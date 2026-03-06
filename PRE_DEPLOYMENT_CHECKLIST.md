# ✅ CHECKLIST PRÉ-DEPLOYMENT - Aguia Florestal

Use este checklist para verificar que TUDO está pronto antes de fazer deploy para produção.

**Tempo estimado:** 5 minutos para verificar

---

## 📋 1. AMBIENTE LOCAL

### Desenvolvimento
- [ ] `npm run dev` funciona sem erros
- [ ] App abre em http://localhost:5173
- [ ] Não há warnings vermelhos no console (F12)

### Git
- [ ] `git status` mostra repo limpo (sem changes não commitadas)
- [ ] `git log -1` mostra último commit recente
- [ ] Repositório público no GitHub pronto

### Node/NPM
- [ ] `node --version` mostra v18 ou superior
- [ ] `npm --version` mostra v8 ou superior
- [ ] `npm list @supabase/supabase-js` mostra versão instalada

---

## 🔐 2. SUPABASE CONFIGURAÇÃO

### Account
- [ ] Conta Supabase criada (https://supabase.com)
- [ ] Email verificado
- [ ] Projeto criado no dashboard

### API Keys
- [ ] Na Settings > API, copiei **Project URL**
- [ ] Na Settings > API, copiei **anon/public key**
- [ ] URLs começam com `https://`
- [ ] Keys têm >50 caracteres

### Database
- [ ] `schema.sql` foi executado (via SQL Editor)
- [ ] Tabelas existem: `SELECT table_name FROM information_schema.tables`
- [ ] Usuários importados: `SELECT COUNT(*) FROM users` retorna 4+
- [ ] Máquinas importadas: `SELECT COUNT(*) FROM machines` retorna 4+
- [ ] Admin user existe: `SELECT * FROM users WHERE username = 'admin'`

### RLS (Opcional mas recomendado)
- [ ] RLS habilitado nas tabelas
- [ ] Policies criadas (verificar em Table Editor > Policies)

---

## 📝 3. AMBIENTE LOCAL (.env.local)

### Arquivo Existe
- [ ] `.env.local` existe na raiz do projeto
- [ ] Não está no git (verificar `.gitignore`)
- [ ] Tem permissão de leitura

### Variáveis Preenchidas
- [ ] `VITE_SUPABASE_URL=https://seu-projeto.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY=sua-chave-super-longa-aqui`
- [ ] Nenhuma variável vazia ou com placeholder
- [ ] Nenhum espaço antes/depois dos valores

### Teste
```bash
# No terminal
grep VITE_SUPABASE .env.local
# Deve mostrar ambas as variáveis com valores reais
```

---

## ✅ 4. FUNCIONALIDADE TESTADA

### Login
- [ ] `npm run dev` rodando
- [ ] Acesso http://localhost:5173
- [ ] Login com **admin/admin123** funciona
- [ ] Dashboard carrega após login

### Criar O.S
- [ ] Clique em "Ordens de Serviço"
- [ ] Clique em "Criar Nova O.S"
- [ ] Preencha todos os campos
- [ ] Clique "Iniciar Trabalho"
- [ ] O.S aparece na lista com status "aberta"

### Editar O.S
- [ ] O.S aberta mostra botão "Editar"
- [ ] Clique em "Editar"
- [ ] Mude um campo
- [ ] Clique "Salvar Alterações"
- [ ] Mudança aparece refletida

### Finalizar O.S
- [ ] O.S aberta mostra botão "Finalizar"
- [ ] Clique em "Finalizar"
- [ ] Modal pede relatório (deixe em branco é ok)
- [ ] Clique "Concluir"
- [ ] Status muda para "fechada"

### Histórico
- [ ] No Dashboard, clique "Histórico de O.S"
- [ ] Página carrega com lista de O.S
- [ ] Mostra as O.S criadas
- [ ] Filtros funcionam
- [ ] Busca funciona
- [ ] Exportar CSV baixa arquivo

### Validação
- [ ] Tente criar O.S sem máquina → erro aparece
- [ ] Tente criar O.S sem técnico → erro aparece
- [ ] Tente criar O.S sem componente → erro aparece
- [ ] Tente criar O.S sem descrição → erro aparece

---

## 🗄️ 5. DATABASE VERIFICAÇÃO

### Dados Persistem
- [ ] Crie uma O.S
- [ ] Recarregue a página (F5)
- [ ] O.S ainda aparece (não foi perdida)

### Supabase Recebe Dados
```bash
# No Supabase SQL Editor
SELECT COUNT(*) FROM service_orders;
# Deve retornar número > 0
```

### Tipos Estão Corretos
```bash
# Em src/pages/ServiceOrders.tsx
# Verificar que está usando supabaseApi functions
# grep -n "supabaseApi" ServiceOrders.tsx
# Deve mostrar múltiplas referências
```

---

## 🚀 6. DEPLOYMENT PRONTO

### GitHub
- [ ] Todo código feito commit
- [ ] Sem mudanças não commitadas (`git status` está limpo)
- [ ] Último push foi recente (`git log -1`)
- [ ] Branch é `main`

### Platform Setup

#### Se escolheu Vercel:
- [ ] Conta Vercel criada
- [ ] Repositório GitHub autorizado
- [ ] Projeto importado em Vercel

#### Se escolheu Netlify:
- [ ] Conta Netlify criada
- [ ] Repositório GitHub conectado
- [ ] Projeto criado

#### Se escolheu GitHub Pages:
- [ ] Repositório é `seu-usuario.github.io`
- [ ] `.github/workflows/deploy.yml` criado
- [ ] Secrets adicionados no GitHub

### Variáveis de Ambiente (Plataforma)
- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] Nenhuma variável vazia
- [ ] Valores idênticos ao `.env.local`

