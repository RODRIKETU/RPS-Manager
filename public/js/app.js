/* RPS Manager Pro - JavaScript Principal */

// ==================== VARIÁVEIS GLOBAIS ====================

// Empresas
let empresas = [];
let arquivosSelecionados = [];
let opcoes = {
  atualizarExistentes: true,
  ignorarDuplicadas: false
};

// RPS
let rpsData = [];
let rpsAtual = null;
let paginaAtual = 1;
let itensPorPagina = 20;
let rpsSelecionados = new Set();
let ordenacaoAtual = { campo: 'data_emissao', direcao: 'desc' };

// Layouts
let layoutsData = [];
let layoutAtual = null;
let paginaAtualLayouts = 1;
let itensPorPaginaLayouts = 10;
let layoutsSelecionados = new Set();
let ordenacaoAtualLayouts = { campo: 'nome', direcao: 'asc' };

// ==================== FUNÇÕES DE NAVEGAÇÃO LEGACY (compatibilidade) ====================

function showTab(tabName) {
  // Função legacy para compatibilidade - redireciona para nova navegação
  if (typeof showPage === 'function') {
    showPage(tabName);
  } else {
    // Fallback para o sistema antigo
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (event && event.target) {
      event.target.classList.add('active');
    }
    
    const tabElement = document.getElementById(`tab-${tabName}`);
    if (tabElement) {
      tabElement.classList.add('active');
    }

    // Carregar dados específicos da aba
    if (tabName === 'rps' || tabName === 'gestao') {
      carregarRPS();
    } else if (tabName === 'layouts') {
      atualizarListaLayouts();
    }
  }
}

// ==================== FUNÇÕES DE EMPRESAS ====================

async function carregarEmpresas() {
  try {
    const response = await fetch('/api/empresas');
    empresas = await response.json();
    atualizarTabelaEmpresas();
  } catch (error) {
    showNotification('Erro ao carregar empresas', 'error');
  }
}

function atualizarTabelaEmpresas() {
  const tbody = document.getElementById('empresasTable');
  tbody.innerHTML = empresas.map(empresa => `
    <tr>
      <td>${formatarCNPJ(empresa.cnpj)}</td>
      <td>${empresa.razao_social}</td>
      <td>${empresa.nome_fantasia || '-'}</td>
      <td>${empresa.inscricao_municipal || '-'}</td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="editarEmpresa(${empresa.id})" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="excluirEmpresa(${empresa.id})" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setupFormEmpresa() {
  // Configuração do formulário
  document.getElementById('formEmpresa').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const empresaId = document.getElementById('empresaId').value;
    const isEdicao = empresaId && empresaId !== '';
    
    const dados = {
      cnpj: document.getElementById('cnpj').value.replace(/\D/g, ''),
      razaoSocial: document.getElementById('razaoSocial').value,
      nomeFantasia: document.getElementById('nomeFantasia').value,
      inscricaoMunicipal: document.getElementById('inscricaoMunicipal').value,
      endereco: document.getElementById('endereco').value,
      telefone: document.getElementById('telefone').value,
      email: document.getElementById('email').value
    };

    try {
      let response;
      if (isEdicao) {
        // Atualizar empresa existente
        response = await fetch(`/api/empresas/${empresaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });
      } else {
        // Criar nova empresa
        response = await fetch('/api/empresas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        });
      }

      if (response.ok) {
        const mensagem = isEdicao ? 'Empresa atualizada com sucesso!' : 'Empresa cadastrada com sucesso!';
        showNotification(mensagem, 'success');
        limparFormularioEmpresa();
        carregarEmpresas();
      } else {
        const error = await response.json();
        showNotification(error.erro, 'error');
      }
    } catch (error) {
      showNotification('Erro ao salvar empresa', 'error');
    }
  });

  // Máscara e busca automática para CNPJ
  const cnpjInput = document.getElementById('cnpj');
  cnpjInput.addEventListener('input', function(e) {
    // Aplica máscara de CNPJ
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 14) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
      e.target.value = value;
    }
  });

  cnpjInput.addEventListener('blur', function(e) {
    const cnpj = e.target.value.replace(/\D/g, '');
    // Se o CNPJ tem 14 dígitos e os campos ainda estão vazios, busca automaticamente
    if (cnpj.length === 14 && !document.getElementById('razaoSocial').value.trim()) {
      buscarDadosCNPJ();
    }
  });

  // Máscara para telefone
  const telefoneInput = document.getElementById('telefone');
  telefoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      if (value.length <= 10) {
        value = value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
      } else {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
      }
      e.target.value = value;
    }
  });
}

function limparFormularioEmpresa() {
  document.getElementById('formEmpresa').reset();
  document.getElementById('empresaId').value = '';
  
  // Atualizar texto do botão
  const btnSubmit = document.querySelector('#formEmpresa button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar Empresa';
  }
}

function editarEmpresa(id) {
  const empresa = empresas.find(e => e.id === id);
  if (empresa) {
    document.getElementById('empresaId').value = empresa.id;
    document.getElementById('cnpj').value = formatarCNPJ(empresa.cnpj);
    document.getElementById('razaoSocial').value = empresa.razao_social;
    document.getElementById('nomeFantasia').value = empresa.nome_fantasia || '';
    document.getElementById('inscricaoMunicipal').value = empresa.inscricao_municipal || '';
    document.getElementById('endereco').value = empresa.endereco || '';
    document.getElementById('telefone').value = empresa.telefone || '';
    document.getElementById('email').value = empresa.email || '';
    
    // Atualizar texto do botão
    const btnSubmit = document.querySelector('#formEmpresa button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.innerHTML = '<i class="fas fa-save"></i> Atualizar Empresa';
    }
    
    // Scroll para o formulário
    document.querySelector('#formEmpresa').scrollIntoView({ behavior: 'smooth' });
  }
}

async function excluirEmpresa(id) {
  const empresa = empresas.find(e => e.id === id);
  if (!empresa) {
    showNotification('Empresa não encontrada', 'error');
    return;
  }

  // Confirmar exclusão
  const confirmacao = confirm(
    `Tem certeza que deseja excluir a empresa "${empresa.razao_social}"?\n\n` +
    'Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos.'
  );

  if (!confirmacao) {
    return;
  }

  try {
    const response = await fetch(`/api/empresas/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showNotification('Empresa excluída com sucesso!', 'success');
      carregarEmpresas();
      
      // Se a empresa excluída estava sendo editada, limpar o formulário
      const empresaIdForm = document.getElementById('empresaId').value;
      if (empresaIdForm == id) {
        limparFormularioEmpresa();
      }
    } else {
      const error = await response.json();
      showNotification(error.erro || 'Erro ao excluir empresa', 'error');
    }
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    showNotification('Erro ao excluir empresa', 'error');
  }
}

// ==================== BUSCA AUTOMÁTICA POR CNPJ ====================

async function buscarDadosCNPJ() {
  const cnpjInput = document.getElementById('cnpj');
  const btnBusca = document.querySelector('.btn-search-cnpj');
  const cnpj = cnpjInput.value.replace(/\D/g, ''); // Remove caracteres não numéricos
  
  // Validação básica do CNPJ
  if (cnpj.length !== 14) {
    mostrarNotificacao('CNPJ deve ter 14 dígitos', 'error');
    return;
  }
  
  // Validação de CNPJ inválido (todos os dígitos iguais)
  if (/^(\d)\1{13}$/.test(cnpj)) {
    mostrarNotificacao('CNPJ inválido', 'error');
    return;
  }
  
  // Desabilita botão e mostra loading
  btnBusca.disabled = true;
  btnBusca.classList.add('loading');
  btnBusca.innerHTML = '<i class="fas fa-spinner"></i>';
  
  // Mostra notificação de busca em andamento
  mostrarNotificacao('Buscando dados da empresa em múltiplas fontes...', 'info');
  
  try {
    // Busca dados através do nosso servidor (com fallback de múltiplas APIs)
    const response = await fetch(`/api/cnpj/buscar/${cnpj}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.erro || 'CNPJ não encontrado');
    }
    
    const dados = await response.json();
    
    // Preenche os campos automaticamente
    preencherDadosEmpresa(dados);
    mostrarNotificacao('✅ Dados da empresa carregados com sucesso!', 'success');
    
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    
    let mensagemErro = 'Erro ao buscar dados do CNPJ.';
    
    if (error.message.includes('403')) {
      mensagemErro = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
    } else if (error.message.includes('não encontrado')) {
      mensagemErro = 'CNPJ não encontrado. Verifique se o número está correto.';
    } else if (error.message.includes('nenhuma fonte')) {
      mensagemErro = 'Dados não encontrados em nenhuma fonte. Cadastre manualmente.';
    }
    
    mostrarNotificacao(mensagemErro, 'error');
  } finally {
    // Reabilita botão
    btnBusca.disabled = false;
    btnBusca.classList.remove('loading');
    btnBusca.innerHTML = '<i class="fas fa-search"></i>';
  }
}

function preencherDadosEmpresa(dados) {
  // Preenche razão social
  if (dados.razao_social) {
    document.getElementById('razaoSocial').value = dados.razao_social;
  }
  
  // Preenche nome fantasia
  if (dados.nome_fantasia && dados.nome_fantasia !== dados.razao_social) {
    document.getElementById('nomeFantasia').value = dados.nome_fantasia;
  }
  
  // Preenche email
  if (dados.email) {
    document.getElementById('email').value = dados.email;
  }
  
  // Preenche telefone
  if (dados.telefone) {
    document.getElementById('telefone').value = dados.telefone;
  }
  
  // Preenche endereço
  if (dados.endereco) {
    document.getElementById('endereco').value = dados.endereco;
  }
}

// ==================== FUNÇÕES DE RPS ====================

async function atualizarListaRps() {
  const empresaId = document.getElementById('filtroEmpresa').value;
  const dataInicio = document.getElementById('filtroDataInicio').value;
  const dataFim = document.getElementById('filtroDataFim').value;

  if (!empresaId || !dataInicio || !dataFim) {
    mostrarNotificacao('Selecione empresa e período para buscar RPS', 'warning');
    return;
  }

  try {
    mostrarLoading('tabelaRpsBody');
    
    const response = await fetch(`/api/rps?empresaId=${empresaId}&dataInicio=${dataInicio}&dataFim=${dataFim}`);
    const data = await response.json();

    if (response.ok) {
      rpsData = data.rps || [];
      atualizarEstatisticas(data.totais);
      filtrarRps();
      mostrarNotificacao('Lista de RPS atualizada', 'success');
    } else {
      throw new Error(data.erro || 'Erro ao buscar RPS');
    }
  } catch (error) {
    console.error('Erro ao buscar RPS:', error);
    mostrarNotificacao('Erro ao buscar RPS: ' + error.message, 'error');
    rpsData = [];
    renderizarTabelaRps([]);
  }
}

function filtrarRps() {
  const filtroStatus = document.getElementById('filtroStatus').value;
  const filtroBusca = document.getElementById('filtroBusca').value.toLowerCase();

  let rpsFiltrados = rpsData.filter(rps => {
    const matchStatus = !filtroStatus || rps.status === filtroStatus;
    const matchBusca = !filtroBusca || 
      rps.numero.toString().includes(filtroBusca) ||
      rps.tomador_nome?.toLowerCase().includes(filtroBusca) ||
      rps.descricao?.toLowerCase().includes(filtroBusca);
    
    return matchStatus && matchBusca;
  });

  // Aplicar ordenação
  rpsFiltrados.sort((a, b) => {
    const { campo, direcao } = ordenacaoAtual;
    let valorA = a[campo];
    let valorB = b[campo];

    if (campo === 'valor_servicos' || campo === 'valor_iss') {
      valorA = parseFloat(valorA) || 0;
      valorB = parseFloat(valorB) || 0;
    }

    if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
    if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
    return 0;
  });

  renderizarTabelaRps(rpsFiltrados);
  atualizarPaginacao(rpsFiltrados.length);
}

function renderizarTabelaRps(dados) {
  const tbody = document.getElementById('tabelaRpsBody');
  
  if (dados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <i class="fas fa-file-alt"></i>
          <div class="empty-state-title">Nenhum RPS encontrado</div>
          <div class="empty-state-subtitle">Ajuste os filtros para ver mais resultados</div>
        </td>
      </tr>
    `;
    return;
  }

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = Math.min(inicio + itensPorPagina, dados.length);
  const dadosPagina = dados.slice(inicio, fim);

  tbody.innerHTML = dadosPagina.map(rps => `
    <tr>
      <td>
        <input type="checkbox" 
               ${rpsSelecionados.has(rps.id) ? 'checked' : ''} 
               onchange="toggleSelecionarRps(${rps.id})">
      </td>
      <td>${rps.numero}</td>
      <td>${formatarData(rps.data_emissao)}</td>
      <td>${rps.tomador_nome || '-'}</td>
      <td title="${rps.descricao || ''}">${truncarTexto(rps.descricao, 30)}</td>
      <td class="text-right">R$ ${formatarValor(rps.valor_servicos)}</td>
      <td class="text-right">R$ ${formatarValor(rps.valor_iss)}</td>
      <td class="text-center">
        <span class="rps-status ${rps.status || 'pendente'}">${getStatusLabel(rps.status)}</span>
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-info" onclick="visualizarRps(${rps.id})" title="Visualizar">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-warning" onclick="editarRps(${rps.id})" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="excluirRps(${rps.id})" title="Excluir">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Atualizar informações de paginação
  document.getElementById('infoInicio').textContent = inicio + 1;
  document.getElementById('infoFim').textContent = fim;
  document.getElementById('infoTotal').textContent = dados.length;
}

// ==================== FUNÇÕES DE LAYOUTS ====================

async function atualizarListaLayouts() {
  try {
    mostrarLoadingLayouts();
    
    const response = await fetch('/api/layouts');
    const data = await response.json();

    if (response.ok) {
      layoutsData = data;
      atualizarEstatisticasLayouts();
      filtrarLayouts();
      mostrarNotificacao('Lista de layouts atualizada', 'success');
    } else {
      throw new Error(data.erro || 'Erro ao buscar layouts');
    }
  } catch (error) {
    console.error('Erro ao buscar layouts:', error);
    mostrarNotificacao('Erro ao buscar layouts: ' + error.message, 'error');
    layoutsData = [];
    renderizarTabelaLayouts([]);
  }
}

// ==================== FUNÇÕES DE IMPORTAÇÃO ====================

function setupDropZone() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
}

function handleFiles(files) {
  arquivosSelecionados = Array.from(files);
  atualizarListaArquivos();
  verificarHabilitarImportacao();
}

function verificarHabilitarImportacao() {
  const layoutId = document.getElementById('layoutImportacao').value;
  const empresaId = document.getElementById('empresaImportacao').value;
  const cadastrarEmpresas = document.getElementById('cadastrarEmpresas').checked;
  const temArquivos = arquivosSelecionados.length > 0;
  
  // Habilita se tem arquivos, layout selecionado e (empresa selecionada OU cadastro automático marcado)
  const podeImportar = temArquivos && layoutId && (empresaId || cadastrarEmpresas);
  
  document.getElementById('btnImportar').disabled = !podeImportar;
}

function atualizarListaArquivos() {
  const container = document.getElementById('filesList');
  container.innerHTML = arquivosSelecionados.map((file, index) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--light); border-radius: 8px; margin-bottom: 8px;">
      <div>
        <strong>${file.name}</strong>
        <span style="color: var(--secondary); margin-left: 16px;">${(file.size / 1024).toFixed(1)} KB</span>
      </div>
      <button class="btn btn-danger" onclick="removerArquivo(${index})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

// ==================== FUNÇÕES UTILITÁRIAS ====================

function formatarCNPJ(cnpj) {
  if (!cnpj) return '';
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatarValor(valor) {
  if (!valor) return '0,00';
  return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function truncarTexto(texto, tamanho) {
  if (!texto) return '-';
  return texto.length > tamanho ? texto.substring(0, tamanho) + '...' : texto;
}

function getStatusLabel(status) {
  const labels = {
    'processado': 'Processado',
    'pendente': 'Pendente',
    'erro': 'Erro',
    'ativo': 'Ativo',
    'inativo': 'Inativo'
  };
  return labels[status] || 'Pendente';
}

function formatarInputs() {
  // Formatação do CNPJ
  document.getElementById('cnpj').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    e.target.value = value;
  });
  
  // Formatação do telefone
  document.getElementById('telefone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
    e.target.value = value;
  });
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => {
    notification.classList.remove('show');
  }, 4000);
}

