// --- DADOS PADRÃO ---
const DADOS_PADRAO = {
  frota: [
    { placa: 'ABC-1234', modelo: 'Volvo FH', status: 'Em rota', lat: -23.5505, lng: -46.6333 },
    { placa: 'DEF-5678', modelo: 'Scania R500', status: 'Parado', lat: -19.9167, lng: -43.9345 },
    { placa: 'GHI-9012', modelo: 'Mercedes Actros', status: 'Manutenção', lat: -22.9068, lng: -43.1729 },
    { placa: 'JKL-3456', modelo: 'DAF XF', status: 'Em rota', lat: -25.4284, lng: -49.2733 }
  ],
  motoristas: [
    { nome: 'Carlos Silva', cnh: '12345678900', status: 'Ativo' },
    { nome: 'João Mendes', cnh: '98765432100', status: 'Em viagem' },
    { nome: 'Rafael Costa', cnh: '45612378900', status: 'Folga' },
  ],
  rotas: [
    { origem: 'São Paulo', destino: 'Curitiba', distancia: '400 km', duracao: '6h' },
    { origem: 'Belo Horizonte', destino: 'Rio de Janeiro', distancia: '440 km', duracao: '7h' },
  ],
  alertas: [
    { tipo: 'Manutenção', mensagem: 'Caminhão DEF-5678 com revisão atrasada', status: 'Pendente' },
    { tipo: 'Rota', mensagem: 'Veículo GHI-9012 fora da rota prevista', status: 'Ativo' },
  ],
  // --- DADOS FINANCEIROS ATUALIZADOS PARA 12 MESES ---
  financeiro: [
    { mes: 'Jan', lucro: 42000, despesas: 15000, saldo: 27000 },
    { mes: 'Fev', lucro: 45000, despesas: 16000, saldo: 29000 },
    { mes: 'Mar', lucro: 50000, despesas: 17000, saldo: 33000 },
    { mes: 'Abr', lucro: 48000, despesas: 16500, saldo: 31500 },
    { mes: 'Mai', lucro: 55000, despesas: 18000, saldo: 37000 },
    { mes: 'Jun', lucro: 53000, despesas: 17500, saldo: 35500 },
    { mes: 'Jul', lucro: 58000, despesas: 19000, saldo: 39000 },
    { mes: 'Ago', lucro: 56000, despesas: 18500, saldo: 37500 },
    { mes: 'Set', lucro: 60000, despesas: 20000, saldo: 40000 },
    { mes: 'Out', lucro: 62000, despesas: 21000, saldo: 41000 },
    { mes: 'Nov', lucro: 65000, despesas: 22000, saldo: 43000 },
    { mes: 'Dez', lucro: 70000, despesas: 25000, saldo: 45000 }
  ]
};

// --- FUNÇÕES DE DADOS (localStorage) ---
function getDados(chave) {
  const dados = localStorage.getItem(chave);
  if (!dados) {
    localStorage.setItem(chave, JSON.stringify(DADOS_PADRAO[chave]));
    return DADOS_PADRAO[chave];
  }
  return JSON.parse(dados);
}

function saveDados(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
}

// --- VARIÁVEIS GLOBAIS DE ESTADO ---
let meuMapa = null;
let marcadores = {}; 
let meuGraficoFinanceiro = null;
let filtros = {
  frotaBusca: '',
  frotaStatus: '',
  motoristaBusca: ''
};
let editando = {
  veiculo: null,
  motorista: null
};

// --- FUNÇÕES DE RENDERIZAÇÃO ---
function formatarStatus(status) {
  let classe = '';
  if (status === 'Em rota') classe = 'status-em-rota';
  else if (status === 'Manutenção') classe = 'status-manutencao';
  else if (status === 'Parado') classe = 'status-parado';
  return `<span class="${classe}">${status}</span>`;
}
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


