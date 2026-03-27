# 📖 MANUAL DO USUÁRIO - Águia Florestal

## Sistema de Ordens de Serviço para Manutenção Preventiva e Corretiva

---

## 📋 SUMÁRIO

1. [Introdução](#introdução)
2. [Primeiros Passos](#primeiros-passos)
3. [Dashboard Inicial](#dashboard-inicial)
4. [Login](#login)
5. [Básicos - Tarefas Diárias](#básicos---tarefas-diárias)
6. [Intermediário - Fluxo de Trabalho](#intermediário---fluxo-de-trabalho)
7. [Avançado - Recursos Adicionais](#avançado---recursos-adicionais)
8. [Trabalhando Offline](#trabalhando-offline)
9. [Troubleshooting](#troubleshooting)

---

## Introdução

O **Águia Florestal** é um sistema web moderno para gestão de ordens de serviço (O.S) e manutenção de máquinas em ambientes florestais.

### Objetivos do Sistema:
- ✅ Registrar ordens de serviço de manutenção
- ✅ Acompanhar equipamentos e máquinas
- ✅ Consultar manuais técnicos
- ✅ Realizar inspeções com checklists
- ✅ Visualizar histórico de operações
- ✅ Funcionar sem internet (Offline-first)

### Quem Pode Usar:
- **Operadores de Equipamento** - Podem abrir O.S, executar checklists e consultar informações
- **Técnicos de Manutenção** - Realizam e finalizam as ordens de serviço
- **Supervisores** - Acompanham e gerenciam as atividades

---

## Primeiros Passos

### Requisitos Iniciais:
1. Um navegador web moderno (Chrome, Firefox, Safari, Edge)
2. Conexão com internet (primeira vez) ou dados sincronizados do cache
3. Seus dados de login fornecidos pelo administrador

### Acessar o Sistema:
1. Abra o navegador
2. Dirija-se para o endereço do sistema fornecido (ex: https://aguia-florestal.vercel.app)
3. Você verá a tela de **Login**

---

## Dashboard Inicial

Ao acessar o sistema, você verá um painel com todos os módulos disponíveis para você.

### O que você verá:
- **Cartões de módulos** com ícones e títulos
- **Barra de navegação** no topo ou lateral
- **Informações do seu perfil** (seu nome e papel)
- **Botão de logout** para sair do sistema

### Módulos Available (conforme suas permissões):

| Módulo | Descrição | Ícone |
|--------|-----------|-------|
| **Manuais Técnicos** | Consultar especificações de máquinas | 📚 |
| **Checklist Mensal** | Realizar inspeção de equipamentos | ✅ |
| **Ordens de Serviço** | Criar/gerenciar O.S | 🔧 |
| **Histórico de O.S** | Ver todas as O.S realizadas | 📊 |
| **Histórico de Inspeção** | Ver todas as inspeções feitas | 📈 |

> 💡 Se um módulo não aparece, entre em contato com o administrador para solicitar permissão.

---

## Login

### Como Fazer Login:

**Passo 1:** Na tela inicial, você verá campos para inserir:
- **Usuário** - seu nome de login
- **Senha** - sua senha segura

**Passo 2:** Digite seus dados

```
Exemplo:
Usuário: joao_silva
Senha: ••••••••
```

**Passo 3:** Clique em **"Entrar"**

```
✅ Se correto → Você será direcionado ao Dashboard
❌ Se erro → Você verá uma mensagem de erro
```

### Recuperar Acesso:
- Se esqueceu sua senha, **contate o administrador**
- Não há opção de "Esqueci a Senha" no sistema

### Mantendo Seguro:
- 🔒 **Nunca compartilhe sua senha** com outras pessoas
- 🔒 **Sempre faça logout** ao terminar (clique seu nome → Logout)
- 🔒 **Use senhas fortes** (misture letras, números, símbolos)

---

# BÁSICOS - Tarefas Diárias

## 1️⃣ Consultar Manuais Técnicos

Os manuais técnicos contêm informações sobre todas as máquinas do sistema.

### Acessar Manuais:
1. No **Dashboard**, clique no card de **"Manuais Técnicos"** 📚
2. Você verá uma **lista de máquinas** com seus nomes e modelos

### Encontrar uma Máquina:
- **Scroll** pela lista (se houver muitas)
- Clique no **nome da máquina** para ver detalhes completos

### Ver Detalhes da Máquina:
Ao clicar em uma máquina, você verá:
- ℹ️ **Nome e Modelo** da máquina
- ℹ️ **Número de Série** (identificação única)
- ℹ️ **Data de Compra** (quando foi adquirida)
- ℹ️ **Imagem** da máquina (se disponível)
- ℹ️ **Manual PDF** (para download)
- ℹ️ **Especificações técnicas**

### Download do Manual PDF:
- Procure pelo botão **"📥 Baixar Manual"**
- Clique para baixar em seu computador
- Salve em local seguro para consulta offline

> 💡 **Dica:** Baixe os manuais enquanto estiver com internet para consultá-los depois sem conexão.

---

## 2️⃣ Criar uma Ordem de Serviço

Uma **Ordem de Serviço (O.S)** é o registro formal de uma manutenção que precisa ser realizada.

### Quando Criar uma O.S:
- Quando uma máquina apresenta problemas
- Quando é necessária manutenção preventiva/corretiva
- Quando há necessidade de verificação técnica

### Passo a Passo:

**Passo 1:** No Dashboard, clique em **"Ordens de Serviço"** 🔧

**Passo 2:** Clique no botão **"+ Nova O.S"** ou **"Criar Nova Ordem"**

**Passo 3:** Preencha o formulário:

```
Campos Obrigatórios (*):

Máquina *
├─ Selecione a máquina que precisa manutenção
└─ Ex: Trator JD 5090, Escavadeira CAT 320

Operador *
├─ Quem está operando/reportando o problema
└─ Ex: João Silva

Técnico *
├─ Quem irá executar a manutenção
└─ Ex: Pedro Costa

Tipo de Manutenção *
├─ Preventiva (agendada, rotina)
└─ Corretiva (problema identificado)

Componente Afetado *
├─ Qual parte da máquina tem problema
└─ Ex: Motor, Transmissão, Sistema Hidráulico

Descrição do Problema *
├─ Detalhe o que está acontecendo
└─ Ex: "Motor não ligar, sem som, possível bateria"

Campos Opcionais:

Peças/Ferramentas Utilizadas
├─ Selecione itens que serão usados
└─ Ex: Óleo sintético 5L, Filtro ar, Chave inglesa

Observações Adicionais
├─ Notas extras sobre a O.S
└─ Ex: "Máquina foi testada em local seguro"
```

**Passo 4:** Clique em **"Criar O.S"** ou **"Salvar"**

```
✅ O.S Criada com Sucesso!
Você receberá um ID único (ex: OS-2024-001234)
```

### Confirmação:
- A O.S foi criada e atribuída ao técnico
- Você receberá confirmação visual ou notificação
- O histórico será atualizado

> 💡 **Dica:** Guarde o ID da O.S para referência futura!

---

## 3️⃣ Realizar um Checklist de Inspeção

Um **Checklist** é uma lista de itens que deve ser verificada regularmente em uma máquina.

### Quando Fazer Checklist:
- Executar inspeção mensal de equipamentos
- Antes de usar o equipamento
- Se solicitado pelo supervisor
- Conforme cronograma de manutenção preventiva

### Passo a Passo:

**Passo 1:** No Dashboard, clique em **"Checklist Mensal"** ✅

**Passo 2:** Você verá uma tela para **"Selecionar Equipamento"**

**Passo 3:** Escolha a máquina a ser inspecionada:
- Clique no dropdown/lista de máquinas
- Selecione a máquina desejada
- Ex: "Trator 5090", "Escavadeira CAT"

**Passo 4:** Você verá o **Checklist com Categorias**

Exemplo de estrutura:
```
CHECKLIST - Trator 5090
Data: 27/03/2024
Técnico: João Silva

✅ CATEGORIA: MOTOR
├─ [ ] Óleo do motor em nível adequado
├─ [ ] Não há vazamentos
├─ [ ] Correia de distribuição OK
└─ [✓] Motor liga normalmente

✅ CATEGORIA: TRANSMISSÃO
├─ [ ] Óleo da transmissão OK
├─ [ ] Marchas entram corretamente
└─ [✓] Sem barulhos estranhos

✅ CATEGORIA: SISTEMA ELÉTRICO
├─ [ ] Bateria carregada
├─ [ ] Luzes funcionam
└─ [ ] Cabos em bom estado
```

**Passo 5:** Para cada item, escolha um status:

| Status | Significado | Quando usar |
|--------|-------------|-------------|
| ✅ OK | Tudo funcionando normalmente | Item está em perfeito estado |
| ❌ NOK | Problema identificado | Item apresenta defeito/problema |
| ⊘ N/A | Não Aplicável | Item não existe nesta máquina |

**Passo 6:** Clique em cada item e marque o status apropriado:
- Clique no item
- Selecione o status
- Se desejar, adicione uma **observação** (ex: "Óleo sujo, precisa troca")

**Passo 7:** Quando terminar de verificar todos os itens:
- Clique em **"Finalizar Checklist"**
- O sistema validará se todos foram preenchidos
- Receberá confirmação de sucesso

```
✅ Checklist Finalizado!
Todos os dados foram salvos e sincronizados.
```

### Revendo o Checklist Anterior:
- Vá para **"Histórico de Inspeção"** 📈
- Procure pelo checklist anterior da mesma máquina
- Clique para ver todos os detalhes
- Compare os status (OK/NOK/N/A)

> 💡 **Dica:** Se encontrar o status "NOK", mencione ao supervisor ou técnico para correção!

---

## 4️⃣ Acompanhar Uma Ordem de Serviço

Você pode ver o status e detalhes de uma O.S que está em andamento.

### Visualizar O.S em Andamento:

**Passo 1:** No Dashboard, clique em **"Ordens de Serviço"** 🔧

**Passo 2:** Você verá uma lista de O.S (suas ou atribuídas a você)

**Passo 3:** Clique em uma O.S para ver detalhes:
- 📋 ID da O.S
- 🚜 Máquina
- 👤 Operador e Técnico
- 🔧 Componente afetado
- 📝 Descrição do problema
- 📊 Status: (Aberta, Em Andamento, Finalizada)
- 🛠️ Peças/Ferramentas usadas

### Editar Uma O.S (Se Permitido):
- Clique no botão **"✏️ Editar"**
- Modifique os campos desejados
- Clique **"Salvar Alterações"**

> ⚠️ **Nota:** Você pode editar apenas se tiver permissão ou se for o responsável pela O.S.

---

# INTERMEDIÁRIO - Fluxo de Trabalho

## 5️⃣ Finalizar uma Ordem de Serviço

Quando a manutenção for concluída, você precisa **finalizá-la** com um relatório.

### Pré-requisitos:
- A O.S deve estar aberta/em andamento
- A manutenção deve estar concluída
- Você deve ser o técnico atribuído (ou admin)

### Passo a Passo:

**Passo 1:** Na listagem de O.S, clique na ordem que deseja finalizar

**Passo 2:** Veja os detalhes e clique em **"Finalizar O.S"** ou **"Concluir"**

**Passo 3:** Aparecerá um formulário para adicionar informações de conclusão:

```
Campos do Relatório de Conclusão:

Tempo Gasto (horas)
├─ Quanto tempo levou a manutenção
└─ Ex: 2.5 horas

Relatório Técnico (Opcional)
├─ Descreva o que foi feito
└─ Ex: "Óleo foi trocado, filtro recolocado, 
        máquina testada com sucesso"

Observações Importantes
├─ Notas adicionais
└─ Ex: "Cliente notificado, máquina liberada"

Status Final
├─ Selecione: Finalizado | Pendente Revisão | Com Defeito
└─ Indica se a correção resolveu o problema
```

**Passo 4:** Clique em **"Confirmar Finalização"** ou **"Salvar e Fechar"**

```
✅ O.S Finalizada com Sucesso!
Status alterado para: FINALIZADO
Data de conclusão: 27/03/2024 14:30
```

### O que Acontece Depois:
- O status muda para "Finalizado"
- A O.S é movida para histórico
- O supervisor/admin será notificado
- Não pode mais ser editada (apenas visualizada)

---

## 6️⃣ Consultar Histórico de Ordens de Serviço

O histórico mostra todas as O.S que já foram criadas e finalizadas.

### Acessar Histórico:

**Passo 1:** No Dashboard, clique em **"Histórico de O.S"** 📊

**Passo 2:** Você verá uma tabela com todas as O.S

### Informações Disponíveis:

```
Tabela de Histórico:
┌─────────────────────────────────────────────┐
│ ID    │ Máquina │ Status │ Data    │ Técnico │
├─────────────────────────────────────────────┤
│ OS-01 │ Trator  │ ✅ Fim │ 25/03   │ João    │
│ OS-02 │ Escav.  │ 🔄 And│ 26/03   │ Pedro   │
│ OS-03 │ Trator  │ ✅ Fim │ 20/03   │ João    │
└─────────────────────────────────────────────┘
```

### Filtros Disponíveis:

**Por Status:**
- ✅ Finalizadas
- 🔄 Em Andamento
- ⏳ Abertas

**Por Tipo:**
- 🛡️ Preventiva (manutenção rotina)
- 🆘 Corretiva (problema)

**Busca Rápida:**
- Digite no campo de busca para encontrar por:
  - ID da O.S
  - Nome da máquina
  - Nome do técnico

### Clicar em uma O.S no Histórico:
- Ver todos os detalhes completos
- Visualizar relatório de conclusão
- Ver peças/ferramentas utilizadas
- Imprimir o histórico (se necessário)

> 💡 **Dica:** Use os filtros para encontrar rapidamente o que procura!

---

## 7️⃣ Visualizar Histórico de Inspeções

Ver todos os checklists que você (ou a equipe) já realizou.

### Acessar Histórico de Inspeção:

**Passo 1:** No Dashboard, clique em **"Histórico de Inspeção"** 📈

**Passo 2:** Você verá uma listagem com todas as inspeções anteriores

### Informações Mostradas:

```
Histórico exibe:
- Data da inspeção
- Máquina inspecionada
- Técnico que realizou
- Número de itens OK
- Número de itens NOK (problemas)
- Número de itens N/A
- Status de sincronização (✓ Sincronizado | ⏳ Pendente)
```

### Filtros e Buscas:

**Filtrar por:**
- Máquina (Trator, Escavadeira, etc.)
- Data (últimos 7 dias, 30 dias, etc.)
- Técnico responsável
- Status de Sincronização

**Buscar por:**
- Nome da máquina
- Data específica

### Visualizar Detalhes de um Checklist Anterior:

**Passo 1:** Clique em uma inspeção da lista

**Passo 2:** Você verá:
- ✅ Todos os itens que foram marcados como OK
- ❌ Todos os itens marcados como NOK (com observações)
- ⊘ Itens que eram N/A

**Passo 3:** Compare com inspeções anteriores:
- Procure pelo **"Comparar com Anterior"** (se disponível)
- Veja mudanças no status dos itens
- Identifique problemas recorrentes

---

# AVANÇADO - Recursos Adicionais

## 8️⃣ Exportar Dados para Excel/CSV

Você pode exportar históricos e relatórios para processar em planilhas.

### Exportar Histórico de O.S:

**Passo 1:** Vá para **"Histórico de O.S"** 📊

**Passo 2:** Clique em **"📥 Exportar CSV"** ou **"Exportar para Excel"**

**Passo 3:** O arquivo será baixado para seu computador

**Passo 4:** Abra em Excel, Google Sheets, etc.

### Formato do Arquivo CSV:

```
ID;Máquina;Técnico;Tipo;Status;Data;Componente;Horas
OS-001;Trator 5090;João Silva;Preventiva;Finalizado;2024-03-25;Motor;2.5
OS-002;Escavadeira CAT;Pedro Costa;Corretiva;Finalizado;2024-03-26;Sistema Hidráulico;4
OS-003;Trator 5090;João Silva;Corretiva;Em Andamento;2024-03-27;Transmissão;0
```

### O que Você Pode Fazer:
- 📊 Criar gráficos e análises
- 📈 Comparar dados históricos
- 🖨️ Imprimir relatórios
- 💾 Fazer backup de dados
- 📧 Compartilhar com gerentes

> 💡 **Dica:** Exporte regularmente para ter backups locais dos seus dados!

---

## 9️⃣ Notificações e Alertas

O sistema notifica você de eventos importantes.

### Tipos de Notificações:

```
📢 NOTIFICAÇÕES DO SISTEMA:

1️⃣ O.S Atribuída a Você
   └─ "Uma nova O.S foi atribuída a você: OS-0045"

2️⃣ Checklist Vencido
   └─ "Checklist mensal vencido para Trator 5090"

3️⃣ O.S Finalizada
   └─ "A O.S OS-0034 foi finalizada por João Silva"

4️⃣ Erro de Sincronização
   └─ "Falha ao sincronizar dados. Tentando novamente..."

5️⃣ Permissão Alterada
   └─ "Você agora tem acesso ao módulo X"
```

### Ver Notificações:
- Procure pelo ícone 🔔 **sino de notificações** no topo da tela
- Clique para ver todas as notificações recentes
- Marque como lida ou delete conforme necessário

### Configurar Preferências de Notificação:

**Passo 1:** Vá para **Configurações** (ícone ⚙️)

**Passo 2:** Clique em **"Notificações"**

**Passo 3:** Escolha quais notificações deseja receber:
- ✅ O.S atribuídas
- ✅ Checklists
- ✅ Atualizações de status
- ✅ Alertas de sincronização

**Passo 4:** Salve suas preferências

---

# TRABALHANDO OFFLINE

## 🔟 Usando o Sistema Sem Internet

O Águia Florestal foi projetado para funcionar **offline-first**. Você pode continuar trabalhando sem internet!

### Como Funciona Offline:

**Dados Armazenados Localmente:**
- Máquinas e manuais (baixados previamente)
- O.S que você criou
- Checklists que realizou
- Histórico local

**O Que Você PODE Fazer Offline:**
✅ Criar nova O.S
✅ Editar O.S em andamento
✅ Preencher checklists
✅ Consultar manuais (se baixados)
✅ Ver histórico local
✅ Adicionar observações

**O Que PRECISA de Internet:**
❌ Fazer login pela primeira vez
❌ Download de manuais PDF
❌ Upload de imagens/fotos
❌ Sincronizar dados com servidor
❌ Ver permissões atualizadas

### Preparar-se para Trabalhar Offline:

**Passo 1:** Enquanto conectado à internet, execute estas ações:

- 📚 Abra "Manuais Técnicos"
- 📥 Baixe os manuais PDF das máquinas que usará
- 🔍 Visualize os checklists para cachear na memória
- 📊 Abra o "Histórico de O.S" (para ter referência)
- ✅ Faça um checklist (para testar se funciona)

**Passo 2:** Quando Desconectar:

- ✅ O sistema detectará automaticamente
- ✅ Você verá um indicador de status offline
- ✅ Continuar normalmente trabalhando!

### Salvamento e Sincronização Automática:

O sistema implementa uma **fila de sincronização**:

```
Fluxo de Sincronização:

1. Você cria/edita um item offline
   ↓
2. Sistema salva localmente no seu dispositivo
   ↓
3. Quando internet volta, sincroniza automaticamente
   ↓
4. Você recebe confirmação (✓ Sincronizado)
```

### Indicadores de Sincronização:

```
Status Icons:
✓ Verde  = Sincronizado com servidor
⏳ Amarelo/Laranja = Aguardando sincronização
⚠️ Vermelho = Erro na sincronização (tente novamente depois)
```

### Se Houver Erro na Sincronização:

1. Cheque sua conexão de internet
2. Recarregue a página (F5 ou Ctrl+R)
3. O sistema tentará sincronizar novamente
4. Se persistir, **contate o administrador**

> 💡 **Dica:** Sempre mantenha os dados localizados atualizados! Abra o sistema periodicamente para sincronizar.

---

# TROUBLESHOOTING

## ⚠️ Problemas Comuns e Soluções

### Problema 1: Não consegue fazer login

**Sintomas:**
- Mensagem: "Usuário ou senha incorretos"
- Não consigo acessar o sistema

**Soluções:**
1. ✅ Verifique CAPS LOCK (não deve estar ativado)
2. ✅ Verifique espaços em branco (não copie com espaço)
3. ✅ Contate o administrador se esqueceu a senha
4. ✅ Tente em outro navegador (Chrome, Firefox, Safari)
5. ✅ Limpe cache: Ctrl+Shift+Del → selecione "Cookies" → Delete

**Código de Erro:** 401 | 403

---

### Problema 2: Não vejo o módulo que preciso

**Sintomas:**
- O card do módulo não aparece no Dashboard
- Erro "Acesso Negado" ao clicar

**Soluções:**
1. ✅ Contate o **administrador** para solicitar permissão
2. ✅ Verifique seu papel (Admin vs Operador)
3. ✅ Faça logout e login novamente
4. ✅ Recarregue a página (F5)

**Motivo Comum:**
- O admin ainda não liberou o módulo para seu usuário

---

### Problema 3: Dados não sincronizam offline

**Sintomas:**
- Ícone vermelho ⚠️ no status
- "Falha ao sincronizar"

**Soluções:**
1. ✅ Verifique sua conexão de internet (teste em outro site)
2. ✅ Recarregue a página
3. ✅ Limpe cache do navegador
4. ✅ Tente em outro navegador
5. ✅ Se persistir, contate o administrador

**Possíveis Causas:**
- Conexão de internet instável
- Servidor temporariamente indisponível
- Permissões alteradas

---

### Problema 4: Não consegui baixar o manual PDF

**Sintomas:**
- Clico no botão "Baixar Manual" e nada acontece
- Erro de download

**Soluções:**
1. ✅ Verifique conexão de internet
2. ✅ Desabilite bloqueadores de pop-ups
3. ✅ Tente com outro navegador
4. ✅ Verifique espaço em disco
5. ✅ Contate o administrador se arquivo está vazio

---

### Problema 5: O Checklist não finaliza

**Sintomas:**
- Ao clicar "Finalizar Checklist", aparece erro
- Não deixa completar a inspeção

**Soluções:**
1. ✅ Verifique se **todos os itens** foram preenchidos
   - Nenhum item pode ficar em branco
   - Todos precisam ter status OK, NOK ou N/A
2. ✅ Se há muitos itens, tente fazer em partes (refresque)
3. ✅ Recarregue a página e tente novamente
4. ✅ Se erro persiste, contate o administrador

**Causa Comum:**
- Algum item não recebeu status

---

### Problema 6: Meu navegador está muito lento

**Sintomas:**
- Sistema carrega com demora
- Interface tremeluz ou congela

**Soluções:**
1. ✅ Feche abas desnecessárias
2. ✅ Recarregue a página
3. ✅ Limpe cache: Ctrl+Shift+Del → "Cookies" e "Cache"
4. ✅ Desabilite extensões do navegador (temporariamente)
5. ✅ Tente em navegador diferente
6. ✅ Reinicie seu computador

---

### Problema 7: Logout inesperado

**Sintomas:**
- Você é desconectado de repente
- Sistema me pede para fazer login novamente

**Soluções:**
1. ✅ Sua sessão pode ter expirado (segurança normal)
2. ✅ Faça login novamente
3. ✅ Se ocorre frequentemente, contate o administrador
4. ✅ Verifique se outro dispositivo está usando sua conta

**Causa Comum:**
- Sessão expirou após período de inatividade (por segurança)

---

### Problema 8: Erro geral "Algo deu errado"

**Sintomas:**
- Mensagem genérica de erro
- Não sabe o que fazer

**Soluções:**
1. ✅ Anote o **hora** exata do problema
2. ✅ Anote a **URL** que estava acessando
3. ✅ Recarregue a página (pode ser erro temporário)
4. ✅ Tente fazer login novamente
5. ✅ **Contate o administrador com essas informações**

**Informações úteis ao reportar:**
- Que você estava tentando fazer
- Hora exata do erro
- Qual navegador/versão
- ID da O.S ou máquina envolvida

---

## 📞 Contatos e Suporte

Se nenhuma solução acima funktionou:

**Pré-requisitos antes de contatar:**
- ✅ Você tentou recarregar a página?
- ✅ Você tentou em outro navegador?
- ✅ Você limpou o cache?
- ✅ Sua internet está funcionando bem?

**Ao Contatar o Administrador, Mencione:**
- 📝 Descrição clara do problema
- ⏰ Hora exata que ocorreu
- 🌐 Endereço da página (URL)
- 📱 Seu nome de usuário
- 🔧 Navegador e versão que está usando
- 📷 Screenshot (se possível)

---

## 📚 Resumo Rápido - Processos Principais

### Fluxo de Uma Ordem de Serviço:

```
1. RELATÓRIO DO PROBLEMA
   Operador identifica problema na máquina
   ↓
2. CRIAR O.S
   Seleciona máquina, técnico, componente, descrição
   ↓
3. ATRIBUIR TÉCNICO
   O.S é atribuída ao técnico responsável
   ↓
4. MANUTENÇÃO
   Técnico realiza o trabalho
   ↓
5. FINALIZAR O.S
   Adiciona relatório técnico e observações
   ↓
6. ARQUIVO
   O.S vai para histórico e pode ser consultada
```

### Fluxo de Um Checklist:

```
1. SELECIONAR MÁQUINA
   Escolhe qual equipamento será inspecionado
   ↓
2. PREENCHER ITENS
   Marca cada item como OK, NOK ou N/A
   ↓
3. ADICIONAR OBSERVAÇÕES
   Se NOK, descreve o que está errado
   ↓
4. FINALIZAR
   Salva o checklist completo
   ↓
5. ARQUIVO
   Checklist fica no histórico para referência
```

---

## 💡 Dicas Finais para Melhor Uso

1. **Baixe Manuais Regularmente**
   - Antes de sair para o campo, baixe os PDFs
   - Ter referência offline evita perda de tempo

2. **Preench Descrições Detalhadas**
   - Quanto mais detalhe, melhor o técnico entende
   - Inclua data, hora, máquina e o que foi feito

3. **Faça Checklists Completos**
   - Todos os itens precisam ser preenchidos
   - Uma inspeção incompleta não tem valor

4. **Sincronize Regularmente**
   - Conecte-se à internet periodicamente
   - Deixe o sistema sincronizar completamente

5. **Use Filtros e Buscas**
   - Economiza tempo ao encontrar informações
   - Use data, nome, tipo para filtrar

6. **Mantenha Dados Seguros**
   - Não compartilhe sua senha
   - Sempre faça logout ao terminar
   - Não use em computadores compartilhados sem cuidado

---

## 📖 Próximas Etapas

Agora que você conhece o sistema:

✅ **Dia 1:** Explore o Dashboard, veja o Manual de uma máquina
✅ **Dia 2:** Crie sua primeira Ordem de Serviço
✅ **Dia 3:** Complete seu primeiro Checklist
✅ **Dia 4:** Finalize uma O.S com relatório
✅ **Dia 5:** Use filtros e exporte dados

**Se tiver dúvidas em qualquer etapa, contate seu administrador.**

---

**Versão:** 1.0  
**Data:** Março 2024  
**Sistema:** Águia Florestal - Gestão de Ordens de Serviço  

---

**Boa sorte com o sistema! 🌳🚀**