function mostrarNotificacao(mensagem, tipo = 'info') {
  // Remove notificação anterior se existir
  const notificacaoExistente = document.querySelector('.notificacao-cnpj');
  if (notificacaoExistente) {
    notificacaoExistente.remove();
  }
  
  // Cria nova notificação
  const notificacao = document.createElement('div');
  notificacao.className = `notificacao-cnpj notificacao-${tipo}`;
  notificacao.innerHTML = `
    <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    ${mensagem}
  `;
  
  // Adiciona ao body
  document.body.appendChild(notificacao);
  
  // Remove após 4 segundos
  setTimeout(() => {
    if (notificacao.parentNode) {
      notificacao.remove();
    }
  }, 4000);
}

// ==================== FUNÇÕES DE IMPORTAÇÃO ====================

function iniciarImportacao() {
  const empresaId = document.getElementById('empresaImportacao').value;
  const layoutId = document.getElementById('layoutImportacao').value;
  const arquivos = document.getElementById('fileInput').files;
  const cadastrarEmpresas = document.getElementById('cadastrarEmpresas').checked;
  
  if (!layoutId || arquivos.length === 0) {
    showNotification('Por favor, selecione layout e arquivos para importação.', 'danger');
    return;
  }
  
  // Se não tem empresa selecionada e não vai cadastrar automaticamente
  if (!empresaId && !cadastrarEmpresas) {
    showNotification('Por favor, selecione uma empresa ou marque a opção de cadastro automático.', 'danger');
    return;
  }
  
  const formData = new FormData();
  if (empresaId) formData.append('empresa_id', empresaId);
  formData.append('layout_id', layoutId);
  formData.append('atualizar_existentes', document.getElementById('atualizarExistentes').checked);
  formData.append('ignorar_duplicadas', document.getElementById('ignorarDuplicadas').checked);
  formData.append('cadastrar_empresas', cadastrarEmpresas);
  
  for (let i = 0; i < arquivos.length; i++) {
    formData.append('arquivos', arquivos[i]);
  }
  
  // Mostra loading
  const btnImportar = document.getElementById('btnImportar');
  const textoOriginal = btnImportar.innerHTML;
  btnImportar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
  btnImportar.disabled = true;
  
  // Usar a nova rota de importação com cadastro
  const rota = cadastrarEmpresas ? '/api/importar-rps-com-cadastro' : '/api/importar-rps';
  
  fetch(rota, {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    mostrarResultadoImportacao(data);
    // Reset form
    document.getElementById('fileInput').value = '';
    document.getElementById('arquivosSelecionados').style.display = 'none';
  })
  .catch(error => {
    console.error('Erro na importação:', error);
    showNotification('Erro durante a importação. Tente novamente.', 'danger');
  })
  .finally(() => {
    btnImportar.innerHTML = textoOriginal;
    btnImportar.disabled = false;
  });
}