// --- 1. VISÃO GERAL (MAPA + LISTA) ---
function inicializarMapa() {
  const containerMapa = document.getElementById('mapa-simulacao');
  if (containerMapa && !meuMapa) { // Só inicializa se não existir
    meuMapa = L.map('mapa-simulacao').setView([-14.235, -51.925], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(meuMapa);
  }
  renderizarMarcadoresMapa();
}

function renderizarMarcadoresMapa() {
  if (!meuMapa) return;
  const frota = getDados('frota');

  // Limpa marcadores antigos
  Object.values(marcadores).forEach(m => m.remove());
  marcadores = {};

  frota.forEach(veiculo => {
    if (veiculo.lat && veiculo.lng) {
      const marker = L.marker([veiculo.lat, veiculo.lng]).addTo(meuMapa);
      marker.bindPopup(`
        <strong>${veiculo.modelo} (${veiculo.placa})</strong><br>
        Status: ${veiculo.status}
      `);
      marcadores[veiculo.placa] = marker; 
    }
  });
  
  renderizarListaMapa();
}

function renderizarListaMapa() {
  const containerLista = document.getElementById('mapa-lista-scroll');
  if (!containerLista) return;

  const frota = getDados('frota');
  containerLista.innerHTML = frota.map(v => `
    <div class="map-list-item" onclick="focarNoVeiculo('${v.placa}')">
      <h4>${v.placa} (${v.modelo})</h4>
      <p>Status: ${formatarStatus(v.status)}</p>
    </div>
  `).join('');
}

function focarNoVeiculo(placa) {
  const veiculo = getDados('frota').find(v => v.placa === placa);
  if (veiculo && meuMapa) {
    meuMapa.flyTo([veiculo.lat, veiculo.lng], 15); 
    if (marcadores[placa]) {
      marcadores[placa].openPopup();
    }
  }
}


// --- 2. PÁGINA DE FROTA (CRUD + FILTRO) ---
function renderizarFrota() {
  const listaVeiculos = document.getElementById('lista-veiculos');
  if (!listaVeiculos) return;

  let frota = getDados('frota');
  
  if (filtros.frotaStatus) {
    frota = frota.filter(v => v.status === filtros.frotaStatus);
  }
  if (filtros.frotaBusca) {
    const busca = filtros.frotaBusca.toLowerCase();
    frota = frota.filter(v => 
      v.placa.toLowerCase().includes(busca) ||
      v.modelo.toLowerCase().includes(busca)
    );
  }
  
  listaVeiculos.innerHTML = frota.map(v => `
    <div class="card">
      <div>
        <h3>${v.placa}</h3>
        <p><strong>Modelo:</strong> ${v.modelo}</p>
        <p><strong>Status:</strong> ${formatarStatus(v.status)}</p>
      </div>
      <div class="card-botoes">
        <button class="btn-editar" onclick="iniciarEdicaoVeiculo('${v.placa}')">Editar</button>
        <button class="btn-excluir" onclick="excluirVeiculo('${v.placa}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

// --- 3. PÁGINA DE MOTORISTAS (CRUD + FILTRO) ---
function renderizarMotoristas() {
  const listaMotoristas = document.getElementById('lista-motoristas');
  if (!listaMotoristas) return; 

  let motoristas = getDados('motoristas');

  if (filtros.motoristaBusca) {
    const busca = filtros.motoristaBusca.toLowerCase();
    motoristas = motoristas.filter(m => 
      m.nome.toLowerCase().includes(busca) ||
      m.cnh.toLowerCase().includes(busca)
    );
  }

  listaMotoristas.innerHTML = motoristas.map(m => `
    <div class="card">
      <div>
        <h3>${m.nome}</h3>
        <p><strong>CNH:</strong> ${m.cnh}</p>
        <p><strong>Status:</strong> ${m.status}</p>
      </div>
      <div class="card-botoes">
        <button class="btn-editar" onclick="iniciarEdicaoMotorista('${m.cnh}')">Editar</button>
        <button class="btn-excluir" onclick="excluirMotorista('${m.cnh}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

// --- 4. PÁGINA FINANCEIRA (GRÁFICO) ---
function inicializarGraficoFinanceiro() {
  const ctx = document.getElementById('grafico-financeiro');
  if (!ctx) return;

  // --- ALTERAÇÃO: Removido o .reverse() ---
  // Isso garante que os meses sejam exibidos em ordem cronológica (Jan -> Dez)
  const financeiro = getDados('financeiro'); 

  const labels = financeiro.map(f => f.mes);
  const lucros = financeiro.map(f => f.lucro);
  const despesas = financeiro.map(f => f.despesas);
  
  Chart.defaults.color = '#ccc';
  Chart.defaults.borderColor = '#444';

  meuGraficoFinanceiro = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Lucro Bruto',
          data: lucros,
          backgroundColor: 'rgba(0, 191, 255, 0.7)', 
          borderColor: 'rgba(0, 191, 255, 1)',
          borderWidth: 1
        },
        {
          label: 'Despesas',
          data: despesas,
          backgroundColor: 'rgba(255, 77, 77, 0.7)', 
          borderColor: 'rgba(255, 77, 77, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Permite que o gráfico se ajuste
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatarMoeda(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatarMoeda(value);
            }
          }
        }
      }
    }
  });
}