---

## 🔍 7. SEGURANÇA

### Credenciais
- [ ] `.env.local` **NÃO** está commitado no git
- [ ] `.env.local` está em `.gitignore`
- [ ] Variáveis se credenciais apenas em `.env.local` local ou secrets da plataforma
- [ ] Nenhuma credencial em comentários de código

### CORS
- [ ] Supabase permite requests do seu domínio
- [ ] (Supabase faz isso automaticamente)

### HTTPS
- [ ] Domínio de deployment usa HTTPS
- [ ] Supabase URL usa HTTPS
- [ ] Nenhum conteúdo inseguro carregado

### Senhas Demo
- [ ] Mudar senhas demo antes de produção (recomendado)
- [ ] Ou remover usuários demo antes de usar em produção

---

## 📊 8. PERFORMANCE

### Build Size
```bash
npm run build
# Verificar que dist/ tem tamanho razoável (~500KB-1MB)
```

### Build Time
```bash
npm run build
# Deve completar em <30 segundos
```

---

## 📞 9. DOCUMENTAÇÃO

### Docs Criados
- [ ] `README.md` atualizado
- [ ] `SUPABASE_SETUP.md` existe
- [ ] `DEPLOYMENT_VISUAL.md` existe
- [ ] `TROUBLESHOOTING.md` existe
- [ ] `E2E_TESTS.md` existe
- [ ] `.env.example` atualizado

### Docs Commitados
- [ ] Todos os `.md` foram adicionados ao git
- [ ] Aparecem no repositório GitHub

---

## 🎯 CHECKLIST FINAL ANTES DO DEPLOY

```
AMBIENTE         [ ][ ][ ]
SUPABASE         [ ][ ][ ]
ENV LOCAL        [ ][ ][ ]
FUNCIONALIDADE   [ ][ ][ ][ ][ ][ ][ ][ ]
DATABASE         [ ][ ][ ]
GITHUB PUSH      [ ][ ][ ]
PLATAFORMA       [ ][ ][ ]
VARIÁVEIS PLAT   [ ][ ]
SEGURANÇA        [ ][ ][ ][ ]
PERFORMANCE      [ ][ ]
DOCUMENTAÇÃO     [ ][ ][ ][ ]
```

**Seções com todos os itens marcados? ✅ PRONTO PARA DEPLOY!**

---

## 🚀 PRÓXIMOS PASSOS

### Se está tudo OK:

1. **Vercel:**
   ```
   1. Vercel Dashboard
   2. Clique "New Project"
   3. Selecione seu repositório
   4. Configure Environment Variables
   5. Clique "Deploy"
   ```

2. **Netlify:**
   ```
   1. Netlify Dashboard
   2. Clique "Add new site"
   3. Conecte seu repo GitHub
   4. Verifique build command: npm run build
   5. Clique "Deploy"
   ```

3. **GitHub Pages:**
   ```
   1. GitHub Actions vai automaticamente
   2. Build e deploy quando fizer push
   3. Site em seu-usuario.github.io
   ```

Veja [DEPLOYMENT_VISUAL.md](DEPLOYMENT_VISUAL.md) para instruções detalhadas de cada plataforma.

### Depois do Deploy:

1. **Acesse a URL gerada** (ex: seu-app.vercel.app)
2. **Faça login** com admin/admin123
3. **Teste funcionalidades** no site de produção
4. **Compartilhe link** com a equipe

---

## 🐛 Se Algo Falhar

1. **Veja [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**
2. **Verifique console do navegador** (F12 > Console)
3. **Verifique logs de build** da plataforma
4. **Revisite este checklist** para não deixar nada passar

---

## 📋 VERSÃO PRINT

Abra este documento no navegador (Ctrl+P) e imprima para ter uma cópia física do checklist.

---

**Data da última verificação:** _______________

**Responsável:** ___________________________

**Ambiente:** ☐ Dev  ☐ Staging  ☐ Production

---

**Sucesso no deployment! 🚀🌳**
