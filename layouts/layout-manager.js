const fs = require('fs');
const path = require('path');

class LayoutManager {
  constructor() {
    this.layouts = new Map();
    this.defaultLayout = null;
  }

  // Método para processar arquivo com layout RJ padrão
  processarArquivo(conteudo, layoutId = null) {
    console.log(`🔄 LayoutManager: Iniciando processamento do arquivo`);
    console.log(`📏 Tamanho do conteúdo: ${conteudo.length} caracteres`);
    
    try {
      const linhas = conteudo.split('\n').filter(linha => linha.trim());
      console.log(`📊 Total de linhas válidas: ${linhas.length}`);
      
      const resultado = {
        layout: 'RJ_PADRAO_V1',
        cabecalho: null,
        detalhes: [],
        rodape: null,
        estatisticas: {
          valorTotal: 0,
          totalRps: 0
        }
      };

      let valorTotalCalculado = 0;
      let totalRpsCalculado = 0;
      let contadorTipos = {};

      for (const [index, linha] of linhas.entries()) {
        const tipoRegistro = linha.substring(0, 2);
        contadorTipos[tipoRegistro] = (contadorTipos[tipoRegistro] || 0) + 1;
        
        console.log(`📄 Linha ${index + 1}: Tipo ${tipoRegistro}, Tamanho: ${linha.length}`);
        
        switch (tipoRegistro) {
          case '10': // Cabeçalho - obrigatório
            console.log(`🏷️ Processando cabeçalho (linha ${index + 1})`);
            resultado.cabecalho = this.processarCabecalho(linha);
            console.log(`✅ Cabeçalho processado:`, {
              cnpj: resultado.cabecalho?.cnpj,
              inscricaoMunicipal: resultado.cabecalho?.inscricaoMunicipal,
              dataInicio: resultado.cabecalho?.dataInicio,
              dataFim: resultado.cabecalho?.dataFim
            });
            break;
            
          case '20': // Detalhe do RPS - obrigatório
          case '30': // RPS-C (Recibo Provisório de Cupons) - opcional
          case '40': // Declaração de Notas Convencionais - opcional
            console.log(`📝 Processando RPS tipo ${tipoRegistro} (linha ${index + 1})`);
            const rps = this.processarDetalheRPS(linha);
            if (rps) {
              resultado.detalhes.push(rps);
              valorTotalCalculado += rps.valorServicos || 0;
              totalRpsCalculado++;
              console.log(`✅ RPS processado: Num=${rps.numeroRps}, Valor=${rps.valorServicos}`);
            } else {
              console.log(`⚠️ RPS não processado na linha ${index + 1}`);
            }
            break;
            
          case '21': // Intermediário do Serviço - opcional
            // Processar dados do intermediário se necessário
            console.log(`ℹ️ Registro tipo 21 (Intermediário) encontrado na linha ${index + 1} - não processado no momento`);
            break;
            
          case '90': // Rodapé - obrigatório
            console.log(`📊 Processando rodapé (linha ${index + 1})`);
            resultado.rodape = this.processarRodape(linha);
            console.log(`✅ Rodapé processado:`, {
              totalRegistros: resultado.rodape?.totalRegistros,
              valorTotal: resultado.rodape?.valorTotal
            });
            break;
            
          default:
            console.log(`⚠️ Tipo de registro não reconhecido: ${tipoRegistro} na linha ${index + 1}`);
            break;
        }
      }

      console.log(`📊 Contadores de tipos de registro:`, contadorTipos);
      console.log(`💰 Valor total calculado: ${valorTotalCalculado}`);
      console.log(`📋 Total de RPS processados: ${totalRpsCalculado}`);

      resultado.estatisticas.valorTotal = valorTotalCalculado;
      resultado.estatisticas.totalRps = totalRpsCalculado;

      console.log(`✅ LayoutManager: Processamento concluído com sucesso`);
      return resultado;
    } catch (error) {
      console.error(`❌ LayoutManager: Erro ao processar arquivo:`, error);
      console.error(`📋 Stack trace:`, error.stack);
      throw new Error(`Erro no processamento: ${error.message}`);
    }
  }

  processarCabecalho(linha) {
    try {
      // Layout do cabeçalho tipo 10 - ANÁLISE DO ARQUIVO REAL
      // Linha real: 100032035458870001910000000033679242025080120250802
      // Posição 0-1: 10 (tipo)
      // Posição 2-4: 003 (versão)  
      // Posição 5: 2 (CNPJ)
      // Posição 6-19: 03545887000191 (CNPJ - 14 dígitos)
      // Posição 20-34: 000000003367924 (inscrição municipal)
      // Posição 35-42: 20250801 (data início)
      // Posição 43-50: 20250802 (data fim)
      
      return {
        tipoRegistro: linha.substring(0, 2),
        versao: linha.substring(2, 5),
        tipoIdentificacao: linha.substring(5, 6),
        cnpj: linha.substring(6, 20).replace(/\D/g, ''),
        inscricaoMunicipal: linha.substring(20, 35).trim(),
        dataInicio: this.formatarData(linha.substring(35, 43)),
        dataFim: this.formatarData(linha.substring(43, 51))
      };
    } catch (error) {
      console.error('Erro ao processar cabeçalho:', error);
      return null;
    }
  }

