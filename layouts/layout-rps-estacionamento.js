// Layout RPS Estacionamento - Baseado no arquivo real
const LAYOUT_RPS_ESTACIONAMENTO = [
  // === CABEÇALHO (Registro Tipo 1) ===
  { start: 0, end: 1, name: 'TipoRegistro', tipo: 'N', descricao: 'Tipo do Registro (1=Cabeçalho)', obrigatorio: true },
  { start: 1, end: 15, name: 'CNPJ', tipo: 'N', descricao: 'CNPJ do Prestador', obrigatorio: true },
  { start: 15, end: 20, name: 'InscricaoMunicipal', tipo: 'N', descricao: 'Inscrição Municipal', obrigatorio: true },
  { start: 20, end: 35, name: 'NumeroLote', tipo: 'N', descricao: 'Número do Lote', obrigatorio: true },
  { start: 35, end: 43, name: 'DataInicio', tipo: 'N', descricao: 'Data Início (AAAAMMDD)', obrigatorio: true },
  { start: 43, end: 51, name: 'DataFim', tipo: 'N', descricao: 'Data Fim (AAAAMMDD)', obrigatorio: true },

  // === DETALHE RPS (Registro Tipo 3) ===
  { start: 0, end: 1, name: 'TipoRegistro', tipo: 'N', descricao: 'Tipo do Registro (3=Detalhe)', obrigatorio: true },
  { start: 1, end: 5, name: 'TipoEquipamento', tipo: 'X', descricao: 'Tipo do Equipamento', obrigatorio: true },
  { start: 5, end: 20, name: 'NumeroSerie', tipo: 'N', descricao: 'Número de Série do Equipamento', obrigatorio: true },
  { start: 20, end: 28, name: 'NumeroRPS', tipo: 'N', descricao: 'Número do RPS', obrigatorio: true },
  { start: 28, end: 36, name: 'DataEmissao', tipo: 'N', descricao: 'Data Emissão (AAAAMMDD)', obrigatorio: true },
  { start: 36, end: 37, name: 'StatusRPS', tipo: 'N', descricao: 'Status (1=Normal, 3=Cancelado)', obrigatorio: true },
  { start: 37, end: 52, name: 'ValorServicos', tipo: 'N', descricao: 'Valor dos Serviços (em centavos)', obrigatorio: true },
  { start: 52, end: 67, name: 'ValorDeducoes', tipo: 'N', descricao: 'Valor das Deduções (em centavos)', obrigatorio: false },
  { start: 67, end: 82, name: 'ValorPIS', tipo: 'N', descricao: 'Valor PIS (em centavos)', obrigatorio: false },
  { start: 82, end: 97, name: 'ValorCOFINS', tipo: 'N', descricao: 'Valor COFINS (em centavos)', obrigatorio: false },
  { start: 97, end: 112, name: 'ValorINSS', tipo: 'N', descricao: 'Valor INSS (em centavos)', obrigatorio: false },
  { start: 112, end: 127, name: 'ValorIR', tipo: 'N', descricao: 'Valor IR (em centavos)', obrigatorio: false },
  { start: 127, end: 142, name: 'ValorCSLL', tipo: 'N', descricao: 'Valor CSLL (em centavos)', obrigatorio: false },
  { start: 142, end: 157, name: 'ValorISS', tipo: 'N', descricao: 'Valor ISS (em centavos)', obrigatorio: false },
  { start: 157, end: 172, name: 'ValorOutrasRetencoes', tipo: 'N', descricao: 'Outras Retenções (em centavos)', obrigatorio: false },
  { start: 172, end: 187, name: 'ValorDesconto', tipo: 'N', descricao: 'Valor Desconto (em centavos)', obrigatorio: false },
  { start: 187, end: 195, name: 'DataVencimento', tipo: 'N', descricao: 'Data Vencimento (AAAAMMDD)', obrigatorio: false },
  { start: 195, end: 220, name: 'Reservado1', tipo: 'X', descricao: 'Campo Reservado', obrigatorio: false },
  { start: 220, end: 250, name: 'Reservado2', tipo: 'X', descricao: 'Campo Reservado', obrigatorio: false },
  { start: 250, end: 265, name: 'DiscriminacaoServicos', tipo: 'X', descricao: 'Discriminação dos Serviços', obrigatorio: true },

  // === RODAPÉ (Registro Tipo 9) ===
  { start: 0, end: 1, name: 'TipoRegistro', tipo: 'N', descricao: 'Tipo do Registro (9=Rodapé)', obrigatorio: true },
  { start: 1, end: 10, name: 'TotalRegistros', tipo: 'N', descricao: 'Total de Registros Tipo 3', obrigatorio: true },
  { start: 10, end: 25, name: 'ValorTotalServicos', tipo: 'N', descricao: 'Valor Total dos Serviços', obrigatorio: true },
  { start: 25, end: 40, name: 'ValorTotalDeducoes', tipo: 'N', descricao: 'Valor Total das Deduções', obrigatorio: false },
  { start: 40, end: 55, name: 'ValorTotalRetencoes', tipo: 'N', descricao: 'Valor Total das Retenções', obrigatorio: false },
  { start: 55, end: 70, name: 'ValorTotalDescontos', tipo: 'N', descricao: 'Valor Total dos Descontos', obrigatorio: false },
  { start: 70, end: 85, name: 'ValorLiquido', tipo: 'N', descricao: 'Valor Líquido Total', obrigatorio: false }
];