function renderizarFinanceiroCards() {
  const resumoFinanceiro = document.getElementById('resumo-financeiro');
  if (!resumoFinanceiro) return; 
  const financeiro = getDados('financeiro');
  resumoFinanceiro.innerHTML = financeiro.map(f => `
    <div class="card">
      <h3>${f.mes}</h3>
      <p><strong>Lucro:</strong> ${formatarMoeda(f.lucro)}</p>
      <p><strong>Despesas:</strong> ${formatarMoeda(f.despesas)}</p>
      <p><strong>Saldo:</strong> ${formatarMoeda(f.saldo)}</p>
    </div>
  `).join('');
}


// --- 5 & 6. Funções de Rotas e Alertas ---
function renderizarRotas() {
  const listaRotas = document.getElementById('lista-rotas');
  if (!listaRotas) return; 
  const rotas = getDados('rotas');
  listaRotas.innerHTML = rotas.map(r => `
    <div class="card">
      <h3>${r.origem} → ${r.destino}</h3>
      <p><strong>Distância:</strong> ${r.distancia}</p>
      <p><strong>Duração:</strong> ${r.duracao}</p>
    </div>
  `).join('');
}

function renderizarAlertas() {
  const listaAlertas = document.getElementById('lista-alertas');
  if (!listaAlertas) return; 
  const alertas = getDados('alertas');
  listaAlertas.innerHTML = alertas.map(a => `
    <div class="card">
      <h3>${a.tipo}</h3>
      <p>${a.mensagem}</p>
      <p><strong>Status:</strong> ${a.status}</p>
    </div>
  `).join('');
}


// --- FUNÇÃO MESTRA DE ATUALIZAÇÃO ---
function inicializarTodasAsTelas() {
  inicializarMapa(); 
  renderizarFrota();
  renderizarMotoristas();
  renderizarRotas();
  renderizarAlertas();
  renderizarFinanceiroCards();
  inicializarGraficoFinanceiro();
}

// --- FUNÇÕES DE AÇÃO (CRUD) ---
function excluirVeiculo(placa) {
  if (confirm(`Tem certeza que deseja excluir o veículo ${placa}?`)) {
    let frota = getDados('frota');
    frota = frota.filter(v => v.placa !== placa);
    saveDados('frota', frota);
    renderizarFrota(); 
    renderizarMarcadoresMapa(); 
  }
}
function iniciarEdicaoVeiculo(placa) {
  const veiculo = getDados('frota').find(v => v.placa === placa);
  if (!veiculo) return;
  editando.veiculo = veiculo; 
  document.querySelector('#page-frota .form-container').classList.add('edit-mode');
  document.getElementById('form-veiculo-titulo').innerText = `Editando Veículo: ${placa}`;
  document.getElementById('veiculo-edit-placa').value = placa; 
  document.getElementById('veiculo-placa').value = veiculo.placa;
  document.getElementById('veiculo-modelo').value = veiculo.modelo;
  document.getElementById('veiculo-status').value = veiculo.status;
  document.getElementById('veiculo-placa').disabled = true; 
  document.getElementById('form-veiculo-btn-salvar').innerText = 'Salvar Alterações';
  document.getElementById('form-veiculo-btn-salvar').classList.add('btn-salvar-edicao');
  document.getElementById('form-veiculo-btn-cancelar').style.display = 'inline-block';
  document.querySelector('.content').scrollTo(0, 0); 
}
function cancelarEdicaoVeiculo() {
  editando.veiculo = null;
  document.querySelector('#page-frota .form-container').classList.remove('edit-mode');
  document.getElementById('form-veiculo-titulo').innerText = 'Cadastrar Novo Veículo';
  document.getElementById('form-novo-veiculo').reset(); 
  document.getElementById('veiculo-placa').disabled = false;
  document.getElementById('form-veiculo-btn-salvar').innerText = 'Adicionar Veículo';
  document.getElementById('form-veiculo-btn-salvar').classList.remove('btn-salvar-edicao');
  document.getElementById('form-veiculo-btn-cancelar').style.display = 'none';
}

