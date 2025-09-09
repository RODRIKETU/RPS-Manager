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

### � **Export/Import de Layouts**
- Exportação de layouts para arquivos JSON
- Importação de layouts de outros sistemas
- Backup e versionamento de configurações
- Compartilhamento entre instalações

### �📊 **Interface Moderna**
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

## 👨‍💻 Desenvolvimento

### **🚀 Início Rápido**
```bash
# TERMINAL 1: Servidor (manter rodando)
.\start-server.bat
# ou
npm run dev

# TERMINAL 2: Testes (executar quando necessário)  
.\test-server.bat
# ou
powershell -ExecutionPolicy Bypass -File .\test-robust.ps1
```

### **⚠️ IMPORTANTE: Use Terminais Separados**
- **Terminal 1**: Dedicado para o servidor (não executar outros comandos)
- **Terminal 2**: Para testes, git, npm install, etc.
- **Nunca execute comandos no terminal do servidor** - isso interrompe o processo!

### **Scripts Disponíveis**
```bash
npm start          # Inicia servidor em produção
npm run dev        # Inicia com nodemon (desenvolvimento)
npm run dev:verbose # Nodemon com logs detalhados
npm run dev:debug  # Nodemon com debug habilitado
```

### **Scripts Batch (Windows)**
- **start-server.bat**: Inicia servidor em janela dedicada
- **test-server.bat**: Executa testes básicos em janela separada

### **Configuração do Nodemon**
O projeto inclui configuração automática do nodemon:
- **Monitora**: `server.js`, `database/`, `layouts/`, `public/`
- **Extensões**: `.js`, `.json`, `.html`, `.css`
- **Ignora**: `node_modules/`, `uploads/`, `*.log`
- **Auto-restart**: 1 segundo de delay

### **Scripts de Teste PowerShell**
```bash
# Executar testes robustos (TERMINAL 2)
powershell -ExecutionPolicy Bypass -File .\test-robust.ps1

# Gerenciar servidor de desenvolvimento
.\dev-server.ps1           # Iniciar servidor
.\dev-server.ps1 -Test     # Iniciar + executar testes
.\dev-server.ps1 -Stop     # Parar servidor
```

### **Estrutura de Desenvolvimento**
- **start-server.bat**: Script para iniciar servidor
- **test-server.bat**: Script para testes básicos
- **test-robust.ps1**: Testes automatizados das APIs
- **dev-server.ps1**: Script de gerenciamento do servidor
- **nodemon.json**: Configuração de hot-reload
- **test-empresa.json**: Dados de teste

### **Fluxo de Desenvolvimento Recomendado**
1. **Abra 2 terminais** no diretório do projeto
2. **Terminal 1**: Execute `.\start-server.bat` e deixe rodando
3. **Terminal 2**: Use para git, testes, instalações, etc.
4. **Acesse**: http://localhost:3000 no navegador
5. **Desenvolva**: Altere arquivos, nodemon reinicia automaticamente

### **URLs de Desenvolvimento**
- **Principal**: http://localhost:3000
- **Gestão**: http://localhost:3000/gestao.html
- **Estacionamento**: http://localhost:3000/estacionamento.html

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
- ✅ **🆕 Busca Automática por CNPJ**: Digite o CNPJ e os dados são preenchidos automaticamente via API
- ✅ **🆕 Auto-Cadastro de Empresas**: Sistema cadastra empresas automaticamente durante importação
- ✅ **Importação com Validação**: Empresa obrigatória por CNPJ
- ✅ **Controle de Duplicatas**: Hash MD5 para arquivos
- ✅ **Gestão por Período**: Filtros e seleção múltipla
- ✅ **Interface Moderna**: Responsiva e intuitiva
- ✅ **Banco Relacional**: SQLite com estrutura completa
- ✅ **APIs REST**: Endpoints para todas as operações
- ✅ **🆕 Integração Externa**: API Brasil API para dados de empresa

## 🔮 Próximas Implementações

- 🟡 **Edição em Massa**: Modal de edição de valores
- 🟡 **Exportação**: Download de dados por período
- 🟡 **Relatórios**: Dashboard com gráficos analíticos
- 🟡 **Autenticação**: Sistema de login por empresa
- 🟡 **Logs**: Auditoria de operações
- 🟡 **Backup**: Exportação/importação de dados

## 🆕 Nova Funcionalidade: Busca Automática por CNPJ

### Como Funciona

1. **Cadastro Manual de Empresas**:
   - Digite apenas o CNPJ no campo de cadastro
   - Clique no botão de busca (🔍) ou termine de digitar o CNPJ
   - O sistema automaticamente preenche: Razão Social, Nome Fantasia, Endereço, Telefone e Email

2. **Importação Automatizada**:
   - Ao importar arquivos RPS, se a empresa não estiver cadastrada
   - O sistema busca automaticamente os dados pela API
   - Cadastra a empresa e prossegue com a importação
   - Exibe notificação informando sobre o auto-cadastro