function mostrarResultadoImportacao(data) {
  const container = document.getElementById('resultadoImportacao');
  const conteudo = document.getElementById('resultadoConteudo');
  
  // Contar estatísticas dos resultados
  let sucessos = 0, erros = 0, empresasCadastradas = 0, ignorados = 0;
  
  if (data.resultados) {
    data.resultados.forEach(resultado => {
      if (resultado.status === 'sucesso') {
        sucessos++;
        if (resultado.empresaCadastradaAutomaticamente) {
          empresasCadastradas++;
        }
      } else if (resultado.status === 'erro' || resultado.status === 'empresa_nao_cadastrada') {
        erros++;
      } else if (resultado.status === 'ignorado') {
        ignorados++;
      }
    });
  }
  
  let html = `
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="text-center">
          <div class="text-success mb-2">
            <i class="fas fa-check-circle fa-2x"></i>
          </div>
          <h5>${sucessos}</h5>
          <p class="text-muted mb-0">Sucessos</p>
        </div>
      </div>
      <div class="col-md-3">
        <div class="text-center">
          <div class="text-danger mb-2">
            <i class="fas fa-times-circle fa-2x"></i>
          </div>
          <h5>${erros}</h5>
          <p class="text-muted mb-0">Erros</p>
        </div>
      </div>
      <div class="col-md-3">
        <div class="text-center">
          <div class="text-warning mb-2">
            <i class="fas fa-exclamation-triangle fa-2x"></i>
          </div>
          <h5>${ignorados}</h5>
          <p class="text-muted mb-0">Ignorados</p>
        </div>
      </div>
      <div class="col-md-3">
        <div class="text-center">
          <div class="text-info mb-2">
            <i class="fas fa-building fa-2x"></i>
          </div>
          <h5>${empresasCadastradas}</h5>
          <p class="text-muted mb-0">Empresas Cadastradas</p>
        </div>
      </div>
    </div>
  `;
  
  if (data.resultados && data.resultados.length > 0) {
    html += `
      <h6><i class="fas fa-list me-2"></i>Detalhes da Importação:</h6>
      <div class="mt-3">
    `;
    
    data.resultados.forEach(resultado => {
      let statusClass, statusIcon, statusText;
      
      switch (resultado.status) {
        case 'sucesso':
          statusClass = 'success';
          statusIcon = 'fas fa-check-circle';
          statusText = 'Sucesso';
          break;
        case 'erro':
          statusClass = 'danger';
          statusIcon = 'fas fa-times-circle';
          statusText = 'Erro';
          break;
        case 'empresa_nao_cadastrada':
          statusClass = 'warning';
          statusIcon = 'fas fa-building';
          statusText = 'Empresa não cadastrada';
          break;
        case 'ignorado':
          statusClass = 'secondary';
          statusIcon = 'fas fa-eye-slash';
          statusText = 'Ignorado';
          break;
        default:
          statusClass = 'info';
          statusIcon = 'fas fa-info-circle';
          statusText = resultado.status;
      }
      
      html += `
        <div class="alert alert-${statusClass} mb-2">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h6 class="alert-heading mb-1">
                <i class="${statusIcon} me-2"></i>${resultado.arquivo}
                <span class="badge bg-${statusClass} ms-2">${statusText}</span>
              </h6>
              <p class="mb-1">${resultado.mensagem || 'Processado com sucesso'}</p>
              
              ${resultado.empresa ? `<small class="text-muted">Empresa: ${resultado.empresa}</small><br>` : ''}
              ${resultado.empresaCadastradaAutomaticamente ? '<small class="text-success"><i class="fas fa-star me-1"></i>Empresa cadastrada automaticamente</small><br>' : ''}
              ${resultado.rpsImportados ? `<small class="text-muted">RPS importados: ${resultado.rpsImportados}</small><br>` : ''}
              ${resultado.rpsAtualizados ? `<small class="text-muted">RPS atualizados: ${resultado.rpsAtualizados}</small><br>` : ''}
              ${resultado.valorTotal ? `<small class="text-muted">Valor total: ${resultado.valorTotal}</small>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  conteudo.innerHTML = html;
  container.style.display = 'block';
  
  // Scroll para o resultado
  container.scrollIntoView({ behavior: 'smooth' });
  
  showNotification(`Importação concluída! ${sucessos} arquivo(s) processado(s) com sucesso.`, sucessos > 0 ? 'success' : 'warning');
}

// ==================== FUNÇÕES DE LAYOUT ====================

// ==================== SISTEMA DE GERENCIAMENTO DE LAYOUTS POR TIPO DE REGISTRO ====================

let tiposRegistroConfig = [];

// Tipos de registro padrão
const TIPOS_REGISTRO_PADRAO = {
  '10': { nome: 'Cabeçalho', descricao: 'Linha de cabeçalho do arquivo (Obrigatório)' },
  '20': { nome: 'Detalhes RPS', descricao: 'Detalhes de cada RPS' },
  '21': { nome: 'Intermediário', descricao: 'Detalhes do intermediário do serviço' },
  '30': { nome: 'RPS-C (Cupons)', descricao: 'Detalhes do RPS-C - Cupons' },
  '40': { nome: 'Notas Convencionais', descricao: 'Detalhes de notas fiscais convencionais recebidas' },
  '50': { nome: 'Materiais Obra', descricao: 'Declaração de materiais incorporados a uma obra' },
  '90': { nome: 'Rodapé', descricao: 'Linha de rodapé do arquivo com totais (Obrigatório)' }
};

function mostrarFormularioLayout(layout = null) {
  const formulario = document.getElementById('formularioLayout');
  const titulo = document.getElementById('tituloFormulario');
  
  if (layout) {
    // Modo edição
    layoutAtual = layout;
    titulo.textContent = 'Editar Layout';
    carregarDadosLayout(layout);
  } else {
    // Modo criação
    layoutAtual = null;
    titulo.textContent = 'Criar Novo Layout';
    limparFormularioLayout();
    // Carregar tipos de registro RPS padrão
    carregarTiposRegistroRPSPadrao();
  }
  
  formulario.style.display = 'block';
  formulario.scrollIntoView({ behavior: 'smooth' });
}

function carregarTiposRegistroRPSPadrao() {
  // Define os tipos de registro RPS padrão
  const tiposRPSPadrao = [
    {
      id: Date.now() + 1,
      codigo_tipo: '10',
      nome_tipo: 'Cabeçalho do Arquivo',
      descricao: 'Linha de cabeçalho do arquivo (Obrigatório)',
      obrigatorio: true,
      ativo: true,
      campos: []
    },
    {
      id: Date.now() + 2,
      codigo_tipo: '20',
      nome_tipo: 'Detalhes do RPS',
      descricao: 'Detalhes de cada RPS (Opcional)',
      obrigatorio: false,
      ativo: true,
      campos: []
    },
    {
      id: Date.now() + 3,
      codigo_tipo: '21',
      nome_tipo: 'Intermediário do Serviço',
      descricao: 'Detalhes do intermediário do serviço (Opcional)',
      obrigatorio: false,
      ativo: true,
      campos: []
    },
    {
      id: Date.now() + 4,
      codigo_tipo: '30',
      nome_tipo: 'RPS-C (Cupons)',
      descricao: 'Detalhes do RPS-C - Cupons (Opcional)',
      obrigatorio: false,
      ativo: true,
      campos: []
    },
    {
      id: Date.now() + 5,
      codigo_tipo: '40',
      nome_tipo: 'Notas Fiscais Convencionais',
      descricao: 'Detalhes de notas fiscais convencionais recebidas (Opcional)',
      obrigatorio: false,
      ativo: true,
      campos: []
    },
    {
      id: Date.now() + 6,
      codigo_tipo: '50',
      nome_tipo: 'Materiais Incorporados',
      descricao: 'Declaração de materiais incorporados a uma obra (Opcional)',
      obrigatorio: false,
      ativo: true,
      campos: []
    },
    {
      id: Date.now() + 7,
      codigo_tipo: '90',
      nome_tipo: 'Rodapé do Arquivo',
      descricao: 'Linha de rodapé do arquivo com totais (Obrigatório)',
      obrigatorio: true,
      ativo: true,
      campos: []
    }
  ];
  
  tiposRegistroConfig = tiposRPSPadrao;
  renderizarTiposRegistro();
  
  mostrarNotificacao('Tipos de registro RPS carregados automaticamente', 'info');
}

function ocultarFormularioLayout() {
  document.getElementById('formularioLayout').style.display = 'none';
  layoutAtual = null;
  tiposRegistroConfig = [];
}

function limparFormularioLayout() {
  document.getElementById('formLayout').reset();
  document.getElementById('layoutIdEdicao').value = '';
  document.getElementById('layoutVersao').value = '1.0';
  document.getElementById('layoutStatus').value = 'ativo';
  tiposRegistroConfig = [];
  document.getElementById('tiposRegistro').innerHTML = '';
}

function carregarDadosLayout(layout) {
  document.getElementById('layoutIdEdicao').value = layout.id;
  document.getElementById('layoutId').value = layout.layout_id;
  document.getElementById('layoutNome').value = layout.nome;
  document.getElementById('layoutVersao').value = layout.versao || '1.0';
  document.getElementById('layoutStatus').value = layout.status || 'ativo';
  document.getElementById('layoutDescricao').value = layout.descricao || '';
  
  // Carregar tipos de registro se existirem
  carregarTiposRegistro(layout.id);
}

async function carregarTiposRegistro(layoutId) {
  try {
    console.log('🔍 Carregando tipos para layout ID:', layoutId);
    const response = await fetch(`/api/layouts/${layoutId}/tipos`);
    if (response.ok) {
      const tipos = await response.json();
      console.log('✅ Tipos carregados:', tipos.length);
      console.log('📋 Dados dos tipos:', tipos);
      tiposRegistroConfig = tipos;
      console.log('🎯 tiposRegistroConfig atualizado:', tiposRegistroConfig.length);
      renderizarTiposRegistro();
    } else {
      console.error('❌ Erro na resposta:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Erro ao carregar tipos de registro:', error);
  }
}

function adicionarTipoRegistro(codigoTipo = '', nomeTipo = '', descricao = '') {
  const id = Date.now();
  const tipo = {
    id: id,
    codigo_tipo: codigoTipo,
    nome_tipo: nomeTipo,
    descricao: descricao,
    campos: [],
    obrigatorio: true,
    ordem: tiposRegistroConfig.length
  };
  
  tiposRegistroConfig.push(tipo);
  renderizarTiposRegistro();
}

function carregarCamposPadrao(tipoId, codigoTipo) {
  // Buscar os campos padrão para o tipo de registro RPS
  const camposPadrao = obterCamposRPSPadrao(codigoTipo);
  
  if (camposPadrao && camposPadrao.length > 0) {
    const tipo = tiposRegistroConfig.find(t => t.id === tipoId);
    if (tipo) {
      tipo.campos = {};
      
      camposPadrao.forEach((campo, index) => {
        const ordem = (index + 1).toString();
        tipo.campos[ordem] = {
          id: Date.now() + index,
          nome: campo.nome,
          posicao: campo.posicao_inicial,
          tamanho: campo.tamanho,
          tipo: campo.tipo,
          descricao: campo.descricao,
          obrigatorio: campo.obrigatorio || false,
          valor_fixo: campo.valor_fixo || ''
        };
      });
      
      renderizarTiposRegistro();
      mostrarNotificacao(`Campos padrão carregados para o tipo ${codigoTipo}`, 'success');
    }
  }
}

function obterCamposRPSPadrao(codigoTipo) {
  const camposPadrao = {
    '10': [ // Cabeçalho
      { nome: 'tipo_registro', posicao_inicial: 1, tamanho: 2, tipo: 'numero', descricao: 'Tipo do registro (sempre 10)', obrigatorio: true, valor_fixo: '10' },
      { nome: 'codigo_municipio', posicao_inicial: 3, tamanho: 7, tipo: 'numero', descricao: 'Código do município', obrigatorio: true },
      { nome: 'cnpj_prestador', posicao_inicial: 10, tamanho: 14, tipo: 'cnpj', descricao: 'CNPJ do prestador', obrigatorio: true },
      { nome: 'inscricao_municipal', posicao_inicial: 24, tamanho: 15, tipo: 'texto', descricao: 'Inscrição municipal', obrigatorio: true },
      { nome: 'data_inicio', posicao_inicial: 39, tamanho: 8, tipo: 'data', descricao: 'Data de início (AAAAMMDD)', obrigatorio: true },
      { nome: 'data_fim', posicao_inicial: 47, tamanho: 8, tipo: 'data', descricao: 'Data de fim (AAAAMMDD)', obrigatorio: true }
    ],
    '20': [ // Detalhes RPS
      { nome: 'tipo_registro', posicao_inicial: 1, tamanho: 2, tipo: 'numero', descricao: 'Tipo do registro (sempre 20)', obrigatorio: true, valor_fixo: '20' },
      { nome: 'numero_rps', posicao_inicial: 3, tamanho: 12, tipo: 'numero', descricao: 'Número do RPS', obrigatorio: true },
      { nome: 'serie_rps', posicao_inicial: 15, tamanho: 5, tipo: 'texto', descricao: 'Série do RPS', obrigatorio: true },
      { nome: 'tipo_rps', posicao_inicial: 20, tamanho: 1, tipo: 'numero', descricao: 'Tipo do RPS', obrigatorio: true },
      { nome: 'data_emissao', posicao_inicial: 21, tamanho: 8, tipo: 'data', descricao: 'Data de emissão (AAAAMMDD)', obrigatorio: true },
      { nome: 'situacao_rps', posicao_inicial: 29, tamanho: 1, tipo: 'numero', descricao: 'Situação do RPS', obrigatorio: true },
      { nome: 'valor_servicos', posicao_inicial: 30, tamanho: 15, tipo: 'valor', descricao: 'Valor dos serviços', obrigatorio: true },
      { nome: 'valor_deducoes', posicao_inicial: 45, tamanho: 15, tipo: 'valor', descricao: 'Valor das deduções', obrigatorio: false },
      { nome: 'codigo_servico', posicao_inicial: 60, tamanho: 5, tipo: 'texto', descricao: 'Código do serviço', obrigatorio: true },
      { nome: 'aliquota_iss', posicao_inicial: 65, tamanho: 4, tipo: 'numero', descricao: 'Alíquota do ISS (%)', obrigatorio: true }
    ],
    '21': [ // Intermediário
      { nome: 'tipo_registro', posicao_inicial: 1, tamanho: 2, tipo: 'numero', descricao: 'Tipo do registro (sempre 21)', obrigatorio: true, valor_fixo: '21' },
      { nome: 'numero_rps', posicao_inicial: 3, tamanho: 12, tipo: 'numero', descricao: 'Número do RPS relacionado', obrigatorio: true },
      { nome: 'tipo_documento', posicao_inicial: 15, tamanho: 1, tipo: 'numero', descricao: 'Tipo documento (1=CNPJ, 2=CPF)', obrigatorio: true },
      { nome: 'documento_intermediario', posicao_inicial: 16, tamanho: 14, tipo: 'texto', descricao: 'CNPJ/CPF do intermediário', obrigatorio: true },
      { nome: 'razao_social', posicao_inicial: 30, tamanho: 115, tipo: 'texto', descricao: 'Razão social do intermediário', obrigatorio: true }
    ],
    '30': [ // RPS-C
      { nome: 'tipo_registro', posicao_inicial: 1, tamanho: 2, tipo: 'numero', descricao: 'Tipo do registro (sempre 30)', obrigatorio: true, valor_fixo: '30' },
      { nome: 'numero_rps', posicao_inicial: 3, tamanho: 12, tipo: 'numero', descricao: 'Número do RPS', obrigatorio: true },
      { nome: 'data_emissao', posicao_inicial: 15, tamanho: 8, tipo: 'data', descricao: 'Data de emissão (AAAAMMDD)', obrigatorio: true },
      { nome: 'numero_cupom', posicao_inicial: 23, tamanho: 12, tipo: 'numero', descricao: 'Número do cupom fiscal', obrigatorio: true },
      { nome: 'valor_total', posicao_inicial: 35, tamanho: 15, tipo: 'valor', descricao: 'Valor total do cupom', obrigatorio: true }
    ],
    '40': [ // Notas Convencionais
      { nome: 'tipo_registro', posicao_inicial: 1, tamanho: 2, tipo: 'numero', descricao: 'Tipo do registro (sempre 40)', obrigatorio: true, valor_fixo: '40' },
      { nome: 'numero_nota', posicao_inicial: 3, tamanho: 12, tipo: 'numero', descricao: 'Número da nota fiscal', obrigatorio: true },
      { nome: 'serie_nota', posicao_inicial: 15, tamanho: 5, tipo: 'texto', descricao: 'Série da nota fiscal', obrigatorio: true },
      { nome: 'data_emissao', posicao_inicial: 20, tamanho: 8, tipo: 'data', descricao: 'Data de emissão (AAAAMMDD)', obrigatorio: true },
      { nome: 'cnpj_emissor', posicao_inicial: 28, tamanho: 14, tipo: 'cnpj', descricao: 'CNPJ do emissor', obrigatorio: true },
      { nome: 'valor_total', posicao_inicial: 42, tamanho: 15, tipo: 'valor', descricao: 'Valor total da nota', obrigatorio: true },
      { nome: 'valor_iss', posicao_inicial: 57, tamanho: 15, tipo: 'valor', descricao: 'Valor do ISS', obrigatorio: false }
    ],
    '50': [ // Materiais
      { nome: 'tipo_registro', posicao_inicial: 1, tamanho: 2, tipo: 'numero', descricao: 'Tipo do registro (sempre 50)', obrigatorio: true, valor_fixo: '50' },
      { nome: 'numero_rps', posicao_inicial: 3, tamanho: 12, tipo: 'numero', descricao: 'Número do RPS relacionado', obrigatorio: true },
      { nome: 'codigo_obra', posicao_inicial: 15, tamanho: 15, tipo: 'texto', descricao: 'Código da obra', obrigatorio: true },
      { nome: 'cep_obra', posicao_inicial: 30, tamanho: 8, tipo: 'numero', descricao: 'CEP da obra', obrigatorio: true },
      { nome: 'descricao_material', posicao_inicial: 38, tamanho: 100, tipo: 'texto', descricao: 'Descrição do material', obrigatorio: true },
      { nome: 'valor_material', posicao_inicial: 138, tamanho: 15, tipo: 'valor', descricao: 'Valor do material', obrigatorio: true }
    ],
    '90': [ // Rodapé
      { nome: 'tipo_registro', posicao_inicial: 1, tamanho: 2, tipo: 'numero', descricao: 'Tipo do registro (sempre 90)', obrigatorio: true, valor_fixo: '90' },
      { nome: 'total_linhas', posicao_inicial: 3, tamanho: 8, tipo: 'numero', descricao: 'Total de linhas do arquivo', obrigatorio: true },
      { nome: 'total_rps', posicao_inicial: 11, tamanho: 8, tipo: 'numero', descricao: 'Total de RPS informados', obrigatorio: true },
      { nome: 'valor_total_servicos', posicao_inicial: 19, tamanho: 15, tipo: 'valor', descricao: 'Valor total dos serviços', obrigatorio: true },
      { nome: 'valor_total_deducoes', posicao_inicial: 34, tamanho: 15, tipo: 'valor', descricao: 'Valor total das deduções', obrigatorio: false },
      { nome: 'valor_total_iss', posicao_inicial: 49, tamanho: 15, tipo: 'valor', descricao: 'Valor total do ISS', obrigatorio: true }
    ]
  };
  
  return camposPadrao[codigoTipo] || [];
}

function renderizarTiposRegistro() {
  console.log('🎨 Renderizando tipos...');
  const container = document.getElementById('tiposRegistro');
  console.log('📦 Container encontrado:', !!container);
  
  if (!container) {
    console.error('❌ Elemento tiposRegistro não encontrado!');
    return;
  }
  
  console.log('📊 Quantidade de tipos:', tiposRegistroConfig.length);
  
  if (tiposRegistroConfig.length === 0) {
    console.log('ℹ️ Nenhum tipo para renderizar');
    container.innerHTML = `
      <div class="text-center text-muted py-3">
        <i class="fas fa-plus-circle fa-2x mb-2"></i>
        <p>Nenhum tipo de registro configurado</p>
        <small>Clique em "Adicionar Tipo" para começar</small>
      </div>
    `;
    return;
  }
  
  let html = '';
  tiposRegistroConfig.forEach((tipo, index) => {
    console.log(`🔧 Gerando HTML para tipo ${index + 1}:`, tipo.codigo_tipo, tipo.nome_tipo);
    html += gerarHTMLTipoRegistro(tipo);
  });
  
  console.log('📝 HTML gerado, tamanho:', html.length);
  container.innerHTML = html;
  console.log('✅ Tipos renderizados no DOM');
}

function gerarHTMLTipoRegistro(tipo) {
  const opcoesSelect = Object.entries(TIPOS_REGISTRO_PADRAO)
    .map(([codigo, info]) => 
      `<option value="${codigo}" ${tipo.codigo_tipo === codigo ? 'selected' : ''}>${codigo} - ${info.nome}</option>`
    ).join('');

  return `
    <div class="card mb-3 tipo-registro" data-tipo-id="${tipo.id}">
      <div class="card-header bg-light d-flex justify-content-between align-items-center">
        <div class="row flex-fill">
          <div class="col-md-3">
            <label class="form-label small">Código do Tipo *</label>
            <select class="form-control form-control-sm" onchange="atualizarTipoRegistro(${tipo.id}, 'codigo_tipo', this.value)">
              <option value="">Selecione...</option>
              ${opcoesSelect}
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small">Nome do Tipo *</label>
            <input type="text" class="form-control form-control-sm" value="${tipo.nome_tipo}" 
                   onchange="atualizarTipoRegistro(${tipo.id}, 'nome_tipo', this.value)"
                   placeholder="Nome do tipo de registro">
          </div>
          <div class="col-md-4">
            <label class="form-label small">Descrição</label>
            <input type="text" class="form-control form-control-sm" value="${tipo.descricao}" 
                   onchange="atualizarTipoRegistro(${tipo.id}, 'descricao', this.value)"
                   placeholder="Descrição do tipo">
          </div>
          <div class="col-md-1">
            <label class="form-label small">Ações</label>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerTipoRegistro(${tipo.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <small class="text-muted">Campos do Registro (posição fixa)</small>
          <div class="btn-group" role="group">
            ${tipo.codigo_tipo && obterCamposRPSPadrao(tipo.codigo_tipo).length > 0 ? 
              `<button type="button" class="btn btn-sm btn-outline-info" onclick="carregarCamposPadrao(${tipo.id}, '${tipo.codigo_tipo}')" title="Carregar campos padrão para tipo ${tipo.codigo_tipo}">
                <i class="fas fa-magic"></i> Padrão
              </button>` : ''
            }
            <button type="button" class="btn btn-sm btn-outline-success" onclick="adicionarCampoRegistro(${tipo.id})">
              <i class="fas fa-plus"></i> Campo
            </button>
          </div>
        </div>
        <div id="campos-tipo-${tipo.id}">
          ${renderizarCamposTipo(tipo)}
        </div>
      </div>
    </div>
  `;
}

function renderizarCamposTipo(tipo) {
  if (!tipo.campos || typeof tipo.campos !== 'object' || Object.keys(tipo.campos).length === 0) {
    return '<div class="text-center text-muted py-2"><small>Nenhum campo configurado</small></div>';
  }
  
  // Cabeçalho das colunas
  const cabecalho = `
    <div class="row g-2 mb-2 fw-bold text-muted small bg-light p-2 rounded">
      <div class="col-md-1 text-center">
        <i class="fas fa-sort-numeric-down me-1"></i>Ordem
      </div>
      <div class="col-md-2">Campo</div>
      <div class="col-md-1 text-center">Inicial</div>
      <div class="col-md-1 text-center">Final</div>
      <div class="col-md-1 text-center">Tamanho</div>
      <div class="col-md-1">Formato</div>
      <div class="col-md-1 text-center">Obrigatório</div>
      <div class="col-md-3">Conteúdo</div>
      <div class="col-md-1 text-center">Ações</div>
    </div>
  `;
  
  // Converter objeto de campos para array ordenado pela chave (ordem)
  const camposOrdenados = Object.entries(tipo.campos)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([ordem, campo]) => ({
      ...campo,
      id: campo.id || `${tipo.id}_${ordem}`,
      ordem: parseInt(ordem)
    }));
  
  return cabecalho + camposOrdenados.map((campo) => gerarHTMLCampoRegistro(tipo.id, campo, campo.ordem)).join('');
}

function gerarHTMLCampoRegistro(tipoId, campo, ordem) {
  const valorFixoInfo = campo.valor_fixo ? `<small class="text-success">(Fixo: ${campo.valor_fixo})</small>` : '';
  const posicaoInicial = parseInt(campo.posicao) || 1;
  const tamanho = parseInt(campo.tamanho) || 1;
  const posicaoFinal = posicaoInicial + tamanho - 1;
  const temSubcampos = campo.subcampos && campo.subcampos.length > 0;
  
  return `
    <div class="row g-2 mb-2 campo-registro border p-2 rounded align-items-center" data-campo-id="${campo.id}">
      <!-- Ordem -->
      <div class="col-md-1 text-center">
        <div class="input-group input-group-sm" style="max-width: 70px; margin: 0 auto;">
          <input type="number" class="form-control form-control-sm text-center fw-bold" value="${ordem}" 
                 onchange="atualizarOrdemCampo(${tipoId}, ${campo.id}, parseInt(this.value))"
                 placeholder="Ord" min="1" max="999" 
                 title="Número de ordem do campo - clique para editar"
                 style="border-color: #007bff; color: #007bff;">
        </div>
        ${temSubcampos ? '<i class="fas fa-sitemap text-info d-block mt-1" title="Campo com subcampos condicionais" style="font-size: 10px;"></i>' : ''}
      </div>
      
      <!-- Campo -->
      <div class="col-md-2">
        <input type="text" class="form-control form-control-sm" value="${campo.nome}" 
               onchange="atualizarCampoRegistro(${tipoId}, ${campo.id}, 'nome', this.value)"
               placeholder="Nome do campo">
        ${valorFixoInfo}
        ${temSubcampos ? '<small class="text-info">Campo condicional</small>' : ''}
      </div>
      
      <!-- Inicial -->
      <div class="col-md-1">
        <input type="number" class="form-control form-control-sm text-center" value="${posicaoInicial}" 
               onchange="atualizarCampoRegistro(${tipoId}, ${campo.id}, 'posicao', parseInt(this.value)); atualizarTamanhoAutomatico(${tipoId}, ${campo.id})"
               placeholder="Pos" min="1">
      </div>
      
      <!-- Final (calculado automaticamente) -->
      <div class="col-md-1">
        <input type="number" class="form-control form-control-sm text-center bg-light" value="${posicaoFinal}" 
               readonly title="Calculado automaticamente: Inicial + Tamanho - 1">
      </div>
      
      <!-- Tamanho -->
      <div class="col-md-1">
        <input type="number" class="form-control form-control-sm text-center" value="${tamanho}" 
               onchange="atualizarCampoRegistro(${tipoId}, ${campo.id}, 'tamanho', parseInt(this.value)); atualizarTamanhoAutomatico(${tipoId}, ${campo.id})"
               placeholder="Tam" min="1">
      </div>
      
      <!-- Formato -->
      <div class="col-md-1">
        <select class="form-control form-control-sm" onchange="atualizarCampoRegistro(${tipoId}, ${campo.id}, 'tipo', this.value)">
          <option value="texto" ${campo.tipo === 'texto' ? 'selected' : ''}>Texto</option>
          <option value="numero" ${campo.tipo === 'numero' ? 'selected' : ''}>Número</option>
          <option value="valor" ${campo.tipo === 'valor' ? 'selected' : ''}>Valor</option>
          <option value="data" ${campo.tipo === 'data' ? 'selected' : ''}>Data</option>
          <option value="cnpj" ${campo.tipo === 'cnpj' ? 'selected' : ''}>CNPJ</option>
        </select>
      </div>
      
      <!-- Obrigatório -->
      <div class="col-md-1 text-center">
        <div class="form-check form-switch">
          <input type="checkbox" class="form-check-input" ${campo.obrigatorio ? 'checked' : ''} 
                 onchange="atualizarCampoRegistro(${tipoId}, ${campo.id}, 'obrigatorio', this.checked)"
                 title="Campo obrigatório">
        </div>
      </div>
      
      <!-- Conteúdo (descrição completa) -->
      <div class="col-md-2">
        <textarea class="form-control form-control-sm" rows="2" 
                  onchange="atualizarCampoRegistro(${tipoId}, ${campo.id}, 'descricao', this.value)"
                  placeholder="Descrição completa do campo...">${campo.descricao || ''}</textarea>
      </div>
      
      <!-- Ações -->
      <div class="col-md-2 text-center">
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-outline-info" onclick="gerenciarSubcampos(${tipoId}, ${campo.id}, ${ordem})"
                  title="Gerenciar subcampos condicionais">
            <i class="fas fa-sitemap"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerCampoRegistro(${tipoId}, ${campo.id})"
                  ${campo.valor_fixo ? 'title="Campo padrão - pode ser removido se necessário"' : 'title="Remover campo"'}>
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Subcampos condicionais (se existirem) -->
    <div id="subcampos-${campo.id}" class="subcampos-container ms-4" style="display: none;">
      ${temSubcampos ? gerarHTMLSubcampos(campo.subcampos) : ''}
    </div>
  `;
}

function atualizarTipoRegistro(tipoId, campo, valor) {
  const tipo = tiposRegistroConfig.find(t => t.id === tipoId);
  if (tipo) {
    tipo[campo] = valor;
    
    // Se mudou o código do tipo, atualizar nome e descrição automaticamente
    if (campo === 'codigo_tipo' && valor !== 'custom' && TIPOS_REGISTRO_PADRAO[valor]) {
      tipo.nome_tipo = TIPOS_REGISTRO_PADRAO[valor].nome;
      tipo.descricao = TIPOS_REGISTRO_PADRAO[valor].descricao;
      
      // Adicionar automaticamente o campo de tipo de registro se não existir
      if (!tipo.campos) tipo.campos = [];
      
      const campoTipoExiste = tipo.campos.find(c => c.nome === 'tipo_registro');
      if (!campoTipoExiste) {
        const campoTipo = {
          id: Date.now(),
          nome: 'tipo_registro',
          posicao: 1,
          tamanho: 2,
          tipo: 'numero',
          descricao: `Tipo do registro (sempre ${valor})`,
          obrigatorio: true,
          valor_fixo: valor
        };
        tipo.campos.unshift(campoTipo); // Adiciona no início
      }
      
      renderizarTiposRegistro();
    }
  }
}

function removerTipoRegistro(tipoId) {
  if (confirm('Tem certeza que deseja remover este tipo de registro?')) {
    tiposRegistroConfig = tiposRegistroConfig.filter(t => t.id !== tipoId);
    renderizarTiposRegistro();
  }
}

function adicionarCampoRegistro(tipoId) {
  const tipo = tiposRegistroConfig.find(t => t.id === tipoId);
  if (tipo) {
    if (!tipo.campos) tipo.campos = {};
    
    // Calcular próxima posição baseada no último campo
    let proximaPosicao = 1;
    const camposArray = Object.values(tipo.campos);
    if (camposArray.length > 0) {
      // Ordenar campos por posição para encontrar o último
      const camposOrdenados = camposArray.sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
      const ultimoCampo = camposOrdenados[camposOrdenados.length - 1];
      proximaPosicao = (parseInt(ultimoCampo.posicao) || 1) + (parseInt(ultimoCampo.tamanho) || 1);
    }
    
    // Encontrar próximo número de ordem
    const proximaOrdem = Object.keys(tipo.campos).length + 1;
    
    const novoCampo = {
      id: Date.now(),
      nome: '',
      posicao: proximaPosicao,
      tamanho: 10, // Tamanho padrão
      tipo: 'texto',
      descricao: '',
      obrigatorio: false
    };
    
    tipo.campos[proximaOrdem.toString()] = novoCampo;
    renderizarTiposRegistro();
    
    // Foco no campo nome do novo campo adicionado
    setTimeout(() => {
      const novoInput = document.querySelector(`[data-campo-id="${novoCampo.id}"] input[placeholder="Nome do campo"]`);
      if (novoInput) novoInput.focus();
    }, 100);
  }
}

function atualizarCampoRegistro(tipoId, campoId, propriedade, valor) {
  const tipo = tiposRegistroConfig.find(t => t.id === tipoId);
  if (tipo && tipo.campos) {
    // Encontrar o campo na estrutura de objeto (chave = ordem)
    for (const [ordem, campo] of Object.entries(tipo.campos)) {
      if (campo.id === campoId) {
        campo[propriedade] = valor;
        // Re-renderizar para atualizar cálculos automáticos
        renderizarTiposRegistro();
        break;
      }
    }
  }
}

function atualizarOrdemCampo(tipoId, campoId, novaOrdem) {
  const tipo = tiposRegistroConfig.find(t => t.id === tipoId);
  if (!tipo || !tipo.campos) {
    return;
  }

  // Encontrar o campo atual
  let campoAtual = null;
  let chaveAtual = null;
  
  for (const [chave, campo] of Object.entries(tipo.campos)) {
    if (campo.id === campoId) {
      campoAtual = campo;
      chaveAtual = chave;
      break;
    }
  }

  if (!campoAtual || !chaveAtual) {
    return;
  }

  // Verificar se a nova ordem já existe
  if (tipo.campos[novaOrdem.toString()]) {
    // Se a ordem já existe, trocar as posições
    const campoExistente = tipo.campos[novaOrdem.toString()];
    
    // Remover ambos os campos
    delete tipo.campos[chaveAtual];
    delete tipo.campos[novaOrdem.toString()];
    
    // Recolocar com ordens trocadas
    tipo.campos[novaOrdem.toString()] = campoAtual;
    tipo.campos[chaveAtual] = campoExistente;
    
    mostrarNotificacao(`Campos trocaram de posição: ordem ${chaveAtual} ↔ ordem ${novaOrdem}`, 'info');
  } else {
    // Se a ordem não existe, apenas mover o campo
    delete tipo.campos[chaveAtual];
    tipo.campos[novaOrdem.toString()] = campoAtual;
    
    mostrarNotificacao(`Campo movido para ordem ${novaOrdem}`, 'sucesso');
  }

  // Re-renderizar para mostrar as mudanças
  renderizarTiposRegistro();
}

function atualizarTamanhoAutomatico(tipoId, campoId) {
  // Esta função é chamada quando posição inicial ou tamanho mudam
  // para recalcular automaticamente a posição final
  setTimeout(() => {
    renderizarTiposRegistro();
  }, 100);
}

function removerCampoRegistro(tipoId, campoId) {
  const tipo = tiposRegistroConfig.find(t => t.id === tipoId);
  if (tipo && tipo.campos) {
    // Encontrar a chave do campo a ser removido
    const chaveParaRemover = Object.keys(tipo.campos).find(chave => 
      tipo.campos[chave].id === campoId
    );
    
    if (chaveParaRemover) {
      delete tipo.campos[chaveParaRemover];
      renderizarTiposRegistro();
    }
  }
}

async function salvarLayout() {
  try {
    const layoutId = document.getElementById('layoutId').value.trim();
    const layoutNome = document.getElementById('layoutNome').value.trim();
    const layoutVersao = document.getElementById('layoutVersao').value.trim();
    const layoutStatus = document.getElementById('layoutStatus').value;
    const layoutDescricao = document.getElementById('layoutDescricao').value.trim();
    
    if (!layoutId || !layoutNome) {
      mostrarNotificacao('Por favor, preencha todos os campos obrigatórios', 'aviso');
      return;
    }
    
    if (tiposRegistroConfig.length === 0) {
      mostrarNotificacao('Adicione pelo menos um tipo de registro', 'aviso');
      return;
    }
    
    // Validar se todos os tipos têm código e nome
    for (const tipo of tiposRegistroConfig) {
      if (!tipo.codigo_tipo || !tipo.nome_tipo) {
        mostrarNotificacao('Todos os tipos de registro devem ter código e nome', 'aviso');
        return;
      }
    }
    
    const layout = {
      layout_id: layoutId,
      nome: layoutNome,
      versao: layoutVersao,
      status: layoutStatus,
      descricao: layoutDescricao,
      tipos_registro: tiposRegistroConfig
    };
    
    const isEdicao = layoutAtual !== null;
    const url = isEdicao ? `/api/layouts/${layoutAtual.id}` : '/api/layouts';
    const method = isEdicao ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout)
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.erro || 'Erro ao salvar layout');
    }
    
    mostrarNotificacao(
      isEdicao ? 'Layout atualizado com sucesso!' : 'Layout criado com sucesso!', 
      'sucesso'
    );
    
    ocultarFormularioLayout();
    atualizarListaLayouts();
    
  } catch (error) {
    console.error('Erro ao salvar layout:', error);
    mostrarNotificacao('Erro ao salvar layout: ' + error.message, 'erro');
  }
}

