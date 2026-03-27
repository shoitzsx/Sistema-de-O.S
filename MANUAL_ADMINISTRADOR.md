# 🔐 MANUAL DO ADMINISTRADOR - Águia Florestal

## Guia Completo para Gerenciamento do Sistema

---

## 📋 SUMÁRIO

1. [Visão Geral para Admins](#visão-geral-para-admins)
2. [Primeiro Acesso](#primeiro-acesso)
3. [Gestão de Usuários](#gestão-de-usuários)
4. [Controle de Permissões](#controle-de-permissões)
5. [Gerenciamento de Dados](#gerenciamento-de-dados)
6. [Máquinas e Manuais](#máquinas-e-manuais)
7. [Monitoramento de Operações](#monitoramento-de-operações)
8. [Manutenção do Sistema](#manutenção-do-sistema)
9. [Troubleshooting Avançado](#troubleshooting-avançado)
10. [Segurança e Boas Práticas](#segurança-e-boas-práticas)

---

## Visão Geral para Admins

### O Papel de Administrador

Como administrador do Águia Florestal, você é responsável por:

✅ **Controle de Usuários** - Criar, editar, deletar contas
✅ **Gerenciamento de Permissões** - Definir quem acessa o quê
✅ **Cadastro de Recursos** - Máquinas, manuais, peças e ferramentas
✅ **Auditoria de Operações** - Revisar O.S, checklists, histórico
✅ **Manutenção do Sistema** - Backups, sincronizações, atualizações
✅ **Suporte Técnico** - Resolver problemas de usuários

### Diferenças entre Perfis

| Aspecto | Admin | Operador |
|--------|-------|----------|
| **Criar Usuários** | ✅ Sim | ❌ Não |
| **Deletar O.S** | ✅ Sim (com credencial) | ❌ Não |
| **Ver Todos os Dados** | ✅ Sim | ❌ Apenas seus dados |
| **Gerenciar Máquinas** | ✅ Sim | ❌ Visualizar |
| **Controlar Permissões** | ✅ Sim | ❌ Não |
| **Acessar Dashboard Admin** | ✅ Sim | ❌ Não |
| **Criar O.S** | ✅ Sim | ✅ Sim |
| **Fazer Checklist** | ✅ Sim | ✅ Sim |
| **Exportar Dados** | ✅ Sim | ✅ Sim |

### Credenciais Padrão

Ao primeiro acesso, use:

```
Usuário: admin
Senha: admin123
```

⚠️ **AVISO CRÍTICO:** Altere esta senha imediatamente após primeiro login!

---

## Primeiro Acesso

### Checklist de Configuração Inicial

Após fazer login como admin, complete estas etapas em ordem:

#### Passo 1: Acessar Dashboard Admin

1. Faça login com `admin / admin123`
2. Você verá o Dashboard principal
3. Procure pelo link/ícone **"Gerenciar Usuários"** 👥 ou **"Admin Panel"** ⚙️

#### Passo 2: Verificar Banco de Dados

```
URI do Supabase: Verfique em "Settings"
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (servidor apenas)
```

#### Passo 3: Criar Usuários Iniciais

Vá para **"Gerenciar Usuários"** e crie pelo menos:
- ✅ 1 admin adicional (backup)
- ✅ 3-5 operadores (técnicos)

#### Passo 4: Cadastrar Máquinas

Vá para **"Manuais Técnicos"** e crie:
- ✅ Primeiras máquinas do seu parque
- ✅ Suba manuais PDF
- ✅ Configure templates de checklist

#### Passo 5: Configurar Peças e Ferramentas

Vá para **"Ordens de Serviço"** → **"Gerenciar Peças"**:
- ✅ Crie catálogo de peças
- ✅ Crie catálogo de ferramentas
- ✅ Defina quantidades em estoque

#### Passo 6: Testar Fluxo Completo

1. Crie uma O.S de teste
2. Faça um checklist de teste
3. Finalize a O.S com relatório
4. Exporte dados para CSV
5. Delete a O.S de teste

---

## Gestão de Usuários

### Acessar Gestão de Usuários

1. No Dashboard, localize o módulo **"Gerenciar Usuários"** 👥
2. Clique para abrir o painel administrativo
3. Você verá uma tabela com todos os usuários cadastrados

### Visualizar Usuários Existentes

**Tabela Mostra:**
- 👤 Nome do usuário
- 🔑 Login (username)
- 📧 Email (se disponível)
- 🎭 Papel (Admin / Operador)
- ✅ Status (Ativo / Inativo)
- 📅 Data de criação
- 🔧 Ações (Editar / Deletar)

### Criar Novo Usuário

**Passo 1:** No painel de usuários, clique em **"+ Novo Usuário"** ou **"Criar Usuario"**

**Passo 2:** Preencha o formulário:

```
Campos Obrigatórios:

Nome Completo * (ex: João Silva)
Login/Username * (ex: joao.silva)
  └─ Deve ser único no sistema
  └─ Use sem espaços (ponto, hífen ou underscore)
  └─ Mínimo 5 caracteres

Email * (ex: joao@empresa.com)
  └─ Será usado para comunicações futuras
  └─ Pode ser o mesmo da empresa

Senha Inicial * (ex: Temp@1234)
  └─ Mínimo 8 caracteres
  └─ Deve incluir: maiúscula, minúscula, número, símbolo
  └─ O usuário pode alterar após primeiro login

Papel (Role) * 
  └─ Admin (acesso total)
  └─ Operador (acesso limitado aos módulos aprovados)

Módulos Permitidos (se Operador)
  └─ [ ] Manuais Técnicos
  └─ [ ] Checklist Mensal
  └─ [ ] Ordens de Serviço
  └─ [ ] Histórico de O.S
  └─ [ ] Histórico de Inspeção
  └─ [ ] Gerenciar Usuários (apenas admin)

Status
  └─ ✅ Ativo (pode fazer login)
  └─ ❌ Inativo (negado acesso)
```

**Passo 3:** Clique em **"Criar Usuario"**

```
✅ Usuário Criado com Sucesso!
Credenciais temporárias foram geradas.
```

**Passo 4:** Compartilhe as Credenciais

Entregar ao novo usuário:
```
📋 ENVIAR POR EMAIL OU PESSOALMENTE:

Bem-vindo ao Águia Florestal!

Suas credenciais de acesso:
├─ Usuário: joao.silva
├─ Senha Temporária: Temp@1234
└─ URL: https://aguia-florestal.vercel.app

⚠️ Importante:
- Altere sua senha no primeiro login
- Não compartilhe suas credenciais
- Entre em contato se não conseguir acessar
```

> 💡 **Dica:** Use um gerador de senhas seguras. A senha deve ser temporária e o usuário deve mudar na primeira vez.

### Editar Usuário Existente

**Passo 1:** Na tabela de usuários, localize o usuário desejado

**Passo 2:** Clique no botão **"✏️ Editar"**

**Passo 3:** Você pode alterar:

```
Permitido Editar:
✅ Email
✅ Papel (Admin ↔ Operador)
✅ Módulos permitidos
✅ Status (Ativo ↔ Inativo)
✅ Nome completo

NÃO é Permitido Editar:
❌ Username (use delete e recrie se necessário)
```

**Passo 4:** Clique em **"Salvar Alterações"**

### Alterar Senha de Usuário (Como Admin)

**Passo 1:** Edite o usuário desejado

**Passo 2:** Procure pela seção **"Alterar Senha"** ou "Resetar Senha"

**Passo 3:** Insira a nova senha (mesmos requisitos)

**Passo 4:** Salve

> ⚠️ **AVISO:** O usuário precisará fazer login novamente. Se esquecer a nova senha, terá que contatar você novamente.

### Deletar Usuário

⚠️ **AÇÃO IRREVERSÍVEL - CUIDADO!**

**Passo 1:** Na tabela de usuários, encontre o usuário

**Passo 2:** Clique em **"🗑️ Deletar"** ou **"Remover"**

**Passo 3:** Sistema pede confirmação:

```
Deseja deletar o usuário: João Silva?

⚠️ Aviso:
- Esta ação é IRREVERSÍVEL
- Todas as O.S criadas por este usuário serão mantidas
- O histórico será preservado
- O login não funcionará mais

[❌ Cancelar] [🗑️ Deletar Permanentemente]
```

**Passo 4:** Confirme apenas se tem certeza

```
✅ Usuário deletado com sucesso!
O login não funcionará mais.
Dados históricos foram preservados.
```

### Desativar vs Deletar

| Ação | Use Quando | Reversível |
|------|-----------|-----------|
| **Desativar** | Usuário sai de férias, licença, projeto | ✅ Sim |
| **Deletar** | Usuário saiu da empresa, sem possibilidade de retorno | ❌ Não |

**Recomendação:** SEMPRE desative primeiro. Delete apenas após confirmar que não retornará.

---

## Controle de Permissões

### Entender o Sistema de Módulos

Cada usuário (exceto Admin) tem permissões granulares. Os módulos disponíveis são:

```
1. MANUAIS TÉCNICOS (ID: 1)
   └─ Visualizar máquinas, manuais PDF, especificações
   └─ Ideal para: Técnicos, Operadores

2. CHECKLIST MENSAL (ID: 2)
   └─ Executar inspeções mensais
   └─ Ideal para: Técnicos de manutenção

3. ORDENS DE SERVIÇO (ID: 3)
   └─ Criar e gerenciar O.S
   └─ Ideal para: Todos os técnicos

4. HISTÓRICO DE O.S (ID: 4)
   └─ Ver todas as O.S finalizadas e em andamento
   └─ Ideal para: Supervisores, Gerentes

5. HISTÓRICO DE INSPEÇÃO (ID: 6)
   └─ Ver checklists anteriores
   └─ Ideal para: Técnicos, Supervisores

6. GERENCIAR USUÁRIOS (ID: 5)
   └─ Criar, editar, deletar usuários
   └─ Ideal para: Admin apenas (não recomendado para operadores)
```

### Definir Permissões ao Criar Usuário

**Exemplo 1: Técnico Operacional**
```
Papel: Operador
Módulos:
✅ Manuais Técnicos
✅ Checklist Mensal
✅ Ordens de Serviço
✅ Histórico de O.S
❌ Histórico de Inspeção (apenas ver suas inspeções)
❌ Gerenciar Usuários
```

**Exemplo 2: Supervisor**
```
Papel: Operador
Módulos:
✅ Manuais Técnicos
✅ Checklist Mensal
✅ Ordens de Serviço
✅ Histórico de O.S
✅ Histórico de Inspeção
❌ Gerenciar Usuários
```

**Exemplo 3: Admin Secundário**
```
Papel: Admin
Módulos: (NÃO aplicável, tem acesso a TODOS)
└─ Admins têm permissão total automaticamente
```

### Modificar Permissões Após Criação

**Passo 1:** Vá para **"Gerenciar Usuários"**

**Passo 2:** Clique em **"Editar"** ao lado do usuário

**Passo 3:** Na seção **"Módulos Permitidos"**, marque/desmarque:

```
Current Permissions:
☑ Manuais Técnicos       [Click to toggle]
☑ Checklist Mensal       [Click to toggle]
☑ Ordens de Serviço      [Click to toggle]
☐ Histórico de O.S       [Click to toggle]
☐ Histórico de Inspeção  [Click to toggle]
☐ Gerenciar Usuários     [Click to toggle]
```

**Passo 4:** Salve

```
✅ Permissões Atualizadas!
Usuario terá acesso aos novos módulos no próximo login.
```

### Notificar Usuário de Mudanças

Após alterar permissões, envie um email:

```
Assunto: Suas permissões no Águia Florestal foram atualizadas

Olá João,

Suas permissões foram atualizadas em [DATA].

Novos módulos disponíveis:
- ✅ Histórico de Inspeção
- ✅ Histórico de O.S

Você terá acesso ao próximo login.

Qualquer dúvida, contate o administrador.
```

---

## Gerenciamento de Dados

### Visão Geral de Dados

O sistema possui dados em dois lugares:

**1. Banco de Dados Central (Supabase)**
```
Location: Cloud PostgreSQL
Backup: Automático
Access: VITE_SUPABASE_ANON_KEY (público)
        SUPABASE_SERVICE_ROLE_KEY (secreto)
```

**2. Dados Locais (Navegador)**
```
Location: IndexedDB (banco local)
Sync: Automático quando online
Use: Trabalhar offline
```

### Tabelas Principais e Suas Funções

#### users
```sql
Campos:
- id: UUID
- username: string (único)
- email: string
- role: 'admin' | 'operator'
- allowed_modules: array(int)
- created_at: timestamp
- updated_at: timestamp

Função: Armazenar dados de usuários e permissões
Alterações: Via Dashboard "Gerenciar Usuários"
```

#### machines
```sql
Campos:
- id: UUID
- name: string (ex: "Trator 5090")
- model: string (ex: "John Deere 5090")
- serial_number: string (único)
- purchase_date: date
- manual_url: string (link PDF)
- image_url: string (foto)
- specifications: json
- created_at: timestamp

Função: Registros de máquinas
Alterações: Via Dashboard "Manuais Técnicos"
```

#### service_orders
```sql
Campos:
- id: UUID
- machine_id: UUID (referência a machines)
- operator_id: UUID (referência a users)
- technician_id: UUID (referência a users)
- component: string (ex: "Motor")
- description: string (detalhe do problema)
- status: 'open' | 'in_progress' | 'completed'
- maintenance_type: 'preventive' | 'corrective'
- report: text (opcional, ao finalizar)
- hours_spent: decimal
- created_at: timestamp
- completed_at: timestamp (null se aberta)

Função: Rastrear ordens de serviço
Alterações: Via Dashboard "Ordens de Serviço"
```

#### checklists
```sql
Campos:
- id: UUID
- machine_id: UUID
- technician_id: UUID
- checklist_date: timestamp
- status_by_category: json (ex: {"Motor": "OK", "Transmissão": "NOK"})
- observations: text
- sync_status: 'synced' | 'pending' | 'failed'

Função: Registrar inspeções mensais
Alterações: Via Dashboard "Checklist Mensal"
```

#### parts_tools
```sql
Campos:
- id: UUID
- name: string (ex: "Óleo Sintético 5L")
- category: 'part' | 'tool'
- quantity: int (quantidade em estoque)
- unit_cost: decimal
- created_at: timestamp

Função: Catálogo de peças e ferramentas
Alterações: Via Dashboard (admin apenas)
```

### Exportar Backup de Dados

**Opção 1: Via Dashboard (Fácil)**

1. Vá para **"Histórico de O.S"** 📊
2. Se houver dados, clique **"📥 Exportar CSV"**
3. Arquivo será baixado: `export_YYMMDD.csv`
4. Salve em local seguro

**Opção 2: Via Supabase Console (Avançado)**

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para **"SQL Editor"**
4. Execute:

```sql
-- Exportar Ordens de Serviço
SELECT * FROM service_orders 
ORDER BY created_at DESC;

-- Exportar Usuários
SELECT id, username, email, role 
FROM users;

-- Exportar Máquinas
SELECT * FROM machines;

-- Exportar Checklists
SELECT * FROM checklists 
ORDER BY checklist_date DESC;
```

5. Clique em ⬇️ **"Download CSV"**

**Opção 3: Via Programação (Script Node.js)**

```javascript
// Executar com: node scripts/backup-database.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function backupAll() {
  const tables = ['service_orders', 'checklists', 'machines', 'users', 'parts_tools']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
    
    if (error) console.error(`Erro em ${table}:`, error)
    else console.log(`${table}: ${data.length} registros`)
  }
}

backupAll()
```

### Deletar Ordem de Serviço (Ação Sensível)

⚠️ **APENAS ADMINS PODEM DELETAR O.S**

**Motivos Permitidos:**
- ✅ Dados de teste/demo
- ✅ Erro na criação
- ✅ Duplicação acidental
- ✅ Protocolo de segurança

**Motivos NÃO Permitidos:**
- ❌ Remover O.S histórica legítima
- ❌ Tentar "falsificar" dados
- ❌ Esconder problemas

#### Processo de Deleção

**Passo 1:** Vá para **"Histórico de O.S"** 📊

**Passo 2:** Encontre a O.S indesejada

**Passo 3:** Clique no botão **"🗑️ Deletar"** (aparece apenas para Admin)

**Passo 4:** Sistema solicita **credencial de administrador**:

```
⚠️ CONFIRMAÇÃO CRÍTICA

Você está prestes a DELETAR a O.S: OS-001234
Máquina: Trator 5090
Data: 25/03/2024
Técnico: João Silva

Esta ação é IRREVERSÍVEL!

Para confirmar, insira sua SENHA de admin:
[____________]

[❌ Cancelar] [🗑️ Deletar Permanentemente]
```

**Passo 5:** Digite sua senha de admin e clique **"Deletar Permanentemente"**

```
✅ O.S Deletada!
ID: OS-001234
Data: 27/03/2024 14:30
Deletado por: Admin Silva
```

> 📋 **Auditoria:** A deleção é registrada em `audit_logs` para rastreamento.

---

## Máquinas e Manuais

### Cadastrar Nova Máquina

**Passo 1:** No Dashboard, vá para **"Manuais Técnicos"** 📚

**Passo 2:** Procure um botão **"+ Nova Máquina"** ou **"Cadastrar Equipamento"**

**Passo 3:** Preencha o formulário:

```
Campos Obrigatórios:

Nome da Máquina * (ex: "Trator 5090")
├─ Nome comum pelo qual é conhecido
└─ Deve ser único ou diferenciável

Modelo * (ex: "John Deere 5090")
├─ Modelo completo do fabricante
└─ Útil para buscar especificações

Número de Série * (ex: "JD123456789")
├─ Identificação única do equipamento
├─ Deve ser exatamente como consta na máquina
└─ Será usado para rastreamento

Data de Compra (ex: 15/01/2020)
├─ Quando foi adquirido
└─ Ajuda a calcular idade da máquina

Campos Opcionais:

Imagem da Máquina
├─ Foto/screenshot do equipamento
└─ Formatos: JPG, PNG, WebP

Manual Técnico (PDF)
├─ Manual do fabricante
├─ Será disponível para download
└─ Formato: PDF (até 20MB)

Especificações Técnicas
├─ JSON com dados técnicos
├─ Ex: {"potência": "100cv", "peso": "5000kg"}
└─ Opcional, para referência
```

**Passo 4:** Clique em **"Criar Máquina"**

```
✅ Máquina Cadastrada!
ID: machine_abc123
Agora disponível para O.S e Checklists
```

### Editar Máquina

**Passo 1:** Em "Manuais Técnicos", clique na máquina desejada

**Passo 2:** Clique em **"✏️ Editar"**

**Passo 3:** Altere os dados e clique **"Salvar"**

```
Pode ser Alterado:
✅ Nome
✅ Modelo  
✅ Data de Compra
✅ Imagem
✅ Manual PDF
✅ Especificações

Cuidado:
⚠️ Número de Série (chave única)
```

### Upload de Manual PDF

O manual precisa estar em **formato PDF** para ser útil.

**Passo 1:** Ao criar/editar máquina, procure por **"Selecionar Arquivo"** ou **"📤 Upload"**

**Passo 2:** Escolha o arquivo PDF do seu computador

**Passo 3:** Clique **"Enviar"** ou **"Upload"**

**Passo 4:** Aguarde conclusão

```
Enquanto faz upload:
⏳ Progresso: 45%...
⏳ Validando arquivo...
```

```
Após upload:
✅ Manual enviado com sucesso!
Disponível para download em 5 segundos
```

> 💡 **Dica:** Compesse o PDF se for muito grande (use Ghostscript ou online-convert.com)

### Configurar Template de Checklist

Cada máquina tem um **template de checklist** (modelo de inspeção).

**Passo 1:** Em "Manuais Técnicos", clique na máquina

**Passo 2:** Procure por **"⚙️ Configurar Checklist"** ou **"Editar Template"**

**Passo 3:** Você verá categorias e itens:

```
TEMPLATE DE CHECKLIST - Trator 5090

Categoria 1: MOTOR
  ├─ Item: Óleo do motor em nível adequado
  ├─ Item: Não há vazamentos
  ├─ Item: Correia de distribuição OK
  └─ Item: Motor liga normalmente

Categoria 2: TRANSMISSÃO
  ├─ Item: Óleo da transmissão OK
  ├─ Item: Marchas entram corretamente
  └─ Item: Sem barulhos estranhos

+ Adicionar Categoria
+ Adicionar Item
```

**Passo 4:** Para ADICIONAR um item:
- Clique em **"+ Adicionar Item"** dentro da categoria
- Ou **"+ Adicionar Categoria"** para nova seção

**Passo 5:** Para REMOVER um item:
- Clique em **"🗑️"** ao lado do item
- Confirme

**Passo 6:** Clique em **"Salvar Template"**

```
✅ Template Salvo!
Próximos checklists usarão este modelo.
```

### Visualizar Histórico de Inspeções

Como admin, você pode ver TODOS os checklists realizados.

**Passo 1:** Vá para **"Histórico de Inspeção"** 📈

**Passo 2:** Você verá:
- Todas as máquinas
- Todos os técnicos
- Todas as datas
- Status de cada inspeção

**Passo 3:** Filter por:
- 🚜 Máquina
- 👤 Técnico
- 📅 Data
- ❌ Apenas com problemas (NOK)

**Passo 4:** Clique em uma inspeção para ver detalhes completos

```
Checklist - Trator 5090 - 25/03/2024

✅ MOTOR
  ✓ Óleo do motor em nível adequado [OK]
  ✓ Não há vazamentos [OK]
  ✓ Correia de distribuição OK [NOK - Requer troca em 500h]
  ✓ Motor liga normalmente [OK]

✅ TRANSMISSÃO
  ✓ Óleo da transmissão OK [OK]
  ✓ Marchas entram corretamente [OK]
  ✓ Sem barulhos estranhos [OK]
```

---

## Monitoramento de Operações

### Dashboard de Monitoramento (Admin)

Como admin, você tem acesso a um **dashboard avançado** que mostra:

```
DASHBOARD ADMINISTRATIVO

📊 Estatísticas Gerais:
├─ Total de Usuários: 15
├─ Usuários Ativos: 14
├─ Usuários Inativos: 1
├─ Total de Máquinas: 8
├─ Total de O.S Criadas: 247
└─ O.S em Andamento: 23

📈 Ordens de Serviço:
├─ Filtragem por Status:
│  ├─ ✅ Finalizadas: 200 (81%)
│  ├─ 🔄 Em Andamento: 23 (9%)
│  └─ ⏳ Abertas: 24 (10%)
├─ Média de Tempo: 3.2 horas
├─ Taxa de Conclusão: 89%
└─ Problemas Mais Comuns: Motor (45%), Transmissão (32%)

✅ Checklists:
├─ Total Realizados: 156
├─ Taxa de Conformidade: 78%
├─ Máquinas com Problemas: 3
│  ├─ Trator 5090: 5 itens NOK
│  ├─ Escavadeira CAT: 2 itens NOK
│  └─ Motoniveladora: 1 item NOK
└─ Próximas Inspeções: 12

👥 Performance de Usuários:
├─ Técnico Mais Produtivo: João Silva (89 O.S)
├─ Técnico Mais Rápido: Pedro Costa (2.1h média)
├─ Taxa de Erros: 2%
└─ Conformidade: 94%
```

### Filtros de Monitoramento

```
FILTROS DISPONÍVEIS:

Por Data:
- Últimos 7 dias
- Últimos 30 dias
- Últimos 90 dias
- Período customizado

Por Máquina:
- Selecione qual equipamento monitorar
- Compare múltiplas máquinas

Por Usuário:
- Veja performance individual
- Compare produtividade

Por Status:
- Finalizado ✅
- Em Andamento 🔄
- Aberto ⏳
- Com Problema ⚠️
```

### Relatórios Gerados

Você pode gerar relatórios em PDF:

**Passo 1:** Do lado do dashboard, procure **"📊 Gerar Relatório"**

**Passo 2:** Escolha tipo de relatório:

```
Tipos Disponíveis:

1. RELATÓRIO DE PERFORMANCE
   ├─ Produtividade de técnicos
   ├─ Tempo médio de execução
   ├─ Taxa de conformidade
   └─ Recomendações

2. RELATÓRIO DE MÁQUINAS
   ├─ Estado de cada equipamento
   ├─ Histórico de manutenção
   ├─ Próximas inspeções
   └─ Custos estimados

3. RELATÓRIO EXECUTIVO
   ├─ Resumo geral do mês
   ├─ KPIs principais
   ├─ Desvios e alertas
   └─ Recomendações

4. AUDITORIA
   ├─ Todas as O.S deletadas
   ├─ Mudanças de permissão
   ├─ Logins de admin
   └─ Tentativas de acesso negado
```

**Passo 3:** Configure período e filtros

**Passo 4:** Clique **"📥 Gerar PDF"**

```
⏳ Gerando relatório...
✅ Relatório gerado!
📥 Clique para fazer download
```

### Alertas e Notificações

O sistema gera alertas automáticos:

```
🔔 ALERTAS DE NOTIFICAÇÃO:

1. O.S Atrasada
   └─ "O.S OS-0045 está aberta há 7 dias"

2. Checklist Não Realizado
   └─ "Checklist mensal vencido para Trator 5090"

3. Máquina com Problemas (NOK)
   └─ "Escavadeira CAT tem 5 itens em NOK"

4. Usuário Inativo
   └─ "Pedro Silva não faz login há 14 dias"

5. Tentativas de Acesso Negado
   └─ "João tentou acessar 'Gerenciar Usuários' sem permissão"

6. Falha de Sincronização
   └─ "Dados do iPad de João não sincronizaram por 2 horas"

7. Limite de Armazenamento
   └─ "Você atingiu 85% do limite de armazenamento do Supabase"
```

### Resolver Alertas

**Exemplo: O.S Atrasada**

1. Clique no alerta
2. Sistema abre a O.S
3. Você pode:
   - ✅ Finalizar a O.S
   - 📝 Adicionar observação
   - 👥 Reatribuir a outro técnico
   - 🔔 Notificar o responsável

---

## Manutenção do Sistema

### Checklist de Manutenção Mensal

Execut estas tarefas todo mês para manter o sistema saudável:

```
CHECKLIST DE MANUTENÇÃO - MENSAL

□ Primeira Semana do Mês:
  ├─ [ ] Revisar alertas de O.S atrasadas
  ├─ [ ] Verificar usuários inativos (notificar)
  ├─ [ ] Confirmar backups foram executados
  └─ [ ] Revisar armazenamento (Supabase storage %)

□ Segunda Semana:
  ├─ [ ] Gerar relatório de performance
  ├─ [ ] Revisar máquinas com problemas recorrentes
  ├─ [ ] Atualizar templates de checklists (se necessário)
  └─ [ ] Analisar taxa de conformidade

□ Terceira Semana:
  ├─ [ ] Desativar usuários que saíram
  ├─ [ ] Atualizar dados de máquinas (serial #, etc)
  ├─ [ ] Revisar permissões de usuários
  └─ [ ] Teste de login com diferentes perfis

□ Quarta Semana:
  ├─ [ ] Fazer backup manual (precaução)
  ├─ [ ] Verificar disponibilidade do sistema
  ├─ [ ] Revisar logs de erro (se disponível)
  └─ [ ] Planejar ações para próximo mês
```

### Backup Manual

Para maior segurança, faça backups regulares.

**Método 1: Via Dashboard**

1. Vá para **"Histórico de O.S"**
2. **Exportar CSV** (será baixado)
3. Salve em disco externo e/ou cloud

**Método 2: Via Supabase Console**

1. Vá para https://supabase.com/dashboard
2. Seu Projeto → **"Settings"** → **"Backups"**
3. Clique em **"Create Backup"**
4. Sistema criará snapshot automático

```
Backup criado com sucesso!
├─ Data: 27/03/2024 14:30
├─ Tamanho: 245 MB
├─ Retention: 30 dias
└─ Status: Completo ✅
```

### Restaurar de Backup (Caso de Emergência)

⚠️ **AÇÃO CRÍTICA - ABRA TICKET COM SUPABASE**

1. Acesse https://supabase.com/dashboard
2. Seu projeto → **"Settings"** → **"Backups"**
3. Selecione backup anterior
4. Clique **"Restore"**
5. Confirme (dados recentes serão perdidos!)

```
⚠️ AVISO CRÍTICO
Ao restaurar, TODOS os dados criados APÓS este backup
serão PERMANENTEMENTE DELETADOS.

Data do backup: 26/03/2024
Dados que serão perdidos: 27/03 até agora

Deseja continuar?
[❌ Cancelar] [⚠️ Restaurar Mesmo Assim]
```

### Atualizar Sistema

Quando disponível, atualizações incluem:

- 🐛 Correções de bugs
- ✨ Novas funcionalidades
- 🔒 Patches de segurança
- ⚡ Melhorias de performance

#### Verificar Versão Atual

1. Clique em seu nome de usuário (canto superior)
2. Selecione **"Sobre"** ou **"Configurações"**
3. Procure por **"Versão do Sistema"**

```
Sobre - Águia Florestal

Versão: 1.5.2
Build: 240327
Última atualização: 25/03/2024
Status: ✅ Atualizado
```

#### Aplicar Atualização

1. Seu administrador de infraestrutura receberá notificação
2. Para **Vercel/Netlify**: Deploy automático
3. Acesse novamente (Ctrl+Shift+R para limpar cache)

> 🔔 **Dica:** Atualizações são gratuitas. Não há custo adicional.

### Monitorar Armazenamento (Supabase)

Acompanhe quanto storage está sendo usado:

1. Vá para https://supabase.com/dashboard
2. Seu Projeto → **"Settings"** → **"Usage"**
3. Você verá:

```
STORAGE USAGE

Database: 125 MB / 8 GB (1.5%)
└─ Tabelas de O.S, Usuarios, Checklists, etc

Storage (Arquivos): 2.3 GB / 5 GB (46%)
├─ Manuais PDF: 1.8 GB
├─ Imagens de Máquinas: 350 MB
└─ Uploads de Usuários: 150 MB

Bandwidth (API): 45 GB / 50 GB (90%)
└─ Requisições HTTP
```

Se aproximar do limites:
- 📋 Faça backup de arquivos antigos
- 🗑️ Delete manuais desatualizados
- 🖼️ Comprima imagens
- 📞 Contate Supabase para upgrade

---

## Troubleshooting Avançado

### Usuário Não Consegue Fazer Login

**Sintomas:**
- "Usuário ou senha incorretos"
- Código 401

**Causas Possíveis:**

1. **Usuário desativado**
   - Solução: Edite usuário e ative (Status = Ativo)

2. **Senha expirada**
   - Solução: Reset senha do usuário

3. **Usuário deletado**
   - Solução: Recrie o usuário

4. **Problema de Cache**
   - Solução: Usuário tenta Ctrl+Shift+Del → Limpar cookies

### Módulo Não Aparece no Dashboard

**Sintomas:**
- O card do módulo não aparece
- Usuário tem permissão mas não vê

**Soluções:**
1. Verifique em "Gerenciar Usuários" se permissão está marcada
2. Peça ao usuário fazer logout e login novamente
3. Tente em navegador diferente
4. Limpe cache no navegador (Ctrl+Shift+Del)

### Dados Não Sincronizam Offline

**Sintomas:**
- Status mostra ⚠️ vermelho
- "Falha ao sincronizar"

**Possíveis Causas:**

1. **Conexão fraca**
   - Solução: Espere por conexão melhor, tente em outro lugar

2. **Servidor sobrecarregado**
   - Solução: Tente após alguns minutos

3. **API inativa**
   - Solução: Verifique status do Supabase (https://supabase.com/status)

4. **Límite de requisições atingido**
   - Solução: Contate Supabase para upgrade

5. **Dados corrompidos localmente**
   - Solução: Limpe IndexedDB:
     ```javascript
     // No console do navegador (F12)
     indexedDB.deleteDatabase('aguia_florestal')
     // Recarregue: Ctrl+R
     ```

### Relatório Não Gera

**Erro:** "Falha ao gerar PDF"

**Soluções:**
1. Tente gerar com menos dados (período menor)
2. Espere alguns segundos e tente novamente
3. Tente em outro navegador
4. Se persistir, contate administrador

### Problema de Performance (Sistema Lento)

**Sintomas:**
- Interface lenta
- Tabelas demoram para carregar
- Cliques não respondem rápido

**Causas e Soluções:**

1. **Muitos dados carregados**
   - Solução: Use filtros para reduzir resultados

2. **Muitas abas abertas**
   - Solução: Feche abas desnecessárias

3. **Cache do navegador cheio**
   - Solução: Limpe cache (Ctrl+Shift+Del)

4. **Conexão lenta**
   - Solução: Verifique internet, tente outro dispositivo

5. **Servidor sobrecarregado**
   - Solução: Tente em horário menos ocupado

6. **Extensões do navegador interferindo**
   - Solução: Desabilite extensões temporariamente

### Banco de Dados Corrompido

**Sintomas:**
- Dados inconsistentes
- Casa nulável quando não deveria
- Erros aleatórios

**Prevenção:**
- ✅ Faça backups regulares
- ✅ Não delete dados manualmente (use interface)
- ✅ Mantenha conexão estável durante operações

**Recuperação:**
1. Contate Supabase Support: https://supabase.com/support
2. Solicite restauração de backup
3. Especifique data/hora da corrupção
4. Entre 24-48 horas, banco é restaurado

---

## Segurança e Boas Práticas

### Política de Senhas

Para manter o sistema seguro, implemente política forte:

```
REQUISITOS DE SENHA:

✅ Mínimo 8 caracteres
✅ Pelo menos 1 MAIÚSCULA
✅ Pelo menos 1 minúscula
✅ Pelo menos 1 número
✅ Pelo menos 1 símbolo (!@#$%^&*)

❌ Não use:
- Senha simples (123456, abcdef)
- Seu nome ou username
- Datas de nascimento
- Informações públicas (nome empresa, etc)

✅ Exemplos de BOAS senhas:
- MeuSenha@2024Segura
- Trator5090$Manutencao
- AgiaFlor@2024#Tech

❌ Exemplos de RUINS:
- aguia123 (muito simples)
- aguiaflor (sem número/símbolo)
- 12345678 (só números)
```

### Controle de Acesso

**Para cada novo usuário pergunt:**

1. Qual seu papel na empresa?
   - Técnico de Manutenção → Operador (módulos 1,2,3,4)
   - Supervisor → Operador (módulos 1,2,3,4,6)
   - Gerente → Operador (módulos 3,4) ou Admin
   - Admin → Admin (acesso total)

2. Qual máquinas precisa acessar?
   - Limitar por tipo de equipamento (se possível)

3. Qual é seu email corporativo?
   - Para comunicações e notificações

4. Quanto tempo vai usar o sistema?
   - Para planejar políticas de retenção

### Auditoria de Ações

Todas as ações críticas são registradas:

```
AUDIT LOG - O Que É Registrado:

✅ Criação de usuário
✅ Deleção de usuário
✅ Mudança de permissões
✅ Deleção de O.S (com motivo)
✅ Login de admin
✅ Alteração de dados sensíveis
✅ Tentativas de acesso negado
✅ Exports de dados

Para acessar logs (Supabase):
1. SQL Editor
2. SELECT * FROM audit_logs ORDER BY created_at DESC;
```

### Proteger Dados Sensíveis

**O QUE NÃO fazer:**

❌ Compartilhar senha de admin com vários
❌ Deixar conta admin aberta em computador público
❌ Enviar credenciais por email plano
❌ Usar mesma senha em múltiplos sistemas
❌ Armazenar senhas em documento texto

**O QUE fazer:**

✅ Alterar senha admin após primeiro acesso
✅ Usar gerenciador de senhas (LastPass, 1Password, Bitwarden)
✅ Ativar 2FA (Two-Factor Authentication) se disponível
✅ Fazer logout ao sair
✅ Desativar (não deletar) usuários que saem
✅ Implementar rotação de senhas a cada 90 dias

### Compliance e Conformidade

Se sua empresa requer conformidade (LGPD, GDPR, ISO 27001):

#### LGPD (Lei Geral de Proteção de Dados - Brasil)

```
Implementar:
✅ Termo de Consentimento ao primeiro login
✅ Política de privacidade disponível
✅ Direito de acesso aos dados
✅ Direito de deletar dados (GDPR-alike)
✅ Encriptação de dados em trânsito (HTTPS)
✅ Backup e recuperação de desastres

Documentar:
✅ Processamento de dados pessoais
✅ Responsáveis pelos dados
✅ Tempo de retenção
✅ Incidentes de segurança
```

#### Auditoria de Segurança Trimestral

Faça a cada 3 meses:

```
□ Revisar lista de usuários
  ├─ Remover inativos há 6+ meses
  └─ Verificar permissões apropriadas

□ Testar backup e restore
  ├─ Confirmar que backups funcionam
  └─ Simular restauração

□ Revisar logs de acesso
  ├─ Procurar por anomalias
  └─ Verificar tentativas de hacking

□ Atualizar documentação de segurança
  ├─ Distribuir aos usuários
  └─ Confirmar leitura

□ Teste de penetração (anual)
  ├─ Contratar serviço externo
  └─ Corrigir vulnerabilidades encontradas
```

---

## Checklist Final de Configuração

Use este checklist ao implementar o sistema pela primeira vez:

```
CHECKLIST DE IMPLEMENTAÇÃO

FASE 1: SETUP INICIAL
[ ] Setup do Supabase concluído
[ ] Schema.sql e migrations rodadas
[ ] Variáveis de ambiente configuradas
[ ] Sistema online e acessível

FASE 2: USUÁRIOS
[ ] Admin principal criado
[ ] Admin secundário criado (backup)
[ ] 3-5 operadores criados
[ ] Credenciais entregues
[ ] Senhas iniciais alteradas pelos usuários

FASE 3: MÁQUINAS
[ ] Pelo menos 3 máquinas cadastradas
[ ] Manuais PDF importados
[ ] Templates de checklist configurados
[ ] Imagens de máquinas adicionadas

FASE 4: PERMISSÕES
[ ] Cada usuário tem módulos apropriados
[ ] Nenhum operador com acceso a "Gerenciar Usuários"
[ ] Admin secundário testado
[ ] Permissões documentadas

FASE 5: TESTES
[ ] Criar teste O.S
[ ] Fazer teste Checklist
[ ] Finalizar teste O.S
[ ] Exportar dados de teste
[ ] Deletar dados de teste (como admin)
[ ] Logar como operador (verificar permissões)

FASE 6: TREINAMENTO
[ ] Usuários treinados no sistema
[ ] Manual do Usuário distribuído
[ ] Playlist de vídeos tutoriais preparada
[ ] Contato de suporte fornecido

FASE 7: PRODUÇÃO
[ ] Backup inicial feito
[ ] Monitoramento ativado
[ ] Alertas configurados
[ ] Logs monitorados
[ ] Status do Supabase bookmarkado

PHASE 8: DOCUMENTAÇÃO
[ ] README atualizado
[ ] Passwords seguras em cofre
[ ] Plano de disaster recovery escrito
[ ] SLA definido com usuários
```

---

## Informações de Contato e Suporte

### Quando Contatar Supabase

**Problemas Relatados:**
- ❌ Banco de dados indisponível
- ❌ Dados corrompidos
- ❌ Limite de requisições atingido
- ❌ Armazenamento cheio
- ❌ Backup/Restore necessário

**Contato:**
- 🌐 https://supabase.com/support
- 📧 support@supabase.com
- 🟫 Discord Community

### Quando Contatar Vercel/Netlify (se usar)

**Problemas:**
- Deploy falhando
- Score de performance baixa
- Certificado SSL expirado
- Limite de requisições HTTP

### Documentação Oficial

- 📚 Supabase Docs: https://supabase.com/docs
- 📚 React Docs: https://react.dev
- 📚 TypeScript Docs: https://www.typescriptlang.org/docs
- 📚 Tailwind CSS: https://tailwindcss.com/docs

---

**Versão:** 1.0  
**Data:** Março 2024  
**Próxima Revisão:** Junho 2024  
**Último Atualizado:** 27/03/2024  

---

**Obrigado por usar Águia Florestal! 🌳🔐**

Para dúvidas, contate seu administrador de TI.
