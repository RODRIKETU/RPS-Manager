const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const layoutManager = require('./layouts/layout-manager');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.dat', '.rps'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext) || !path.extname(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Função para calcular hash do arquivo
function calcularHashArquivo(conteudo) {
  return crypto.createHash('md5').update(conteudo).digest('hex');
}

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ROTAS DE EMPRESAS ====================

// Listar empresas
app.get('/api/empresas', async (req, res) => {
  try {
    const empresas = await db.listarEmpresas();
    res.json(empresas);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Criar empresa
app.post('/api/empresas', async (req, res) => {
  try {
    console.log('Dados recebidos para criar empresa:', req.body);
    const empresa = await db.criarEmpresa(req.body);
    res.status(201).json(empresa);
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ erro: 'CNPJ já cadastrado' });
    } else {
      res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  }
});

// Buscar empresa por CNPJ
app.get('/api/empresas/cnpj/:cnpj', async (req, res) => {
  try {
    const empresa = await db.buscarEmpresaPorCnpj(req.params.cnpj);
    if (empresa) {
      res.json(empresa);
    } else {
      res.status(404).json({ erro: 'Empresa não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar tipos de registro RPS disponíveis
app.get('/api/tipos-registro', async (req, res) => {
  try {
    const tipos = await db.buscarTiposRegistro();
    res.json(tipos);
  } catch (error) {
    console.error('Erro ao buscar tipos de registro:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Atualizar empresa
app.put('/api/empresas/:id', async (req, res) => {
  try {
    const resultado = await db.atualizarEmpresa(req.params.id, req.body);
    if (resultado.changes > 0) {
      res.json({ mensagem: 'Empresa atualizada com sucesso' });
    } else {
      res.status(404).json({ erro: 'Empresa não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar dados de CNPJ externamente
app.get('/api/cnpj/buscar/:cnpj', async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/\D/g, ''); // Remove caracteres não numéricos
    
    // Validação básica do CNPJ
    if (cnpj.length !== 14) {
      return res.status(400).json({ erro: 'CNPJ deve ter 14 dígitos' });
    }
    
    // Validação de CNPJ inválido (todos os dígitos iguais)
    if (/^(\d)\1{13}$/.test(cnpj)) {
      return res.status(400).json({ erro: 'CNPJ inválido' });
    }
    
    // Tenta buscar em múltiplas APIs como fallback
    const dados = await buscarCNPJComFallback(cnpj);
    
    if (!dados) {
      return res.status(404).json({ erro: 'CNPJ não encontrado em nenhuma fonte disponível' });
    }
    
    // Retorna os dados formatados
    res.json({
      cnpj: dados.cnpj,
      razao_social: dados.razao_social,
      nome_fantasia: dados.nome_fantasia,
      email: dados.email,
      telefone: dados.telefone,
      endereco: dados.endereco,
      situacao: dados.situacao,
      atividade_principal: dados.atividade_principal,
      data_abertura: dados.data_abertura
    });
    
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    res.status(500).json({ erro: 'Erro ao consultar dados do CNPJ' });
  }
});

// Função para buscar CNPJ com múltiplas APIs como fallback
async function buscarCNPJComFallback(cnpj) {
  // Base de dados simulada para demonstração (em caso de falha das APIs)
  const dadosSimulados = {
    '11222333000181': {
      cnpj: '11.222.333/0001-81',
      razao_social: 'Empresa de Demonstração LTDA',
      nome_fantasia: 'Demo Empresa',
      email: 'contato@demo.com.br',
      telefone: '(11) 9999-9999',
      endereco: 'Rua de Exemplo, 123, Centro, São Paulo - SP, CEP: 01234-567',
      situacao: 'ATIVA',
      atividade_principal: 'Atividades de demonstração',
      data_abertura: '2020-01-01'
    },
    '13369527400010': {
      cnpj: '13.369.527/4000-10',
      razao_social: 'Outro Exemplo Empresarial S/A',
      nome_fantasia: 'Exemplo SA',
      email: 'info@exemplo.com.br',
      telefone: '(11) 8888-8888',
      endereco: 'Av. Exemplo, 456, Bairro Demo, São Paulo - SP, CEP: 05432-100',
      situacao: 'ATIVA',
      atividade_principal: 'Serviços de exemplo e demonstração',
      data_abertura: '2019-06-15'
    }
  };

  const apis = [
    {
      name: 'Brasil API',
      url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      parser: (data) => ({
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        email: data.email,
        telefone: data.ddd && data.telefone ? `(${data.ddd}) ${data.telefone}` : null,
        endereco: formatarEndereco(data),
        situacao: data.situacao_cadastral,
        atividade_principal: data.cnae_fiscal_descricao,
        data_abertura: data.data_inicio_atividade
      })
    },
    {
      name: 'API CNPJ (Receitaws)',
      url: `https://www.receitaws.com.br/v1/cnpj/${cnpj}`,
      parser: (data) => ({
        cnpj: data.cnpj,
        razao_social: data.nome,
        nome_fantasia: data.fantasia,
        email: data.email,
        telefone: data.telefone,
        endereco: `${data.logradouro}, ${data.numero}, ${data.bairro}, ${data.municipio} - ${data.uf}, CEP: ${data.cep}`,
        situacao: data.situacao,
        atividade_principal: data.atividade_principal?.[0]?.text,
        data_abertura: data.abertura
      })
    }
  ];

  // Tenta primeiro as APIs externas
  for (const api of apis) {
    try {
      console.log(`Tentando buscar CNPJ ${cnpj} na ${api.name}`);
      
      const response = await fetch(api.url, {
        headers: {
          'User-Agent': 'RPS-Manager/1.0.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 10000 // 10 segundos de timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Sucesso na ${api.name}`);
        return api.parser(data);
      } else {
        console.log(`❌ Erro ${response.status} na ${api.name}`);
      }
      
    } catch (error) {
      console.log(`❌ Falha na ${api.name}:`, error.message);
      continue;
    }
  }
  
  // Se todas as APIs falharam, usa dados simulados para demonstração
  if (dadosSimulados[cnpj]) {
    console.log(`📋 Usando dados simulados para CNPJ ${cnpj} (APIs indisponíveis)`);
    return dadosSimulados[cnpj];
  }
  
  console.log(`❌ CNPJ ${cnpj} não encontrado em nenhuma fonte`);
  return null;
}

// Endpoint para testar status das APIs de CNPJ
app.get('/api/cnpj/status', async (req, res) => {
  const testCnpj = '11222333000181'; // CNPJ de teste
  const apis = [
    {
      name: 'Brasil API',
      url: `https://brasilapi.com.br/api/cnpj/v1/${testCnpj}`,
    },
    {
      name: 'Receitaws',
      url: `https://www.receitaws.com.br/v1/cnpj/${testCnpj}`,
    },
    {
      name: 'CNPJs.dev',
      url: `https://api.cnpjs.dev/v1/${testCnpj}`,
    }
  ];

  const resultados = [];

  for (const api of apis) {
    try {
      const start = Date.now();
      const response = await fetch(api.url, {
        headers: {
          'User-Agent': 'RPS-Manager/1.0.0',
          'Accept': 'application/json',
        },
        timeout: 5000
      });
      
      const tempo = Date.now() - start;
      
      resultados.push({
        nome: api.name,
        status: response.ok ? 'online' : `erro ${response.status}`,
        tempo: `${tempo}ms`,
        disponivel: response.ok
      });
      
    } catch (error) {
      resultados.push({
        nome: api.name,
        status: 'offline',
        erro: error.message,
        disponivel: false
      });
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    apis: resultados,
    disponiveis: resultados.filter(r => r.disponivel).length
  });
});

// Função auxiliar para formatar endereço
function formatarEndereco(dados) {
  let endereco = '';
  if (dados.logradouro) {
    endereco += dados.logradouro;
    if (dados.numero) endereco += `, ${dados.numero}`;
    if (dados.complemento) endereco += `, ${dados.complemento}`;
    if (dados.bairro) endereco += `, ${dados.bairro}`;
    if (dados.municipio) endereco += `, ${dados.municipio}`;
    if (dados.uf) endereco += ` - ${dados.uf}`;
    if (dados.cep) endereco += `, CEP: ${dados.cep}`;
  }
  return endereco;
}

// Função auxiliar para buscar e cadastrar empresa automaticamente
async function buscarECadastrarEmpresa(cnpj) {
  try {
    // Primeiro verifica se a empresa já existe no banco
    const empresaExistente = await db.buscarEmpresaPorCnpj(cnpj);
    if (empresaExistente) {
      return { empresa: empresaExistente, cadastradaAutomaticamente: false };
    }

    // Se não existe, busca dados externos usando sistema de fallback
    console.log(`Buscando dados da empresa CNPJ: ${cnpj}`);
    const dadosExternos = await buscarCNPJComFallback(cnpj);
    
    if (!dadosExternos) {
      throw new Error(`CNPJ ${cnpj} não encontrado em nenhuma fonte disponível`);
    }
    
    // Cadastra a empresa automaticamente
    const novaEmpresa = {
      cnpj: cnpj,
      razaoSocial: dadosExternos.razao_social || 'Razão Social não informada',
      nomeFantasia: dadosExternos.nome_fantasia || dadosExternos.razao_social || '',
      inscricaoMunicipal: '',
      endereco: dadosExternos.endereco || '',
      telefone: dadosExternos.telefone || '',
      email: dadosExternos.email || ''
    };

    console.log(`Cadastrando empresa automaticamente: ${novaEmpresa.razaoSocial}`);
    const empresaCadastrada = await db.criarEmpresa(novaEmpresa);
    
    return { empresa: empresaCadastrada, cadastradaAutomaticamente: true };

  } catch (error) {
    console.error(`Erro ao buscar/cadastrar empresa CNPJ ${cnpj}:`, error);
    throw error;
  }
}

// ==================== ROTAS DE IMPORTAÇÃO ====================

// Importar arquivos RPS
app.post('/api/importar-rps', upload.array('arquivos'), async (req, res) => {
  try {
    const { atualizarExistentes, ignorarDuplicadas } = req.body;
    const arquivos = req.files;
    const resultados = [];

    for (const arquivo of arquivos) {
      try {
        const conteudo = fs.readFileSync(arquivo.path, 'utf-8');
        const hashArquivo = calcularHashArquivo(conteudo);
        
        // Processar arquivo com layout dinâmico
        console.log(`Processando arquivo: ${arquivo.originalname}`);
        
        // Usar o sistema de layouts dinâmicos
        const dadosProcessados = layoutManager.processarArquivo(conteudo);
        
        console.log(`Dados processados com layout ${dadosProcessados.layout}:`, {
          totalDetalhes: dadosProcessados.detalhes?.length || 0,
          valorTotalEstatisticas: dadosProcessados.estatisticas?.valorTotal || 0,
          temCabecalho: !!dadosProcessados.cabecalho,
          temRodape: !!dadosProcessados.rodape,
          cnpjCabecalho: dadosProcessados.cabecalho?.cnpj
        });
        
        if (!dadosProcessados.cabecalho?.cnpj) {
          resultados.push({
            arquivo: arquivo.originalname,
            status: 'erro',
            mensagem: 'CNPJ não encontrado no cabeçalho'
          });
          continue;
        }

        // Verificar se empresa existe ou criar automaticamente
        let resultadoEmpresa;
        try {
          resultadoEmpresa = await buscarECadastrarEmpresa(dadosProcessados.cabecalho.cnpj);
        } catch (error) {
          resultados.push({
            arquivo: arquivo.originalname,
            status: 'erro',
            mensagem: `Erro ao buscar/cadastrar empresa: ${error.message}`
          });
          continue;
        }

        const empresa = resultadoEmpresa.empresa;

        // Verificar se arquivo já foi importado
        const arquivoExistente = await db.verificarArquivoExiste(hashArquivo);
        if (arquivoExistente && ignorarDuplicadas === 'true') {
          resultados.push({
            arquivo: arquivo.originalname,
            status: 'ignorado',
            mensagem: 'Arquivo já importado anteriormente'
          });
          continue;
        }

        // Criar registro do arquivo
        console.log(`Criando registro do arquivo com valorTotal: ${dadosProcessados.estatisticas?.valorTotal || 0}`);
        const novoArquivo = await db.criarArquivo({
          empresaId: empresa.id,
          nomeArquivo: arquivo.originalname,
          hashArquivo: hashArquivo,
          totalRps: dadosProcessados.detalhes.length,
          valorTotal: dadosProcessados.estatisticas?.valorTotal || 0,
          dataInicio: dadosProcessados.cabecalho?.dataInicio,
          dataFim: dadosProcessados.cabecalho?.dataFim
        });

        // Importar RPS
        let rpsImportados = 0;
        let rpsAtualizados = 0;

        for (const rps of dadosProcessados.detalhes) {
          try {
            await db.criarRps({
              arquivoId: novoArquivo.id,
              empresaId: empresa.id,
              numeroRps: rps.numeroRps,
              serieRps: rps.serieRps || '',
              tipoRps: rps.tipoRps || '1',
              dataEmissao: rps.dataEmissao,
              dataCompetencia: rps.dataCompetencia || rps.dataEmissao,
              prestadorCnpj: dadosProcessados.cabecalho.cnpj,
              prestadorInscricaoMunicipal: dadosProcessados.cabecalho.inscricaoMunicipal,
              discriminacao: rps.discriminacao || 'Serviços diversos',
              valorServicos: rps.valorServicos || 0,
              valorIss: rps.valorIss || 0,
              baseCalculo: rps.baseCalculo || rps.valorServicos || 0,
              aliquota: rps.aliquota || 0,
              tipoEquipamento: rps.tipoEquipamento,
              numeroSerie: rps.numeroSerie
            });
            rpsImportados++;
          } catch (rpsError) {
            if (rpsError.code === 'SQLITE_CONSTRAINT_UNIQUE' && atualizarExistentes === 'true') {
              // Atualizar RPS existente
              rpsAtualizados++;
            }
          }
        }

        resultados.push({
          arquivo: arquivo.originalname,
          status: 'sucesso',
          empresa: empresa.razao_social,
          empresaCadastradaAutomaticamente: resultadoEmpresa.cadastradaAutomaticamente,
          rpsImportados,
          rpsAtualizados,
          valorTotal: ((dadosProcessados.resumo?.valorTotal || 0) / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })
        });

      } catch (arquivoError) {
        console.error(`Erro ao processar arquivo ${arquivo.originalname}:`, arquivoError);
        resultados.push({
          arquivo: arquivo.originalname,
          status: 'erro',
          mensagem: arquivoError.message
        });
      }

      // Limpar arquivo temporário
      fs.unlinkSync(arquivo.path);
    }

    res.json({ resultados });
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE RPS ====================

// Buscar RPS por período
app.get('/api/rps', async (req, res) => {
  try {
    const { empresaId, dataInicio, dataFim } = req.query;
    
    if (!empresaId || !dataInicio || !dataFim) {
      return res.status(400).json({ erro: 'Parâmetros obrigatórios: empresaId, dataInicio, dataFim' });
    }

    const rps = await db.buscarRpsPorPeriodo(empresaId, dataInicio, dataFim);
    
    // Calcular totais
    const valorTotal = rps.reduce((sum, item) => sum + parseFloat(item.valor_servicos || 0), 0);
    const valorISS = rps.reduce((sum, item) => sum + parseFloat(item.valor_iss || 0), 0);

    res.json({
      rps,
      totais: {
        quantidade: rps.length,
        valorTotal: valorTotal.toFixed(2),
        valorISS: valorISS.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Atualizar RPS em massa
app.put('/api/rps/massa', async (req, res) => {
  try {
    const { ids, dadosAtualizacao } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ erro: 'IDs são obrigatórios' });
    }

    let totalAtualizados = 0;
    for (const id of ids) {
      const resultado = await db.atualizarRps(id, dadosAtualizacao);
      totalAtualizados += resultado.changes;
    }

    res.json({ 
      mensagem: `${totalAtualizados} RPS atualizados com sucesso`,
      totalAtualizados 
    });
  } catch (error) {
    console.error('Erro ao atualizar RPS em massa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Excluir RPS em massa
app.delete('/api/rps/massa', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ erro: 'IDs são obrigatórios' });
    }

    const resultado = await db.excluirRps(ids);
    
    res.json({ 
      mensagem: `${resultado.changes} RPS excluídos com sucesso`,
      totalExcluidos: resultado.changes
    });
  } catch (error) {
    console.error('Erro ao excluir RPS em massa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar RPS individual
app.get('/api/rps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rps = await db.buscarRpsPorId(id);
    
    if (!rps) {
      return res.status(404).json({ erro: 'RPS não encontrado' });
    }
    
    res.json(rps);
  } catch (error) {
    console.error('Erro ao buscar RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Atualizar RPS individual
app.put('/api/rps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizacao = req.body;
    
    const resultado = await db.atualizarRps(id, dadosAtualizacao);
    
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'RPS não encontrado' });
    }
    
    res.json({ mensagem: 'RPS atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Excluir RPS individual
app.delete('/api/rps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await db.excluirRps([id]);
    
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'RPS não encontrado' });
    }
    
    res.json({ mensagem: 'RPS excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Estatísticas de RPS
app.get('/api/rps/estatisticas/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { ano } = req.query;
    
    const estatisticas = await db.obterEstatisticasRps(empresaId, ano || new Date().getFullYear());
    
    res.json(estatisticas);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Criar novo RPS
app.post('/api/rps', async (req, res) => {
  try {
    const dadosRps = req.body;
    
    // Validações básicas
    if (!dadosRps.empresa_id || !dadosRps.numero || !dadosRps.data_emissao) {
      return res.status(400).json({ erro: 'Campos obrigatórios: empresa_id, numero, data_emissao' });
    }

    // Verificar se já existe RPS com mesmo número para a empresa
    const rpsExistente = await db.buscarRpsPorNumero(dadosRps.empresa_id, dadosRps.numero);
    if (rpsExistente) {
      return res.status(400).json({ erro: 'Já existe um RPS com este número para esta empresa' });
    }

    const novoRps = await db.criarRps(dadosRps);
    
    res.status(201).json({ 
      mensagem: 'RPS criado com sucesso',
      rps: novoRps
    });
  } catch (error) {
    console.error('Erro ao criar RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// APIs para Layouts

// Listar layouts
app.get('/api/layouts', async (req, res) => {
  try {
    // Combina layouts do banco de dados com layouts dinâmicos
    const layoutsBD = await db.listarLayouts();
    const layoutsDinamicos = layoutManager.listarLayouts();
    
    // Adiciona informação de origem
    const layoutsCompletos = [
      ...layoutsBD.map(layout => ({ ...layout, origem: 'banco' })),
      ...layoutsDinamicos.map(layout => ({ ...layout, origem: 'dinamico' }))
    ];
    
    res.json(layoutsCompletos);
  } catch (error) {
    console.error('Erro ao buscar layouts:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar layout por ID
app.get('/api/layouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro tenta buscar no sistema dinâmico
    let layout = layoutManager.obterLayout(id);
    
    if (layout) {
      res.json({ ...layout, origem: 'dinamico' });
      return;
    }
    
    // Se não encontrar, busca no banco de dados
    layout = await db.buscarLayoutPorId(id);
    
    if (!layout) {
      return res.status(404).json({ erro: 'Layout não encontrado' });
    }
    
    res.json(layout);
  } catch (error) {
    console.error('Erro ao buscar layout:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar tipos de registro de um layout
app.get('/api/layouts/:id/tipos', async (req, res) => {
  try {
    const { id } = req.params;
    const tipos = await db.buscarTiposRegistroPorLayout(id);
    res.json(tipos);
  } catch (error) {
    console.error('Erro ao buscar tipos de registro:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Criar novo layout
app.post('/api/layouts', async (req, res) => {
  try {
    const { layout_id, nome, descricao, versao, status, tipos_registro } = req.body;
    
    // Validações básicas
    if (!layout_id || !nome) {
      return res.status(400).json({ erro: 'Campos obrigatórios: layout_id, nome' });
    }

    if (!tipos_registro || tipos_registro.length === 0) {
      return res.status(400).json({ erro: 'Pelo menos um tipo de registro deve ser definido' });
    }

    // Criar o layout
    const novoLayout = await db.criarLayoutNovoSistema({
      layout_id,
      nome,
      descricao,
      versao: versao || '1.0',
      status: status || 'ativo'
    });

    // Criar os tipos de registro
    for (const tipo of tipos_registro) {
      if (!tipo.codigo_tipo || !tipo.nome_tipo) {
        return res.status(400).json({ erro: 'Cada tipo de registro deve ter código e nome' });
      }

      await db.criarTipoRegistro(novoLayout.id, {
        codigo_tipo: tipo.codigo_tipo,
        nome_tipo: tipo.nome_tipo,
        descricao: tipo.descricao || '',
        campos: JSON.stringify(tipo.campos || []),
        obrigatorio: tipo.obrigatorio !== false,
        ordem: tipo.ordem || 0
      });
    }
    
    res.status(201).json({ 
      mensagem: 'Layout criado com sucesso',
      layout: novoLayout
    });
  } catch (error) {
    console.error('Erro ao criar layout:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ erro: 'ID do layout já existe' });
    } else {
      res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  }
});

// Atualizar layout
app.put('/api/layouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { layout_id, nome, descricao, versao, status, tipos_registro } = req.body;
    
    // Validações básicas
    if (!layout_id || !nome) {
      return res.status(400).json({ erro: 'Campos obrigatórios: layout_id, nome' });
    }

    // Atualizar dados básicos do layout
    const resultado = await db.atualizarLayoutNovoSistema(id, {
      layout_id,
      nome,
      descricao,
      versao,
      status
    });
    
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Layout não encontrado' });
    }

    // Se tipos_registro foram fornecidos, atualizar
    if (tipos_registro && Array.isArray(tipos_registro)) {
      // Remover tipos existentes
      await db.excluirTiposRegistroPorLayout(id);

      // Adicionar novos tipos
      for (const tipo of tipos_registro) {
        await db.criarTipoRegistro(id, {
          codigo_tipo: tipo.codigo_tipo,
          nome_tipo: tipo.nome_tipo,
          descricao: tipo.descricao || '',
          campos: JSON.stringify(tipo.campos || []),
          obrigatorio: tipo.obrigatorio !== false,
          ordem: tipo.ordem || 0
        });
      }
    }
    
    res.json({ mensagem: 'Layout atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar layout:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Excluir layouts
app.delete('/api/layouts', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ erro: 'IDs são obrigatórios' });
    }

    const resultado = await db.excluirLayouts(ids);
    
    res.json({ 
      mensagem: `${resultado.changes} layout(s) excluído(s) com sucesso`,
      totalExcluidos: resultado.changes
    });
  } catch (error) {
    console.error('Erro ao excluir layouts:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Excluir layout individual
app.delete('/api/layouts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const resultado = await db.excluirLayout(id);
    
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Layout não encontrado' });
    }
    
    res.json({ mensagem: 'Layout excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir layout:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Ativar/Desativar layouts em massa
app.put('/api/layouts/status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ erro: 'IDs são obrigatórios' });
    }

    if (!status || !['ativo', 'inativo'].includes(status)) {
      return res.status(400).json({ erro: 'Status deve ser "ativo" ou "inativo"' });
    }

    const resultado = await db.atualizarStatusLayouts(ids, status);
    
    res.json({ 
      mensagem: `${resultado.changes} layout(s) ${status === 'ativo' ? 'ativado(s)' : 'desativado(s)'} com sucesso`,
      totalAtualizados: resultado.changes
    });
  } catch (error) {
    console.error('Erro ao atualizar status dos layouts:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Estatísticas de layouts
app.get('/api/layouts/estatisticas', async (req, res) => {
  try {
    const estatisticas = await db.obterEstatisticasLayouts();
    res.json(estatisticas);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de layouts:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ==================== APIs PARA LAYOUTS DINÂMICOS ====================

// Criar layout dinâmico
app.post('/api/layouts/dinamico', async (req, res) => {
  try {
    const layout = req.body;
    
    // Validar layout
    const validacao = layoutManager.validarLayout(layout);
    if (!validacao.valido) {
      return res.status(400).json({ 
        erro: 'Layout inválido', 
        detalhes: validacao.erros 
      });
    }

    // Usar o método atualizado que persiste no banco
    const novoLayout = await layoutManager.adicionarLayout(layout);
    
    res.status(201).json({ 
      mensagem: 'Layout dinâmico criado com sucesso',
      layout: novoLayout
    });
  } catch (error) {
    console.error('Erro ao criar layout dinâmico:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Testar processamento com layout específico
app.post('/api/layouts/testar', upload.single('arquivo'), async (req, res) => {
  try {
    let conteudo;
    const { layoutId, mostrarDetalhes, validarCampos } = req.body;
    
    // Se foi enviado um arquivo, lê o conteúdo
    if (req.file) {
      conteudo = req.file.buffer.toString('utf8');
    } else if (req.body.conteudo) {
      conteudo = req.body.conteudo;
    } else {
      return res.status(400).json({ erro: 'Arquivo ou conteúdo é obrigatório' });
    }

    if (!layoutId) {
      return res.status(400).json({ erro: 'Layout ID é obrigatório' });
    }

    // Busca o layout no banco
    const layout = await db.buscarLayoutPorLayoutId(layoutId);
    if (!layout) {
      return res.status(404).json({ erro: 'Layout não encontrado' });
    }

    // Processa o arquivo com o layout específico
    const resultado = layoutManager.processarArquivo(conteudo, layoutId);
    
    // Calcula estatísticas do teste
    const linhas = conteudo.split('\n').filter(linha => linha.trim());
    const registrosProcessados = resultado.registros ? resultado.registros.length : 0;
    const registrosComErro = resultado.erros ? resultado.erros.length : 0;
    
    const resposta = {
      mensagem: 'Teste executado com sucesso',
      layout: {
        id: layout.layout_id,
        nome: layout.nome,
        versao: layout.versao
      },
      arquivo: {
        nome: req.file ? req.file.originalname : 'Conteúdo direto',
        tamanho: conteudo.length,
        linhas: linhas.length
      },
      registros: {
        total: registrosProcessados,
        validos: registrosProcessados - registrosComErro,
        erros: registrosComErro
      }
    };

    // Adiciona detalhes se solicitado
    if (mostrarDetalhes === 'true') {
      resposta.detalhes = {
        estruturaLayout: layout.estrutura_completa || layout.estrutura,
        formatacao: layout.formatacao,
        processamento: resultado
      };
    }

    // Adiciona validação de campos se solicitado
    if (validarCampos === 'true' && resultado.registros) {
      const validacao = resultado.registros.map(registro => {
        const errosCampos = [];
        Object.entries(registro).forEach(([campo, valor]) => {
          if (!valor || valor.toString().trim() === '') {
            errosCampos.push(`Campo ${campo} vazio`);
          }
        });
        return {
          registro: registro,
          erros: errosCampos
        };
      });
      resposta.validacao = validacao;
    }
    
    res.json(resposta);
  } catch (error) {
    console.error('Erro ao testar layout:', error);
    res.status(500).json({ 
      erro: error.message,
      detalhes: 'Erro durante o processamento do teste'
    });
  }
});

// Detectar layout automaticamente
app.post('/api/layouts/detectar', async (req, res) => {
  try {
    const { conteudo } = req.body;
    
    if (!conteudo) {
      return res.status(400).json({ erro: 'Conteúdo do arquivo é obrigatório' });
    }

    const layout = layoutManager.detectarLayout(conteudo);
    
    res.json({
      mensagem: 'Layout detectado com sucesso',
      layout: layout
    });
  } catch (error) {
    console.error('Erro ao detectar layout:', error);
    res.status(400).json({ erro: error.message });
  }
});

// Obter informações do sistema de layouts
app.get('/api/layouts/sistema/info', (req, res) => {
  try {
    const layouts = layoutManager.listarLayouts();
    const defaultLayout = layoutManager.defaultLayout;
    
    res.json({
      totalLayouts: layouts.length,
      layoutPadrao: defaultLayout?.id || null,
      layouts: layouts.map(l => ({
        id: l.id,
        nome: l.nome,
        tipo: l.tipo,
        descricao: l.descricao
      }))
    });
  } catch (error) {
    console.error('Erro ao obter info do sistema:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Também disponível em http://0.0.0.0:${PORT}`);
  
  // Inicializar o sistema de layouts dinâmicos
  try {
    await layoutManager.initialize(db);
    console.log('Sistema de layouts dinâmicos inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar sistema de layouts:', error);
  }
});