function previewLayoutJSON() {
  const preview = {
    layout_id: document.getElementById('layoutId').value,
    nome: document.getElementById('layoutNome').value,
    versao: document.getElementById('layoutVersao').value,
    status: document.getElementById('layoutStatus').value,
    descricao: document.getElementById('layoutDescricao').value,
    tipos_registro: tiposRegistroConfig
  };
  
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Preview JSON do Layout</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <pre class="bg-light p-3" style="max-height: 500px; overflow-y: auto;">${JSON.stringify(preview, null, 2)}</pre>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  
  modal.addEventListener('hidden.bs.modal', () => {
    document.body.removeChild(modal);
  });
}

// ==================== FUNÇÕES ANTIGAS (MANTER POR COMPATIBILIDADE) ====================

function abrirModalNovoLayout(layoutParaEdicao = null) {
  // Remove qualquer modal existente primeiro
  const modalExistente = document.getElementById('modalNovoLayout');
  if (modalExistente) {
    modalExistente.remove();
  }

  const isEdicao = layoutParaEdicao !== null;
  const titulo = isEdicao ? 'Editar Layout' : 'Criar Novo Layout';
  const botaoSalvar = isEdicao ? 'Salvar Alterações' : 'Criar Layout';

  // Criar HTML do modal de forma mais simples
  const modalHTML = `
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="fas fa-${isEdicao ? 'edit' : 'plus-circle'} me-2"></i>${titulo}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="formNovoLayout">
            <div class="card mb-3">
              <div class="card-header">
                <h6 class="mb-0">Informações Básicas</h6>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-6 col-12">
                    <label class="form-label">ID do Layout *</label>
                    <input type="text" id="layoutId" class="form-control" 
                           placeholder="ex: servicos_empresa_01" required 
                           ${isEdicao ? 'readonly' : ''}>
                  </div>
                  <div class="col-md-6 col-12">
                    <label class="form-label">Nome do Layout *</label>
                    <input type="text" id="layoutNome" class="form-control" 
                           placeholder="ex: Layout Serviços Empresa" required>
                  </div>
                  <div class="col-md-4 col-12">
                    <label class="form-label">Tipo</label>
                    <select id="layoutTipo" class="form-control">
                      <option value="servicos">Serviços</option>
                      <option value="consultoria">Consultoria</option>
                      <option value="comercio">Comércio</option>
                      <option value="industria">Indústria</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div class="col-md-4 col-12">
                    <label class="form-label">Versão</label>
                    <input type="text" id="layoutVersao" class="form-control" value="1.0">
                  </div>
                  <div class="col-md-4 col-12">
                    <label class="form-label">Status</label>
                    <select id="layoutStatus" class="form-control">
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label class="form-label">Descrição</label>
                    <textarea id="layoutDescricao" class="form-control" rows="2"></textarea>
                  </div>
                </div>
              </div>
            </div>
            
            ${!isEdicao ? `
            <div class="card mb-3">
              <div class="card-header">
                <h6 class="mb-0">Templates Rápidos</h6>
              </div>
              <div class="card-body">
                <div class="row g-2">
                  <div class="col-lg-3 col-md-6 col-12">
                    <button type="button" class="btn btn-outline-primary w-100" onclick="carregarTemplate('basico')">
                      Template Básico
                    </button>
                  </div>
                  <div class="col-lg-3 col-md-6 col-12">
                    <button type="button" class="btn btn-outline-success w-100" onclick="carregarTemplate('completo')">
                      Template Completo
                    </button>
                  </div>
                  <div class="col-lg-3 col-md-6 col-12">
                    <button type="button" class="btn btn-outline-info w-100" onclick="carregarTemplate('consultoria')">
                      Template Consultoria
                    </button>
                  </div>
                  <div class="col-lg-3 col-md-6 col-12">
                    <button type="button" class="btn btn-outline-warning w-100" onclick="carregarTemplate('servicos')">
                      Template Serviços
                    </button>
                  </div>
                </div>
              </div>
            </div>
            ` : ''}

            <div class="card mb-3">
              <div class="card-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <h6 class="mb-2 mb-md-0">Estrutura do Layout</h6>
                <div class="d-flex flex-column flex-md-row gap-2">
                  <button type="button" class="btn btn-sm btn-outline-secondary" onclick="previewEstrutura()">
                    <i class="fas fa-eye"></i> Preview JSON
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-info" onclick="validarEstrutura()">
                    <i class="fas fa-check"></i> Validar
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div id="construtorEstrutura">
                  <div class="estrutura-secao mb-3" data-secao="cabecalho">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2">
                      <h6 class="text-primary mb-2 mb-md-0">
                        <i class="fas fa-header me-2"></i>Cabeçalho
                      </h6>
                      <button type="button" class="btn btn-sm btn-outline-success" onclick="adicionarCampo('cabecalho')">
                        <i class="fas fa-plus"></i> Campo
                      </button>
                    </div>
                    <div id="campos-cabecalho"></div>
                  </div>
                  
                  <div class="estrutura-secao mb-3" data-secao="detalhe">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2">
                      <h6 class="text-success mb-2 mb-md-0">
                        <i class="fas fa-list me-2"></i>Detalhe
                      </h6>
                      <button type="button" class="btn btn-sm btn-outline-success" onclick="adicionarCampo('detalhe')">
                        <i class="fas fa-plus"></i> Campo
                      </button>
                    </div>
                    <div id="campos-detalhe"></div>
                  </div>
                  
                  <div class="estrutura-secao mb-3" data-secao="rodape">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2">
                      <h6 class="text-warning mb-2 mb-md-0">
                        <i class="fas fa-grip-lines me-2"></i>Rodapé
                      </h6>
                      <button type="button" class="btn btn-sm btn-outline-success" onclick="adicionarCampo('rodape')">
                        <i class="fas fa-plus"></i> Campo
                      </button>
                    </div>
                    <div id="campos-rodape"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card" id="previewCard" style="display: none;">
              <div class="card-header">
                <h6 class="mb-0">Preview da Estrutura JSON</h6>
              </div>
              <div class="card-body">
                <pre id="previewJSON" class="bg-light p-3" style="max-height: 300px; overflow-y: auto; font-size: 0.8rem;"></pre>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer d-flex flex-column flex-md-row justify-content-between">
          <div class="mb-2 mb-md-0">
            ${isEdicao ? `
              <button type="button" class="btn btn-outline-danger" onclick="confirmarExclusaoLayout('${layoutParaEdicao?.id || layoutParaEdicao?.layout_id}')">
                <i class="fas fa-trash"></i> Excluir Layout
              </button>
            ` : ''}
          </div>
          <div class="d-flex flex-column flex-md-row gap-2">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-outline-info" onclick="previewEstrutura()">Preview</button>
            <button type="button" class="btn btn-primary" onclick="${isEdicao ? 'salvarEdicaoLayout' : 'salvarNovoLayoutFromGrid'}()">
              <i class="fas fa-save me-2"></i>${botaoSalvar}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'modalNovoLayout';
  modal.setAttribute('tabindex', '-1');
  modal.innerHTML = modalHTML;
  
  document.body.appendChild(modal);
  
  // Inicializar modal após pequeno delay
  setTimeout(() => {
    try {
      const bsModal = new bootstrap.Modal(modal, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
      
      bsModal.show();
      
      // Se está editando, carregar dados do layout
      if (isEdicao && layoutParaEdicao) {
        carregarDadosParaEdicao(layoutParaEdicao);
      } else {
        // Carregar template básico por padrão apenas na criação
        setTimeout(() => {
          carregarTemplate('basico');
        }, 300);
      }
      
      modal.addEventListener('hidden.bs.modal', () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      });
    } catch (error) {
      console.error('Erro ao abrir modal:', error);
      mostrarNotificacao('Erro ao abrir modal de layout', 'erro');
    }
  }, 100);
}

function gerarCampoHTML(secao, nome, config) {
  const id = `${secao}_${nome}_${Date.now()}`;
  return `
    <div class="row g-2 mb-2 campo-row p-2 border rounded campo-grid" data-campo="${nome}">
      <div class="col-12 col-md-3">
        <label class="form-label small">Nome do Campo</label>
        <input type="text" class="form-control form-control-sm" value="${nome}" placeholder="Nome do campo">
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label small">Posição</label>
        <input type="number" class="form-control form-control-sm" value="${config.posicao}" placeholder="0" min="0">
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label small">Tamanho</label>
        <input type="number" class="form-control form-control-sm" value="${config.tamanho}" placeholder="10" min="1">
      </div>
      <div class="col-12 col-md-3">
        <label class="form-label small">Descrição</label>
        <input type="text" class="form-control form-control-sm" value="${config.descricao || ''}" placeholder="Descrição">
      </div>
      <div class="col-8 col-md-1">
        <label class="form-label small">Tipo</label>
        <select class="form-control form-control-sm">
          <option value="texto" ${config.tipo === 'texto' ? 'selected' : ''}>Texto</option>
          <option value="numero" ${config.tipo === 'numero' ? 'selected' : ''}>Número</option>
          <option value="valor" ${config.tipo === 'valor' ? 'selected' : ''}>Valor</option>
          <option value="data" ${config.tipo === 'data' ? 'selected' : ''}>Data</option>
          <option value="cnpj" ${config.tipo === 'cnpj' ? 'selected' : ''}>CNPJ</option>
        </select>
      </div>
      <div class="col-4 col-md-1">
        <label class="form-label small">Ações</label>
        <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removerCampo(this)">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function carregarDadosParaEdicao(layout) {
  // Preencher campos básicos
  document.getElementById('layoutId').value = layout.layout_id || layout.id;
  document.getElementById('layoutNome').value = layout.nome;
  document.getElementById('layoutTipo').value = layout.tipo;
  document.getElementById('layoutVersao').value = layout.versao || '1.0';
  document.getElementById('layoutDescricao').value = layout.descricao || '';
  
  // Status se existir
  const statusSelect = document.getElementById('layoutStatus');
  if (statusSelect) {
    statusSelect.value = layout.status || 'ativo';
  }

  // Carregar estrutura existente
  const estrutura = layout.estrutura_completa || layout.estrutura;
  if (estrutura) {
    carregarEstruturaNoEditor(estrutura);
  }
}