  processarDetalheRPS(linha) {
    try {
      const tipoRegistro = linha.substring(0, 2);
      
      switch (tipoRegistro) {
        case '20': // Detalhe do RPS - Layout oficial do banco
          return this.processarTipo20(linha);
          
        case '30': // RPS-C (Recibo Provisório de Cupons) - Layout oficial do banco
          return this.processarTipo30(linha);
          
        case '40': // Declaração de Notas Convencionais - Layout oficial do banco
          return this.processarTipo40(linha);
          
        default:
          console.warn(`Tipo de registro de detalhe não suportado: ${tipoRegistro}`);
          return null;
      }
    } catch (error) {
      console.error('Erro ao processar detalhe RPS:', error);
      return null;
    }
  }

  processarTipo20(linha) {
    // TIPO 20: Detalhe do RPS - BASEADO NO LAYOUT OFICIAL DO BANCO DE DADOS
    const numeroRps = linha.substring(8, 23).trim(); // Posições 9-23: Número do RPS (15 posições)
    const serieRps = linha.substring(3, 8).trim(); // Posições 4-8: Série do RPS (5 posições)
    const dataEmissaoStr = linha.substring(23, 31); // Posições 24-31: Data de emissão (8 posições)
    const valorServicosStr = linha.substring(700, 715); // Posições 701-715: Valor dos serviços (15 posições)
    const valorIssStr = linha.substring(850, 865); // Posições 851-865: Valor do ISS (15 posições)
    const tomadorCnpjCpf = linha.substring(33, 47).trim(); // Posições 34-47: CPF/CNPJ do Tomador (14 posições)
    const tomadorRazaoSocial = linha.substring(77, 192).trim(); // Posições 78-192: Nome/Razão Social do Tomador (115 posições)
    const discriminacao = linha.substring(954, 4954).trim(); // Posições 955-4954: Discriminação (4000 posições)

    const dataEmissao = this.formatarData(dataEmissaoStr);
    const valorServicos = this.formatarValor(valorServicosStr);
    const valorIss = this.formatarValor(valorIssStr);

    return {
      tipoRegistro: '20', // Identificador do tipo de registro
      numeroRps: numeroRps || `RPS-${Date.now()}`,
      serieRps: serieRps || '001',
      tipoRps: linha.substring(2, 3) || '0', // Posição 3: Tipo do RPS
      dataEmissao: dataEmissao || new Date().toISOString().split('T')[0],
      dataCompetencia: dataEmissao || new Date().toISOString().split('T')[0],
      valorServicos: valorServicos || 0,
      valorIss: valorIss || 0,
      baseCalculo: valorServicos || 0,
      aliquota: valorServicos > 0 ? ((valorIss / valorServicos) * 100) : 0,
      discriminacao: discriminacao || 'Serviços diversos',
      tomadorCnpj: tomadorCnpjCpf.length === 14 ? tomadorCnpjCpf : null,
      tomadorCpf: tomadorCnpjCpf.length === 11 ? tomadorCnpjCpf : null,
      tomadorRazaoSocial: tomadorRazaoSocial
    };
  }

  processarTipo30(linha) {
    // TIPO 30: RPS-C (Recibo Provisório de Cupons) - BASEADO NO LAYOUT OFICIAL DO BANCO DE DADOS
    const numeroRps = linha.substring(8, 23).trim(); // Posições 9-23: Número do RPS (15 posições)
    const serieRps = linha.substring(3, 8).trim(); // Posições 4-8: Série do RPS (5 posições)
    const dataEmissaoStr = linha.substring(23, 31); // Posições 24-31: Data de emissão (8 posições)
    const valorServicosStr = linha.substring(77, 92); // Posições 78-92: Valor dos serviços (15 posições)
    const valorIssStr = linha.substring(137, 152); // Posições 138-152: Valor do ISS (15 posições)
    const dataCompetenciaStr = linha.substring(153, 161); // Posições 154-161: Data de competência (8 posições)
    
    // A discriminação está no final (posições 212-4211)
    const discriminacao = linha.substring(211).trim() || 'ESTACIONAMENTO'; 
    
    const dataEmissao = this.formatarData(dataEmissaoStr);
    const dataCompetencia = this.formatarData(dataCompetenciaStr);
    const valorServicos = this.formatarValor(valorServicosStr);
    const valorIss = this.formatarValor(valorIssStr);
    
    return {
      tipoRegistro: '30', // Identificador do tipo de registro
      numeroRps: numeroRps || `RPS-${Date.now()}`,
      serieRps: serieRps || '001',
      tipoRps: '2', // Tipo 30 = RPS-C (tipo 2)
      dataEmissao: dataEmissao || new Date().toISOString().split('T')[0],
      dataCompetencia: dataCompetencia || dataEmissao || new Date().toISOString().split('T')[0],
      valorServicos: valorServicos || 0,
      valorIss: valorIss || 0,
      baseCalculo: valorServicos || 0,
      aliquota: valorServicos > 0 ? ((valorIss / valorServicos) * 100) : 0,
      discriminacao: discriminacao,
      tipoEquipamento: 'ESTACIONAMENTO'
    };
  }