function excluirMotorista(cnh) {
  if (confirm(`Tem certeza que deseja excluir este motorista?`)) {
    let motoristas = getDados('motoristas');
    motoristas = motoristas.filter(m => m.cnh !== cnh);
    saveDados('motoristas', motoristas);
    renderizarMotoristas();
  }
}
function iniciarEdicaoMotorista(cnh) {
  const motorista = getDados('motoristas').find(m => m.cnh === cnh);
  if (!motorista) return;
  editando.motorista = motorista;
  document.querySelector('#page-motoristas .form-container').classList.add('edit-mode');
  document.getElementById('form-motorista-titulo').innerText = `Editando Motorista`;
  document.getElementById('motorista-edit-cnh').value = cnh;
  document.getElementById('motorista-nome').value = motorista.nome;
  document.getElementById('motorista-cnh').value = motorista.cnh;
  document.getElementById('motorista-status').value = motorista.status;
  document.getElementById('motorista-cnh').disabled = true; 
  document.getElementById('form-motorista-btn-salvar').innerText = 'Salvar Alterações';
  document.getElementById('form-motorista-btn-salvar').classList.add('btn-salvar-edicao');
  document.getElementById('form-motorista-btn-cancelar').style.display = 'inline-block';
  document.querySelector('.content').scrollTo(0, 0); 
}
function cancelarEdicaoMotorista() {
  editando.motorista = null;
  document.querySelector('#page-motoristas .form-container').classList.remove('edit-mode');
  document.getElementById('form-motorista-titulo').innerText = 'Cadastrar Novo Motorista';
  document.getElementById('form-novo-motorista').reset();
  document.getElementById('motorista-cnh').disabled = false;
  document.getElementById('form-motorista-btn-salvar').innerText = 'Adicionar Motorista';
  document.getElementById('form-motorista-btn-salvar').classList.remove('btn-salvar-edicao');
  document.getElementById('form-motorista-btn-cancelar').style.display = 'none';
}


// --- CONFIGURAÇÃO DOS FORMULÁRIOS (SUBMIT) ---
function setupFormularios() {
  const formVeiculo = document.getElementById('form-novo-veiculo');
  if (formVeiculo) {
    formVeiculo.addEventListener('submit', (e) => {
      e.preventDefault();
      const frotaAtual = getDados('frota');
      if (editando.veiculo) {
        const placaOriginal = document.getElementById('veiculo-edit-placa').value;
        const veiculoEditado = frotaAtual.find(v => v.placa === placaOriginal);
        veiculoEditado.modelo = document.getElementById('veiculo-modelo').value;
        veiculoEditado.status = document.getElementById('veiculo-status').value;
        saveDados('frota', frotaAtual);
        cancelarEdicaoVeiculo();
      } else {
        const novaPlaca = document.getElementById('veiculo-placa').value;
        if (frotaAtual.some(v => v.placa === novaPlaca)) {
          alert('Erro: Esta placa já está cadastrada.');
          return;
        }
        const novoVeiculo = {
          placa: novaPlaca,
          modelo: document.getElementById('veiculo-modelo').value,
          status: document.getElementById('veiculo-status').value,
          lat: (Math.random() * -30) - 3, 
          lng: (Math.random() * -40) - 35
        };
        frotaAtual.push(novoVeiculo);
        saveDados('frota', frotaAtual);
        formVeiculo.reset();
      }
      renderizarFrota();
      renderizarMarcadoresMapa();
    });
    document.getElementById('form-veiculo-btn-cancelar').addEventListener('click', cancelarEdicaoVeiculo);
  }

  const formMotorista = document.getElementById('form-novo-motorista');
  if (formMotorista) {
    formMotorista.addEventListener('submit', (e) => {
      e.preventDefault();
      const motoristasAtuais = getDados('motoristas');
      if (editando.motorista) {
        const cnhOriginal = document.getElementById('motorista-edit-cnh').value;
        const motoristaEditado = motoristasAtuais.find(m => m.cnh === cnhOriginal);
        motoristaEditado.nome = document.getElementById('motorista-nome').value;
        motoristaEditado.status = document.getElementById('motorista-status').value;
        saveDados('motoristas', motoristasAtuais);
        cancelarEdicaoMotorista();
      } else {
        const novaCNH = document.getElementById('motorista-cnh').value;
        if (motoristasAtuais.some(m => m.cnh === novaCNH)) {
          alert('Erro: Esta CNH já está cadastrada.');
          return;
        }
        const novoMotorista = {
          nome: document.getElementById('motorista-nome').value,
          cnh: novaCNH,
          status: document.getElementById('motorista-status').value
        };
        motoristasAtuais.push(novoMotorista);
        saveDados('motoristas', motoristasAtuais);
        formMotorista.reset();
      }
      renderizarMotoristas();
    });
    document.getElementById('form-motorista-btn-cancelar').addEventListener('click', cancelarEdicaoMotorista);
  }
}