function carregarEstruturaNoEditor(estrutura) {
  // Limpar campos existentes
  document.getElementById('campos-cabecalho').innerHTML = '';
  document.getElementById('campos-detalhe').innerHTML = '';
  document.getElementById('campos-rodape').innerHTML = '';

  // Carregar cabeçalho
  if (estrutura.cabecalho && estrutura.cabecalho.campos) {
    Object.entries(estrutura.cabecalho.campos).forEach(([nome, config]) => {
      const html = gerarCampoHTML('cabecalho', nome, config);
      document.getElementById('campos-cabecalho').insertAdjacentHTML('beforeend', html);
    });
  }

  // Carregar detalhe
  if (estrutura.detalhe && estrutura.detalhe.campos) {
    Object.entries(estrutura.detalhe.campos).forEach(([nome, config]) => {
      const html = gerarCampoHTML('detalhe', nome, config);
      document.getElementById('campos-detalhe').insertAdjacentHTML('beforeend', html);
    });
  }

  // Carregar rodapé
  if (estrutura.rodape && estrutura.rodape.campos) {
    Object.entries(estrutura.rodape.campos).forEach(([nome, config]) => {
      const html = gerarCampoHTML('rodape', nome, config);
      document.getElementById('campos-rodape').insertAdjacentHTML('beforeend', html);
    });
  }
}

