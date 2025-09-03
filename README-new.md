# 🏢 RPS Manager Pro - Sistema Multi-Empresa

Sistema completo de gestão de RPS (Recibo de Prestação de Serviços) multi-empresa com importação automatizada, validações inteligentes e gestão por período.

## 🚀 Características Principais

### 🏢 **Multi-Empresa**
- Cadastro completo de empresas prestadoras
- Validação por CNPJ automática
- Controle de acesso por empresa

### 📁 **Importação Inteligente**
- Upload de múltiplos arquivos simultaneamente
- Validação automática de empresa por CNPJ do cabeçalho
- Controle de duplicatas por hash MD5
- Opções de atualização e filtragem

### 🎯 **Gestão por Período**
- Consulta de RPS por empresa e período
- Filtros avançados por série
- Seleção múltipla para ações em massa
- Edição e exclusão em lote

### 📊 **Interface Moderna**
- Design responsivo e profissional
- Drag & Drop para arquivos
- Notificações em tempo real
- Totalizadores dinâmicos

## 🛠️ Tecnologias

- **Backend**: Node.js + Express.js + SQLite3
- **Frontend**: HTML5 + CSS3 + JavaScript ES6+
- **Database**: SQLite com estrutura relacional
- **Upload**: Multer para processamento de arquivos
- **UI/UX**: CSS Grid + Flexbox + Font Awesome

## 📦 Instalação e Execução

```bash
# 1. Clone o repositório
git clone [url-do-repositorio]
cd RPS_Manager

# 2. Instale as dependências
npm install

# 3. Inicie o servidor
npm start
# ou
node server.js

# 4. Acesse o sistema
# http://localhost:3000
```

## 🎯 Como Usar

### 1️⃣ **Cadastrar Empresas**
1. Acesse a aba "Empresas"
2. Preencha CNPJ, razão social e dados complementares
3. Salve a empresa (obrigatório antes da importação)

### 2️⃣ **Importar Arquivos RPS**
1. Vá para a aba "Importação"
2. Configure opções: "Atualizar Existentes" / "Ignorar Duplicadas"
3. Arraste arquivos ou clique para selecionar
4. Sistema valida empresa por CNPJ do cabeçalho automaticamente
5. Acompanhe resultados detalhados da importação

### 3️⃣ **Gerenciar RPS**
1. Acesse `/gestao.html`
2. Selecione empresa e período
3. Use filtros por série se necessário
4. Selecione RPS para ações em massa (editar/excluir)
5. Acompanhe totais no rodapé em tempo real

## 📁 Estrutura do Projeto

```
📂 RPS_Manager/
├── 📄 server.js                    # Servidor principal com APIs
├── 📄 package.json                 # Dependências do projeto
├── 📂 database/
│   └── 📄 db.js                    # Classes e métodos do banco SQLite
├── 📂 layouts/
│   └── 📄 layout-rps-estacionamento.js  # Parser para RPS de estacionamento
├── 📂 public/
│   ├── 📄 index.html               # Sistema principal (empresas + importação)
│   ├── 📄 gestao.html              # Gestão de RPS por período
│   └── 📄 estacionamento.html      # Visualizador específico
├── 📂 uploads/                     # Arquivos temporários de upload
├── 📄 rps_manager.db              # Banco de dados SQLite (criado automaticamente)
├── 📄 Rpd Exemplo Estacionamento.txt  # Arquivo de exemplo
└── 📄 README.md                   # Esta documentação
```

## 🗄️ Estrutura do Banco de Dados

### **Tabela: empresas**
- `id`, `cnpj`, `razao_social`, `nome_fantasia`
- `inscricao_municipal`, `endereco`, `telefone`, `email`
- `ativo`, `created_at`, `updated_at`

### **Tabela: arquivos_rps**
- `id`, `empresa_id`, `nome_arquivo`, `hash_arquivo`
- `total_rps`, `valor_total`, `data_periodo_inicio`, `data_periodo_fim`
- `status`, `created_at`

### **Tabela: rps**
- `id`, `arquivo_id`, `empresa_id`, `numero_rps`, `serie_rps`
- `data_emissao`, `valor_servicos`, `valor_iss`, `tipo_equipamento`
- `numero_serie`, `status`, `created_at`, `updated_at`
- Campos completos para prestador, tomador e valores

## 🔧 APIs Disponíveis

### **Empresas**
- `GET /api/empresas` - Listar empresas
- `POST /api/empresas` - Criar empresa
- `GET /api/empresas/cnpj/:cnpj` - Buscar por CNPJ
- `PUT /api/empresas/:id` - Atualizar empresa

### **Importação**
- `POST /api/importar-rps` - Upload e processamento de arquivos

### **RPS**
- `GET /api/rps?empresaId&dataInicio&dataFim` - Buscar por período
- `PUT /api/rps/massa` - Atualizar em massa
- `DELETE /api/rps/massa` - Excluir em massa

## ✅ Funcionalidades Implementadas

- ✅ **Sistema Multi-Empresa**: Cadastro e gestão completa
- ✅ **Importação com Validação**: Empresa obrigatória por CNPJ
- ✅ **Controle de Duplicatas**: Hash MD5 para arquivos
- ✅ **Gestão por Período**: Filtros e seleção múltipla
- ✅ **Interface Moderna**: Responsiva e intuitiva
- ✅ **Banco Relacional**: SQLite com estrutura completa
- ✅ **APIs REST**: Endpoints para todas as operações

## 🔮 Próximas Implementações

- 🟡 **Edição em Massa**: Modal de edição de valores
- 🟡 **Exportação**: Download de dados por período
- 🟡 **Relatórios**: Dashboard com gráficos analíticos
- 🟡 **Autenticação**: Sistema de login por empresa
- 🟡 **Logs**: Auditoria de operações
- 🟡 **Backup**: Exportação/importação de dados

## 🔒 Validações de Segurança

- ✅ **CNPJ obrigatório** no cabeçalho dos arquivos
- ✅ **Empresa deve existir** antes da importação
- ✅ **Controle de duplicatas** por hash único
- ✅ **Validação de tipos** de arquivo (.txt, .dat, .rps)
- ✅ **Sanitização** de dados de entrada

## 🚀 Exemplo de Uso Completo

1. **Cadastre uma empresa** com CNPJ `00.032.035/4588-70`
2. **Importe o arquivo** `Rpd Exemplo Estacionamento.txt`
3. **Sistema valida** CNPJ automaticamente
4. **Processa 290+ RPS** de estacionamento
5. **Gerencie por período** em `/gestao.html`
6. **Selecione e edite** em massa conforme necessário

## 📞 Suporte e Contribuição

- 🐛 **Issues**: Reporte bugs no GitHub
- 💡 **Features**: Sugira melhorias
- 🤝 **Contribua**: Fork + Pull Request
- 📧 **Contato**: [seu-email]

---

**RPS Manager Pro** - Gestão profissional de RPS multi-empresa! 🚀
