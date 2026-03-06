# 🚀 GUIA VISUAL DE DEPLOYMENT - Aguia Florestal

## 📋 Sumário das Opções

Este projeto pode ser deployado em 3 plataformas diferentes. Escolha a que preferir:

| Plataforma | Dificuldade | Tempo | Custo | Melhor Para |
|-----------|------------|-------|-------|------------|
| **Vercel** | ⭐ Muito Fácil | 5 min | Grátis (até 100 GB) | Começar rapidinho |
| **Netlify** | ⭐ Muito Fácil | 5 min | Grátis (até 100 GB) | Alternativa Vercel |
| **GitHub Pages** | ⭐⭐ Fácil | 10 min | Grátis | Sem backend externo |

---

## 🟦 OPÇÃO 1: Vercel (Recomendado)

**Vantagens:**
- ✅ Deployment automático ao fazer push no GitHub
- ✅ Preview automático de PRs
- ✅ Interface muito intuitiva
- ✅ Free tier generoso

### Passo a Passo

#### 1️⃣ Preparar Repositório GitHub
```bash
git init
git add .
git commit -m "Initial commit - Aguia Florestal with Supabase"
git branch -M main
git remote add origin https://github.com/seu-usuario/aguia-florestal.git
git push -u origin main
```

#### 2️⃣ Acessar Vercel
1. Acesse https://vercel.com
2. Clique em "Sign Up" (ou "Sign in" se já tem conta)
3. Escolha "Continue with GitHub"
4. Autorize Vercel a acessar seu GitHub

#### 3️⃣ Importar Projeto
1. Na dashboard Vercel, clique em "+ New Project"
2. Procure por "aguia-florestal"
3. Clique em "Import"

#### 4️⃣ Configurar Variáveis de Ambiente
Na tela de configuração:
1. Clique em "Environment Variables"
2. Adicione:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://xxxxx.supabase.co` (copiar do Supabase)
3. Clique em "Add"
4. Repita para `VITE_SUPABASE_ANON_KEY` (valor do projeto Supabase)

#### 5️⃣ Deploy
1. Clique em "Deploy"
2. Aguarde o build completar (2-3 minutos)
3. Quando terminar, clique no link para abrir o site

**Pronto! Seu site está online!** 🎉

---

## 🟦 OPÇÃO 2: Netlify

**Vantagens:**
- ✅ Tão fácil quanto Vercel
- ✅ Build gratuito com CI/CD
- ✅ Interface clara

### Passo a Passo

#### 1️⃣ Preparar Repositório GitHub
(Mesmo que Vercel - veja acima)

#### 2️⃣ Acessar Netlify
1. Acesse https://netlify.com
2. Clique em "Sign up"
3. Escolha "GitHub"

#### 3️⃣ Conectar Repositório
1. Clique em "+ Add new site"
2. Escolha "Import an existing project"
3. Conecte GitHub
4. Selecione "aguia-florestal"

#### 4️⃣ Configurar Build
Na tela de configuração:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

#### 5️⃣ Adicionar Variáveis de Ambiente
1. Na dashboard, vá para "Site settings"
2. Clique em "Build & deploy"
3. Clique em "Environment"
4. Adicione as mesmas variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

#### 6️⃣ Disparar Deploy
1. Clique em "Deploys"
2. Clique em "Trigger deploy"
3. Escolha "Deploy site"
4. Aguarde o build completar

**Seu site está online!** 🎉

---

## 🟦 OPÇÃO 3: GitHub Pages

**Vantagens:**
- ✅ 100% grátis e simples
- ✅ Integrado com GitHub
- ✅ Sem dependência de serviços externos

**Desvantagem:**
- ⚠️ Variáveis de ambiente mais complexas

### Passo a Passo

#### 1️⃣ Criar Repositório Público
1. No GitHub, crie novo repo: `seu-usuario.github.io`
2. Faça push do código

#### 2️⃣ Adicionar Secrets do GitHub
1. Na página do repo, vá para "Settings"
2. Clique em "Secrets and variables"
3. Clique em "Actions"
4. Clique em "+ New repository secret"
5. Adicione:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://xxxxx.supabase.co`
6. Repita para `VITE_SUPABASE_ANON_KEY`

#### 3️⃣ Criar GitHub Actions Workflow
Crie arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      run: npm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

#### 4️⃣ Configurar Pages
1. Vá para "Settings" > "Pages"
2. Em "Branch", selecione `gh-pages`
3. Clique em "Save"

#### 5️⃣ Deploy
1. Faça um push para `main`:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push
   ```
2. GitHub Actions vai fazer build e deploy automaticamente
3. Aguarde alguns minutos
4. Site estará disponível em `https://seu-usuario.github.io`

---

## ✅ CHECKLIST DE DEPLOYMENT

Antes de fazer deploy, confirme que:

- [ ] Conta Supabase criada
- [ ] Projeto Supabase criado
- [ ] Schema SQL executado no Supabase
- [ ] `.env.local` preenchido com credenciais
- [ ] Login funciona localmente (`npm run dev`)
- [ ] Criar O.S funciona localmente
- [ ] Histórico funciona localmente
- [ ] Git configurado (`git config user.name` e `git config user.email`)
- [ ] Repositório criado no GitHub
- [ ] Código feito push para GitHub
- [ ] Variáveis de ambiente configuradas na plataforma

---

## 🔧 TROUBLESHOOTING DE DEPLOYMENT

### "Environment variables not found"
- **Solução:** Certifique-se que as variáveis foram configuradas ANTES de fazer o deploy
- Redeploy o projeto após adicionar as variáveis

### "Build failed - Cannot find supabase"
- **Solução:** Execute `npm install @supabase/supabase-js` localmente
- Use `npm ci` ao invés de `npm install` em CI/CD

### "Page blank (white screen)"
1. Abra console do navegador (F12)
2. Veja a aba "Console" para erros
3. Comum: Supabase URL incorreta ou chave vencida
4. Testes: Execute no console:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   ```

### "Supabase connection refused"
- Verifique endpoints da URL
- Teste connection no navegador:
  ```javascript
  fetch('https://seu-url.supabase.co/rest/v1/', {
    headers: { 'apikey': 'sua-chave' }
  })
  ```

---

## 📊 Fluxo de Desenvolvimento

```
Local Development (npm run dev)
         ↓
    Testa localmente
         ↓
    git push para GitHub
         ↓
  GitHub Actions / Vercel / Netlify
         ↓
   Build & Test automático
         ↓
   Deploy para produção
         ↓
Disponível em URL pública
```

---

## 🎯 Próximos Passos

1. **Escolha uma plataforma** (Vercel é mais rápido)
2. **Siga o guia passo a passo** da sua escolha
3. **Teste o login** com `admin` / `admin123`
4. **Verifique Histórico e O.S** funcionando
5. **Compartilhe o link** com a equipe

### Links Úteis

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Netlify Dashboard](https://app.netlify.com)
- [GitHub Pages Docs](https://pages.github.com)

---

**Sucesso no deployment! 🚀**