  processarTipo40(linha) {
    // TIPO 40: Declaração de Notas Convencionais - BASEADO NO LAYOUT OFICIAL DO BANCO DE DADOS
    const numeroNota = linha.substring(9, 24).trim(); // Posições 10-24: Número da Nota Convencional (15 posições)
    const serieNota = linha.substring(4, 9).trim(); // Posições 5-9: Série da Nota Convencional (5 posições)
    const dataEmissaoStr = linha.substring(24, 32); // Posições 25-32: Data de emissão (8 posições)
    const valorServicosStr = linha.substring(700, 715); // Posições 701-715: Valor dos serviços (15 posições)
    const valorIssStr = linha.substring(760, 775); // Posições 761-775: Valor do ISS (15 posições)
    const prestadorCnpjCpf = linha.substring(34, 48).trim(); // Posições 35-48: CPF/CNPJ do Prestador (14 posições)
    const prestadorRazaoSocial = linha.substring(78, 193).trim(); // Posições 79-193: Nome/Razão Social do Prestador (115 posições)
    const discriminacao = linha.substring(814).trim(); // Posições 815+: Discriminação (4000 posições)

    const dataEmissao = this.formatarData(dataEmissaoStr);
    const valorServicos = this.formatarValor(valorServicosStr);
    const valorIss = this.formatarValor(valorIssStr);

    return {
      tipoRegistro: '40', // Identificador do tipo de registro
      numeroRps: numeroNota || `NOTA-${Date.now()}`,
      serieRps: serieNota || '001',
      tipoRps: '3', // Tipo 40 = Nota Convencional
      dataEmissao: dataEmissao || new Date().toISOString().split('T')[0],
      dataCompetencia: dataEmissao || new Date().toISOString().split('T')[0],
      valorServicos: valorServicos || 0,
      valorIss: valorIss || 0,
      baseCalculo: valorServicos || 0,
      aliquota: valorServicos > 0 ? ((valorIss / valorServicos) * 100) : 0,
      discriminacao: discriminacao || 'Nota Convencional',
      prestadorCnpj: prestadorCnpjCpf.length === 14 ? prestadorCnpjCpf : null,
      prestadorCpf: prestadorCnpjCpf.length === 11 ? prestadorCnpjCpf : null,
      prestadorRazaoSocial: prestadorRazaoSocial
    };
  }

  processarRodape(linha) {
    try {
      // Layout do rodapé tipo 90 - BASEADO NO LAYOUT OFICIAL DO BANCO DE DADOS
      // Estrutura conforme tipos_registro:
      // Posição 1-2: Tipo de registro (90)
      // Posição 3-10: Número de linhas de detalhe (8 posições)
      // Posição 11-25: Valor total dos serviços (15 posições)
      // Posição 26-40: Valor total das deduções (15 posições)
      
      return {
        tipoRegistro: linha.substring(0, 2),
        totalRps: parseInt(linha.substring(2, 10)) || 0,
        valorTotal: this.formatarValor(linha.substring(10, 25)),
        valorDeducoes: this.formatarValor(linha.substring(25, 40))
      };
    } catch (error) {
      console.error('Erro ao processar rodapé:', error);
      return null;
    }
  }

  formatarData(dataStr) {
    if (!dataStr || dataStr.length !== 8) return null;
    
    try {
      const ano = dataStr.substring(0, 4);
      const mes = dataStr.substring(4, 6);
      const dia = dataStr.substring(6, 8);
      return `${ano}-${mes}-${dia}`;
    } catch (error) {
      return null;
    }
  }

  formatarValor(valorStr) {
    if (!valorStr) return 0;
    
    try {
      // Remove caracteres não numéricos e converte centavos para reais
      const numero = valorStr.replace(/\D/g, '');
      return parseFloat(numero) / 100;
    } catch (error) {
      return 0;
    }
  }

  // Métodos compatíveis com o sistema existente
  obterLayout(id) {
    return {
      id: id || 'RJ_PADRAO_V1',
      nome: 'Layout Padrão RJ',
      tipo: 'rj-padrao'
    };
  }

  validarLayout(layout) {
    return { valido: true, erros: [] };
  }

  async adicionarLayout(layout) {
    return { id: Date.now(), ...layout };
  }

  detectarLayout(conteudo) {
    return 'RJ_PADRAO_V1';
  }

  listarLayouts() {
    return ['RJ_PADRAO_V1'];
  }
}

module.exports = new LayoutManager();
