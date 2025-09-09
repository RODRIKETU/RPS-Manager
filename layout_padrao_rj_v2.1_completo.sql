-- ============================================================================
-- SCRIPT SQL PARA CRIAÇÃO DO LAYOUT PADRÃO RJ v2.1 (VERSÃO COMPLETA)
-- Layout baseado no padrão da Prefeitura do Rio de Janeiro
-- Versão: 2.1 - Incluindo todos os 7 tipos de registro especificados no PDF
-- Data de criação: 2025-01-08
-- ============================================================================

-- ============================================================================
-- CRIAÇÃO DO LAYOUT PRINCIPAL
-- ============================================================================
INSERT INTO layouts (
    id,
    nome,
    tipo,
    descricao,
    data_criacao,
    layout_id,
    estrutura_completa,
    formatacao,
    origem
) VALUES (
    1,
    'Padrão RJ - Prefeitura do Rio de Janeiro v2.1 (Completo)',
    'arquivo_posicional',
    'Layout completo da Prefeitura do Rio de Janeiro com todos os 7 tipos de registro especificados no manual: 10 (Cabeçalho), 20 (RPS), 21 (Intermediário), 30 (Cupom Fiscal), 40 (Nota Fiscal), 60 (RPS Exportação) e 90 (Rodapé)',
    datetime('now'),
    'RJ_PREFEITURA_PADRAO_V2_COMPLETO',
    json('{
        "total_campos": 16,
        "tamanho_linha": 236,
        "separador": "",
        "encoding": "UTF-8",
        "quebra_linha": "CRLF",
        "tipos_registro": ["10", "20", "21", "30", "40", "60", "90"],
        "obrigatorios": ["10", "90"],
        "opcionais": ["20", "21", "30", "40", "60"]
    }'),
    json('{
        "preenchimento_numerico": "zeros_esquerda",
        "preenchimento_string": "espacos_direita",
        "case_string": "maiusculo",
        "formato_data": "YYYYMMDD",
        "formato_decimal": "centavos"
    }'),
    'PDF Manual Prefeitura RJ'
);

-- ============================================================================
-- TIPO 10 - CABEÇALHO DO ARQUIVO
-- ============================================================================
INSERT INTO tipos_registro (
    layout_id,
    codigo_tipo,
    nome_tipo,
    descricao,
    campos,
    obrigatorio,
    ordem,
    data_criacao
) VALUES (
    1,
    '10',
    'Cabeçalho do Arquivo',
    'Registro de cabeçalho do arquivo. Uma linha.',
    json('[
        {
            "nome": "tipo_registro",
            "posicao": 1,
            "tamanho": 2,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 0,
            "descricao": "Tipo do registro - sempre 10",
            "valor_fixo": "10"
        },
        {
            "nome": "versao_layout",
            "posicao": 3,
            "tamanho": 3,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 1,
            "descricao": "Versão do layout",
            "valor_padrao": "001"
        },
        {
            "nome": "cnpj_prestador",
            "posicao": 6,
            "tamanho": 14,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 2,
            "descricao": "CNPJ do prestador de serviços",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "inscricao_municipal",
            "posicao": 20,
            "tamanho": 8,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 3,
            "descricao": "Inscrição municipal do prestador",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "data_inicio",
            "posicao": 28,
            "tamanho": 8,
            "tipo": "date",
            "obrigatorio": true,
            "ordem": 4,
            "descricao": "Data de início do período (AAAAMMDD)",
            "formato": "YYYYMMDD"
        },
        {
            "nome": "data_fim",
            "posicao": 36,
            "tamanho": 8,
            "tipo": "date",
            "obrigatorio": true,
            "ordem": 5,
            "descricao": "Data de fim do período (AAAAMMDD)",
            "formato": "YYYYMMDD"
        },
        {
            "nome": "razao_social",
            "posicao": 44,
            "tamanho": 75,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 6,
            "descricao": "Razão social do prestador",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "filler",
            "posicao": 119,
            "tamanho": 118,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 7,
            "descricao": "Campo de preenchimento",
            "valor_padrao": " "
        }
    ]'),
    1,
    0,
    datetime('now')
);