async function salvarEdicaoLayout() {
  try {
    const layoutId = document.getElementById('layoutId').value.trim();
    const layoutNome = document.getElementById('layoutNome').value.trim();
    const layoutTipo = document.getElementById('layoutTipo').value;
    const layoutVersao = document.getElementById('layoutVersao').value.trim();
    const layoutDescricao = document.getElementById('layoutDescricao').value.trim();
    
    const statusSelect = document.getElementById('layoutStatus');
    const layoutStatus = statusSelect ? statusSelect.value : 'ativo';
    
    if (!layoutId || !layoutNome) {
      mostrarNotificacao('Por favor, preencha todos os campos obrigatórios', 'aviso');
      return;
    }
    
    const estrutura = construirEstruturaFromGrid();
    
    const layoutAtualizado = {
      id: layoutId,
      nome: layoutNome,
      tipo: layoutTipo,
      versao: layoutVersao,
      descricao: layoutDescricao,
      status: layoutStatus,
      estrutura: estrutura,
      formatacao: {
        data: 'YYYYMMDD',
        decimal: 'centavos',
        encoding: 'utf-8'
      }
    };
    
    const response = await fetch(`/api/layouts/${layoutId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layoutAtualizado)
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.erro || 'Erro ao atualizar layout');
    }
    
    mostrarNotificacao('Layout atualizado com sucesso!', 'sucesso');
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoLayout'));
    modal.hide();
    
    // Atualizar lista
    atualizarListaLayouts();
    
  } catch (error) {
    console.error('Erro ao atualizar layout:', error);
    mostrarNotificacao('Erro ao atualizar layout: ' + error.message, 'erro');
  }
}

async function confirmarExclusaoLayout(layoutId) {
  if (confirm('Tem certeza que deseja excluir este layout? Esta ação não pode ser desfeita.')) {
    await excluirLayout(layoutId);
  }
}

async function excluirLayout(layoutId) {
  try {
    const response = await fetch(`/api/layouts/${layoutId}`, {
      method: 'DELETE'
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.erro || 'Erro ao excluir layout');
    }
    
    mostrarNotificacao('Layout excluído com sucesso!', 'sucesso');
    
    // Fechar modal se estiver aberto
    const modalElement = document.getElementById('modalNovoLayout');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
    
    // Atualizar lista
    atualizarListaLayouts();
    
  } catch (error) {
    console.error('Erro ao excluir layout:', error);
    mostrarNotificacao('Erro ao excluir layout: ' + error.message, 'erro');
  }
}

function validarEstrutura() {
  try {
    const estrutura = construirEstruturaFromGrid();
    
    const temCamposCabecalho = Object.keys(estrutura.cabecalho.campos).length > 0;
    const temCamposDetalhe = Object.keys(estrutura.detalhe.campos).length > 0;
    const temCamposRodape = Object.keys(estrutura.rodape.campos).length > 0;
    
    if (!temCamposCabecalho && !temCamposDetalhe && !temCamposRodape) {
      mostrarNotificacao('A estrutura deve ter pelo menos um campo', 'aviso');
      return false;
    }
    
    // Validar se não há sobreposição de posições
    const validacoes = [];
    
    ['cabecalho', 'detalhe', 'rodape'].forEach(secao => {
      const campos = estrutura[secao]?.campos || {};
      const posicoes = [];
      
      Object.entries(campos).forEach(([nome, config]) => {
        const inicio = config.posicao;
        const fim = config.posicao + config.tamanho - 1;
        
        posicoes.forEach(pos => {
          if ((inicio >= pos.inicio && inicio <= pos.fim) || 
              (fim >= pos.inicio && fim <= pos.fim)) {
            validacoes.push(`Conflito de posição na seção ${secao}: ${nome} e ${pos.nome}`);
          }
        });
        
        posicoes.push({ nome, inicio, fim });
      });
    });
    
    if (validacoes.length > 0) {
      mostrarNotificacao('Problemas encontrados: ' + validacoes.join(', '), 'aviso');
      return false;
    }
    
    mostrarNotificacao('Estrutura válida!', 'sucesso');
    return true;
  } catch (error) {
    mostrarNotificacao('Erro na validação: ' + error.message, 'erro');
    return false;
  }
}

function carregarTemplate(tipo) {
  const templates = {
    basico: {
      cabecalho: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'cnpj', posicao: 1, tamanho: 14, descricao: 'CNPJ da empresa', tipo: 'cnpj' },
        { nome: 'razaoSocial', posicao: 15, tamanho: 60, descricao: 'Razão social', tipo: 'texto' }
      ],
      detalhe: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'numeroRps', posicao: 1, tamanho: 10, descricao: 'Número do RPS', tipo: 'numero' },
        { nome: 'valorServicos', posicao: 11, tamanho: 15, descricao: 'Valor dos serviços', tipo: 'valor' },
        { nome: 'discriminacao', posicao: 26, tamanho: 200, descricao: 'Discriminação dos serviços', tipo: 'texto' }
      ],
      rodape: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'totalRps', posicao: 1, tamanho: 10, descricao: 'Total de RPS', tipo: 'numero' },
        { nome: 'valorTotal', posicao: 11, tamanho: 15, descricao: 'Valor total', tipo: 'valor' }
      ]
    },
    completo: {
      cabecalho: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'cnpj', posicao: 1, tamanho: 14, descricao: 'CNPJ da empresa', tipo: 'cnpj' },
        { nome: 'inscricaoMunicipal', posicao: 15, tamanho: 20, descricao: 'Inscrição municipal', tipo: 'texto' },
        { nome: 'razaoSocial', posicao: 35, tamanho: 60, descricao: 'Razão social', tipo: 'texto' },
        { nome: 'dataInicio', posicao: 95, tamanho: 8, descricao: 'Data início período', tipo: 'data' },
        { nome: 'dataFim', posicao: 103, tamanho: 8, descricao: 'Data fim período', tipo: 'data' }
      ],
      detalhe: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'numeroRps', posicao: 1, tamanho: 10, descricao: 'Número do RPS', tipo: 'numero' },
        { nome: 'serieRps', posicao: 11, tamanho: 5, descricao: 'Série do RPS', tipo: 'texto' },
        { nome: 'tipoRps', posicao: 16, tamanho: 1, descricao: 'Tipo do RPS', tipo: 'texto' },
        { nome: 'dataEmissao', posicao: 17, tamanho: 8, descricao: 'Data de emissão', tipo: 'data' },
        { nome: 'dataCompetencia', posicao: 25, tamanho: 8, descricao: 'Data de competência', tipo: 'data' },
        { nome: 'valorServicos', posicao: 33, tamanho: 15, descricao: 'Valor dos serviços', tipo: 'valor' },
        { nome: 'valorIss', posicao: 48, tamanho: 15, descricao: 'Valor do ISS', tipo: 'valor' },
        { nome: 'baseCalculo', posicao: 63, tamanho: 15, descricao: 'Base de cálculo', tipo: 'valor' },
        { nome: 'aliquota', posicao: 78, tamanho: 6, descricao: 'Alíquota', tipo: 'numero' },
        { nome: 'discriminacao', posicao: 84, tamanho: 200, descricao: 'Discriminação dos serviços', tipo: 'texto' }
      ],
      rodape: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'totalRps', posicao: 1, tamanho: 10, descricao: 'Total de RPS', tipo: 'numero' },
        { nome: 'valorTotalServicos', posicao: 11, tamanho: 15, descricao: 'Valor total dos serviços', tipo: 'valor' },
        { nome: 'valorTotalIss', posicao: 26, tamanho: 15, descricao: 'Valor total do ISS', tipo: 'valor' }
      ]
    },
    consultoria: {
      cabecalho: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'cnpj', posicao: 1, tamanho: 14, descricao: 'CNPJ da empresa', tipo: 'cnpj' },
        { nome: 'inscricaoMunicipal', posicao: 15, tamanho: 15, descricao: 'Inscrição municipal', tipo: 'texto' },
        { nome: 'razaoSocial', posicao: 30, tamanho: 50, descricao: 'Razão social', tipo: 'texto' },
        { nome: 'dataInicio', posicao: 80, tamanho: 8, descricao: 'Data início período', tipo: 'data' },
        { nome: 'dataFim', posicao: 88, tamanho: 8, descricao: 'Data fim período', tipo: 'data' }
      ],
      detalhe: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'numeroRps', posicao: 1, tamanho: 8, descricao: 'Número do RPS', tipo: 'numero' },
        { nome: 'serieRps', posicao: 9, tamanho: 3, descricao: 'Série do RPS', tipo: 'texto' },
        { nome: 'dataEmissao', posicao: 12, tamanho: 8, descricao: 'Data de emissão', tipo: 'data' },
        { nome: 'valorServicos', posicao: 20, tamanho: 12, descricao: 'Valor dos serviços', tipo: 'valor' },
        { nome: 'valorIss', posicao: 32, tamanho: 12, descricao: 'Valor do ISS', tipo: 'valor' },
        { nome: 'discriminacao', posicao: 44, tamanho: 150, descricao: 'Descrição da consultoria', tipo: 'texto' }
      ],
      rodape: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'totalRps', posicao: 1, tamanho: 8, descricao: 'Total de RPS', tipo: 'numero' },
        { nome: 'valorTotalServicos', posicao: 9, tamanho: 12, descricao: 'Valor total dos serviços', tipo: 'valor' },
        { nome: 'valorTotalIss', posicao: 21, tamanho: 12, descricao: 'Valor total do ISS', tipo: 'valor' }
      ]
    },
    servicos: {
      cabecalho: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'cnpj', posicao: 1, tamanho: 14, descricao: 'CNPJ da empresa', tipo: 'cnpj' },
        { nome: 'inscricaoMunicipal', posicao: 15, tamanho: 20, descricao: 'Inscrição municipal', tipo: 'texto' },
        { nome: 'razaoSocial', posicao: 35, tamanho: 60, descricao: 'Razão social', tipo: 'texto' }
      ],
      detalhe: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'numeroRps', posicao: 1, tamanho: 10, descricao: 'Número do RPS', tipo: 'numero' },
        { nome: 'dataEmissao', posicao: 11, tamanho: 8, descricao: 'Data de emissão', tipo: 'data' },
        { nome: 'valorServicos', posicao: 19, tamanho: 15, descricao: 'Valor dos serviços', tipo: 'valor' },
        { nome: 'valorIss', posicao: 34, tamanho: 15, descricao: 'Valor do ISS', tipo: 'valor' },
        { nome: 'codigoServico', posicao: 49, tamanho: 10, descricao: 'Código do serviço', tipo: 'texto' },
        { nome: 'discriminacao', posicao: 59, tamanho: 180, descricao: 'Discriminação dos serviços', tipo: 'texto' }
      ],
      rodape: [
        { nome: 'tipoRegistro', posicao: 0, tamanho: 1, descricao: 'Tipo do registro', tipo: 'texto' },
        { nome: 'totalRps', posicao: 1, tamanho: 10, descricao: 'Total de RPS', tipo: 'numero' },
        { nome: 'valorTotalServicos', posicao: 11, tamanho: 15, descricao: 'Valor total dos serviços', tipo: 'valor' },
        { nome: 'valorTotalIss', posicao: 26, tamanho: 15, descricao: 'Valor total do ISS', tipo: 'valor' }
      ]
    }
  };

  const template = templates[tipo];
  if (!template) {
    mostrarNotificacao('Template não encontrado', 'erro');
    return;
  }

  // Limpar campos existentes
  document.getElementById('campos-cabecalho').innerHTML = '';
  document.getElementById('campos-detalhe').innerHTML = '';
  document.getElementById('campos-rodape').innerHTML = '';

  // Aplicar template no cabeçalho
  template.cabecalho.forEach(campo => {
    const html = gerarCampoHTML('cabecalho', campo.nome, campo);
    document.getElementById('campos-cabecalho').insertAdjacentHTML('beforeend', html);
  });

  // Aplicar template no detalhe
  template.detalhe.forEach(campo => {
    const html = gerarCampoHTML('detalhe', campo.nome, campo);
    document.getElementById('campos-detalhe').insertAdjacentHTML('beforeend', html);
  });

  // Aplicar template no rodapé
  template.rodape.forEach(campo => {
    const html = gerarCampoHTML('rodape', campo.nome, campo);
    document.getElementById('campos-rodape').insertAdjacentHTML('beforeend', html);
  });

  // Definir valores padrão baseados no template
  if (tipo === 'consultoria') {
    document.getElementById('layoutTipo').value = 'consultoria';
    document.getElementById('layoutNome').value = 'Layout Consultoria';
    document.getElementById('layoutDescricao').value = 'Layout para empresas de consultoria';
  } else if (tipo === 'servicos') {
    document.getElementById('layoutTipo').value = 'servicos';
    document.getElementById('layoutNome').value = 'Layout Serviços';
    document.getElementById('layoutDescricao').value = 'Layout para empresas de serviços';
  } else if (tipo === 'completo') {
    document.getElementById('layoutTipo').value = 'servicos';
    document.getElementById('layoutNome').value = 'Layout Completo';
    document.getElementById('layoutDescricao').value = 'Layout completo com todos os campos padrão';
  } else if (tipo === 'basico') {
    document.getElementById('layoutTipo').value = 'servicos';
    document.getElementById('layoutNome').value = 'Layout Básico';
    document.getElementById('layoutDescricao').value = 'Layout básico com campos essenciais';
  }

  mostrarNotificacao(`Template "${tipo}" carregado com sucesso!`, 'sucesso');
}

function adicionarCampo(secao) {
  const container = document.getElementById(`campos-${secao}`);
  const novoCampo = gerarCampoHTML(secao, 'novoCampo', { 
    posicao: 0, 
    tamanho: 10, 
    descricao: '', 
    tipo: 'texto' 
  });
  container.insertAdjacentHTML('beforeend', novoCampo);
}

function removerCampo(button) {
  const row = button.closest('.campo-row');
  row.remove();
}

function previewEstrutura() {
  const estrutura = construirEstruturaFromGrid();
  const previewCard = document.getElementById('previewCard');
  const previewJSON = document.getElementById('previewJSON');
  
  previewJSON.textContent = JSON.stringify(estrutura, null, 2);
  previewCard.style.display = previewCard.style.display === 'none' ? 'block' : 'none';
}

function construirEstruturaFromGrid() {
  const estrutura = {};
  
  // Construir cabeçalho
  estrutura.cabecalho = {
    linha: 0,
    campos: {}
  };
  
  const camposCabecalho = document.querySelectorAll('#campos-cabecalho .campo-row');
  camposCabecalho.forEach(row => {
    const inputs = row.querySelectorAll('input, select');
    const nome = inputs[0].value.trim();
    const posicao = parseInt(inputs[1].value) || 0;
    const tamanho = parseInt(inputs[2].value) || 1;
    const descricao = inputs[3].value.trim();
    const tipo = inputs[4].value;
    
    if (nome) {
      estrutura.cabecalho.campos[nome] = { 
        posicao, 
        tamanho,
        descricao,
        tipo
      };
    }
  });
  
  // Construir detalhe
  const identificadorDetalhe = document.getElementById('identificadorDetalhe').value || '2';
  estrutura.detalhe = {
    identificador: identificadorDetalhe,
    campos: {}
  };
  
  const camposDetalhe = document.querySelectorAll('#campos-detalhe .campo-row');
  camposDetalhe.forEach(row => {
    const inputs = row.querySelectorAll('input, select');
    const nome = inputs[0].value.trim();
    const posicao = parseInt(inputs[1].value) || 0;
    const tamanho = parseInt(inputs[2].value) || 1;
    const descricao = inputs[3].value.trim();
    const tipo = inputs[4].value;
    
    if (nome) {
      estrutura.detalhe.campos[nome] = { 
        posicao, 
        tamanho,
        descricao,
        tipo
      };
    }
  });
  
  // Construir rodapé
  const identificadorRodape = document.getElementById('identificadorRodape').value || '9';
  estrutura.rodape = {
    identificador: identificadorRodape,
    campos: {}
  };
  
  const camposRodape = document.querySelectorAll('#campos-rodape .campo-row');
  camposRodape.forEach(row => {
    const inputs = row.querySelectorAll('input, select');
    const nome = inputs[0].value.trim();
    const posicao = parseInt(inputs[1].value) || 0;
    const tamanho = parseInt(inputs[2].value) || 1;
    const descricao = inputs[3].value.trim();
    const tipo = inputs[4].value;
    
    if (nome) {
      estrutura.rodape.campos[nome] = { 
        posicao, 
        tamanho,
        descricao,
        tipo
      };
    }
  });
  
  return estrutura;
}

async function salvarNovoLayoutFromGrid() {
  try {
    const layoutId = document.getElementById('layoutId').value.trim();
    const layoutNome = document.getElementById('layoutNome').value.trim();
    const layoutTipo = document.getElementById('layoutTipo').value;
    const layoutVersao = document.getElementById('layoutVersao').value.trim();
    const layoutDescricao = document.getElementById('layoutDescricao').value.trim();
    const layoutEncoding = document.getElementById('layoutEncoding').value;
    const formatoData = document.getElementById('formatoData').value;
    const formatoDecimal = document.getElementById('formatoDecimal').value;
    const separadorCampo = document.getElementById('separadorCampo').value;
    
    if (!layoutId || !layoutNome) {
      mostrarNotificacao('Por favor, preencha todos os campos obrigatórios', 'aviso');
      return;
    }
    
    // Validar ID do layout (sem espaços e caracteres especiais)
    if (!/^[a-zA-Z0-9_]+$/.test(layoutId)) {
      mostrarNotificacao('ID do layout deve conter apenas letras, números e underscore', 'aviso');
      return;
    }
    
    const estrutura = construirEstruturaFromGrid();
    
    // Validar se há campos em cada seção
    const temCamposCabecalho = Object.keys(estrutura.cabecalho.campos).length > 0;
    const temCamposDetalhe = Object.keys(estrutura.detalhe.campos).length > 0;
    const temCamposRodape = Object.keys(estrutura.rodape.campos).length > 0;
    
    if (!temCamposCabecalho && !temCamposDetalhe && !temCamposRodape) {
      mostrarNotificacao('O layout deve ter pelo menos um campo em alguma seção', 'aviso');
      return;
    }
    
    const novoLayout = {
      id: layoutId,
      nome: layoutNome,
      tipo: layoutTipo,
      versao: layoutVersao,
      descricao: layoutDescricao,
      estrutura: estrutura,
      formatacao: {
        data: formatoData,
        decimal: formatoDecimal,
        encoding: layoutEncoding,
        separador: separadorCampo
      }
    };
    
    const response = await fetch('/api/layouts/dinamico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoLayout)
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.erro || 'Erro ao criar layout');
    }
    
    mostrarNotificacao('Layout criado com sucesso!', 'sucesso');
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoLayout'));
    modal.hide();
    
    // Atualizar lista
    atualizarListaLayouts();
    
  } catch (error) {
    console.error('Erro ao salvar layout:', error);
    mostrarNotificacao('Erro ao salvar layout: ' + error.message, 'erro');
  }
}

async function salvarNovoLayout() {
  try {
    const layoutId = document.getElementById('layoutId').value.trim();
    const layoutNome = document.getElementById('layoutNome').value.trim();
    const layoutTipo = document.getElementById('layoutTipo').value;
    const layoutVersao = document.getElementById('layoutVersao').value.trim();
    const layoutDescricao = document.getElementById('layoutDescricao').value.trim();
    const layoutEstrutura = document.getElementById('layoutEstrutura').value.trim();
    
    if (!layoutId || !layoutNome || !layoutEstrutura) {
      mostrarNotificacao('Por favor, preencha todos os campos obrigatórios', 'aviso');
      return;
    }
    
    let estrutura;
    try {
      estrutura = JSON.parse(layoutEstrutura);
    } catch (error) {
      mostrarNotificacao('Estrutura JSON inválida: ' + error.message, 'erro');
      return;
    }
    
    const novoLayout = {
      id: layoutId,
      nome: layoutNome,
      tipo: layoutTipo,
      versao: layoutVersao,
      descricao: layoutDescricao,
      estrutura: estrutura,
      formatacao: {
        data: 'YYYYMMDD',
        decimal: 'centavos',
        encoding: 'utf-8'
      }
    };
    
    const response = await fetch('/api/layouts/dinamico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoLayout)
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.erro || 'Erro ao criar layout');
    }
    
    mostrarNotificacao('Layout criado com sucesso!', 'sucesso');
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoLayout'));
    modal.hide();
    
    // Atualizar lista
    atualizarListaLayouts();
    
  } catch (error) {
    console.error('Erro ao salvar layout:', error);
    mostrarNotificacao('Erro ao salvar layout: ' + error.message, 'erro');
  }
}

async function atualizarListaLayouts() {
  try {
    const response = await fetch('/api/layouts');
    if (!response.ok) throw new Error('Erro ao carregar layouts');
    
    const layouts = await response.json();
    const container = document.getElementById('layoutsContainer');
    
    if (!container) return;
    
    if (layouts.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center">
          <i class="fas fa-table fa-3x text-muted mb-3"></i>
          <h5>Nenhum Layout Encontrado</h5>
          <p class="text-muted">Crie seu primeiro layout baseado em tipos de registro.</p>
          <button class="btn btn-primary" onclick="mostrarFormularioLayout()">
            <i class="fas fa-plus"></i> Criar Primeiro Layout
          </button>
        </div>
      `;
      return;
    }
    
    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Nome</th>
              <th class="d-none d-md-table-cell">ID</th>
              <th class="d-none d-lg-table-cell">Versão</th>
              <th class="d-none d-lg-table-cell">Status</th>
              <th class="d-none d-lg-table-cell">Tipos de Registro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    for (const layout of layouts) {
      // Buscar tipos de registro para este layout
      let tiposCount = 0;
      try {
        const tiposResponse = await fetch(`/api/layouts/${layout.id}/tipos`);
        if (tiposResponse.ok) {
          const tipos = await tiposResponse.json();
          tiposCount = tipos.length;
        }
      } catch (error) {
        console.warn('Erro ao carregar tipos para layout:', layout.id);
      }
      
      const status = layout.status || 'ativo';
      
      html += `
        <tr>
          <td>
            <strong>${layout.nome}</strong>
            <br><small class="text-muted">${layout.descricao || 'Sem descrição'}</small>
            <div class="d-md-none mt-2">
              <span class="badge bg-secondary me-1">${layout.layout_id}</span>
              <span class="badge ${status === 'ativo' ? 'bg-success' : 'bg-warning'}">${status}</span>
              <span class="badge bg-info">${tiposCount} tipos</span>
            </div>
          </td>
          <td class="d-none d-md-table-cell">
            <code class="small">${layout.layout_id}</code>
          </td>
          <td class="d-none d-lg-table-cell">${layout.versao || '1.0'}</td>
          <td class="d-none d-lg-table-cell">
            <span class="badge ${status === 'ativo' ? 'bg-success' : 'bg-warning'}">${status}</span>
          </td>
          <td class="d-none d-lg-table-cell">
            <span class="badge bg-info">${tiposCount} tipo(s)</span>
          </td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="visualizarLayout('${layout.id}')" title="Visualizar">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-info" onclick="editarLayoutNovo('${layout.id}')" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-success" onclick="testarLayout('${layout.id}')" title="Testar">
                <i class="fas fa-vial"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="confirmarExclusaoLayout('${layout.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Erro ao carregar layouts:', error);
    const container = document.getElementById('layoutsContainer');
    if (container) {
      container.innerHTML = `
        <div class="p-4 text-center">
          <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <h5>Erro ao Carregar Layouts</h5>
          <p class="text-muted">Ocorreu um erro ao carregar a lista de layouts.</p>
          <button class="btn btn-outline-primary" onclick="atualizarListaLayouts()">
            <i class="fas fa-sync"></i> Tentar Novamente
          </button>
        </div>
      `;
    }
  }
}

async function editarLayoutNovo(layoutId) {
  try {
    const response = await fetch(`/api/layouts/${layoutId}`);
    if (!response.ok) throw new Error('Layout não encontrado');
    
    const layout = await response.json();
    mostrarFormularioLayout(layout);
    
  } catch (error) {
    console.error('Erro ao carregar layout para edição:', error);
    mostrarNotificacao('Erro ao carregar layout: ' + error.message, 'erro');
  }
}

async function editarLayout(layoutId) {
  try {
    // Buscar dados do layout
    const response = await fetch(`/api/layouts/${layoutId}`);
    if (!response.ok) throw new Error('Layout não encontrado');
    
    const layout = await response.json();
    
    // Abrir modal no modo de edição
    abrirModalNovoLayout(layout);
    
  } catch (error) {
    console.error('Erro ao carregar layout para edição:', error);
    mostrarNotificacao('Erro ao carregar layout: ' + error.message, 'erro');
  }
}

async function visualizarLayout(layoutId) {
  try {
    const response = await fetch(`/api/layouts/${layoutId}`);
    if (!response.ok) throw new Error('Layout não encontrado');
    
    const layout = await response.json();
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Layout: ${layout.nome}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-md-6"><strong>ID:</strong> ${layout.layout_id || layout.id}</div>
              <div class="col-md-6"><strong>Tipo:</strong> ${layout.tipo}</div>
            </div>
            <div class="row mb-3">
              <div class="col-md-6"><strong>Versão:</strong> ${layout.versao || '1.0'}</div>
              <div class="col-md-6"><strong>Origem:</strong> ${layout.origem || 'banco'}</div>
            </div>
            <div class="mb-3">
              <strong>Descrição:</strong><br>
              ${layout.descricao || 'Sem descrição'}
            </div>
            <div class="mb-3">
              <strong>Estrutura:</strong>
              <pre class="bg-light p-3" style="max-height: 400px; overflow-y: auto;">${JSON.stringify(layout.estrutura_completa || layout.estrutura || {}, null, 2)}</pre>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    modal.addEventListener('hidden.bs.modal', () => {
      document.body.removeChild(modal);
    });
    
  } catch (error) {
    mostrarNotificacao('Erro ao visualizar layout: ' + error.message, 'erro');
  }
}

async function testarLayout(layoutId) {
  abrirModalTestarLayout(layoutId);
}

function filtrarLayouts() {
  atualizarListaLayouts();
}

// ==================== FUNÇÕES DE EMPRESAS (PLACEHOLDER) ====================

function limparFormularioEmpresa() {
  document.getElementById('formEmpresa').reset();
  showNotification('Formulário limpo!', 'info');
}

function buscarDadosCNPJ() {
  const cnpj = document.getElementById('cnpj').value;
  if (!cnpj) {
    showNotification('Por favor, digite um CNPJ para buscar.', 'warning');
    return;
  }
  showNotification('Funcionalidade de busca de CNPJ será implementada em breve.', 'info');
}

function abrirModalTestarLayout(layoutId) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'modalTestarLayout';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Testar Layout</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="formTestarLayout">
            <div class="mb-3">
              <label class="form-label">Layout ID: <strong>${layoutId}</strong></label>
            </div>
            <div class="mb-3">
              <label class="form-label">Arquivo de Teste <span class="text-danger">*</span></label>
              <input type="file" id="arquivoTeste" class="form-control" accept=".txt,.rps" required>
              <small class="text-muted">Selecione um arquivo RPS para testar com este layout</small>
            </div>
            <div class="mb-3">
              <label class="form-label">Opções de Teste</label>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="mostrarDetalhes" checked>
                <label class="form-check-label" for="mostrarDetalhes">
                  Mostrar detalhes do processamento
                </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="validarCampos" checked>
                <label class="form-check-label" for="validarCampos">
                  Validar todos os campos
                </label>
              </div>
            </div>
            <div id="resultadoTeste" class="mt-3" style="display: none;">
              <h6>Resultado do Teste:</h6>
              <div id="conteudoResultado"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="executarTesteLayout('${layoutId}')">Executar Teste</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  
  modal.addEventListener('hidden.bs.modal', () => {
    document.body.removeChild(modal);
  });
}

async function executarTesteLayout(layoutId) {
  try {
    const arquivoInput = document.getElementById('arquivoTeste');
    const mostrarDetalhes = document.getElementById('mostrarDetalhes').checked;
    const validarCampos = document.getElementById('validarCampos').checked;
    
    if (!arquivoInput.files[0]) {
      mostrarNotificacao('Por favor, selecione um arquivo para teste', 'aviso');
      return;
    }
    
    const formData = new FormData();
    formData.append('arquivo', arquivoInput.files[0]);
    formData.append('layoutId', layoutId);
    formData.append('mostrarDetalhes', mostrarDetalhes);
    formData.append('validarCampos', validarCampos);
    
    const response = await fetch('/api/layouts/testar', {
      method: 'POST',
      body: formData
    });
    
    const resultado = await response.json();
    
    const resultadoDiv = document.getElementById('resultadoTeste');
    const conteudoDiv = document.getElementById('conteudoResultado');
    
    if (!response.ok) {
      conteudoDiv.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-times-circle"></i> <strong>Erro no teste:</strong>
          <br>${resultado.erro || 'Erro desconhecido'}
        </div>
      `;
    } else {
      let html = `
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i> <strong>Teste executado com sucesso!</strong>
        </div>
      `;
      
      if (resultado.registros) {
        html += `
          <div class="mt-3">
            <h6>Resumo:</h6>
            <ul class="list-group list-group-flush">
              <li class="list-group-item d-flex justify-content-between">
                <span>Total de registros processados:</span>
                <strong>${resultado.registros.total || 0}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Registros válidos:</span>
                <strong class="text-success">${resultado.registros.validos || 0}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Registros com erro:</span>
                <strong class="text-danger">${resultado.registros.erros || 0}</strong>
              </li>
            </ul>
          </div>
        `;
      }
      
      if (mostrarDetalhes && resultado.detalhes) {
        html += `
          <div class="mt-3">
            <h6>Detalhes do Processamento:</h6>
            <pre class="bg-light p-3" style="max-height: 300px; overflow-y: auto;">${JSON.stringify(resultado.detalhes, null, 2)}</pre>
          </div>
        `;
      }
      
      conteudoDiv.innerHTML = html;
    }
    
    resultadoDiv.style.display = 'block';
    
  } catch (error) {
    console.error('Erro ao testar layout:', error);
    mostrarNotificacao('Erro ao executar teste: ' + error.message, 'erro');
  }
}

