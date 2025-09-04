/**
 * Sistema de Layouts Dinâmicos para RPS Manager Pro
 * 
 * Este módulo gerencia diferentes layouts de arquivos RPS, permitindo
 * processamento flexível baseado em configurações dinâmicas.
 * Integra com banco de dados SQLite para persistência.
 */

class LayoutManager {
  constructor() {
    this.layouts = new Map();
    this.defaultLayout = null;
    this.db = null;
  }

  /**
   * Inicializa o gerenciador com conexão ao banco de dados
   */
  async initialize(database) {
    this.db = database;
    await this.carregarLayoutsDoBanco();
    await this.inicializarLayoutPadrao();
  }

  /**
   * Carrega layouts do banco de dados
   */
  async carregarLayoutsDoBanco() {
    if (!this.db) return;
    
    try {
      const layouts = await this.db.listarLayouts();
      
      for (const layoutBD of layouts) {
        if (layoutBD.estrutura_completa && Object.keys(layoutBD.estrutura_completa).length > 0) {
          const layout = {
            id: layoutBD.layout_id || `layout_${layoutBD.id}`,
            nome: layoutBD.nome,
            descricao: layoutBD.descricao,
            tipo: layoutBD.tipo,
            versao: layoutBD.versao,
            origem: 'banco',
            database_id: layoutBD.id,
            estrutura: layoutBD.estrutura_completa,
            formatacao: layoutBD.formatacao || {
              data: 'YYYYMMDD',
              decimal: 'centavos',
              encoding: 'utf-8'
            }
          };
          
          this.layouts.set(layout.id, layout);
        }
      }
      
      console.log(`Carregados ${this.layouts.size} layouts do banco de dados`);
    } catch (error) {
      console.error('Erro ao carregar layouts do banco:', error);
    }
  }

  /**
   * Inicializa o layout padrão (criar se não existir)
   */
  async inicializarLayoutPadrao() {
    // Verifica se já existe um layout genérico no banco
    const layoutGenericoExistente = this.layouts.get('generico');
    
    if (!layoutGenericoExistente) {
      const layoutGenerico = this.criarLayoutGenericoPadrao();
      
      try {
        if (this.db) {
          await this.db.criarLayoutDinamico(layoutGenerico);
          console.log('Layout genérico padrão criado no banco de dados');
        }
        this.layouts.set(layoutGenerico.id, layoutGenerico);
      } catch (error) {
        console.error('Erro ao criar layout padrão no banco:', error);
        // Se falhar, adiciona apenas na memória
        this.layouts.set(layoutGenerico.id, layoutGenerico);
      }
    }
    
    this.setLayoutPadrao('generico');
  }

  /**
   * Cria a estrutura do layout genérico padrão
   */
  criarLayoutGenericoPadrao() {
    return {
      id: 'generico',
      nome: 'Layout Genérico RPS',
      descricao: 'Layout padrão para arquivos RPS diversos',
      tipo: 'servicos',
      origem: 'dinamico',
      estrutura: {
        cabecalho: {
          linha: 0,
          campos: {
            tipoRegistro: { posicao: 0, tamanho: 1 },
            cnpj: { posicao: 1, tamanho: 14 },
            inscricaoMunicipal: { posicao: 15, tamanho: 20 },
            razaoSocial: { posicao: 35, tamanho: 60 },
            dataInicio: { posicao: 95, tamanho: 8 },
            dataFim: { posicao: 103, tamanho: 8 }
          }
        },
        detalhe: {
          identificador: '2',
          campos: {
            tipoRegistro: { posicao: 0, tamanho: 1 },
            numeroRps: { posicao: 1, tamanho: 10 },
            serieRps: { posicao: 11, tamanho: 5 },
            tipoRps: { posicao: 16, tamanho: 1 },
            dataEmissao: { posicao: 17, tamanho: 8 },
            dataCompetencia: { posicao: 25, tamanho: 8 },
            valorServicos: { posicao: 33, tamanho: 15 },
            valorIss: { posicao: 48, tamanho: 15 },
            baseCalculo: { posicao: 63, tamanho: 15 },
            aliquota: { posicao: 78, tamanho: 6 },
            discriminacao: { posicao: 84, tamanho: 200 }
          }
        },
        rodape: {
          identificador: '9',
          campos: {
            tipoRegistro: { posicao: 0, tamanho: 1 },
            totalRps: { posicao: 1, tamanho: 10 },
            valorTotalServicos: { posicao: 11, tamanho: 15 },
            valorTotalIss: { posicao: 26, tamanho: 15 }
          }
        }
      },
      formatacao: {
        data: 'YYYYMMDD',
        decimal: 'centavos',
        encoding: 'utf-8'
      }
    };
  }

