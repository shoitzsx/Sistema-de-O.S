# Documentacao Completa do Sistema - Aguia Florestal

## 1. Visao Geral
O Aguia Florestal e um sistema web para gestao operacional de manutencao em ambiente florestal.

Objetivos principais:
- Controlar ordens de servico (abertura, acompanhamento, finalizacao e historico).
- Gerenciar checklists de inspecao mensal por equipamento.
- Organizar maquinas, manuais e itens de apoio (pecas/ferramentas).
- Gerenciar usuarios e permissoes por modulo.
- Operar em modo offline-first para uso em campo sem internet.

## 2. Stack Tecnologica
Frontend:
- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- React Router DOM 7
- Motion
- React Toastify
- Lucide React

Backend e dados:
- Supabase (PostgreSQL + Storage)

Offline e PWA:
- vite-plugin-pwa
- Dexie (IndexedDB)
- Fila de sincronizacao local com retry

## 3. Estrutura de Pastas (Resumo)
- src/pages: telas de negocio
- src/components: componentes reutilizaveis
- src/context: estado global de autenticacao
- src/lib: integracoes com Supabase e camada offline
- schema.sql: estrutura inicial de banco
- vercel.json e netlify.toml: configuracoes de deploy

## 4. Rotas da Aplicacao
Rota publica:
- /login

Rotas protegidas:
- / (Dashboard)
- /manuals
- /checklist
- /checklist-history
- /service-orders
- /history
- /users

Protecao de rota:
- Feita por ProtectedRoute com base no usuario salvo no AuthContext.

## 5. Perfis, Permissoes e Modulos
Perfis:
- admin
- operator

Permissao por modulo:
- Cada usuario possui allowed_modules (array de IDs).
- Admin ve todos os modulos.
- Operador ve apenas os modulos liberados.

IDs atuais de modulo:
- 1: Manuais Tecnicos
- 2: Checklist Mensal
- 3: Ordens de Servico
- 4: Historico de O.S
- 5: Gerenciar Usuarios
- 6: Historico de Inspecao

## 6. Modulos do Sistema
### 6.1 Login
Funcionalidades:
- Seleciona usuario e valida senha.
- Mantem sessao em localStorage.
- Permite login com dados em cache offline quando necessario.

### 6.2 Dashboard
Funcionalidades:
- Exibe modulos disponiveis conforme permissao.
- Atalho visual para navegacao principal.

### 6.3 Manuais Tecnicos
Funcionalidades:
- Cadastro de maquinas (admin).
- Edicao/visualizacao de detalhes da maquina.
- Upload de imagem e manual PDF (quando online).
- Edicao de template de checklist por modelo.

Observacao:
- Upload de arquivo depende de conexao (Supabase Storage).

### 6.4 Checklist Mensal
Funcionalidades:
- Selecao de equipamento.
- Execucao de checklist por categorias e itens.
- Marcacao de status por item (OK/NOK/N/A).
- Registro de observacao por item.
- Validacao de progresso antes de finalizar.
- Salvamento offline com sincronizacao automatica.

### 6.5 Historico de Inspecao
Funcionalidades:
- Listagem de inspecoes com filtros.
- Exibicao de status e observacao por item inspecionado.
- Indicacao de status de sincronizacao (sincronizado/pendente/erro).

### 6.6 Ordens de Servico
Funcionalidades:
- Abertura de O.S.
- Registro de componente, descricao e itens usados.
- Finalizacao com relatorio opcional.
- Edicao de relatorio/ferramentas/componentes.
- Cadastro de pecas/ferramentas (admin).
- Exclusao em lote com confirmacao e validacao de credencial (admin).
- Operacao offline-first para CRUD principal.

### 6.7 Historico de O.S
Funcionalidades:
- Filtros por status, tipo e busca.
- Exportacao CSV (compatibilidade com Excel):
- Separador ;
- Escape de campos
- BOM UTF-8
- Colunas locais e ISO para data/hora
- Modal administrativo para exclusao controlada.

### 6.8 Gestao de Usuarios
Funcionalidades:
- Criacao, edicao e remocao de usuarios.
- Definicao de role.
- Definicao de modulos permitidos.
- Uso administrativo exclusivo.

## 7. Banco de Dados (Supabase)
Tabelas principais:
- users
- machines
- parts_tools
- service_orders
- checklists
- checklist_templates

Relacionamentos principais:
- service_orders.machine_id -> machines.id
- service_orders.operator_id -> users.id
- checklists.machine_id -> machines.id
- checklists.operator_id -> users.id