// ==================== FUNÇÃO DE NOTIFICAÇÃO GLOBAL ====================

function showNotification(message, type = 'success') {
  // Remove notificações existentes
  document.querySelectorAll('.notification').forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} notification show`;
  
  const iconMap = {
    success: 'check-circle',
    danger: 'exclamation-triangle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  
  notification.innerHTML = `
    <i class="fas fa-${iconMap[type] || 'info-circle'} me-2"></i>
    ${message}
    <button type="button" class="btn-close ms-auto" onclick="this.parentElement.remove()"></button>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Função auxiliar para compatibilidade
function mostrarNotificacao(message, type = 'sucesso') {
  const typeMap = {
    'sucesso': 'success',
    'erro': 'danger',
    'aviso': 'warning',
    'info': 'info'
  };
  showNotification(message, typeMap[type] || type);
}

// ==================== LAYOUTS DINÂMICOS ====================
// FUNCIONALIDADE DESABILITADA - Usando apenas layouts do banco de dados

/*
async function carregarLayoutsDinamicos() {
  try {
    const response = await fetch('/api/layouts/sistema/info');
    if (!response.ok) throw new Error('Erro ao carregar informações dos layouts dinâmicos');
    
    const info = await response.json();
    
    mostrarNotificacao(
      `Sistema de Layouts Dinâmicos\n` +
      `Total de layouts: ${info.totalLayouts}\n` +
      `Layout padrão: ${info.layoutPadrao || 'Nenhum'}\n` +
      `Layouts disponíveis: ${info.layouts.map(l => l.nome).join(', ')}`,
      'info'
    );
    
    console.log('Informações dos layouts dinâmicos:', info);
  } catch (error) {
    console.error('Erro ao carregar layouts dinâmicos:', error);
    mostrarNotificacao('Erro ao carregar layouts dinâmicos: ' + error.message, 'erro');
  }
}
*/

