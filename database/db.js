const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, 'rps_manager.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err);
      } else {
        console.log('Conectado ao banco de dados SQLite');
        this.createTables();
      }
    });
  }

  createTables() {
    // Tabela de empresas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj TEXT UNIQUE NOT NULL,
        razao_social TEXT NOT NULL,
        nome_fantasia TEXT,
        inscricao_municipal TEXT,
        endereco TEXT,
        telefone TEXT,
        email TEXT,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de arquivos importados
    this.db.run(`
      CREATE TABLE IF NOT EXISTS arquivos_rps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        nome_arquivo TEXT NOT NULL,
        hash_arquivo TEXT UNIQUE NOT NULL,
        total_rps INTEGER DEFAULT 0,
        valor_total DECIMAL(15,2) DEFAULT 0,
        data_periodo_inicio DATE,
        data_periodo_fim DATE,
        status TEXT DEFAULT 'processado',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas (id)
      )
    `);

    // Tabela de RPS
    this.db.run(`
      CREATE TABLE IF NOT EXISTS rps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        arquivo_id INTEGER NOT NULL,
        empresa_id INTEGER NOT NULL,
        numero_rps TEXT NOT NULL,
        serie_rps TEXT,
        tipo_rps TEXT,
        data_emissao DATE NOT NULL,
        data_competencia DATE,
        natureza_operacao TEXT,
        regime_especial_tributacao TEXT,
        optante_simples_nacional BOOLEAN DEFAULT 0,
        incentivador_cultural BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'normal',
        
        -- Prestador
        prestador_cnpj TEXT,
        prestador_inscricao_municipal TEXT,
        
        -- Tomador
        tomador_cnpj TEXT,
        tomador_cpf TEXT,
        tomador_inscricao_municipal TEXT,
        tomador_razao_social TEXT,
        tomador_endereco TEXT,
        tomador_numero TEXT,
        tomador_complemento TEXT,
        tomador_bairro TEXT,
        tomador_cep TEXT,
        tomador_cidade TEXT,
        tomador_uf TEXT,
        tomador_telefone TEXT,
        tomador_email TEXT,
        
        -- Serviços
        codigo_servico TEXT,
        codigo_cnae TEXT,
        codigo_tributacao_municipio TEXT,
        discriminacao TEXT,
        codigo_municipio TEXT,
        
        -- Valores
        valor_servicos DECIMAL(15,2) DEFAULT 0,
        valor_deducoes DECIMAL(15,2) DEFAULT 0,
        valor_pis DECIMAL(15,2) DEFAULT 0,
        valor_cofins DECIMAL(15,2) DEFAULT 0,
        valor_inss DECIMAL(15,2) DEFAULT 0,
        valor_ir DECIMAL(15,2) DEFAULT 0,
        valor_csll DECIMAL(15,2) DEFAULT 0,
        valor_iss DECIMAL(15,2) DEFAULT 0,
        valor_outras_retencoes DECIMAL(15,2) DEFAULT 0,
        base_calculo DECIMAL(15,2) DEFAULT 0,
        aliquota DECIMAL(5,4) DEFAULT 0,
        valor_liquido DECIMAL(15,2) DEFAULT 0,
        valor_iss_retido DECIMAL(15,2) DEFAULT 0,
        
        -- Equipamento (para estacionamento)
        tipo_equipamento TEXT,
        numero_serie TEXT,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (arquivo_id) REFERENCES arquivos_rps (id),
        FOREIGN KEY (empresa_id) REFERENCES empresas (id),
        UNIQUE(empresa_id, numero_rps, serie_rps, data_emissao)
      )
    `);

    // Tabela de logs de importação
    this.db.run(`
      CREATE TABLE IF NOT EXISTS logs_importacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        arquivo_id INTEGER,
        empresa_id INTEGER,
        tipo_operacao TEXT, -- 'importacao', 'atualizacao', 'erro'
        mensagem TEXT,
        detalhes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (arquivo_id) REFERENCES arquivos_rps (id),
        FOREIGN KEY (empresa_id) REFERENCES empresas (id)
      )
    `);

    // Tabela de layouts de registros
    this.db.run(`
      CREATE TABLE IF NOT EXISTS layouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        layout_id TEXT UNIQUE NOT NULL, -- ID único do layout (ex: 'layout_empresa_01')
        nome TEXT NOT NULL,
        descricao TEXT,
        versao TEXT DEFAULT '1.0',
        status TEXT DEFAULT 'ativo',
        origem TEXT DEFAULT 'banco', -- 'banco' ou 'dinamico'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de tipos de registro
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tipos_registro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        layout_id INTEGER NOT NULL,
        codigo_tipo TEXT NOT NULL, -- '01', '02', '03', etc.
        nome_tipo TEXT NOT NULL, -- 'Cabeçalho', 'Detalhe', 'Rodapé', etc.
        descricao TEXT,
        campos TEXT NOT NULL, -- JSON com a estrutura dos campos
        obrigatorio BOOLEAN DEFAULT 1,
        ordem INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (layout_id) REFERENCES layouts (id),
        UNIQUE(layout_id, codigo_tipo)
      )
    `);

    // Tabela de campos condicionais/subcampos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS campos_condicionais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_registro_id INTEGER NOT NULL,
        campo_pai_ordem INTEGER NOT NULL, -- ordem do campo pai que determina a condição
        condicao_valor TEXT NOT NULL, -- valor que ativa esta condição (ex: "1", "2", "3")
        subcampo_letra TEXT, -- letra do subcampo (A, B, C, etc.)
        nome_subcampo TEXT NOT NULL,
        posicao_inicial INTEGER NOT NULL,
        posicao_final INTEGER NOT NULL,
        tamanho INTEGER NOT NULL,
        formato TEXT NOT NULL,
        obrigatorio BOOLEAN DEFAULT 0,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tipo_registro_id) REFERENCES tipos_registro (id)
      )
    `);

    // Adicionar campo layout_id na tabela empresas se não existir
    this.db.run(`
      ALTER TABLE empresas ADD COLUMN layout_id INTEGER REFERENCES layouts(id)
    `, (err) => {
      // Ignora erro se a coluna já existir
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna layout_id:', err);
      }
    });

    // Adicionar novas colunas na tabela layouts se não existirem
    this.db.run(`
      ALTER TABLE layouts ADD COLUMN layout_id TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna layout_id:', err);
      }
    });

    this.db.run(`
      ALTER TABLE layouts ADD COLUMN origem TEXT DEFAULT 'banco'
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna origem:', err);
      }
    });

    this.db.run(`
      ALTER TABLE layouts ADD COLUMN estrutura_completa TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna estrutura_completa:', err);
      }
    });

    this.db.run(`
      ALTER TABLE layouts ADD COLUMN formatacao TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna formatacao:', err);
      }
    });

    console.log('Tabelas criadas/verificadas com sucesso');
  }

  // Métodos para empresas
  async criarEmpresa(empresa) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO empresas (cnpj, razao_social, nome_fantasia, inscricao_municipal, endereco, telefone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        empresa.cnpj,
        empresa.razaoSocial,
        empresa.nomeFantasia,
        empresa.inscricaoMunicipal,
        empresa.endereco,
        empresa.telefone,
        empresa.email
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...empresa });
      });
    });
  }

  async buscarEmpresaPorCnpj(cnpj) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM empresas WHERE cnpj = ? AND ativo = 1';
      this.db.get(sql, [cnpj], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async listarEmpresas() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM empresas WHERE ativo = 1 ORDER BY razao_social';
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async atualizarEmpresa(id, empresa) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE empresas 
        SET razao_social = ?, nome_fantasia = ?, inscricao_municipal = ?, 
            endereco = ?, telefone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [
        empresa.razaoSocial,
        empresa.nomeFantasia,
        empresa.inscricaoMunicipal,
        empresa.endereco,
        empresa.telefone,
        empresa.email,
        id
      ], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async excluirEmpresa(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM empresas WHERE id = ?`;
      this.db.run(sql, [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // Métodos para arquivos
  async criarArquivo(arquivo) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO arquivos_rps (empresa_id, nome_arquivo, hash_arquivo, total_rps, valor_total, data_periodo_inicio, data_periodo_fim)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        arquivo.empresaId,
        arquivo.nomeArquivo,
        arquivo.hashArquivo,
        arquivo.totalRps,
        arquivo.valorTotal,
        arquivo.dataInicio,
        arquivo.dataFim
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...arquivo });
      });
    });
  }

  async verificarArquivoExiste(hashArquivo) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM arquivos_rps WHERE hash_arquivo = ?';
      this.db.get(sql, [hashArquivo], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Métodos para RPS
  async criarRps(rps) {
    return new Promise((resolve, reject) => {
      // Suporte para formato novo (interface web) e antigo (importação)
      const dados = {
        arquivo_id: rps.arquivo_id || rps.arquivoId || 0,
        empresa_id: rps.empresa_id || rps.empresaId,
        numero_rps: rps.numero || rps.numeroRps,
        serie_rps: rps.serie || rps.serieRps || '1',
        tipo_rps: rps.tipo || rps.tipoRps || 'RPS',
        data_emissao: rps.data_emissao || rps.dataEmissao,
        data_competencia: rps.data_competencia || rps.dataCompetencia || rps.data_emissao || rps.dataEmissao,
        prestador_cnpj: rps.prestador_cnpj || rps.prestadorCnpj,
        prestador_inscricao_municipal: rps.prestador_inscricao_municipal || rps.prestadorInscricaoMunicipal,
        tomador_razao_social: rps.tomador_nome || rps.tomadorRazaoSocial,
        tomador_cnpj: rps.tomador_documento || rps.tomadorCnpj,
        discriminacao: rps.descricao || rps.discriminacao,
        valor_servicos: rps.valor_servicos || rps.valorServicos || 0,
        valor_iss: rps.valor_iss || rps.valorIss || 0,
        valor_liquido: rps.valor_liquido || rps.valorLiquido || 0,
        base_calculo: rps.base_calculo || rps.baseCalculo || 0,
        aliquota: rps.aliquota_iss || rps.aliquota || 0,
        tipo_equipamento: rps.tipo_equipamento || rps.tipoEquipamento,
        numero_serie: rps.numero_serie || rps.numeroSerie,
        status: rps.status || 'pendente'
      };

      const sql = `
        INSERT INTO rps (
          arquivo_id, empresa_id, numero_rps, serie_rps, tipo_rps, data_emissao, data_competencia,
          prestador_cnpj, prestador_inscricao_municipal, tomador_razao_social, tomador_cnpj,
          discriminacao, valor_servicos, valor_iss, valor_liquido, base_calculo, aliquota, 
          tipo_equipamento, numero_serie, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        dados.arquivo_id, dados.empresa_id, dados.numero_rps, dados.serie_rps, dados.tipo_rps,
        dados.data_emissao, dados.data_competencia, dados.prestador_cnpj, dados.prestador_inscricao_municipal,
        dados.tomador_razao_social, dados.tomador_cnpj, dados.discriminacao, dados.valor_servicos, 
        dados.valor_iss, dados.valor_liquido, dados.base_calculo, dados.aliquota,
        dados.tipo_equipamento, dados.numero_serie, dados.status
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...dados });
      });
    });
  }

  async buscarRpsPorPeriodo(empresaId, dataInicio, dataFim) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          r.id, r.numero_rps as numero, r.data_emissao, r.tomador_razao_social as tomador_nome, 
          r.discriminacao as descricao, r.valor_servicos, r.valor_iss, r.status,
          a.nome_arquivo 
        FROM rps r
        LEFT JOIN arquivos_rps a ON r.arquivo_id = a.id
        WHERE r.empresa_id = ? AND r.data_emissao BETWEEN ? AND ?
        ORDER BY r.data_emissao DESC, r.numero_rps
      `;
      this.db.all(sql, [empresaId, dataInicio, dataFim], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async atualizarRps(id, dadosRps) {
    return new Promise((resolve, reject) => {
      const campos = Object.keys(dadosRps).map(key => `${key} = ?`).join(', ');
      const valores = Object.values(dadosRps);
      valores.push(id);
      
      const sql = `UPDATE rps SET ${campos}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      this.db.run(sql, valores, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async excluirRps(ids) {
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',');
      const sql = `DELETE FROM rps WHERE id IN (${placeholders})`;
      this.db.run(sql, ids, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async buscarRpsPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT r.*, e.razao_social as empresa_nome 
        FROM rps r 
        JOIN empresas e ON r.empresa_id = e.id 
        WHERE r.id = ?
      `;
      this.db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async buscarRpsPorNumero(empresaId, numero) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM rps WHERE empresa_id = ? AND numero_rps = ?';
      this.db.get(sql, [empresaId, numero], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async obterEstatisticasRps(empresaId, ano) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_rps,
          SUM(valor_servicos) as valor_total_servicos,
          SUM(valor_iss) as valor_total_iss,
          AVG(valor_servicos) as valor_medio_servicos,
          COUNT(CASE WHEN status = 'processado' THEN 1 END) as rps_processados,
          COUNT(CASE WHEN status = 'pendente' THEN 1 END) as rps_pendentes,
          COUNT(CASE WHEN status = 'erro' THEN 1 END) as rps_com_erro
        FROM rps 
        WHERE empresa_id = ? AND strftime('%Y', data_emissao) = ?
      `;
      this.db.get(sql, [empresaId, ano.toString()], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Métodos para layouts
  async criarLayout(layout) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO layouts (layout_id, nome, tipo, descricao, versao, status, origem, estrutura_completa, formatacao, configuracao_cabecalho, configuracao_detalhe, configuracao_rodape)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        layout.id || layout.layout_id,
        layout.nome,
        layout.tipo,
        layout.descricao,
        layout.versao || '1.0',
        layout.status || 'ativo',
        layout.origem || 'banco',
        JSON.stringify(layout.estrutura || layout.estrutura_completa || {}),
        JSON.stringify(layout.formatacao || {}),
        JSON.stringify(layout.configuracao_cabecalho || []),
        JSON.stringify(layout.configuracao_detalhe || []),
        JSON.stringify(layout.configuracao_rodape || [])
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...layout });
      });
    });
  }

  async criarLayoutDinamico(layout) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO layouts (layout_id, nome, tipo, descricao, versao, status, origem, estrutura_completa, formatacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        layout.id,
        layout.nome,
        layout.tipo || 'servicos',
        layout.descricao || '',
        layout.versao || '1.0',
        'ativo',
        'dinamico',
        JSON.stringify(layout.estrutura || {}),
        JSON.stringify(layout.formatacao || {})
      ], function(err) {
        if (err) reject(err);
        else resolve({ 
          id: this.lastID, 
          database_id: this.lastID,
          ...layout 
        });
      });
    });
  }

  async listarLayouts() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT l.*, 
               COUNT(e.id) as empresas_usando
        FROM layouts l
        LEFT JOIN empresas e ON l.id = e.layout_id AND e.ativo = 1
        GROUP BY l.id
        ORDER BY l.nome
      `;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else {
          // Parse das configurações JSON
          const layouts = rows.map(layout => ({
            ...layout,
            estrutura_completa: JSON.parse(layout.estrutura_completa || '{}'),
            formatacao: JSON.parse(layout.formatacao || '{}'),
            configuracao_cabecalho: JSON.parse(layout.configuracao_cabecalho || '[]'),
            configuracao_detalhe: JSON.parse(layout.configuracao_detalhe || '[]'),
            configuracao_rodape: JSON.parse(layout.configuracao_rodape || '[]')
          }));
          resolve(layouts);
        }
      });
    });
  }

  async buscarLayoutPorId(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT l.*, 
               COUNT(e.id) as empresas_usando
        FROM layouts l
        LEFT JOIN empresas e ON l.id = e.layout_id AND e.ativo = 1
        WHERE l.id = ?
        GROUP BY l.id
      `;
      this.db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else if (row) {
          // Parse das configurações JSON
          const layout = {
            ...row,
            estrutura_completa: JSON.parse(row.estrutura_completa || '{}'),
            formatacao: JSON.parse(row.formatacao || '{}'),
            configuracao_cabecalho: JSON.parse(row.configuracao_cabecalho || '[]'),
            configuracao_detalhe: JSON.parse(row.configuracao_detalhe || '[]'),
            configuracao_rodape: JSON.parse(row.configuracao_rodape || '[]')
          };
          resolve(layout);
        } else {
          resolve(null);
        }
      });
    });
  }

  async buscarLayoutPorLayoutId(layoutId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT l.*, 
               COUNT(e.id) as empresas_usando
        FROM layouts l
        LEFT JOIN empresas e ON l.id = e.layout_id AND e.ativo = 1
        WHERE l.layout_id = ?
        GROUP BY l.id
      `;
      this.db.get(sql, [layoutId], (err, row) => {
        if (err) reject(err);
        else if (row) {
          // Parse das configurações JSON
          const layout = {
            ...row,
            estrutura_completa: JSON.parse(row.estrutura_completa || '{}'),
            formatacao: JSON.parse(row.formatacao || '{}'),
            configuracao_cabecalho: JSON.parse(row.configuracao_cabecalho || '[]'),
            configuracao_detalhe: JSON.parse(row.configuracao_detalhe || '[]'),
            configuracao_rodape: JSON.parse(row.configuracao_rodape || '[]')
          };
          resolve(layout);
        } else {
          resolve(null);
        }
      });
    });
  }

  async atualizarLayout(id, layout) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE layouts 
        SET nome = ?, tipo = ?, descricao = ?, versao = ?, status = ?, 
            configuracao_cabecalho = ?, configuracao_detalhe = ?, configuracao_rodape = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [
        layout.nome,
        layout.tipo,
        layout.descricao,
        layout.versao,
        layout.status,
        JSON.stringify(layout.configuracao_cabecalho || []),
        JSON.stringify(layout.configuracao_detalhe || []),
        JSON.stringify(layout.configuracao_rodape || []),
        id
      ], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async excluirLayouts(ids) {
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',');
      const sql = `DELETE FROM layouts WHERE id IN (${placeholders})`;
      this.db.run(sql, ids, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async excluirLayout(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM layouts WHERE id = ? OR layout_id = ?`;
      this.db.run(sql, [id, id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async atualizarStatusLayouts(ids, status) {
    return new Promise((resolve, reject) => {
      const placeholders = ids.map(() => '?').join(',');
      const sql = `UPDATE layouts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
      this.db.run(sql, [status, ...ids], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async obterEstatisticasLayouts() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_layouts,
          COUNT(CASE WHEN status = 'ativo' THEN 1 END) as layouts_ativos,
          COUNT(CASE WHEN status = 'inativo' THEN 1 END) as layouts_inativos,
          (SELECT COUNT(DISTINCT e.id) FROM empresas e WHERE e.layout_id IS NOT NULL AND e.ativo = 1) as empresas_usando_layouts
        FROM layouts
      `;
      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // ==================== NOVOS MÉTODOS PARA TIPOS DE REGISTRO ====================

  async criarLayoutNovoSistema(layout) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO layouts (layout_id, nome, descricao, versao, status, origem)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        layout.layout_id,
        layout.nome,
        layout.descricao,
        layout.versao || '1.0',
        layout.status || 'ativo',
        layout.origem || 'banco'
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...layout });
      });
    });
  }

  async criarTipoRegistro(layoutId, tipo) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO tipos_registro (layout_id, codigo_tipo, nome_tipo, descricao, campos, obrigatorio, ordem)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        layoutId,
        tipo.codigo_tipo,
        tipo.nome_tipo,
        tipo.descricao,
        tipo.campos,
        tipo.obrigatorio ? 1 : 0,
        tipo.ordem || 0
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...tipo });
      });
    });
  }

  async buscarTiposRegistroPorLayout(layoutId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM tipos_registro 
        WHERE layout_id = ? 
        ORDER BY ordem, codigo_tipo
      `;
      this.db.all(sql, [layoutId], (err, rows) => {
        if (err) reject(err);
        else {
          // Parse dos campos JSON
          const tipos = rows.map(row => ({
            ...row,
            campos: JSON.parse(row.campos || '[]'),
            obrigatorio: row.obrigatorio === 1
          }));
          resolve(tipos);
        }
      });
    });
  }

  async atualizarLayoutNovoSistema(id, layout) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE layouts 
        SET layout_id = ?, nome = ?, descricao = ?, versao = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [
        layout.layout_id,
        layout.nome,
        layout.descricao,
        layout.versao,
        layout.status,
        id
      ], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async excluirTiposRegistroPorLayout(layoutId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM tipos_registro WHERE layout_id = ?`;
      this.db.run(sql, [layoutId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // ==================== MÉTODOS PARA CAMPOS CONDICIONAIS ====================
  
  async criarCampoCondicional(tipoRegistroId, campoCondicional) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO campos_condicionais 
        (tipo_registro_id, campo_pai_ordem, condicao_valor, subcampo_letra, nome_subcampo, 
         posicao_inicial, posicao_final, tamanho, formato, obrigatorio, descricao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        tipoRegistroId,
        campoCondicional.campo_pai_ordem,
        campoCondicional.condicao_valor,
        campoCondicional.subcampo_letra,
        campoCondicional.nome_subcampo,
        campoCondicional.posicao_inicial,
        campoCondicional.posicao_final,
        campoCondicional.tamanho,
        campoCondicional.formato,
        campoCondicional.obrigatorio ? 1 : 0,
        campoCondicional.descricao
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...campoCondicional });
      });
    });
  }

  async buscarCamposCondicionaisPorTipo(tipoRegistroId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM campos_condicionais 
        WHERE tipo_registro_id = ? 
        ORDER BY campo_pai_ordem, condicao_valor
      `;
      this.db.all(sql, [tipoRegistroId], (err, rows) => {
        if (err) reject(err);
        else {
          // Agrupar por campo pai e condição
          const camposAgrupados = {};
          rows.forEach(row => {
            const chave = `${row.campo_pai_ordem}_${row.condicao_valor}`;
            if (!camposAgrupados[chave]) {
              camposAgrupados[chave] = {
                campo_pai_ordem: row.campo_pai_ordem,
                condicao_valor: row.condicao_valor,
                subcampos: []
              };
            }
            camposAgrupados[chave].subcampos.push({
              id: row.id,
              subcampo_letra: row.subcampo_letra,
              nome_subcampo: row.nome_subcampo,
              posicao_inicial: row.posicao_inicial,
              posicao_final: row.posicao_final,
              tamanho: row.tamanho,
              formato: row.formato,
              obrigatorio: row.obrigatorio === 1,
              descricao: row.descricao
            });
          });
          resolve(Object.values(camposAgrupados));
        }
      });
    });
  }

  async excluirCamposCondicionaisPorTipo(tipoRegistroId) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM campos_condicionais WHERE tipo_registro_id = ?`;
      this.db.run(sql, [tipoRegistroId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // Fechar conexão
  close() {
    if (this.db) {
      this.db.close();
    }
  }

  // Método para buscar tipos de registro RPS disponíveis
  async buscarTiposRegistro() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT tr.*, l.nome as layout_nome 
        FROM tipos_registro tr
        JOIN layouts l ON tr.layout_id = l.id
        ORDER BY tr.ordem ASC
      `;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = new Database();