### API Utilizada
- **Brasil API**: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (Principal)
- **ReceitaWS**: `https://www.receitaws.com.br/v1/cnpj/{cnpj}` (Fallback)
- **Dados Simulados**: Sistema local para demonstração quando APIs estão indisponíveis
- Dados oficiais da Receita Federal quando disponível
- Informações sempre atualizadas

### Rotas Disponíveis
- `GET /api/cnpj/buscar/{cnpj}` - Busca dados externos de CNPJ
- `GET /api/cnpj/status` - Verifica status das APIs externas
- Retorna dados formatados prontos para uso

## 🔧 Resolução de Problemas

### Erro 403 nas APIs de CNPJ
Se você receber erro 403 ao buscar dados de CNPJ:

1. **Sistema de Fallback Automático**: O sistema tenta múltiplas APIs automaticamente
2. **Dados de Demonstração**: Para CNPJs `11222333000181` e `13369527400010` há dados simulados
3. **Cadastro Manual**: Sempre é possível cadastrar empresas manualmente
4. **Logs Detalhados**: Verifique o console do servidor para diagnóstico

### Erro "Cannot read properties of undefined (reading 'valorTotal')"
Se você receber este erro ao importar arquivos RPS:

**✅ RESOLVIDO**: Implementadas as seguintes correções:
1. **Correção de referência**: Mudou de `estatisticas.valorTotal` para `resumo.valorTotal`
2. **Tratamento de valores zero**: RPS com valor 0 são tratados corretamente
3. **Valores padrão**: Campos undefined recebem valor 0 automaticamente
4. **Logs de debug**: Sistema mostra detalhes do processamento para diagnóstico
5. **Compatibilidade**: Criado campo `estatisticas` para compatibilidade retroativa

**Sintomas originais**: Erro ao tentar acessar propriedade `valorTotal` de objeto `undefined`
**Causa**: Estrutura de dados do layout não coincidia com o código de importação
**Solução**: Correção das referências + tratamento defensivo de dados

### CNPJs para Teste
- `11.222.333/0001-81` - Empresa de Demonstração LTDA
- `13.369.527/4000-10` - Outro Exemplo Empresarial S/A

### Arquivos RPS para Teste
- `RPS1_01_D2025_08_03.txt` - Arquivo com RPS incluindo valores zero
- Contém diferentes cenários: RPS com valor, RPS com valor zero, etc.

## 🔒 Validações de Segurança

- ✅ **CNPJ obrigatório** no cabeçalho dos arquivos
- ✅ **🆕 Auto-cadastro de empresas** quando não existem no banco
- ✅ **🆕 Validação de CNPJ** antes da busca externa
- ✅ **Controle de duplicatas** por hash único
- ✅ **Validação de tipos** de arquivo (.txt, .dat, .rps)
- ✅ **🆕 Tratamento de erros** da API externa
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

## 🔄 **Export/Import de Layouts**

### **🎯 Visão Geral**
O sistema de Export/Import permite backup, compartilhamento e migração de layouts entre diferentes instalações do RPS Manager. Os layouts são exportados em formato JSON com estrutura completa.

### **🚀 Funcionalidades**

#### **📤 Exportação de Layouts**
- **Lista de layouts**: Visualização de todos os layouts disponíveis
- **Exportação JSON**: Download automático de arquivo JSON estruturado
- **Informações completas**: Metadata, configurações e tipos de registro
- **Backup seguro**: Preservação total da estrutura e campos

#### **📥 Importação de Layouts**
- **Upload via interface**: Drag & drop ou seleção de arquivo
- **Validação automática**: Verificação da estrutura JSON
- **Controle de duplicatas**: Previne layouts com mesmo ID
- **Transação segura**: Rollback automático em caso de erro

### **📁 Estrutura do JSON Exportado**

```json
{
  "metadata": {
    "versao": "1.0",
    "data_exportacao": "2025-01-08T12:00:00.000Z",
    "exportado_por": "RPS Manager",
    "descricao": "Layout exportado do sistema RPS Manager"
  },
  "layout": {
    "id": 1,
    "nome": "Padrão RJ - Prefeitura do Rio de Janeiro v2.1",
    "tipo": "arquivo_posicional",
    "layout_id": "RJ_PREFEITURA_PADRAO_V2_COMPLETO",
    "estrutura_completa": { /* configurações */ },
    "formatacao": { /* regras de formatação */ }
  },
  "tipos_registro": [
    {
      "codigo_tipo": "10",
      "nome_tipo": "Cabeçalho do Arquivo",
      "campos": [ /* definições dos campos */ ],
      "obrigatorio": true,
      "ordem": 0
    }
  ]
}
```

### **🛠️ Como Usar**

