# 🌳 Aguia Florestal - Sistema de Ordens de Serviço

Sistema web moderno para gerenciamento de ordens de serviço (O.S) e manutenção preventiva/corretiva de máquinas agrícolas.

**Status:** ✅ Pronto para produção com Supabase

---

## 📋 Funcionalidades Principais

### 🔐 Autenticação
- Sistema de login seguro
- Controle de acesso por módulos (allowed_modules)
- Papéis: Admin e Operador

### 🔧 Ordens de Serviço
- Criar nova O.S com máquina, técnico, operador, componente
- Editar O.S em andamento
- Finalizar O.S com relatório (opcional)
- Histórico completo de O.S

### 📊 Dashboard
- Visualização de módulos disponíveis
- Acesso rápido a funcionalidades

### 📈 Histórico
- Visualização de todas as O.S
- Filtros: Status, Tipo, Busca
- Exportação para CSV

---

## 🚀 Quick Start

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar Supabase

1. Vá para https://supabase.com/dashboard
2. Crie novo projeto
3. Vá para SQL Editor
4. Copie e execute `schema.sql`

### 3. Configurar .env.local
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### 4. Iniciar
```bash
npm run dev
```

Login com **admin / admin123**

---

## 📚 Documentação Completa

- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Setup detalhado do Supabase
- **[DEPLOYMENT_VISUAL.md](DEPLOYMENT_VISUAL.md)** - Como fazer deploy (Vercel, Netlify, GitHub Pages)
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solução de problemas

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **UI:** Lucide React, Framer Motion

---

## 📁 Estrutura

```
src/
├── pages/         # Páginas (Login, ServiceOrders, History, etc)
├── components/    # Components reutilizáveis
├── lib/           # Supabase client e API wrapper
└── context/       # Context de autenticação
```

---

## 🔑 Usuários Demo

| Usuário | Senha | Papel |
|---------|-------|-------|
| admin | admin123 | Admin |
| joao | 1234 | Operador |
| maria | 1234 | Operador |
| pedro | 1234 | Operador |

---

## ⚡ Comandos

```bash
npm run dev      # Desenvolvimento
npm run build    # Build para produção
npm run preview  # Preview do build
npm run lint     # Verificar tipos TypeScript
```

---

## 📦 Deployment

3 opções disponíveis. Veja [DEPLOYMENT_VISUAL.md](DEPLOYMENT_VISUAL.md) para instruções detalhadas:

1. **Vercel** (Recomendado)
2. **Netlify**
3. **GitHub Pages**

---

## 🐛 Problemas?

Veja [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para soluções de problemas comuns.

---

**Última atualização:** 2024