// Função para identificar o tipo de linha baseado no primeiro caractere
function identificarTipoLinha(linha) {
  const tipoRegistro = linha.charAt(0);
  switch (tipoRegistro) {
    case '1':
      return 'CABECALHO';
    case '3':
      return 'DETALHE';
    case '9':
      return 'RODAPE';
    default:
      return 'DESCONHECIDO';
  }
}

// Função para parsear linha de cabeçalho
function parsearCabecalho(linha) {
  return {
    TipoRegistro: linha.substring(0, 1),
    CNPJ: linha.substring(1, 15),
    InscricaoMunicipal: linha.substring(15, 20),
    NumeroLote: linha.substring(20, 35),
    DataInicio: linha.substring(35, 43),
    DataFim: linha.substring(43, 51)
  };
}

// Função para parsear linha de detalhe RPS
function parsearDetalhe(linha) {
  return {
    TipoRegistro: linha.substring(0, 1),
    TipoEquipamento: linha.substring(1, 5).trim(),
    NumeroSerie: linha.substring(5, 20).trim(),
    NumeroRPS: linha.substring(20, 28).trim(),
    DataEmissao: linha.substring(28, 36).trim(),
    StatusRPS: linha.substring(36, 37).trim(),
    ValorServicos: linha.substring(37, 52).trim() || '0',
    ValorDeducoes: linha.substring(52, 67).trim() || '0',
    ValorPIS: linha.substring(67, 82).trim() || '0',
    ValorCOFINS: linha.substring(82, 97).trim() || '0',
    ValorINSS: linha.substring(97, 112).trim() || '0',
    ValorIR: linha.substring(112, 127).trim() || '0',
    ValorCSLL: linha.substring(127, 142).trim() || '0',
    ValorISS: linha.substring(142, 157).trim() || '0',
    ValorOutrasRetencoes: linha.substring(157, 172).trim() || '0',
    ValorDesconto: linha.substring(172, 187).trim() || '0',
    DataVencimento: linha.substring(187, 195).trim(),
    DiscriminacaoServicos: linha.substring(250, 265).trim()
  };
}

// Função para parsear linha de rodapé
function parsearRodape(linha) {
  return {
    TipoRegistro: linha.substring(0, 1),
    TotalRegistros: linha.substring(1, 10),
    ValorTotalServicos: linha.substring(10, 25),
    ValorTotalDeducoes: linha.substring(25, 40),
    ValorTotalRetencoes: linha.substring(40, 55),
    ValorTotalDescontos: linha.substring(55, 70),
    ValorLiquido: linha.substring(70, 85)
  };
}