#### **1. Acessar a Funcionalidade**
1. Abra o RPS Manager
2. Navegue para `/layout-export-import.html`
3. Ou acesse via menu principal

#### **2. Exportar um Layout**
1. Na seção "📤 Exportar Layouts"
2. Encontre o layout desejado na lista
3. Clique em "📤 Exportar JSON"
4. O arquivo será baixado automaticamente

#### **3. Importar um Layout**
1. Na seção "📥 Importar Layout"
2. Arraste o arquivo JSON ou clique em "Selecionar Arquivo"
3. Aguarde a validação e importação
4. O layout estará disponível no sistema

### **🔧 APIs de Export/Import**

```javascript
// Listar layouts para exportação
GET /api/layouts/exportar/lista

// Exportar layout específico
GET /api/layouts/:id/exportar

// Importar layout
POST /api/layouts/importar
```

### **⚠️ Considerações Importantes**

1. **IDs únicos**: Layouts com mesmo `layout_id` não podem ser duplicados
2. **Preservação**: Todos os campos e configurações são mantidos
3. **Marcação**: Layouts importados são marcados como "(Importado)"
4. **Segurança**: Transações garantem integridade dos dados

### **📋 Casos de Uso**

- **🔄 Migração**: Transferir layouts entre servidores
- **💾 Backup**: Criar cópias de segurança dos layouts
- **🤝 Compartilhamento**: Distribuir layouts para outras equipes
- **📚 Versionamento**: Manter histórico de versões dos layouts

---

**RPS Manager Pro** - Gestão profissional de RPS multi-empresa! 🚀

## ✨ **Nova Funcionalidade: Gestão de RPS**

### **🎯 Visão Geral**
A tela de Gestão de RPS oferece controle completo sobre os Recibos de Prestação de Serviços, permitindo visualização, criação, edição e exclusão de RPS de forma intuitiva e eficiente.

### **🔧 Funcionalidades Principais**

#### **1. Visualização e Filtros**
- 📊 **Dashboard com estatísticas**: Total de RPS, Valor Total, Valor ISS, RPS Selecionados
- 🔍 **Filtros avançados**: Por empresa, período, status e busca por texto
- 📋 **Tabela interativa**: Ordenação por colunas, seleção múltipla, paginação
- 📱 **Interface responsiva**: Funciona em desktop e dispositivos móveis

#### **2. Criação e Edição de RPS**
- ➕ **Novo RPS**: Formulário completo para criação manual de RPS
- ✏️ **Edição individual**: Alterar dados de RPS existentes
- 🧮 **Cálculos automáticos**: Valor ISS e líquido calculados automaticamente
- ✅ **Validação**: Campos obrigatórios e verificação de duplicatas

#### **3. Ações em Massa**
- ☑️ **Seleção múltipla**: Marcar/desmarcar RPS individuais ou todos
- 📝 **Edição em massa**: Alterar status, alíquota ISS e observações
- 🗑️ **Exclusão em massa**: Remover múltiplos RPS de uma vez
- 📤 **Exportação**: Download de RPS selecionados em formato CSV

#### **4. Gerenciamento Individual**
- 👁️ **Visualização detalhada**: Modal com todas as informações do RPS
- ✏️ **Edição rápida**: Acesso direto ao formulário de edição
- 🗑️ **Exclusão**: Remoção individual com confirmação

### **🚀 Como Usar**

#### **1. Acessar a Gestão de RPS**
1. Abra o sistema RPS Manager
2. Clique na aba "**Gestão RPS**"
3. Selecione uma empresa no filtro
4. Defina o período desejado
5. Clique em "**Atualizar**" para carregar os dados

#### **2. Criar Novo RPS**
1. Clique no botão "**+ Novo RPS**"
2. Preencha os dados obrigatórios:
   - Empresa, Número, Data de Emissão
   - Nome do Tomador, Descrição, Valor
3. O sistema calculará automaticamente ISS e valor líquido
4. Clique em "**Salvar RPS**"

#### **3. Editar RPS Existente**
1. Localize o RPS na tabela
2. Clique no botão ✏️ (Editar)
3. Modifique os dados necessários
4. Clique em "**Atualizar RPS**"

#### **4. Ações em Massa**
1. Selecione os RPS desejados marcando as caixas
2. Use "**Selecionar Todos**" se necessário
3. Escolha a ação: Editar, Excluir ou Exportar
4. Confirme a operação

### **📊 APIs da Gestão de RPS**
- `GET /api/rps` - Buscar RPS por período e empresa
- `POST /api/rps` - Criar novo RPS
- `PUT /api/rps/:id` - Atualizar RPS individual
- `DELETE /api/rps/:id` - Excluir RPS individual
- `PUT /api/rps/massa` - Atualizar múltiplos RPS
- `DELETE /api/rps/massa` - Excluir múltiplos RPS
- `GET /api/rps/estatisticas/:empresaId` - Estatísticas por empresa