-- ============================================================================
-- TIPO 20 - RPS (RECIBO PROVISÓRIO DE SERVIÇOS)
-- ============================================================================
INSERT INTO tipos_registro (
    layout_id,
    codigo_tipo,
    nome_tipo,
    descricao,
    campos,
    obrigatorio,
    ordem,
    data_criacao
) VALUES (
    1,
    '20',
    'RPS - Recibo Provisório de Serviços',
    'Registro de detalhe para documentos tipo RPS e RPS-M (Misto). Zero ou mais linhas.',
    json('[
        {
            "nome": "tipo_registro",
            "posicao": 1,
            "tamanho": 2,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 0,
            "descricao": "Tipo do registro - sempre 20",
            "valor_fixo": "20"
        },
        {
            "nome": "tipo_rps",
            "posicao": 3,
            "tamanho": 1,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 1,
            "descricao": "Tipo do RPS (1=RPS, 2=RPS-M)",
            "valores_validos": ["1", "2"]
        },
        {
            "nome": "serie_rps",
            "posicao": 4,
            "tamanho": 5,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 2,
            "descricao": "Série do RPS",
            "preenchimento": "espacos_direita"
        },
        {
            "nome": "numero_rps",
            "posicao": 9,
            "tamanho": 15,
            "tipo": "number",
            "obrigatorio": true,
            "ordem": 3,
            "descricao": "Número do RPS",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "data_emissao",
            "posicao": 24,
            "tamanho": 8,
            "tipo": "date",
            "obrigatorio": true,
            "ordem": 4,
            "descricao": "Data de emissão do RPS (AAAAMMDD)",
            "formato": "YYYYMMDD"
        },
        {
            "nome": "situacao_rps",
            "posicao": 32,
            "tamanho": 1,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 5,
            "descricao": "Situação do RPS (N=Normal, C=Cancelado)",
            "valores_validos": ["N", "C"]
        },
        {
            "nome": "valor_servicos",
            "posicao": 33,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 6,
            "descricao": "Valor dos serviços prestados em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "valor_deducoes",
            "posicao": 48,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": false,
            "ordem": 7,
            "descricao": "Valor das deduções em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "codigo_servico",
            "posicao": 63,
            "tamanho": 5,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 8,
            "descricao": "Código do serviço prestado (Lista LC 116/2003)",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "aliquota_issqn",
            "posicao": 68,
            "tamanho": 4,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 9,
            "descricao": "Alíquota do ISSQN (4 dígitos, ex: 0500 = 5%)",
            "preenchimento": "zeros_esquerda",
            "formato": "percentual"
        },
        {
            "nome": "valor_issqn",
            "posicao": 72,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 10,
            "descricao": "Valor do ISSQN em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "cpf_cnpj_tomador",
            "posicao": 87,
            "tamanho": 14,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 11,
            "descricao": "CPF ou CNPJ do tomador (apenas números)",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "inscricao_municipal_tomador",
            "posicao": 101,
            "tamanho": 8,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 12,
            "descricao": "Inscrição municipal do tomador",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "indicador_cpf_cnpj",
            "posicao": 109,
            "tamanho": 1,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 13,
            "descricao": "Indicador tipo documento tomador (1=CPF, 2=CNPJ)",
            "valores_validos": ["1", "2"]
        },
        {
            "nome": "razao_social_tomador",
            "posicao": 110,
            "tamanho": 115,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 14,
            "descricao": "Razão social ou nome do tomador",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "discriminacao_servicos",
            "posicao": 225,
            "tamanho": 11,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 15,
            "descricao": "Discriminação dos serviços prestados",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        }
    ]'),
    0,
    1,
    datetime('now')
);