// --- CONFIGURAÇÃO DOS FILTROS ---
function setupFiltros() {
  const filtroFrotaBusca = document.getElementById('filtro-frota-busca');
  if (filtroFrotaBusca) {
    filtroFrotaBusca.addEventListener('input', (e) => {
      filtros.frotaBusca = e.target.value;
      renderizarFrota();
    });
  }
  
  const filtroFrotaStatus = document.getElementById('filtro-frota-status');
  if (filtroFrotaStatus) {
    filtroFrotaStatus.addEventListener('change', (e) => {
      filtros.frotaStatus = e.target.value;
      renderizarFrota();
    });
  }

  const filtroMotoristaBusca = document.getElementById('filtro-motoristas-busca');
  if (filtroMotoristaBusca) {
    filtroMotoristaBusca.addEventListener('input', (e) => {
      filtros.motoristaBusca = e.target.value;
      renderizarMotoristas();
    });
  }
}

// --- SIMULADOR DE NOTIFICAÇÕES ---
const CIDADES_SIMULADAS = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Brasília', 'Goiânia'];
function getRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
function gerarNotificacaoAleatoria() {
  const motoristas = getDados('motoristas');
  const frota = getDados('frota');
  const motorista = getRandom(motoristas);
  const veiculo = getRandom(frota);
  const cidade = getRandom(CIDADES_SIMULADAS);
  if (!motorista || !veiculo) return null;
  const tipo = Math.ceil(Math.random() * 3); 
  switch (tipo) {
    case 1: return `Motorista ${motorista.nome.split(' ')[0]} com caminhão ${veiculo.placa} finalizou a rota.`;
    case 2: return `Caminhão ${veiculo.placa} (${veiculo.modelo}) foi para revisão agendada.`;
    case 3: return `Motorista ${motorista.nome.split(' ')[0]} carregou em ${cidade} com o veículo ${veiculo.placa}.`;
    default: return `Veículo ${veiculo.placa} reportou status: ${veiculo.status}.`;
  }
}
function mostrarNotificacao(mensagem) {
  const container = document.getElementById('notificacao-container');
  if (!container || !mensagem) return;
  const toast = document.createElement('div');
  toast.className = 'notificacao-toast';
  toast.innerHTML = `<strong>ATIVIDADE ⚡</strong><p>${mensagem}</p>`;
  container.prepend(toast); 
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => { toast.remove(); }, 500);
  }, 5000);
}
function iniciarSimuladorNotificacoes() {
  const msgInicial = gerarNotificacaoAleatoria();
  mostrarNotificacao(msgInicial);
  setInterval(() => {
    const mensagem = gerarNotificacaoAleatoria();
    mostrarNotificacao(mensagem);
  }, 50000); 
}

// --- LÓGICA DE NAVEGAÇÃO SPA ---
function setupNavegacao() {
  const navLinks = document.querySelectorAll('#main-nav a');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); 
      
      const pageId = link.getAttribute('data-page');
      
      document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('ativo');
      });
      
      navLinks.forEach(navLink => {
        navLink.classList.remove('ativo');
      });
      
      const targetPage = document.getElementById(pageId);
      if (targetPage) {
        targetPage.classList.add('ativo');
      }
      
      link.classList.add('ativo');
      
      window.location.hash = link.getAttribute('href');
      
      // Corrige renderização de mapa/gráfico
      if (pageId === 'page-visao-geral' && meuMapa) {
        setTimeout(() => meuMapa.invalidateSize(), 10);
      }
      if (pageId === 'page-financeiro' && meuGraficoFinanceiro) {
        meuGraficoFinanceiro.resize();
      }
    });
  });
  
  // Ler a URL na carga inicial
  const hash = window.location.hash.substring(1);
  if (hash) {
    const link = document.querySelector(`#main-nav a[href="#${hash}"]`);
    if (link) {
      link.click();
    }
  }
}

// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavegacao(); 
  inicializarTodasAsTelas(); 
  setupFormularios(); 
  setupFiltros(); 
  iniciarSimuladorNotificacoes(); 
});