// Função principal para processar arquivo RPS de estacionamento
function processarArquivoEstacionamento(conteudo) {
  const linhas = conteudo.split(/\r?\n/).filter(Boolean);
  const resultado = {
    cabecalho: null,
    detalhes: [],
    rodape: null,
    resumo: {
      totalLinhas: linhas.length,
      totalDetalhes: 0,
      valorTotal: 0,
      periodo: null
    }
  };

  linhas.forEach((linha, index) => {
    const tipo = identificarTipoLinha(linha);
    
    switch (tipo) {
      case 'CABECALHO':
        resultado.cabecalho = parsearCabecalho(linha);
        resultado.resumo.periodo = {
          inicio: formatarData(resultado.cabecalho.DataInicio),
          fim: formatarData(resultado.cabecalho.DataFim)
        };
        break;
        
      case 'DETALHE':
        const detalhe = parsearDetalhe(linha);
        resultado.detalhes.push(detalhe);
        resultado.resumo.totalDetalhes++;
        // Tratamento seguro para valores que podem ser zero, vazios ou inválidos
        const valorServicosStr = detalhe.ValorServicos || '0';
        const valorServicos = parseInt(valorServicosStr) || 0;
        resultado.resumo.valorTotal += valorServicos;
        break;
        
      case 'RODAPE':
        resultado.rodape = parsearRodape(linha);
        break;
        
      default:
        console.warn(`Linha ${index + 1}: Tipo não reconhecido - ${linha.substring(0, 10)}...`);
    }
  });

  // Garantir que as estatísticas existam (para compatibilidade)
  if (!resultado.estatisticas) {
    resultado.estatisticas = {
      valorTotal: resultado.resumo.valorTotal,
      totalRps: resultado.resumo.totalDetalhes,
      periodo: resultado.resumo.periodo
    };
  }

  return resultado;
}

// Função para formatar data AAAAMMDD para DD/MM/AAAA
function formatarData(dataStr) {
  if (!dataStr || dataStr.length !== 8) return dataStr;
  const ano = dataStr.substring(0, 4);
  const mes = dataStr.substring(4, 6);
  const dia = dataStr.substring(6, 8);
  return `${dia}/${mes}/${ano}`;
}

// Função para formatar valor em centavos para moeda
function formatarValorMonetario(centavos) {
  const valor = parseInt(centavos) / 100;
  return valor.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });
}

// Validações específicas para RPS de estacionamento
function validarRPSEstacionamento(dados) {
  const erros = [];

  // Validar cabeçalho
  if (dados.cabecalho) {
    if (!dados.cabecalho.CNPJ || !/^\d{14}$/.test(dados.cabecalho.CNPJ)) {
      erros.push('CNPJ do cabeçalho inválido');
    }
    if (!dados.cabecalho.DataInicio || !/^\d{8}$/.test(dados.cabecalho.DataInicio)) {
      erros.push('Data de início inválida');
    }
  }

  // Validar detalhes
  dados.detalhes.forEach((detalhe, index) => {
    if (!detalhe.NumeroRPS || !/^\d+$/.test(detalhe.NumeroRPS)) {
      erros.push(`Linha ${index + 1}: Número RPS inválido`);
    }
    if (!detalhe.DataEmissao || !/^\d{8}$/.test(detalhe.DataEmissao)) {
      erros.push(`Linha ${index + 1}: Data de emissão inválida`);
    }
    if (!detalhe.ValorServicos || !/^\d+$/.test(detalhe.ValorServicos)) {
      erros.push(`Linha ${index + 1}: Valor de serviços inválido`);
    }
  });

  return {
    valido: erros.length === 0,
    erros: erros
  };
}

module.exports = {
  LAYOUT_RPS_ESTACIONAMENTO,
  identificarTipoLinha,
  parsearCabecalho,
  parsearDetalhe,
  parsearRodape,
  processarArquivoEstacionamento,
  formatarData,
  formatarValorMonetario,
  validarRPSEstacionamento
};