-- ============================================================================
-- TIPO 21 - INTERMEDIÁRIO DO SERVIÇO
-- ============================================================================
INSERT INTO tipos_registro (
    layout_id,
    codigo_tipo,
    nome_tipo,
    descricao,
    campos,
    obrigatorio,
    ordem,
    data_criacao
) VALUES (
    1,
    '21',
    'Intermediário do Serviço',
    'Registro de detalhe correspondente ao Intermediário do Serviço do registro 20. Zero ou mais linhas.',
    json('[
        {
            "nome": "tipo_registro",
            "posicao": 1,
            "tamanho": 2,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 0,
            "descricao": "Tipo do registro - sempre 21",
            "valor_fixo": "21"
        },
        {
            "nome": "cpf_cnpj_intermediario",
            "posicao": 3,
            "tamanho": 14,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 1,
            "descricao": "CPF ou CNPJ do intermediário",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "indicador_cpf_cnpj_intermediario",
            "posicao": 17,
            "tamanho": 1,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 2,
            "descricao": "Indicador tipo documento intermediário (1=CPF, 2=CNPJ)",
            "valores_validos": ["1", "2"]
        },
        {
            "nome": "inscricao_municipal_intermediario",
            "posicao": 18,
            "tamanho": 8,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 3,
            "descricao": "Inscrição municipal do intermediário",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "razao_social_intermediario",
            "posicao": 26,
            "tamanho": 115,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 4,
            "descricao": "Razão social ou nome do intermediário",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "filler_intermediario",
            "posicao": 141,
            "tamanho": 95,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 5,
            "descricao": "Campo de preenchimento",
            "valor_padrao": " "
        }
    ]'),
    0,
    2,
    datetime('now')
);

-- ============================================================================
-- TIPO 30 - CUPOM FISCAL
-- ============================================================================
INSERT INTO tipos_registro (
    layout_id,
    codigo_tipo,
    nome_tipo,
    descricao,
    campos,
    obrigatorio,
    ordem,
    data_criacao
) VALUES (
    1,
    '30',
    'Cupom Fiscal',
    'Registro de detalhe para documentos tipo Cupom Fiscal. Zero ou mais linhas.',
    json('[
        {
            "nome": "tipo_registro",
            "posicao": 1,
            "tamanho": 2,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 0,
            "descricao": "Tipo do registro - sempre 30",
            "valor_fixo": "30"
        },
        {
            "nome": "numero_serie_producao",
            "posicao": 3,
            "tamanho": 20,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 1,
            "descricao": "Número de série de produção do equipamento emissor",
            "preenchimento": "espacos_direita"
        },
        {
            "nome": "data_emissao_cupom",
            "posicao": 23,
            "tamanho": 8,
            "tipo": "date",
            "obrigatorio": true,
            "ordem": 2,
            "descricao": "Data de emissão do cupom (AAAAMMDD)",
            "formato": "YYYYMMDD"
        },
        {
            "nome": "numero_cupom",
            "posicao": 31,
            "tamanho": 9,
            "tipo": "number",
            "obrigatorio": true,
            "ordem": 3,
            "descricao": "Número do cupom fiscal",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "valor_servicos_cupom",
            "posicao": 40,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 4,
            "descricao": "Valor dos serviços do cupom em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "codigo_servico_cupom",
            "posicao": 55,
            "tamanho": 5,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 5,
            "descricao": "Código do serviço do cupom (Lista LC 116/2003)",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "aliquota_issqn_cupom",
            "posicao": 60,
            "tamanho": 4,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 6,
            "descricao": "Alíquota do ISSQN do cupom (ex: 0500 = 5%)",
            "preenchimento": "zeros_esquerda",
            "formato": "percentual"
        },
        {
            "nome": "valor_issqn_cupom",
            "posicao": 64,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 7,
            "descricao": "Valor do ISSQN do cupom em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "cpf_cnpj_tomador_cupom",
            "posicao": 79,
            "tamanho": 14,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 8,
            "descricao": "CPF ou CNPJ do tomador do cupom",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "inscricao_municipal_tomador_cupom",
            "posicao": 93,
            "tamanho": 8,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 9,
            "descricao": "Inscrição municipal do tomador do cupom",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "indicador_cpf_cnpj_cupom",
            "posicao": 101,
            "tamanho": 1,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 10,
            "descricao": "Indicador tipo documento tomador cupom (1=CPF, 2=CNPJ)",
            "valores_validos": ["1", "2", " "]
        },
        {
            "nome": "razao_social_tomador_cupom",
            "posicao": 102,
            "tamanho": 115,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 11,
            "descricao": "Razão social ou nome do tomador do cupom",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "endereco_prestacao_servico",
            "posicao": 217,
            "tamanho": 125,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 12,
            "descricao": "Endereço de prestação do serviço",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "numero_encerramento",
            "posicao": 342,
            "tamanho": 9,
            "tipo": "number",
            "obrigatorio": false,
            "ordem": 13,
            "descricao": "Número do encerramento do equipamento",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "descricao_servicos_cupom",
            "posicao": 351,
            "tamanho": 80,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 14,
            "descricao": "Descrição dos serviços do cupom",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "filler_cupom",
            "posicao": 431,
            "tamanho": 6,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 15,
            "descricao": "Campo de preenchimento",
            "valor_padrao": " "
        }
    ]'),
    0,
    3,
    datetime('now')
);