  /**
   * Adiciona um novo layout ao sistema
   */
  async adicionarLayout(layout) {
    if (!layout.id || !layout.estrutura) {
      throw new Error('Layout inválido: ID e estrutura são obrigatórios');
    }
    
    // Adiciona na memória
    this.layouts.set(layout.id, layout);
    
    // Persiste no banco se disponível
    if (this.db) {
      try {
        const layoutBD = await this.db.criarLayoutDinamico(layout);
        layout.database_id = layoutBD.database_id;
        console.log(`Layout ${layout.id} persistido no banco com ID ${layoutBD.database_id}`);
      } catch (error) {
        console.error('Erro ao persistir layout no banco:', error);
        // Se falhar no banco, mantém apenas na memória
      }
    }
    
    return layout;
  }

  /**
   * Remove um layout do sistema
   */
  async removerLayout(layoutId) {
    if (layoutId === this.defaultLayout?.id) {
      throw new Error('Não é possível remover o layout padrão');
    }
    
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Layout ${layoutId} não encontrado`);
    }
    
    // Remove da memória
    const removido = this.layouts.delete(layoutId);
    
    // Remove do banco se tiver database_id
    if (this.db && layout.database_id) {
      try {
        await this.db.excluirLayouts([layout.database_id]);
        console.log(`Layout ${layoutId} removido do banco`);
      } catch (error) {
        console.error('Erro ao remover layout do banco:', error);
      }
    }
    
    return removido;
  }

  /**
   * Define o layout padrão
   */
  setLayoutPadrao(layoutId) {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Layout ${layoutId} não encontrado`);
    }
    
    this.defaultLayout = layout;
  }

  /**
   * Obtém um layout específico
   */
  obterLayout(layoutId) {
    return this.layouts.get(layoutId);
  }

  /**
   * Lista todos os layouts disponíveis
   */
  listarLayouts() {
    return Array.from(this.layouts.values());
  }

  /**
   * Detecta automaticamente o layout baseado no conteúdo do arquivo
   */
  detectarLayout(conteudo) {
    const linhas = conteudo.split('\n').map(linha => linha.trim()).filter(linha => linha);
    
    if (linhas.length < 3) {
      throw new Error('Arquivo muito pequeno para processamento');
    }

    // Verifica estrutura básica: primeira linha (cabeçalho), linhas intermediárias (detalhes), última linha (rodapé)
    const primeiraLinha = linhas[0];
    const ultimaLinha = linhas[linhas.length - 1];
    
    // Por enquanto, retorna o layout padrão
    // Futuramente, aqui será implementada lógica de detecção automática
    return this.defaultLayout;
  }

  /**
   * Processa um arquivo usando um layout específico
   */
  processarArquivo(conteudo, layoutId = null) {
    let layout;
    
    if (layoutId) {
      layout = this.obterLayout(layoutId);
      if (!layout) {
        throw new Error(`Layout ${layoutId} não encontrado`);
      }
    } else {
      layout = this.detectarLayout(conteudo);
    }

    return this.executarProcessamento(conteudo, layout);
  }

  /**
   * Executa o processamento do arquivo com o layout especificado
   */
  executarProcessamento(conteudo, layout) {
    const linhas = conteudo.split('\n').map(linha => linha.trim()).filter(linha => linha);
    
    if (linhas.length < 3) {
      throw new Error('Arquivo deve conter pelo menos cabeçalho, um detalhe e rodapé');
    }

    const resultado = {
      layout: layout.id,
      cabecalho: null,
      detalhes: [],
      rodape: null,
      estatisticas: {
        totalLinhas: linhas.length,
        totalRps: 0,
        valorTotal: 0
      }
    };

    // Processa cabeçalho (primeira linha)
    resultado.cabecalho = this.processarLinhaCabecalho(linhas[0], layout);

    // Processa rodapé (última linha)
    resultado.rodape = this.processarLinhaRodape(linhas[linhas.length - 1], layout);

    // Processa detalhes (linhas intermediárias)
    for (let i = 1; i < linhas.length - 1; i++) {
      const linha = linhas[i];
      
      // Verifica se é linha de detalhe
      if (this.isLinhaDetalhe(linha, layout)) {
        const detalhe = this.processarLinhaDetalhe(linha, layout);
        resultado.detalhes.push(detalhe);
        resultado.estatisticas.totalRps++;
        resultado.estatisticas.valorTotal += detalhe.valorServicos || 0;
      }
    }

    return resultado;
  }

  /**
   * Processa linha de cabeçalho
   */
  processarLinhaCabecalho(linha, layout) {
    const campos = layout.estrutura.cabecalho.campos;
    const resultado = {};

    for (const [nome, config] of Object.entries(campos)) {
      const valor = this.extrairCampo(linha, config);
      resultado[nome] = this.formatarCampo(valor, nome, layout);
    }

    return resultado;
  }

  /**
   * Processa linha de detalhe
   */
  processarLinhaDetalhe(linha, layout) {
    const campos = layout.estrutura.detalhe.campos;
    const resultado = {};

    for (const [nome, config] of Object.entries(campos)) {
      const valor = this.extrairCampo(linha, config);
      resultado[nome] = this.formatarCampo(valor, nome, layout);
    }

    return resultado;
  }

  /**
   * Processa linha de rodapé
   */
  processarLinhaRodape(linha, layout) {
    const campos = layout.estrutura.rodape.campos;
    const resultado = {};

    for (const [nome, config] of Object.entries(campos)) {
      const valor = this.extrairCampo(linha, config);
      resultado[nome] = this.formatarCampo(valor, nome, layout);
    }

    return resultado;
  }

  /**
   * Verifica se uma linha é de detalhe
   */
  isLinhaDetalhe(linha, layout) {
    const identificador = layout.estrutura.detalhe.identificador;
    return linha.charAt(0) === identificador;
  }

  /**
   * Extrai um campo da linha baseado na configuração
   */
  extrairCampo(linha, config) {
    const inicio = config.posicao;
    const fim = inicio + config.tamanho;
    return linha.substring(inicio, fim).trim();
  }

  /**
   * Formata um campo baseado no tipo e configuração do layout
   */
  formatarCampo(valor, nomeCampo, layout) {
    if (!valor) return null;

    // Formatação de datas
    if (nomeCampo.includes('data') || nomeCampo.includes('Data')) {
      return this.formatarData(valor, layout.formatacao.data);
    }

    // Formatação de valores monetários
    if (nomeCampo.includes('valor') || nomeCampo.includes('Valor') || 
        nomeCampo.includes('iss') || nomeCampo.includes('calculo')) {
      return this.formatarValor(valor, layout.formatacao.decimal);
    }

    // Formatação de números
    if (nomeCampo.includes('numero') || nomeCampo.includes('total') || 
        nomeCampo.includes('aliquota')) {
      return this.formatarNumero(valor);
    }

    return valor;
  }

  /**
   * Formata datas
   */
  formatarData(valor, formato) {
    if (formato === 'YYYYMMDD' && valor.length === 8) {
      const ano = valor.substring(0, 4);
      const mes = valor.substring(4, 6);
      const dia = valor.substring(6, 8);
      return `${ano}-${mes}-${dia}`;
    }
    return valor;
  }

  /**
   * Formata valores monetários
   */
  formatarValor(valor, formato) {
    const numero = parseInt(valor) || 0;
    if (formato === 'centavos') {
      return numero / 100;
    }
    return numero;
  }

  /**
   * Formata números
   */
  formatarNumero(valor) {
    return parseInt(valor) || 0;
  }

  /**
   * Valida um layout
   */
  validarLayout(layout) {
    const erros = [];

    if (!layout.id) erros.push('ID é obrigatório');
    if (!layout.nome) erros.push('Nome é obrigatório');
    if (!layout.estrutura) erros.push('Estrutura é obrigatória');

    if (layout.estrutura) {
      if (!layout.estrutura.cabecalho) erros.push('Estrutura de cabeçalho é obrigatória');
      if (!layout.estrutura.detalhe) erros.push('Estrutura de detalhe é obrigatória');
      if (!layout.estrutura.rodape) erros.push('Estrutura de rodapé é obrigatória');
    }

    return {
      valido: erros.length === 0,
      erros
    };
  }
}

// Instância singleton do gerenciador
const layoutManager = new LayoutManager();

module.exports = layoutManager;
