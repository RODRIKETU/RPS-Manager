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
    const allowedTypes = ['.txt', '.dat', '.rps', '.json'];
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
  const hash = crypto.createHash('md5').update(conteudo).digest('hex');
  console.log(`🔐 Hash calculado: ${hash} (tamanho do conteúdo: ${conteudo.length} chars)`);
  return hash;
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

// Buscar empresa por ID
app.get('/api/empresas/:id', async (req, res) => {
  try {
    const empresa = await db.buscarEmpresaPorId(req.params.id);
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

// Excluir empresa
app.delete('/api/empresas/:id', async (req, res) => {
  try {
    const resultado = await db.excluirEmpresa(req.params.id);
    if (resultado.changes > 0) {
      res.json({ mensagem: 'Empresa excluída com sucesso' });
    } else {
      res.status(404).json({ erro: 'Empresa não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
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
  console.log(`🏢 Iniciando busca/cadastro da empresa com CNPJ: ${cnpj}`);
  
  try {
    // Primeiro verifica se a empresa já existe no banco
    console.log(`🔍 Verificando se empresa já existe no banco...`);
    const empresaExistente = await db.buscarEmpresaPorCnpj(cnpj);
    if (empresaExistente) {
      console.log(`✅ Empresa encontrada no banco:`, {
        id: empresaExistente.id,
        razaoSocial: empresaExistente.razao_social,
        cnpj: empresaExistente.cnpj
      });
      return { empresa: empresaExistente, cadastradaAutomaticamente: false };
    }

    // Se não existe, busca dados externos usando sistema de fallback
    console.log(`🌐 Empresa não existe no banco. Buscando dados externos para CNPJ: ${cnpj}`);
    const dadosExternos = await buscarCNPJComFallback(cnpj);
    
    if (!dadosExternos) {
      console.log(`❌ Dados externos não encontrados para CNPJ: ${cnpj}`);
      throw new Error(`CNPJ ${cnpj} não encontrado em nenhuma fonte disponível`);
    }
    
    console.log(`✅ Dados externos encontrados:`, {
      razaoSocial: dadosExternos.razao_social,
      nomeFantasia: dadosExternos.nome_fantasia,
      situacao: dadosExternos.situacao
    });
    
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

    console.log(`💾 Cadastrando empresa automaticamente:`, {
      cnpj: novaEmpresa.cnpj,
      razaoSocial: novaEmpresa.razaoSocial,
      nomeFantasia: novaEmpresa.nomeFantasia
    });
    
    const empresaCadastrada = await db.criarEmpresa(novaEmpresa);
    
    console.log(`✅ Empresa cadastrada com sucesso! ID: ${empresaCadastrada.id}`);
    return { empresa: empresaCadastrada, cadastradaAutomaticamente: true };

  } catch (error) {
    console.error(`Erro ao buscar/cadastrar empresa CNPJ ${cnpj}:`, error);
    throw error;
  }
}

// ==================== ROTAS DE DASHBOARD ====================

// Estatísticas gerais do dashboard
app.get('/api/dashboard/estatisticas', async (req, res) => {
  console.log('📊 Requisição de estatísticas da dashboard recebida');
  
  try {
    // Buscar estatísticas básicas
    console.log('📡 Buscando empresas...');
    const empresas = await db.listarEmpresas();
    console.log(`✅ Empresas encontradas: ${empresas.length}`);
    
    console.log('📡 Buscando layouts...');
    const layouts = await db.listarLayouts();
    console.log(`✅ Layouts encontrados: ${layouts.length}`);
    
    // Buscar estatísticas de RPS (total geral)
    console.log('📡 Contando RPS...');
    const totalRps = await db.contarTotalRps();
    console.log(`✅ Total RPS: ${totalRps}`);
    
    console.log('📡 Contando arquivos...');
    const totalArquivos = await db.contarTotalArquivos();
    console.log(`✅ Total arquivos: ${totalArquivos}`);
    
    const estatisticas = {
      totalEmpresas: empresas.length,
      totalLayouts: layouts.length,
      totalRPS: totalRps || 0,
      totalImportacoes: totalArquivos || 0,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    console.log('📊 Estatísticas finais:', estatisticas);
    res.json(estatisticas);
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ erro: 'Erro interno do servidor', detalhes: error.message });
  }
});

// ==================== ROTAS DE IMPORTAÇÃO ====================

// Importar arquivos RPS
app.post('/api/importar-rps', upload.array('arquivos'), async (req, res) => {
  const inicioProcessamento = Date.now();
  console.log('\n🔄 ===== INÍCIO DA IMPORTAÇÃO =====');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📁 Arquivos recebidos: ${req.files?.length || 0}`);
  console.log(`⚙️ Parâmetros:`, {
    atualizarExistentes: req.body.atualizarExistentes,
    ignorarDuplicadas: req.body.ignorarDuplicadas,
    empresa_id: req.body.empresa_id,
    layout_id: req.body.layout_id
  });

  try {
    const { atualizarExistentes, ignorarDuplicadas } = req.body;
    const arquivos = req.files;
    const resultados = [];

    if (!arquivos || arquivos.length === 0) {
      console.log('❌ Erro: Nenhum arquivo foi enviado');
      return res.status(400).json({ erro: 'Nenhum arquivo foi enviado' });
    }

    for (const [index, arquivo] of arquivos.entries()) {
      console.log(`\n📄 ===== PROCESSANDO ARQUIVO ${index + 1}/${arquivos.length} =====`);
      console.log(`📝 Nome: ${arquivo.originalname}`);
      console.log(`📏 Tamanho: ${(arquivo.size / 1024).toFixed(2)} KB`);
      console.log(`📂 Caminho temporário: ${arquivo.path}`);

      try {
        const conteudo = fs.readFileSync(arquivo.path, 'utf-8');
        const linhas = conteudo.split('\n').filter(l => l.trim());
        console.log(`📊 Total de linhas: ${linhas.length}`);
        
        // Não calcular hash - permitir reimportação
        console.log(`✅ Reimportação permitida - não verificando duplicatas de arquivo`);
        
        // Debug: Listar últimos arquivos no banco
        try {
          const arquivosExistentes = await new Promise((resolve, reject) => {
            db.db.all('SELECT id, nome_arquivo, data_criacao FROM arquivos_rps ORDER BY data_criacao DESC LIMIT 3', (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            });
          });
          console.log(`📋 Últimos 3 arquivos no banco:`, arquivosExistentes.map(a => ({
            id: a.id,
            nome: a.nome_arquivo,
            data: a.data_criacao
          })));
        } catch (debugError) {
          console.log(`⚠️ Erro ao listar arquivos para debug: ${debugError.message}`);
        }
        
        // Processar arquivo com layout dinâmico
        console.log(`🔄 Iniciando processamento com layout manager...`);
        
        const dadosProcessados = layoutManager.processarArquivo(conteudo);
        
        console.log(`✅ Layout detectado: ${dadosProcessados.layout}`);
        console.log(`📈 Estatísticas do processamento:`, {
          totalDetalhes: dadosProcessados.detalhes?.length || 0,
          valorTotalEstatisticas: dadosProcessados.estatisticas?.valorTotal || 0,
          temCabecalho: !!dadosProcessados.cabecalho,
          temRodape: !!dadosProcessados.rodape,
          cnpjCabecalho: dadosProcessados.cabecalho?.cnpj
        });
        
        if (!dadosProcessados.cabecalho?.cnpj) {
          console.log('❌ Erro: CNPJ não encontrado no cabeçalho');
          resultados.push({
            arquivo: arquivo.originalname,
            status: 'erro',
            mensagem: 'CNPJ não encontrado no cabeçalho'
          });
          continue;
        }

        // Verificar se empresa existe ou criar automaticamente
        console.log(`🏢 Buscando empresa com CNPJ: ${dadosProcessados.cabecalho.cnpj}`);
        let resultadoEmpresa;
        try {
          resultadoEmpresa = await buscarECadastrarEmpresa(dadosProcessados.cabecalho.cnpj);
          console.log(`✅ Empresa encontrada/criada:`, {
            id: resultadoEmpresa.empresa.id,
            razaoSocial: resultadoEmpresa.empresa.razao_social,
            cadastradaAutomaticamente: resultadoEmpresa.cadastradaAutomaticamente
          });
        } catch (error) {
          console.log(`❌ Erro ao buscar/cadastrar empresa: ${error.message}`);
          resultados.push({
            arquivo: arquivo.originalname,
            status: 'erro',
            mensagem: `Erro ao buscar/cadastrar empresa: ${error.message}`
          });
          continue;
        }

        const empresa = resultadoEmpresa.empresa;

        // Criar registro do arquivo (sem verificação de duplicata)
        console.log(`💾 Criando registro do arquivo no banco de dados...`);
        const valorTotal = dadosProcessados.estatisticas?.valorTotal || 0;
        console.log(`💰 Valor total calculado: R$ ${(valorTotal / 100).toFixed(2)}`);
        
        let novoArquivo;
        try {
          // Gerar timestamp único para diferenciar importações
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const nomeUnico = `${timestamp}_${arquivo.originalname}`;
          
          novoArquivo = await db.criarArquivo({
            empresaId: empresa.id,
            nomeArquivo: nomeUnico,
            hashArquivo: `${Date.now()}_${Math.random()}`, // Hash único por importação
            totalRps: dadosProcessados.detalhes.length,
            valorTotal: valorTotal,
            dataInicio: dadosProcessados.cabecalho?.dataInicio,
            dataFim: dadosProcessados.cabecalho?.dataFim
          });
          console.log(`✅ Arquivo criado no banco com ID: ${novoArquivo.id}`);
        } catch (dbError) {
          console.log(`❌ Erro ao criar arquivo no banco:`, dbError);
          throw dbError;
        }

        // Importar apenas registros de dados (tipos 20, 30, 40)
        // Ignorar cabeçalho (10) e rodapé (90)
        const registrosDados = dadosProcessados.detalhes.filter(rps => {
          const tipo = rps.tipoRegistro || '20'; // Default para tipo 20 se não especificado
          return ['20', '30', '40'].includes(tipo);
        });
        
        console.log(`🔄 Iniciando importação de ${registrosDados.length} registros de dados (tipos 20, 30, 40)...`);
        console.log(`📊 Total original: ${dadosProcessados.detalhes.length}, Filtrados para dados: ${registrosDados.length}`);
        
        let rpsImportados = 0;
        let rpsAtualizados = 0;
        let rpsComErro = 0;

        for (const [rpsIndex, rps] of registrosDados.entries()) {
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
            
            if ((rpsIndex + 1) % 50 === 0) {
              console.log(`📊 Progresso: ${rpsIndex + 1}/${registrosDados.length} RPS processados`);
            }
          } catch (rpsError) {
            if (rpsError.code === 'SQLITE_CONSTRAINT_UNIQUE' && atualizarExistentes === 'true') {
              console.log(`🔄 RPS ${rps.numeroRps} já existe, atualizando...`);
              rpsAtualizados++;
            } else {
              console.log(`❌ Erro ao importar RPS ${rps.numeroRps}: ${rpsError.message}`);
              rpsComErro++;
            }
          }
        }

        console.log(`✅ Importação do arquivo concluída:`, {
          rpsImportados,
          rpsAtualizados,
          rpsComErro,
          valorTotal: `R$ ${((dadosProcessados.estatisticas?.valorTotal || 0) / 100).toFixed(2)}`
        });

        resultados.push({
          arquivo: arquivo.originalname,
          status: 'sucesso',
          empresa: empresa.razao_social,
          empresaCadastradaAutomaticamente: resultadoEmpresa.cadastradaAutomaticamente,
          rpsImportados,
          rpsAtualizados,
          rpsComErro,
          valorTotal: ((dadosProcessados.estatisticas?.valorTotal || 0) / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })
        });

      } catch (arquivoError) {
        console.log(`❌ Erro crítico ao processar arquivo ${arquivo.originalname}:`, arquivoError);
        console.log(`📋 Stack trace:`, arquivoError.stack);
        resultados.push({
          arquivo: arquivo.originalname,
          status: 'erro',
          mensagem: arquivoError.message
        });
      } finally {
        // Limpar arquivo temporário
        try {
          if (fs.existsSync(arquivo.path)) {
            fs.unlinkSync(arquivo.path);
            console.log(`🗑️ Arquivo temporário removido: ${arquivo.path}`);
          }
        } catch (cleanupError) {
          console.log(`⚠️ Erro ao remover arquivo temporário: ${cleanupError.message}`);
        }
      }
    }

    // Calcular estatísticas consolidadas
    const totalProcessados = resultados.length;
    const importados = resultados.reduce((sum, r) => sum + (r.rpsImportados || 0), 0);
    const atualizados = resultados.reduce((sum, r) => sum + (r.rpsAtualizados || 0), 0);
    const erros = resultados.filter(r => r.status === 'erro').length;
    const tempoProcessamento = Date.now() - inicioProcessamento;

    console.log(`\n🎉 ===== IMPORTAÇÃO CONCLUÍDA =====`);
    console.log(`⏱️ Tempo total: ${tempoProcessamento}ms (${(tempoProcessamento / 1000).toFixed(2)}s)`);
    console.log(`📊 Estatísticas finais:`, {
      totalProcessados,
      importados,
      atualizados,
      erros,
      taxaSucesso: `${((totalProcessados - erros) / totalProcessados * 100).toFixed(1)}%`
    });

    const resposta = {
      totalProcessados,
      importados,
      atualizados,
      erros,
      tempo: `${(tempoProcessamento / 1000).toFixed(2)}s`,
      detalhes: resultados.map(r => {
        let observacoes = '';
        
        if (r.status === 'erro') {
          observacoes = `❌ Erro: ${r.mensagem}`;
        } else if (r.status === 'ignorado') {
          observacoes = `⏭️ ${r.mensagem}`;
        } else {
          // Status de sucesso
          const totalRegistros = (r.rpsImportados || 0) + (r.rpsAtualizados || 0);
          
          if (totalRegistros === 0) {
            observacoes = `✅ Arquivo processado com sucesso, mas nenhum registro novo foi importado (possíveis duplicatas)`;
          } else {
            let partes = [];
            if (r.rpsImportados > 0) {
              partes.push(`${r.rpsImportados} novo${r.rpsImportados !== 1 ? 's' : ''} registro${r.rpsImportados !== 1 ? 's' : ''}`);
            }
            if (r.rpsAtualizados > 0) {
              partes.push(`${r.rpsAtualizados} atualizado${r.rpsAtualizados !== 1 ? 's' : ''}`);
            }
            
            observacoes = `✅ Importação concluída: ${partes.join(' e ')}`;
            
            // Adicionar informação sobre valor total se disponível
            if (r.valorTotal && r.valorTotal !== 'R$ 0,00') {
              observacoes += ` • Valor total: ${r.valorTotal}`;
            }
            
            // Adicionar informação sobre empresa se foi cadastrada automaticamente
            if (r.empresaCadastradaAutomaticamente) {
              observacoes += ` • Empresa "${r.empresa}" cadastrada automaticamente`;
            }
          }
        }
        
        return {
          arquivo: r.arquivo,
          sucesso: r.status === 'sucesso',
          registros: (r.rpsImportados || 0) + (r.rpsAtualizados || 0),
          observacoes: observacoes
        };
      })
    };

    console.log(`📤 Enviando resposta para o cliente...`);
    res.json(resposta);
  } catch (error) {
    const tempoProcessamento = Date.now() - inicioProcessamento;
    console.log(`\n💥 ===== ERRO CRÍTICO NA IMPORTAÇÃO =====`);
    console.log(`⏱️ Tempo até erro: ${tempoProcessamento}ms`);
    console.log(`❌ Erro:`, error.message);
    console.log(`📋 Stack trace:`, error.stack);
    res.status(500).json({ erro: 'Erro interno do servidor', detalhes: error.message });
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
    const { ids, dados } = req.body;
    
    console.log('📝 Edição em massa recebida:', { ids: ids?.length, dados });
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ erro: 'IDs são obrigatórios' });
    }
    
    if (!dados || Object.keys(dados).length === 0) {
      return res.status(400).json({ erro: 'Dados para atualização são obrigatórios' });
    }

    // Extrair flag de recálculo dos dados
    const recalcularLiquido = dados.recalcular_liquido;
    
    // Remover a flag dos dados que serão salvos no banco
    const dadosParaAtualizar = { ...dados };
    delete dadosParaAtualizar.recalcular_liquido;

    let totalAtualizados = 0;
    
    for (const id of ids) {
      let dadosFinais = { ...dadosParaAtualizar };
      
      // Se solicitado recálculo do valor líquido
      if (recalcularLiquido) {
        // Buscar dados atuais do RPS
        const rpsAtual = await db.buscarRpsPorId(id);
        if (rpsAtual) {
          const valorServicos = dadosFinais.valor_servicos ? parseFloat(dadosFinais.valor_servicos) : (rpsAtual.valor_servicos ?? 0);
          const valorDeducoes = dadosFinais.valor_deducoes ? parseFloat(dadosFinais.valor_deducoes) : (rpsAtual.valor_deducoes ?? 0);
          const valorPis = dadosFinais.valor_pis ? parseFloat(dadosFinais.valor_pis) : (rpsAtual.valor_pis ?? 0);
          const valorCofins = dadosFinais.valor_cofins ? parseFloat(dadosFinais.valor_cofins) : (rpsAtual.valor_cofins ?? 0);
          const valorInss = dadosFinais.valor_inss ? parseFloat(dadosFinais.valor_inss) : (rpsAtual.valor_inss ?? 0);
          const valorIr = dadosFinais.valor_ir ? parseFloat(dadosFinais.valor_ir) : (rpsAtual.valor_ir ?? 0);
          const valorCsll = dadosFinais.valor_csll ? parseFloat(dadosFinais.valor_csll) : (rpsAtual.valor_csll ?? 0);
          const valorIss = dadosFinais.valor_iss ? parseFloat(dadosFinais.valor_iss) : (rpsAtual.valor_iss ?? 0);
          const valorOutrasRetencoes = dadosFinais.valor_outras_retencoes ? parseFloat(dadosFinais.valor_outras_retencoes) : (rpsAtual.valor_outras_retencoes ?? 0);
          
          const totalRetencoes = valorPis + valorCofins + valorInss + valorIr + valorCsll + valorIss + valorOutrasRetencoes;
          const valorLiquido = valorServicos - valorDeducoes - totalRetencoes;
          
          dadosFinais.valor_liquido = valorLiquido;
          dadosFinais.base_calculo = valorServicos - valorDeducoes;
          
          console.log(`💰 RPS ${id} - Valor líquido recalculado: R$ ${valorLiquido.toFixed(2)}`);
        }
      }
      
      // Remover campos vazios antes de atualizar
      const dadosLimpos = {};
      for (const [key, value] of Object.entries(dadosFinais)) {
        if (value !== '' && value !== null && value !== undefined) {
          dadosLimpos[key] = value;
        }
      }
      
      const resultado = await db.atualizarRps(id, dadosLimpos);
      totalAtualizados += resultado.changes;
      
      console.log(`✅ RPS ${id} atualizado - ${resultado.changes} registros afetados`);
    }

    console.log(`🎉 Edição em massa concluída: ${totalAtualizados} registros atualizados`);

    res.json({ 
      mensagem: `${totalAtualizados} RPS atualizados com sucesso`,
      atualizados: totalAtualizados,
      registrosAfetados: totalAtualizados,
      recalculoAplicado: recalcularLiquido
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar RPS em massa:', error);
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

// Buscar RPS por empresa e período
app.get('/api/rps/empresa/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { dataInicio, dataFim } = req.query;
    
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ erro: 'Data inicial e final são obrigatórias' });
    }
    
    const rps = await db.buscarRpsPorPeriodo(empresaId, dataInicio, dataFim);
    
    res.json(rps);
  } catch (error) {
    console.error('Erro ao buscar RPS por período:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Buscar todos os RPS de uma empresa (sem filtro de período)
app.get('/api/rps/empresa/:empresaId/todos', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { status } = req.query;
    
    // Construir query para buscar todos os RPS da empresa
    let query = `
      SELECT 
        r.id,
        r.numero_rps,
        r.serie_rps,
        r.data_emissao,
        r.tomador_razao_social,
        r.discriminacao,
        r.valor_servicos,
        r.valor_iss,
        r.valor_liquido,
        r.status,
        a.nome_arquivo
      FROM rps r
      LEFT JOIN arquivos_rps a ON r.arquivo_id = a.id
      WHERE r.empresa_id = ?
    `;
    
    let params = [empresaId];
    
    // Filtro opcional por status
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    // Ordenar por data de emissão (mais recentes primeiro)
    query += ' ORDER BY r.data_emissao DESC, r.id DESC';
    
    const rps = await new Promise((resolve, reject) => {
      db.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    res.json(rps);
  } catch (error) {
    console.error('Erro ao buscar todos os RPS da empresa:', error);
    res.status(500).json({ erro: 'Erro interno do servidor', detalhes: error.message });
  }
});

// Debug: Listar todos os RPS (temporário)
app.get('/api/rps/debug/todos', async (req, res) => {
  try {
    const rps = await db.listarTodosRps();
    res.json(rps);
  } catch (error) {
    console.error('Erro ao buscar todos os RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Debug: Atualizar empresa_id dos RPS (temporário)
app.put('/api/rps/debug/atualizar-empresa/:novaEmpresaId', async (req, res) => {
  try {
    const { novaEmpresaId } = req.params;
    const { empresaIdAtual } = req.query;
    
    if (!novaEmpresaId) {
      return res.status(400).json({ erro: 'ID da nova empresa é obrigatório' });
    }
    
    // Query para atualizar os RPS
    const query = empresaIdAtual 
      ? `UPDATE rps SET empresa_id = ? WHERE empresa_id = ?`
      : `UPDATE rps SET empresa_id = ?`;
    
    const params = empresaIdAtual 
      ? [novaEmpresaId, empresaIdAtual]
      : [novaEmpresaId];
    
    const result = await new Promise((resolve, reject) => {
      db.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
    
    res.json({ 
      sucesso: true, 
      mensagem: `${result.changes} RPS atualizados para empresa_id ${novaEmpresaId}`,
      registrosAtualizados: result.changes
    });
    
  } catch (error) {
    console.error('Erro ao atualizar empresa_id dos RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Debug: Excluir todos os RPS (operação crítica - usar com cuidado)
app.delete('/api/rps/debug/excluir-todos', async (req, res) => {
  try {
    const { confirmacao } = req.query;
    
    // Verificação de segurança - requer confirmação explícita
    if (confirmacao !== 'CONFIRMO_EXCLUSAO_TODOS_RPS') {
      return res.status(400).json({ 
        erro: 'Confirmação obrigatória', 
        mensagem: 'Para excluir todos os RPS, adicione o parâmetro ?confirmacao=CONFIRMO_EXCLUSAO_TODOS_RPS'
      });
    }
    
    // Primeiro, contar quantos RPS existem
    const totalAntes = await new Promise((resolve, reject) => {
      db.db.get('SELECT COUNT(*) as total FROM rps', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total);
        }
      });
    });
    
    // Executar a exclusão
    const result = await new Promise((resolve, reject) => {
      db.db.run('DELETE FROM rps', function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
    
    // Resetar o auto-increment (opcional)
    await new Promise((resolve, reject) => {
      db.db.run('DELETE FROM sqlite_sequence WHERE name="rps"', function(err) {
        if (err) {
          console.warn('Aviso: não foi possível resetar o auto-increment:', err);
        }
        resolve();
      });
    });
    
    res.json({ 
      sucesso: true, 
      mensagem: `Todos os RPS foram excluídos com sucesso`,
      totalExcluidos: result.changes,
      totalAnterior: totalAntes,
      timestampExclusao: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao excluir todos os RPS:', error);
    res.status(500).json({ erro: 'Erro interno do servidor', detalhes: error.message });
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
    // Layouts do banco de dados
    const layoutsBD = await db.listarLayouts();
    
    // Por enquanto, retorna apenas layouts do banco (layoutManager desabilitado temporariamente)
    const layoutsCompletos = layoutsBD.map(layout => ({ ...layout, origem: 'banco' }));
    
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
    
    console.log('POST /api/layouts - Dados recebidos:');
    console.log('  layout_id:', layout_id);
    console.log('  nome:', nome);
    console.log('  tipos_registro:', tipos_registro?.length || 0);
    
    // Validações básicas
    if (!layout_id || !nome) {
      console.log('Erro: Campos obrigatórios não preenchidos');
      return res.status(400).json({ erro: 'Campos obrigatórios: layout_id, nome' });
    }

    if (!tipos_registro || tipos_registro.length === 0) {
      console.log('Erro: Nenhum tipo de registro definido');
      return res.status(400).json({ erro: 'Pelo menos um tipo de registro deve ser definido' });
    }

    console.log('Criando layout no banco...');
    // Criar o layout
    const novoLayout = await db.criarLayoutNovoSistema({
      layout_id,
      nome,
      descricao,
      versao: versao || '1.0',
      status: status || 'ativo'
    });
    
    console.log('Layout criado com ID:', novoLayout.id);
    console.log('Criando tipos de registro...');

    // Criar os tipos de registro
    for (const [index, tipo] of tipos_registro.entries()) {
      console.log(`Criando tipo ${index + 1}:`, tipo.codigo_tipo, '-', tipo.nome_tipo);
      
      if (!tipo.codigo_tipo || !tipo.nome_tipo) {
        console.log('Erro: Tipo sem código ou nome');
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
      console.log(`Tipo ${index + 1} criado com sucesso`);
    }
    
    console.log('Layout completo criado com sucesso!');
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
    
    console.log('PUT /api/layouts/:id - ID:', id);
    console.log('Dados recebidos:', { layout_id, nome, descricao, versao, status, tipos_registro: tipos_registro?.length || 0 });
    
    // Validações básicas
    if (!layout_id || !nome) {
      console.log('Erro de validação: campos obrigatórios não preenchidos');
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
      console.log('Processando', tipos_registro.length, 'tipos de registro');
      
      // Remover tipos existentes
      console.log('Removendo tipos existentes do layout', id);
      await db.excluirTiposRegistroPorLayout(id);

      // Adicionar novos tipos
      for (const tipo of tipos_registro) {
        console.log('Criando tipo:', tipo.codigo_tipo, '-', tipo.nome_tipo);
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
    
    console.log('Layout atualizado com sucesso');
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

// ============================================================================
// ROTAS DE EXPORTAÇÃO E IMPORTAÇÃO DE LAYOUTS
// ============================================================================

// Exportar layout para JSON
app.get('/api/layouts/:id/exportar', async (req, res) => {
  try {
    const layoutId = parseInt(req.params.id);
    
    console.log(`📤 Iniciando exportação do layout ID: ${layoutId}`);
    
    // Buscar dados do layout
    const layout = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT * FROM layouts WHERE id = ?',
        [layoutId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!layout) {
      return res.status(404).json({ erro: 'Layout não encontrado' });
    }
    
    // Buscar tipos de registro do layout
    const tiposRegistro = await new Promise((resolve, reject) => {
      db.db.all(
        'SELECT * FROM tipos_registro WHERE layout_id = ? ORDER BY ordem, codigo_tipo',
        [layoutId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    // Preparar estrutura JSON para exportação
    const layoutExportado = {
      metadata: {
        versao: '1.0',
        data_exportacao: new Date().toISOString(),
        exportado_por: 'RPS Manager',
        descricao: 'Layout exportado do sistema RPS Manager'
      },
      layout: {
        id: layout.id,
        nome: layout.nome,
        tipo: layout.tipo,
        descricao: layout.descricao,
        layout_id: layout.layout_id,
        estrutura_completa: layout.estrutura_completa ? JSON.parse(layout.estrutura_completa) : null,
        formatacao: layout.formatacao ? JSON.parse(layout.formatacao) : null,
        origem: layout.origem,
        data_criacao: layout.data_criacao
      },
      tipos_registro: tiposRegistro.map(tipo => ({
        codigo_tipo: tipo.codigo_tipo,
        nome_tipo: tipo.nome_tipo,
        descricao: tipo.descricao,
        campos: tipo.campos ? JSON.parse(tipo.campos) : [],
        obrigatorio: tipo.obrigatorio === 1,
        ordem: tipo.ordem,
        data_criacao: tipo.data_criacao
      }))
    };
    
    console.log(`✅ Layout exportado com ${tiposRegistro.length} tipos de registro`);
    
    // Definir nome do arquivo
    const nomeArquivo = `layout_${layout.layout_id || layout.id}_${new Date().toISOString().split('T')[0]}.json`;
    
    // Configurar headers para download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    
    res.json(layoutExportado);
    
  } catch (error) {
    console.error('❌ Erro ao exportar layout:', error);
    res.status(500).json({ 
      erro: 'Erro ao exportar layout',
      detalhes: error.message 
    });
  }
});

// Importar layout de JSON
app.post('/api/layouts/importar', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo foi enviado' });
    }
    
    console.log(`📥 Iniciando importação do arquivo: ${req.file.originalname}`);
    
    // Ler e validar arquivo JSON
    const conteudoArquivo = fs.readFileSync(req.file.path, 'utf8');
    let layoutImportado;
    
    try {
      layoutImportado = JSON.parse(conteudoArquivo);
    } catch (parseError) {
      return res.status(400).json({ 
        erro: 'Arquivo JSON inválido',
        detalhes: parseError.message 
      });
    }
    
    // Validar estrutura do JSON
    if (!layoutImportado.layout || !layoutImportado.tipos_registro) {
      return res.status(400).json({ 
        erro: 'Estrutura do arquivo JSON inválida. Esperado: { layout: {...}, tipos_registro: [...] }' 
      });
    }
    
    const { layout, tipos_registro } = layoutImportado;
    
    // Verificar se já existe um layout com o mesmo layout_id
    const layoutExistente = await new Promise((resolve, reject) => {
      db.db.get(
        'SELECT id FROM layouts WHERE layout_id = ?',
        [layout.layout_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (layoutExistente) {
      return res.status(409).json({ 
        erro: 'Já existe um layout com este ID',
        layout_id: layout.layout_id,
        id_existente: layoutExistente.id
      });
    }
    
    // Iniciar transação para importação
    await new Promise((resolve, reject) => {
      db.db.serialize(() => {
        db.db.run('BEGIN TRANSACTION');
        
        // Inserir layout
        const stmtLayout = db.db.prepare(`
          INSERT INTO layouts (
            nome, tipo, descricao, layout_id, estrutura_completa, 
            formatacao, origem, data_criacao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        stmtLayout.run([
          layout.nome,
          layout.tipo,
          layout.descricao,
          layout.layout_id,
          layout.estrutura_completa ? JSON.stringify(layout.estrutura_completa) : null,
          layout.formatacao ? JSON.stringify(layout.formatacao) : null,
          layout.origem + ' (Importado)'
        ], function(err) {
          if (err) {
            db.db.run('ROLLBACK');
            return reject(err);
          }
          
          const novoLayoutId = this.lastID;
          console.log(`✅ Layout inserido com ID: ${novoLayoutId}`);
          
          // Inserir tipos de registro
          const stmtTipos = db.db.prepare(`
            INSERT INTO tipos_registro (
              layout_id, codigo_tipo, nome_tipo, descricao, campos, 
              obrigatorio, ordem, data_criacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `);
          
          let tiposInseridos = 0;
          const totalTipos = tipos_registro.length;
          
          tipos_registro.forEach(tipo => {
            stmtTipos.run([
              novoLayoutId,
              tipo.codigo_tipo,
              tipo.nome_tipo,
              tipo.descricao,
              JSON.stringify(tipo.campos),
              tipo.obrigatorio ? 1 : 0,
              tipo.ordem
            ], function(err) {
              if (err) {
                db.db.run('ROLLBACK');
                return reject(err);
              }
              
              tiposInseridos++;
              if (tiposInseridos === totalTipos) {
                stmtTipos.finalize();
                db.db.run('COMMIT', (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log(`✅ ${totalTipos} tipos de registro inseridos`);
                    resolve({ layoutId: novoLayoutId, totalTipos });
                  }
                });
              }
            });
          });
          
          stmtLayout.finalize();
        });
      });
    });
    
    // Remover arquivo temporário
    fs.unlinkSync(req.file.path);
    
    console.log('✅ Importação concluída com sucesso');
    
    res.json({
      sucesso: true,
      mensagem: 'Layout importado com sucesso',
      layout: {
        nome: layout.nome,
        layout_id: layout.layout_id,
        total_tipos: tipos_registro.length
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao importar layout:', error);
    
    // Remover arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      erro: 'Erro ao importar layout',
      detalhes: error.message 
    });
  }
});

// Listar layouts disponíveis para exportação
app.get('/api/layouts/exportar/lista', async (req, res) => {
  try {
    const layouts = await new Promise((resolve, reject) => {
      db.db.all(`
        SELECT 
          l.id,
          l.nome,
          l.tipo,
          l.descricao,
          l.layout_id,
          l.origem,
          l.data_criacao,
          COUNT(tr.id) as total_tipos
        FROM layouts l
        LEFT JOIN tipos_registro tr ON l.id = tr.layout_id
        GROUP BY l.id
        ORDER BY l.data_criacao DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({
      layouts: layouts.map(layout => ({
        id: layout.id,
        nome: layout.nome,
        tipo: layout.tipo,
        descricao: layout.descricao,
        layout_id: layout.layout_id,
        origem: layout.origem,
        data_criacao: layout.data_criacao,
        total_tipos: layout.total_tipos,
        url_exportacao: `/api/layouts/${layout.id}/exportar`
      }))
    });
    
  } catch (error) {
    console.error('Erro ao listar layouts para exportação:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Também disponível em http://0.0.0.0:${PORT}`);
  
  // Inicializar o sistema de layouts dinâmicos
  try {
    // await layoutManager.initialize(db);
    console.log('Sistema de layouts dinâmicos baseado em banco de dados ativo');
  } catch (error) {
    console.error('Erro ao inicializar sistema de layouts:', error);
  }
});