-- ============================================================================
-- TIPO 40 - NOTA FISCAL CONVENCIONAL
-- ============================================================================
INSERT INTO tipos_registro (
    layout_id,
    codigo_tipo,
    nome_tipo,
    descricao,
    campos,
    obrigatorio,
    ordem,
    data_criacao
) VALUES (
    1,
    '40',
    'Nota Fiscal Convencional',
    'Registro de detalhe para documentos tipo Nota Fiscal Convencional. Zero ou mais linhas.',
    json('[
        {
            "nome": "tipo_registro",
            "posicao": 1,
            "tamanho": 2,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 0,
            "descricao": "Tipo do registro - sempre 40",
            "valor_fixo": "40"
        },
        {
            "nome": "numero_nota_fiscal",
            "posicao": 3,
            "tamanho": 15,
            "tipo": "number",
            "obrigatorio": true,
            "ordem": 1,
            "descricao": "Número da Nota Fiscal Convencional",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "serie_nota_fiscal",
            "posicao": 18,
            "tamanho": 5,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 2,
            "descricao": "Série da Nota Fiscal",
            "preenchimento": "espacos_direita"
        },
        {
            "nome": "data_emissao_nf",
            "posicao": 23,
            "tamanho": 8,
            "tipo": "date",
            "obrigatorio": true,
            "ordem": 3,
            "descricao": "Data de emissão da NF (AAAAMMDD)",
            "formato": "YYYYMMDD"
        },
        {
            "nome": "valor_servicos_nf",
            "posicao": 31,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 4,
            "descricao": "Valor dos serviços da NF em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "valor_deducoes_nf",
            "posicao": 46,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": false,
            "ordem": 5,
            "descricao": "Valor das deduções da NF em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "codigo_servico_nf",
            "posicao": 61,
            "tamanho": 5,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 6,
            "descricao": "Código do serviço da NF (Lista LC 116/2003)",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "aliquota_issqn_nf",
            "posicao": 66,
            "tamanho": 4,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 7,
            "descricao": "Alíquota do ISSQN da NF (ex: 0500 = 5%)",
            "preenchimento": "zeros_esquerda",
            "formato": "percentual"
        },
        {
            "nome": "valor_issqn_nf",
            "posicao": 70,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 8,
            "descricao": "Valor do ISSQN da NF em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "cpf_cnpj_tomador_nf",
            "posicao": 85,
            "tamanho": 14,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 9,
            "descricao": "CPF ou CNPJ do tomador da NF",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "inscricao_municipal_tomador_nf",
            "posicao": 99,
            "tamanho": 8,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 10,
            "descricao": "Inscrição municipal do tomador da NF",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "indicador_cpf_cnpj_nf",
            "posicao": 107,
            "tamanho": 1,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 11,
            "descricao": "Indicador tipo documento tomador NF (1=CPF, 2=CNPJ)",
            "valores_validos": ["1", "2"]
        },
        {
            "nome": "razao_social_tomador_nf",
            "posicao": 108,
            "tamanho": 115,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 12,
            "descricao": "Razão social ou nome do tomador da NF",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "discriminacao_servicos_nf",
            "posicao": 223,
            "tamanho": 13,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 13,
            "descricao": "Discriminação dos serviços da NF",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        }
    ]'),
    0,
    4,
    datetime('now')
);

