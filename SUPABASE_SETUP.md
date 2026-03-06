# 📚 GUIA COMPLETO - INTEGRAÇÃO SUPABASE

## 🚀 PASSO 1: Criar Projeto no Supabase

1. Acesse: https://supabase.com
2. Clique em **"Sign Up"** e crie uma conta
3. No dashboard, clique em **"New Project"**
4. Preencha:
   - **Project Name**: `aguia-florestal` (ou o nome que preferir)
   - **Database Password**: Use uma senha forte
   - **Region**: Selecione a região mais próxima (ex: `South America - São Paulo`)
5. Clique em **"Create new project"** e aguarde (~10 segundos)

---

## 🔑 PASSO 2: Obter as Credenciais

1. Quando o projeto estiver pronto, clique nele para abrir o dashboard
2. No menu lateral, vá em **"Project Settings"** (ícone de engrenagem)
3. Clique em **"API"**
4. Você verá:
   - **Project URL** (começa com `https://...supabase.co`)
   - **Project API keys** seção com "anon (public)" key

5. Copie esses dois valores

---

## 📝 PASSO 3: Configurar Variáveis de Ambiente

1. Abra o arquivo `.env.local` na raiz do projeto
2. Preencha:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

3. Salve o arquivo

---

## 🗄️ PASSO 4: Criar Schema do Banco de Dados

1. No dashboard do Supabase, vá em **"SQL Editor"** (menu lateral esquerdo)
2. Clique em **"New Query"**
3. Cole todo o conteúdo do arquivo `schema.sql` da raiz do projeto
4. Clique em **"Run"** (botão verde)
5. Aguarde a execução (deve aparecer "Success")

**O que foi criado:**
- ✅ Tabela `users` (usuários)
- ✅ Tabela `machines` (máquinas/equipamentos)
- ✅ Tabela `parts_tools` (peças e ferramentas)
- ✅ Tabela `service_orders` (ordens de serviço)
- ✅ Tabela `checklists` (checklists)
- ✅ Tabela `checklist_templates` (templates de checklist)
- ✅ Dados iniciais (usuários, máquinas, etc...)

---

## 🔒 PASSO 5: Configurar RLS (Row Level Security) - OPCIONAL

Se quiser proteger os dados com permissões por usuário (recomendado para produção):

1. No Supabase, vá em **"Authentication"**
2. Configure políticas de RLS nas tabelas
3. NOTA: Por enquanto está configurado para permitir leitura pública (desenvolvimento)

---

## 🧪 PASSO 6: Testar a Conexão

1. Abra um terminal na pasta do projeto
2. Execute:
```bash
npm run dev
```

3. Acesse: `http://localhost:5173`
4. Tente fazer login com:
   - **Usuário**: `admin`
   - **Senha**: `admin123`

Se conseguir fazer login → Tudo está funcionando! ✅

---

##🪔 PASSO 7: Deploy para Produção

### Opção A: Vercel (Recomendado)

1. Instale Vercel CLI:
```bash
npm install -g vercel
```

2. Na pasta do projeto, execute:
```bash
vercel
```

3. Responda as perguntas:
   - **Are you in the right project directory?** → `Y`
   - **Want to modify your vercel.json?** → `N`

4. Após o deploy, você receberá uma URL: `https://seu-projeto.vercel.app`

5. **IMPORTANTE**: Configure as variáveis de ambiente no Vercel:
   - Vá ao seu projeto no Vercel
   - Settings > Environment Variables
   - Adicione:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

---

### Opção B: GitHub Pages

1. Faça commit e push para GitHub:
```bash
git add .
git commit -m "Integração Supabase"
git push origin main
```

2. No GitHub, vá em **Settings > Pages**
3. Em "Source", selecione **GitHub Actions**
4. Crie um arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches:
      - main
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

5. Em **Settings > Secrets and variables > Actions**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

### Opção C: Netlify

1. Acesse: https://netlify.com
2. Clique em **"Add new site > Import an existing project"**
3. Conecte seu repositório GitHub
4. Preencha:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Em **Site settings > Build & deploy > Environment**:
   - Adicione variáveis de ambiente
6. Clique em **Deploy**

---

## 📊 Estrutura do Banco de Dados

```
users
├── id (Primary Key)
├── name
├── username
├── password
├── role (admin | operator)
└── allowed_modules (JSON)

service_orders
├── id
├── machine_id (FK)
├── operator_id (FK)
├── machine_name
├── operator_name
├── maintenance_type (preventiva | corretiva)
├── technician_name
├── component
├── description
├── tools (JSON)
├── used_parts_tools (JSON)
├── start_time
├── end_time
├── status (open | closed)
├── final_report
└── created_at

machines
├── id
├── name
├── model
├── image_url
├── manual_url
├── description
└── quick_specs (JSON)

parts_tools
├── id
├── name
├── description
├── category (part | tool)
└── created_at

checklists
├── id
├── machine_id (FK)
├── operator_id (FK)
├── date
├── status (pending | completed)
├── data (JSON)
└── created_at

checklist_templates
├── id
├── machine_model
├── items (JSON)
└── created_at
```

---

## 🔧 Troubleshooting

### Erro: "undefined is not a function (reading 'from')"
- **Causa**: Variáveis de ambiente não configuradas
- **Solução**: Verifique `.env.local` e reinicie o servidor (`npm run dev`)

### Erro: "Network request failed"
- **Causa**: URL do Supabase incorreta
- **Solução**: Copie novamente a URL exata do projeto no Supabase

### Erro: "Cannot read property 'data' of undefined"
- **Causa**: RLS habilitado sem políticas corretas
- **Solução**: Verifique as políticas RLS no Supabase ou desabilite temporariamente para testes

### Login não funciona
- **Causa**: Dados não foram inseridos no banco
- **Solução**: Verifique se o schema.sql foi executado corretamente

---

## ✅ Checklist de Configuração

- [ ] Projeto criado no Supabase
- [ ] Credenciais obtidas (URL e Anon Key)
- [ ] `.env.local` preenchido
- [ ] `schema.sql` executado no Supabase
- [ ] `npm run dev` testado localmente
- [ ] Login funciona
- [ ] Criação de ordem de serviço funciona
- [ ] Deploy realizado em plataforma (Vercel/Netlify/GitHub Pages)
- [ ] Variáveis de ambiente configuradas no deploy

---

## 📞 Dúvidas?

- Documentação Supabase: https://supabase.com/docs
- Discord Supabase: https://discord.supabase.io
- Issues GitHub: Crie uma issue no repositório

---

**Última atualização**: Março 2026
**Status**: ✅ Pronto para produção