async function abrirModalTestarLayout() {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Testar Layout Dinâmico</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Layout (opcional):</label>
            <select id="layoutTeste" class="form-control">
              <option value="">Detectar automaticamente</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Conteúdo do Arquivo:</label>
            <textarea id="conteudoTeste" class="form-control" rows="10" 
                      placeholder="Cole aqui o conteúdo do arquivo RPS para testar..."></textarea>
          </div>
          <div id="resultadoTeste" class="mt-3" style="display: none;">
            <h6>Resultado do Teste:</h6>
            <pre id="resultadoTexto" class="bg-light p-3" style="max-height: 300px; overflow-y: auto;"></pre>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
          <button type="button" class="btn btn-primary" onclick="executarTesteLauout()">Testar Layout</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  
  // Carregar layouts reais do banco de dados
  try {
    const response = await fetch('/api/layouts');
    const layouts = await response.json();
    
    const selectLayout = document.getElementById('layoutTeste');
    layouts.forEach(layout => {
      const option = document.createElement('option');
      option.value = layout.id;
      option.textContent = `${layout.nome} (ID: ${layout.id})`;
      selectLayout.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar layouts:', error);
    mostrarNotificacao('Erro ao carregar layouts disponíveis', 'error');
  }
  
  modal.addEventListener('hidden.bs.modal', () => {
    document.body.removeChild(modal);
  });
}

async function executarTesteLauout() {
  try {
    const conteudo = document.getElementById('conteudoTeste').value.trim();
    const layoutId = document.getElementById('layoutTeste').value;
    
    if (!conteudo) {
      mostrarNotificacao('Por favor, insira o conteúdo do arquivo', 'aviso');
      return;
    }
    
    const dados = { conteudo };
    if (layoutId) dados.layoutId = layoutId;
    
    const response = await fetch('/api/layouts/testar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.erro || 'Erro ao testar layout');
    }
    
    // Exibir resultado
    document.getElementById('resultadoTexto').textContent = JSON.stringify(resultado.resultado, null, 2);
    document.getElementById('resultadoTeste').style.display = 'block';
    
    mostrarNotificacao('Layout testado com sucesso!', 'sucesso');
    
  } catch (error) {
    console.error('Erro ao testar layout:', error);
    mostrarNotificacao('Erro ao testar layout: ' + error.message, 'erro');
  }
}

async function detectarLayoutAutomatico(conteudo) {
  try {
    const response = await fetch('/api/layouts/detectar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudo })
    });
    
    const resultado = await response.json();
    
    if (!response.ok) {
      throw new Error(resultado.erro || 'Erro ao detectar layout');
    }
    
    return resultado.layout;
  } catch (error) {
    console.error('Erro ao detectar layout:', error);
    throw error;
  }
}

// ==================== FUNÇÕES PARA SUBCAMPOS CONDICIONAIS ====================

function gerarHTMLSubcampos(subcampos) {
  if (!subcampos || subcampos.length === 0) return '';
  
  let html = '<div class="subcampos-list mt-2 p-2 bg-light border rounded">';
  html += '<h6 class="text-info mb-2"><i class="fas fa-sitemap"></i> Subcampos Condicionais</h6>';
  
  // Agrupar subcampos por condição
  const subcamposPorCondicao = {};
  subcampos.forEach(subcampo => {
    if (!subcamposPorCondicao[subcampo.condicao_valor]) {
      subcamposPorCondicao[subcampo.condicao_valor] = [];
    }
    subcamposPorCondicao[subcampo.condicao_valor].push(subcampo);
  });
  
  Object.entries(subcamposPorCondicao).forEach(([condicao, subs]) => {
    html += `<div class="mb-2">`;
    html += `<small class="badge bg-secondary">Quando valor = ${condicao}</small>`;
    subs.forEach(sub => {
      html += `
        <div class="row g-2 mt-1 align-items-center border-start border-info ps-2">
          <div class="col-1">
            <span class="badge bg-info">${sub.subcampo_letra}</span>
          </div>
          <div class="col-3">
            <small>${sub.nome_subcampo}</small>
          </div>
          <div class="col-2">
            <small>Pos: ${sub.posicao_inicial}-${sub.posicao_final}</small>
          </div>
          <div class="col-2">
            <small>Tam: ${sub.tamanho}</small>
          </div>
          <div class="col-2">
            <small>${sub.formato}</small>
          </div>
          <div class="col-2">
            ${sub.obrigatorio ? '<i class="fas fa-check text-success" title="Obrigatório"></i>' : '<i class="fas fa-minus text-muted" title="Opcional"></i>'}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });
  
  html += '</div>';
  return html;
}

function gerenciarSubcampos(tipoId, campoId, ordem) {
  const modalHTML = `
    <div class="modal fade" id="modalSubcampos" tabindex="-1" aria-labelledby="modalSubcamposLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalSubcamposLabel">
              <i class="fas fa-sitemap"></i> Gerenciar Subcampos Condicionais - Campo #${ordem}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle"></i>
              <strong>Subcampos Condicionais:</strong> Dependendo do valor deste campo, outros subcampos podem ter tamanhos ou obrigatoriedades diferentes.
            </div>
            
            <form id="formSubcampos">
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Valor da Condição</label>
                  <input type="text" id="condicaoValor" class="form-control" placeholder="Ex: 1, 2, 3, 4">
                  <small class="text-muted">Valor que ativa esta condição</small>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Descrição da Condição</label>
                  <input type="text" id="condicaoDescricao" class="form-control" placeholder="Ex: CPF, CNPJ, etc.">
                </div>
              </div>
              
              <h6 class="text-primary mt-4 mb-3">Subcampos para esta condição:</h6>
              
              <div class="row mb-2 text-muted">
                <div class="col-1"><small><strong>Letra</strong></small></div>
                <div class="col-3"><small><strong>Nome</strong></small></div>
                <div class="col-2"><small><strong>Inicial</strong></small></div>
                <div class="col-2"><small><strong>Final</strong></small></div>
                <div class="col-1"><small><strong>Tamanho</strong></small></div>
                <div class="col-2"><small><strong>Formato</strong></small></div>
                <div class="col-1"><small><strong>Obrig.</strong></small></div>
              </div>
              
              <div id="subcamposLista">
                <!-- Subcampos serão adicionados aqui -->
              </div>
              
              <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="adicionarSubcampo()">
                <i class="fas fa-plus"></i> Adicionar Subcampo
              </button>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="salvarSubcampos(${tipoId}, ${campoId})">
              <i class="fas fa-save"></i> Salvar Subcampos
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal existente se houver
  const modalExistente = document.getElementById('modalSubcampos');
  if (modalExistente) {
    modalExistente.remove();
  }
  
  // Adicionar novo modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modalSubcampos'));
  modal.show();
  
  // Carregar subcampos existentes se houver
  carregarSubcamposExistentes(tipoId, campoId);
}

let subcamposTemporarios = [];

function adicionarSubcampo() {
  const container = document.getElementById('subcamposLista');
  const index = subcamposTemporarios.length;
  
  const html = `
    <div class="row g-2 mb-2 subcampo-item border p-2 rounded" data-index="${index}">
      <div class="col-1">
        <input type="text" class="form-control form-control-sm text-center" id="letra_${index}" placeholder="A" maxlength="1">
      </div>
      <div class="col-3">
        <input type="text" class="form-control form-control-sm" id="nome_${index}" placeholder="Nome do subcampo">
      </div>
      <div class="col-2">
        <input type="number" class="form-control form-control-sm" id="inicial_${index}" placeholder="Pos" min="1" onchange="calcularFinalSubcampo(${index})">
      </div>
      <div class="col-2">
        <input type="number" class="form-control form-control-sm bg-light" id="final_${index}" readonly>
      </div>
      <div class="col-1">
        <input type="number" class="form-control form-control-sm" id="tamanho_${index}" placeholder="Tam" min="1" onchange="calcularFinalSubcampo(${index})">
      </div>
      <div class="col-2">
        <select class="form-control form-control-sm" id="formato_${index}">
          <option value="Texto">Texto</option>
          <option value="Número">Número</option>
          <option value="Data">Data</option>
          <option value="Valor">Valor</option>
        </select>
      </div>
      <div class="col-1 text-center">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="obrigatorio_${index}">
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger mt-1" onclick="removerSubcampo(${index})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', html);
  subcamposTemporarios.push({});
}

function calcularFinalSubcampo(index) {
  const inicial = parseInt(document.getElementById(`inicial_${index}`).value) || 0;
  const tamanho = parseInt(document.getElementById(`tamanho_${index}`).value) || 0;
  const final = inicial + tamanho - 1;
  
  if (inicial > 0 && tamanho > 0) {
    document.getElementById(`final_${index}`).value = final;
  }
}

function removerSubcampo(index) {
  const elemento = document.querySelector(`[data-index="${index}"]`);
  if (elemento) {
    elemento.remove();
  }
}

function carregarSubcamposExistentes(tipoId, campoId) {
  // Aqui você carregaria os subcampos existentes do servidor
  // Por enquanto, vamos deixar vazio para implementação futura
  console.log(`Carregando subcampos para tipo ${tipoId}, campo ${campoId}`);
}

function salvarSubcampos(tipoId, campoId) {
  const condicaoValor = document.getElementById('condicaoValor').value;
  const condicaoDescricao = document.getElementById('condicaoDescricao').value;
  
  if (!condicaoValor) {
    alert('Por favor, informe o valor da condição');
    return;
  }
  
  const subcampos = [];
  const items = document.querySelectorAll('.subcampo-item');
  
  items.forEach((item, index) => {
    const letra = document.getElementById(`letra_${index}`)?.value;
    const nome = document.getElementById(`nome_${index}`)?.value;
    const inicial = parseInt(document.getElementById(`inicial_${index}`)?.value);
    const tamanho = parseInt(document.getElementById(`tamanho_${index}`)?.value);
    const formato = document.getElementById(`formato_${index}`)?.value;
    const obrigatorio = document.getElementById(`obrigatorio_${index}`)?.checked;
    
    if (letra && nome && inicial && tamanho) {
      subcampos.push({
        subcampo_letra: letra.toUpperCase(),
        nome_subcampo: nome,
        posicao_inicial: inicial,
        posicao_final: inicial + tamanho - 1,
        tamanho: tamanho,
        formato: formato,
        obrigatorio: obrigatorio,
        condicao_valor: condicaoValor,
        descricao: condicaoDescricao
      });
    }
  });
  
  if (subcampos.length === 0) {
    alert('Adicione pelo menos um subcampo');
    return;
  }
  
  // Enviar para o servidor
  fetch('/api/subcampos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tipoId: tipoId,
      campoId: campoId,
      condicaoValor: condicaoValor,
      subcampos: subcampos
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.erro) {
      alert('Erro ao salvar subcampos: ' + data.erro);
    } else {
      alert('Subcampos salvos com sucesso!');
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalSubcampos'));
      modal.hide();
      
      // Atualizar visualização
      renderizarCamposTipo(tipoId);
    }
  })
  .catch(error => {
    console.error('Erro:', error);
    alert('Erro ao salvar subcampos');
  });
}

// ==================== IMPORTAÇÃO/EXPORTAÇÃO DE LAYOUTS ====================

async function exportarLayouts() {
  try {
    console.log('🚀 Exportando todos os layouts...');
    
    // Buscar todos os layouts
    const response = await fetch('/api/layouts');
    if (!response.ok) throw new Error('Erro ao buscar layouts');
    
    const layouts = await response.json();
    
    if (layouts.length === 0) {
      mostrarNotificacao('Nenhum layout encontrado para exportar', 'warning');
      return;
    }
    
    // Buscar tipos para cada layout
    const layoutsCompletos = [];
    for (const layout of layouts) {
      const tiposResponse = await fetch(`/api/layouts/${layout.id}/tipos`);
      if (tiposResponse.ok) {
        const tipos = await tiposResponse.json();
        layoutsCompletos.push({
          ...layout,
          tipos_registro: tipos
        });
      }
    }
    
    // Criar objeto de exportação
    const dadosExportacao = {
      versao: '1.0',
      data_exportacao: new Date().toISOString(),
      total_layouts: layoutsCompletos.length,
      layouts: layoutsCompletos
    };
    
    // Download do arquivo
    downloadJSON(dadosExportacao, `layouts_backup_${formatarDataParaArquivo()}.json`);
    
    mostrarNotificacao(`${layoutsCompletos.length} layout(s) exportado(s) com sucesso!`, 'success');
    
  } catch (error) {
    console.error('Erro ao exportar layouts:', error);
    mostrarNotificacao('Erro ao exportar layouts: ' + error.message, 'erro');
  }
}

async function exportarLayoutSelecionado() {
  try {
    // Verificar se há um layout sendo editado
    const layoutId = document.getElementById('layoutIdEdicao')?.value;
    
    if (!layoutId) {
      mostrarNotificacao('Selecione um layout para editar primeiro', 'warning');
      return;
    }
    
    console.log('🚀 Exportando layout ID:', layoutId);
    
    // Buscar dados do layout
    const layoutResponse = await fetch(`/api/layouts/${layoutId}`);
    if (!layoutResponse.ok) throw new Error('Layout não encontrado');
    
    const layout = await layoutResponse.json();
    
    // Buscar tipos do layout
    const tiposResponse = await fetch(`/api/layouts/${layoutId}/tipos`);
    const tipos = tiposResponse.ok ? await tiposResponse.json() : [];
    
    // Criar objeto de exportação
    const dadosExportacao = {
      versao: '1.0',
      data_exportacao: new Date().toISOString(),
      total_layouts: 1,
      layouts: [{
        ...layout,
        tipos_registro: tipos
      }]
    };
    
    // Download do arquivo
    const nomeArquivo = `layout_${layout.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${formatarDataParaArquivo()}.json`;
    downloadJSON(dadosExportacao, nomeArquivo);
    
    mostrarNotificacao(`Layout "${layout.nome}" exportado com sucesso!`, 'success');
    
  } catch (error) {
    console.error('Erro ao exportar layout:', error);
    mostrarNotificacao('Erro ao exportar layout: ' + error.message, 'erro');
  }
}

function abrirModalExportarLayout() {
  const modal = new bootstrap.Modal(document.getElementById('modalExportarLayout'));
  
  // Limpar estado anterior
  document.getElementById('layoutParaExportar').value = '';
  document.getElementById('previewExportacao').style.display = 'none';
  document.getElementById('btnExecutarExportacao').disabled = true;
  
  // Carregar layouts disponíveis
  carregarLayoutsParaExportacao();
  
  modal.show();
}

function carregarLayoutsParaExportacao() {
  const select = document.getElementById('layoutParaExportar');
  
  // Limpar opções existentes
  select.innerHTML = '<option value="">Selecione um layout...</option>';
  
  if (layouts && layouts.length > 0) {
    layouts.forEach(layout => {
      const option = document.createElement('option');
      option.value = layout.id;
      option.textContent = layout.nome;
      select.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Nenhum layout disponível';
    option.disabled = true;
    select.appendChild(option);
  }
}

function aoSelecionarLayoutExportacao() {
  const selectLayout = document.getElementById('layoutParaExportar');
  const layoutId = selectLayout.value;
  const previewDiv = document.getElementById('previewExportacao');
  const btnExecutar = document.getElementById('btnExecutarExportacao');
  
  if (!layoutId) {
    previewDiv.style.display = 'none';
    btnExecutar.disabled = true;
    return;
  }
  
  const layout = layouts.find(l => l.id == layoutId);
  if (!layout) {
    previewDiv.style.display = 'none';
    btnExecutar.disabled = true;
    return;
  }
  
  // Mostrar preview do layout
  const previewContent = document.getElementById('previewContentExportacao');
  previewContent.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h6 class="mb-0">${layout.nome}</h6>
      </div>
      <div class="card-body">
        <p class="text-muted mb-2">${layout.descricao || 'Sem descrição'}</p>
        <div class="row">
          <div class="col-6">
            <small class="text-muted">Tipos de registro:</small>
            <div id="tiposPreview"></div>
          </div>
          <div class="col-6">
            <small class="text-muted">Total de campos:</small>
            <div id="camposPreview"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Carregar e mostrar tipos de registro
  carregarTiposParaPreview(layout.id);
  
  previewDiv.style.display = 'block';
  btnExecutar.disabled = false;
}

async function carregarTiposParaPreview(layoutId) {
  try {
    const response = await fetch(`/api/layouts/${layoutId}/tipos`);
    if (!response.ok) throw new Error('Erro ao carregar tipos');
    
    const tipos = await response.json();
    
    let totalCampos = 0;
    const tiposHtml = tipos.map(tipo => {
      totalCampos += tipo.campos ? tipo.campos.length : 0;
      return `<span class="badge bg-secondary me-1">${tipo.tipo}</span>`;
    }).join('');
    
    document.getElementById('tiposPreview').innerHTML = tiposHtml || '<span class="text-muted">Nenhum tipo</span>';
    document.getElementById('camposPreview').innerHTML = `<span class="fw-bold">${totalCampos}</span> campos`;
    
  } catch (error) {
    console.error('Erro ao carregar preview:', error);
    document.getElementById('tiposPreview').innerHTML = '<span class="text-danger">Erro ao carregar</span>';
    document.getElementById('camposPreview').innerHTML = '<span class="text-danger">-</span>';
  }
}

async function executarExportacaoLayout() {
  const layoutId = document.getElementById('layoutParaExportar').value;
  const incluirMetadados = document.getElementById('incluirMetadadosExport').checked;
  const formatarJson = document.getElementById('formatarJsonExport').checked;
  
  if (!layoutId) {
    mostrarNotificacao('Selecione um layout para exportar', 'erro');
    return;
  }
  
  try {
    // Buscar o layout
    const layout = layouts.find(l => l.id == layoutId);
    if (!layout) {
      mostrarNotificacao('Layout não encontrado', 'erro');
      return;
    }
    
    // Buscar tipos e campos
    const response = await fetch(`/api/layouts/${layoutId}/tipos`);
    if (!response.ok) throw new Error('Erro ao carregar dados do layout');
    
    const tipos = await response.json();
    
    // Preparar dados para exportação
    let dadosExportacao;
    
    if (incluirMetadados) {
      dadosExportacao = {
        metadata: {
          exportado_por: 'RPS Manager',
          data_exportacao: new Date().toISOString(),
          versao: '1.0',
          total_layouts: 1
        },
        layouts: [{
          ...layout,
          tipos_registro: tipos
        }]
      };
    } else {
      dadosExportacao = {
        ...layout,
        tipos_registro: tipos
      };
    }
    
    // Gerar nome do arquivo
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const nomeArquivo = `layout_${layout.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.json`;
    
    // Download do arquivo
    const jsonString = formatarJson ? JSON.stringify(dadosExportacao, null, 2) : JSON.stringify(dadosExportacao);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Fechar modal e mostrar sucesso
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalExportarLayout'));
    modal.hide();
    
    mostrarNotificacao(`Layout "${layout.nome}" exportado com sucesso!`, 'success');
    
  } catch (error) {
    console.error('Erro ao exportar layout:', error);
    mostrarNotificacao('Erro ao exportar layout: ' + error.message, 'erro');
  }
}

function abrirModalImportarLayout() {
  const modal = new bootstrap.Modal(document.getElementById('modalImportarLayout'));
  
  // Limpar estado anterior
  document.getElementById('arquivoLayoutImport').value = '';
  document.getElementById('previewImportacao').style.display = 'none';
  document.getElementById('opcoesImportacao').style.display = 'none';
  document.getElementById('resultadoImportacao').style.display = 'none';
  document.getElementById('btnExecutarImportacao').disabled = true;
  
  modal.show();
}

function processarArquivoImportacao(input) {
  const arquivo = input.files[0];
  
  if (!arquivo) {
    document.getElementById('previewImportacao').style.display = 'none';
    document.getElementById('opcoesImportacao').style.display = 'none';
    document.getElementById('btnExecutarImportacao').disabled = true;
    return;
  }
  
  if (!arquivo.name.toLowerCase().endsWith('.json')) {
    mostrarNotificacao('Por favor, selecione um arquivo JSON válido', 'erro');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const dados = JSON.parse(e.target.result);
      
      // Validar estrutura do arquivo
      if (!dados.layouts || !Array.isArray(dados.layouts)) {
        throw new Error('Arquivo JSON inválido: propriedade "layouts" não encontrada ou não é um array');
      }
      
      // Mostrar preview
      document.getElementById('infoArquivoImport').innerHTML = `
        <strong>Arquivo:</strong> ${arquivo.name}<br>
        <strong>Tamanho:</strong> ${(arquivo.size / 1024).toFixed(2)} KB<br>
        <strong>Versão:</strong> ${dados.versao || 'N/A'}<br>
        <strong>Data de Exportação:</strong> ${dados.data_exportacao ? new Date(dados.data_exportacao).toLocaleString() : 'N/A'}
      `;
      
      // Mostrar layouts encontrados
      let layoutsHtml = `<strong>Layouts encontrados (${dados.layouts.length}):</strong><ul class="mt-2 mb-0">`;
      dados.layouts.forEach(layout => {
        const tiposCount = layout.tipos_registro ? layout.tipos_registro.length : 0;
        layoutsHtml += `<li>${layout.nome || 'Nome não especificado'} (${tiposCount} tipos)</li>`;
      });
      layoutsHtml += '</ul>';
      
      document.getElementById('layoutsEncontrados').innerHTML = layoutsHtml;
      
      // Mostrar seções
      document.getElementById('previewImportacao').style.display = 'block';
      document.getElementById('opcoesImportacao').style.display = 'block';
      document.getElementById('btnExecutarImportacao').disabled = false;
      
      // Armazenar dados para importação
      window.dadosImportacao = dados;
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      mostrarNotificacao('Erro ao processar arquivo: ' + error.message, 'erro');
    }
  };
  
  reader.readAsText(arquivo);
}

async function executarImportacaoLayout() {
  try {
    if (!window.dadosImportacao) {
      mostrarNotificacao('Nenhum arquivo carregado para importação', 'erro');
      return;
    }
    
    const substituirDuplicados = document.getElementById('substituirDuplicados').checked;
    const manterIds = document.getElementById('manterIds').checked;
    
    console.log('🚀 Executando importação de layouts...');
    console.log('Substituir duplicados:', substituirDuplicados);
    console.log('Manter IDs:', manterIds);
    
    let sucessos = 0;
    let erros = 0;
    let duplicados = 0;
    const resultados = [];
    
    for (const layoutImport of window.dadosImportacao.layouts) {
      try {
        // Preparar dados do layout
        const layoutData = {
          nome: layoutImport.nome,
          tipo: layoutImport.tipo || 'importado',
          descricao: layoutImport.descricao || 'Layout importado',
          estrutura_completa: layoutImport.estrutura_completa || {},
          formatacao: layoutImport.formatacao || {},
          origem: 'importado',
          tipos_registro: layoutImport.tipos_registro || []
        };
        
        // Se não manter IDs, remover ID
        if (!manterIds && layoutData.id) {
          delete layoutData.id;
        }
        
        // Verificar duplicados se necessário
        if (substituirDuplicados) {
          const layoutsExistentes = await fetch('/api/layouts').then(r => r.json());
          const duplicado = layoutsExistentes.find(l => l.nome === layoutData.nome);
          
          if (duplicado) {
            // Atualizar layout existente
            const response = await fetch(`/api/layouts/${duplicado.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(layoutData)
            });
            
            if (response.ok) {
              duplicados++;
              resultados.push(`✅ ${layoutData.nome} (substituído)`);
            } else {
              erros++;
              resultados.push(`❌ ${layoutData.nome} (erro ao substituir)`);
            }
            continue;
          }
        }
        
        // Criar novo layout
        const response = await fetch('/api/layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(layoutData)
        });
        
        if (response.ok) {
          sucessos++;
          resultados.push(`✅ ${layoutData.nome} (criado)`);
        } else {
          erros++;
          resultados.push(`❌ ${layoutData.nome} (erro ao criar)`);
        }
        
      } catch (error) {
        console.error('Erro ao importar layout:', layoutImport.nome, error);
        erros++;
        resultados.push(`❌ ${layoutImport.nome || 'Layout sem nome'} (erro: ${error.message})`);
      }
    }
    
    // Mostrar resultado
    const statusHtml = `
      <div class="row">
        <div class="col-md-4 text-center">
          <div class="text-success">
            <i class="fas fa-check-circle fa-2x"></i>
            <div><strong>${sucessos}</strong></div>
            <div>Criados</div>
          </div>
        </div>
        <div class="col-md-4 text-center">
          <div class="text-warning">
            <i class="fas fa-sync fa-2x"></i>
            <div><strong>${duplicados}</strong></div>
            <div>Substituídos</div>
          </div>
        </div>
        <div class="col-md-4 text-center">
          <div class="text-danger">
            <i class="fas fa-times-circle fa-2x"></i>
            <div><strong>${erros}</strong></div>
            <div>Erros</div>
          </div>
        </div>
      </div>
      <div class="mt-3">
        <details>
          <summary><strong>Detalhes da importação:</strong></summary>
          <ul class="mt-2 mb-0">
            ${resultados.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </details>
      </div>
    `;
    
    document.getElementById('statusImportacao').innerHTML = statusHtml;
    document.getElementById('resultadoImportacao').style.display = 'block';
    
    // Atualizar lista de layouts
    await atualizarListaLayouts();
    
    const mensagem = `Importação concluída: ${sucessos} criados, ${duplicados} substituídos, ${erros} erros`;
    mostrarNotificacao(mensagem, erros > 0 ? 'warning' : 'success');
    
  } catch (error) {
    console.error('Erro durante importação:', error);
    mostrarNotificacao('Erro durante importação: ' + error.message, 'erro');
  }
}

// Funções auxiliares
function downloadJSON(dados, nomeArquivo) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function formatarDataParaArquivo() {
  const agora = new Date();
  return agora.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
}

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', function() {
  carregarEmpresas();
  setupDropZone();
  setupFormEmpresa();
  formatarInputs();
  
  // Event listeners para verificação de importação
  const empresaImportacao = document.getElementById('empresaImportacao');
  const layoutImportacao = document.getElementById('layoutImportacao');
  const cadastrarEmpresas = document.getElementById('cadastrarEmpresas');
  
  if (empresaImportacao) {
    empresaImportacao.addEventListener('change', verificarHabilitarImportacao);
  }
  if (layoutImportacao) {
    layoutImportacao.addEventListener('change', verificarHabilitarImportacao);
  }
  if (cadastrarEmpresas) {
    cadastrarEmpresas.addEventListener('change', verificarHabilitarImportacao);
  }
  
  // Inicializar layouts se a aba estiver ativa
  if (document.getElementById('layouts') && document.getElementById('layouts').style.display !== 'none') {
    atualizarListaLayouts();
  }
});