Campos relevantes por dominio:
- users.allowed_modules armazenado como JSON em texto.
- service_orders.tools e used_parts_tools armazenados como JSON em texto.
- checklists.data armazenado como JSON em texto.
- checklist_templates.items armazenado como JSON em texto.

## 8. Arquitetura de Offline-First
O sistema usa duas camadas offline complementares:

### 8.1 Camada geral de entidades
Arquivo principal:
- src/lib/offlineSync.ts

Escopo:
- users
- machines
- parts_tools
- service_orders
- checklist_templates

Como funciona:
- Cache local em localStorage por entidade.
- Fila de operacoes (insert/update/delete e operacoes especiais de O.S).
- IDs temporarios negativos para registros criados offline.
- Worker automatico que processa fila quando online.
- Retry com backoff exponencial em falhas.

### 8.2 Camada dedicada de checklist
Arquivo principal:
- src/lib/offlineChecklist.ts

Escopo:
- checklists

Como funciona:
- Persistencia local com IndexedDB (Dexie).
- Tabela de checklists offline e fila de sync.
- Marcacao de status local: pending/syncing/synced/error.
- Sincronizacao automatica ao reconectar e em intervalo.

## 9. PWA e Disponibilidade Offline
Configuracao:
- vite-plugin-pwa no vite.config.ts
- Service Worker com:
- autoUpdate
- clientsClaim
- skipWaiting
- cleanupOutdatedCaches
- fallback de navegacao para index.html

Comportamento esperado:
- A primeira carga exige internet.
- Apos cache inicial e ativacao do SW, o app abre offline.
- Recomendado instalar na tela inicial do celular para melhor experiencia.

## 10. Autenticacao e Sessao
- Sessao local armazenada em localStorage (chave user).
- ProtectedRoute protege rotas autenticadas.
- Logout remove dados de sessao local.

## 11. Configuracoes de Deploy
### 11.1 Vercel
- Build: npm run build
- Output: dist
- Rewrites SPA para index.html
- Headers de cache no-store/no-cache para / e /index.html

### 11.2 Netlify
- Build command: npm run build
- Publish: dist
- Redirect SPA para index.html
- Headers de cache e CORS para /api

## 12. Variaveis de Ambiente
Obrigatorias:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## 13. Scripts NPM
- npm run dev: desenvolvimento
- npm run build: build de producao
- npm run preview: preview do build
- npm run lint: checagem de tipos (tsc --noEmit)
- npm run clean: limpa dist

## 14. Fluxo Operacional (Resumo)
### Admin
- Gerencia usuarios e permissoes.
- Cadastra maquinas, templates e itens de manutencao.
- Acompanha historicos e exporta CSV.
- Pode executar exclusoes administrativas controladas.

### Operador
- Acessa modulos autorizados.
- Registra checklist e O.S em campo, inclusive offline.
- Sincroniza automaticamente ao reconectar.

## 15. Responsividade e Compatibilidade
Alvos de uso:
- iOS
- Android
- tablets
- desktop (macOS/Windows/Linux)

Ajustes aplicados:
- Header adaptativo.
- Quebra inteligente de botoes em telas pequenas.
- Modais com altura responsiva e rolagem interna.
- Bloqueio de overflow horizontal.
- Inputs com font-size 16px no mobile para evitar zoom indesejado no iOS.

## 16. Limitacoes Conhecidas
- Upload de arquivos (manuais/imagens) nao sincroniza offline; requer internet.
- Senhas estao em modelo simples no banco (recomendado migrar para hash seguro em fase de hardening).
- Falhas persistentes de rede podem manter itens na fila ate a proxima janela de conectividade.

## 17. Boas Praticas de Operacao em Campo
- Abrir o app online antes de ir para area sem sinal para atualizar cache.
- Instalar o app como PWA na tela inicial do dispositivo.
- Em reconexao, manter app aberto por alguns segundos para sincronizacao.
- Validar periodicamente no historico se registros foram sincronizados.

## 18. Plano de Evolucao Recomendado
- Implementar client_uuid por registro e upsert idempotente no banco.
- Migrar autenticacao para hash de senha + fluxo mais seguro.
- Adicionar painel de auditoria da fila de sync.
- Cobertura de testes automatizados para cenarios offline/online.

## 19. Referencias Internas
Arquivos de apoio existentes no repositorio:
- README.md
- SUPABASE_SETUP.md
- DEPLOYMENT_VISUAL.md
- TROUBLESHOOTING.md
- E2E_TESTS.md
- schema.sql

---
Documento elaborado para servir como referencia completa de arquitetura, operacao e manutencao do sistema.
