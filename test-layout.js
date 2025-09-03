// Teste de processamento do layout RPS
const layoutEstacionamento = require('./layouts/layout-rps-estacionamento');
const fs = require('fs');

// Teste com o arquivo criado
try {
  const conteudo = fs.readFileSync('RPS1_01_D2025_08_03.txt', 'utf-8');
  console.log('Conteúdo do arquivo:', conteudo.length, 'caracteres');
  
  const resultado = layoutEstacionamento.processarArquivoEstacionamento(conteudo);
  
  console.log('=== RESULTADO DO PROCESSAMENTO ===');
  console.log('Cabeçalho:', resultado.cabecalho);
  console.log('Total de detalhes:', resultado.detalhes.length);
  console.log('Resumo:', resultado.resumo);
  console.log('Estatísticas:', resultado.estatisticas);
  
  // Mostrar os primeiros detalhes
  console.log('\n=== DETALHES (primeiros 3) ===');
  resultado.detalhes.slice(0, 3).forEach((detalhe, index) => {
    console.log(`Detalhe ${index + 1}:`, {
      NumeroRPS: detalhe.NumeroRPS,
      ValorServicos: detalhe.ValorServicos,
      DataEmissao: detalhe.DataEmissao
    });
  });
  
} catch (error) {
  console.error('Erro no teste:', error);
}