-- ============================================================================
-- TIPO 60 - RPS DE EXPORTAÇÃO
-- ============================================================================
INSERT INTO tipos_registro (
    layout_id,
    codigo_tipo,
    nome_tipo,
    descricao,
    campos,
    obrigatorio,
    ordem,
    data_criacao
) VALUES (
    1,
    '60',
    'RPS de Exportação',
    'Registro de detalhe para documentos tipo RPS de Exportação. Zero ou mais linhas.',
    json('[
        {
            "nome": "tipo_registro",
            "posicao": 1,
            "tamanho": 2,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 0,
            "descricao": "Tipo do registro - sempre 60",
            "valor_fixo": "60"
        },
        {
            "nome": "serie_rps_exportacao",
            "posicao": 3,
            "tamanho": 5,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 1,
            "descricao": "Série do RPS de exportação",
            "preenchimento": "espacos_direita"
        },
        {
            "nome": "numero_rps_exportacao",
            "posicao": 8,
            "tamanho": 15,
            "tipo": "number",
            "obrigatorio": true,
            "ordem": 2,
            "descricao": "Número do RPS de exportação",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "data_emissao_exportacao",
            "posicao": 23,
            "tamanho": 8,
            "tipo": "date",
            "obrigatorio": true,
            "ordem": 3,
            "descricao": "Data de emissão do RPS exportação (AAAAMMDD)",
            "formato": "YYYYMMDD"
        },
        {
            "nome": "valor_servicos_exportacao",
            "posicao": 31,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 4,
            "descricao": "Valor dos serviços de exportação em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "codigo_servico_exportacao",
            "posicao": 46,
            "tamanho": 5,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 5,
            "descricao": "Código do serviço de exportação (Lista LC 116/2003)",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "cpf_cnpj_tomador_exportacao",
            "posicao": 51,
            "tamanho": 14,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 6,
            "descricao": "CPF ou CNPJ do tomador exportação",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "pais_tomador",
            "posicao": 65,
            "tamanho": 3,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 7,
            "descricao": "Código do país do tomador (3 dígitos)",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "indicador_cpf_cnpj_exportacao",
            "posicao": 68,
            "tamanho": 1,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 8,
            "descricao": "Indicador tipo documento tomador exp (1=CPF, 2=CNPJ)",
            "valores_validos": ["1", "2"]
        },
        {
            "nome": "razao_social_tomador_exportacao",
            "posicao": 69,
            "tamanho": 115,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 9,
            "descricao": "Razão social ou nome do tomador exportação",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        },
        {
            "nome": "discriminacao_servicos_exportacao",
            "posicao": 184,
            "tamanho": 52,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 10,
            "descricao": "Discriminação dos serviços de exportação",
            "preenchimento": "espacos_direita",
            "maiusculo": true
        }
    ]'),
    0,
    5,
    datetime('now')
);

-- ============================================================================
-- TIPO 90 - RODAPÉ DO ARQUIVO
-- ============================================================================
INSERT INTO tipos_registro (
    layout_id,
    codigo_tipo,
    nome_tipo,
    descricao,
    campos,
    obrigatorio,
    ordem,
    data_criacao
) VALUES (
    1,
    '90',
    'Rodapé do Arquivo',
    'Registro de rodapé do arquivo. Uma linha.',
    json('[
        {
            "nome": "tipo_registro",
            "posicao": 1,
            "tamanho": 2,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 0,
            "descricao": "Tipo do registro - sempre 90",
            "valor_fixo": "90"
        },
        {
            "nome": "cnpj_prestador_rodape",
            "posicao": 3,
            "tamanho": 14,
            "tipo": "string",
            "obrigatorio": true,
            "ordem": 1,
            "descricao": "CNPJ do prestador (igual ao cabeçalho)",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "quantidade_registros",
            "posicao": 17,
            "tamanho": 7,
            "tipo": "number",
            "obrigatorio": true,
            "ordem": 2,
            "descricao": "Quantidade total de registros do arquivo",
            "preenchimento": "zeros_esquerda"
        },
        {
            "nome": "valor_total_servicos",
            "posicao": 24,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 3,
            "descricao": "Valor total dos serviços em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "valor_total_deducoes",
            "posicao": 39,
            "tamanho": 15,
            "tipo": "decimal",
            "obrigatorio": true,
            "ordem": 4,
            "descricao": "Valor total das deduções em centavos",
            "preenchimento": "zeros_esquerda",
            "casas_decimais": 2
        },
        {
            "nome": "filler_rodape",
            "posicao": 54,
            "tamanho": 183,
            "tipo": "string",
            "obrigatorio": false,
            "ordem": 5,
            "descricao": "Campo de preenchimento",
            "valor_padrao": " "
        }
    ]'),
    1,
    6,
    datetime('now')
);
