<div align="center">

# 🌳 Sistema de Ordens de Serviço · Águia Florestal

**Controle da manutenção das máquinas: do pedido de serviço ao relatório final.**

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

[🛠️ Ver a parte técnica](#parte-tecnica)

</div>

> 🏢 Desenvolvido por **Lucas Izaias** na **Águia Sistemas** para a **Águia Florestal**, a partir dos problemas apresentados pela empresa. Código publicado com autorização da Águia Sistemas.

---

## 🎯 Para que serve

Para acompanhar a manutenção das máquinas e equipamentos da operação: abrir e acompanhar ordens de serviço, manter as inspeções em dia, ter os manuais técnicos à mão (mesmo sem internet) e saber quanto tempo levou cada atendimento.

## ✅ O que o sistema faz

- 🔧 **Ordens de serviço** de manutenção corretiva e preventiva: abertura, responsável, andamento, finalização e o tempo de cada etapa (fila, trabalho efetivo e intervalos).
- 📄 **Relatório da ordem de serviço** para imprimir ou exportar em PDF.
- 📋 **Checklist mensal de inspeção** configurado por modelo de máquina, com histórico das inspeções e um modo TV.
- 📚 **Manuais técnicos** das máquinas, que podem ser enviados pelo sistema e consultados também sem internet.
- 📴 **Funciona sem internet**: o que é feito offline entra numa fila e é sincronizado quando a conexão volta.
- 🔔 **Avisos** de ordens de serviço em andamento ou em atraso, com prazo configurável.
- 📊 **Histórico e relatórios** com filtros e exportação em CSV.
- 👥 **Gestão de usuários e permissões** por módulo, com papéis de administrador e operador.
- 🔐 **Login rápido**: a pessoa escolhe o usuário e digita a senha num teclado numérico na tela.
- 🧾 **Registro de auditoria** das ações, visível para administradores.
- 🎓 **Central de tutoriais** no painel.
- 📱 **Celular e tablet**: projetos Android e iOS (via Capacitor), e o site também pode ser instalado como aplicativo pelo navegador.

## 🚧 Situação atual

- Publicado na Vercel, com banco de dados no Supabase. Melhorias em andamento.
- Não há demonstração pública: o sistema publicado é de uso da empresa e exige login.

## 👤 Quem fez

Projeto desenvolvido por **Lucas Izaias**.

- 📂 Repositório: [github.com/shoitzsx/Sistema-de-O.S](https://github.com/shoitzsx/Sistema-de-O.S)
- 🐙 GitHub: [github.com/shoitzsx](https://github.com/shoitzsx)
- ✉️ E-mail: [lucas.mateus.izaias.santos@gmail.com](mailto:lucas.mateus.izaias.santos@gmail.com)

---

<a name="parte-tecnica"></a>

## 🛠️ Parte técnica

Esta seção explica como o projeto foi feito, para quem quer avaliar o código ou rodá-lo localmente.

### Linguagens e tecnologias

| Área | Tecnologias |
|---|---|
| Linguagens | TypeScript, SQL (PostgreSQL), CSS |
| Interface | React 19, Vite 6, Tailwind CSS 4, React Router 7, Motion, Lucide, React Toastify |
| Dados e back-end | Supabase (Auth, PostgreSQL, Storage, Row Level Security) e funções serverless na Vercel (`api/admin`) |
| Offline e mobile | Dexie (IndexedDB), vite-plugin-pwa, Capacitor (Android e iOS) |
| Documentos | jsPDF e html-to-image (PDF da ordem de serviço) |
| Qualidade | Verificação de tipos com TypeScript (`tsc --noEmit`) e testes E2E com Playwright |

### Como funciona

- **Front-end:** aplicação React (SPA) que fala direto com o Supabase pelo `supabase-js`. O acesso aos dados é controlado por políticas de Row Level Security definidas nos scripts SQL.
- **Operações administrativas:** criar e editar usuários passa por funções serverless em `api/admin/`, que usam a chave de serviço do Supabase **somente no servidor**, nunca no navegador.
- **Permissões:** cada usuário tem um papel e uma lista de módulos liberados (`allowed_modules`), além de permissões detalhadas (`src/lib/permissions.ts`).
- **Modo offline:** `src/lib/offlineSync.ts` mantém em cache os dados e uma fila de inclusões, alterações e exclusões, processada quando a conexão volta. Checklists e manuais em PDF também ficam guardados no aparelho (`offlineChecklist.ts` e `offlineManuals.ts`).
- **Auditoria:** as ações relevantes são registradas na tabela `audit_logs` (`src/lib/audit.ts`).

<details>
<summary><strong>📁 Estrutura do projeto</strong></summary>

```text
.
├── api/admin/         # funções serverless (Vercel) para gestão de usuários
├── android/  ios/     # projetos nativos gerados pelo Capacitor
├── public/            # ícones e arquivos estáticos
├── scripts/           # scripts de apoio (ícones, testes e manutenção)
├── src/
│   ├── components/    # componentes reutilizáveis (visualizador da O.S, notificações, teclado numérico…)
│   ├── context/       # contexto de autenticação
│   ├── hooks/
│   ├── lib/           # cliente Supabase, API, permissões, auditoria e modo offline
│   └── pages/         # telas do sistema
├── tests/             # testes E2E (Playwright)
├── schema.sql         # esquema inicial do banco
└── *.sql  *.md        # scripts de banco e documentação de apoio
```

</details>

### Executar localmente

**Pré-requisitos:** Node.js e npm (verificado com Node.js 24 e npm 11) e um projeto no Supabase.

```bash
git clone https://github.com/shoitzsx/Sistema-de-O.S.git
cd Sistema-de-O.S
npm ci
```

Copie `.env.example` para `.env.local` e preencha com os dados do **seu** projeto Supabase:

| Variável | Para que serve |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço, usada **somente** pelas funções em `api/admin/`. Configure no servidor (por exemplo, nas variáveis de ambiente da Vercel), nunca no navegador |
| `VITE_ADMIN_API_BASE_URL` | Opcional: endereço da API administrativa, se ela estiver em outro domínio |

**Banco de dados:** no SQL Editor do Supabase, execute `schema.sql` e depois, nesta ordem:
`ADD_AUDIT_LOGS_TABLE.sql`, `ADD_USER_NOTIFICATIONS_TABLE.sql`, `ADD_SERVICE_ORDER_ASSIGNMENT_COLUMNS.sql`, `ADD_CHECKLIST_SCHEDULES_TABLE.sql`, `ADD_MAINTENANCE_LIFECYCLE_COLUMNS.sql`, `MIGRATE_TO_SUPABASE_AUTH.sql`, `ADD_FINE_GRAINED_PERMISSIONS.sql` e `FIX_SUPABASE_404_400.sql`.

> ⚠️ O `schema.sql` cria usuários de exemplo. Troque as senhas deles antes de deixar qualquer ambiente acessível a outras pessoas.

```bash
npm run dev      # servidor de desenvolvimento
npm run lint     # verificação de tipos (tsc --noEmit)
npm run build    # build de produção em dist/
npm run preview  # serve o build localmente
```

**Android e iOS (Capacitor):**

```bash
npm run mobile:sync     # gera os ícones, faz o build e sincroniza os projetos nativos
npm run mobile:android  # abre o projeto no Android Studio
npm run mobile:ios      # abre o projeto no Xcode (somente macOS)
```

### Testes

- `npm run lint` faz a verificação de tipos de todo o projeto.
- Os testes E2E (Playwright) ficam em `tests/` e cobrem a abertura da visualização da ordem de serviço, a exportação em PDF e o modal de checklist em diferentes tamanhos de tela. **Por padrão eles apontam para o ambiente publicado.** Para rodá-los contra um ambiente de teste, defina `PLAYWRIGHT_BASE_URL`.

### Limitações conhecidas

- Não há testes unitários. Os testes E2E dependem de um ambiente em execução com dados.
- Os scripts SQL são aplicados manualmente, em ordem, sem ferramenta de migração.
- Parte da documentação de apoio na raiz foi escrita ao longo do desenvolvimento e pode estar desatualizada em relação ao código.

### Documentação de apoio

- [Documentação completa do sistema](DOCUMENTACAO_COMPLETA_SISTEMA.md)
- [Manual do usuário](MANUAL_USUARIO.md) e [manual do administrador](MANUAL_ADMINISTRADOR.md)
- [Configuração do Supabase](SUPABASE_SETUP.md)
- [Deploy](DEPLOYMENT_VISUAL.md) e [solução de problemas](TROUBLESHOOTING.md)
- [Plano de backup e recuperação](BACKUP_RECOVERY_RUNBOOK.md) e [roadmap](ROADMAP.md)
