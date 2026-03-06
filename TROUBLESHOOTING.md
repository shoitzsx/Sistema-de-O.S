# 🔧 GUIA DE TROUBLESHOOTING - Aguia Florestal

## 🔴 PROBLEMA 1: "Cannot GET /" ou página em branco

### Sintomas
- Página web abre branca/vazia
- Console mostra erro de CORS ou 404
- Botões não funcionam

### Soluções

**1. Verificar se o servidor está rodando**
```bash
# Terminal 1: Iniciar servidor
npm run dev
```

**2. Verificar variáveis de ambiente**
```bash
# No console do navegador (F12 > Console)
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```
Se mostrar `undefined`, significa o `.env.local` não está sendo lido corretamente.

**3. Recriar arquivo .env.local**
```bash
# Deletar e recriar
rm .env.local
echo "VITE_SUPABASE_URL=https://seu-projeto.supabase.co" > .env.local
echo "VITE_SUPABASE_ANON_KEY=sua-chave-aqui" >> .env.local

# Reiniciar Vite
npm run dev
```

**4. Limpar cache do navegador**
- Ctrl + Shift + Delete
- Limpar cookies e cache
- Recarregar página (Ctrl + F5)

---

## 🔴 PROBLEMA 2: Login não funciona

### Sintomas
- Botão de login não responde
- Página carrega mas login falha
- Erro "Unable to connect to server"

### Verificar Lista
- [ ] Supabase URL correta em `.env.local`?
- [ ] API key correta em `.env.local`?
- [ ] `schema.sql` foi executado no Supabase?
- [ ] Tabela `users` tem usuários?
- [ ] Usuário admin com senha admin123 existe?

### Testes

**1. Testar conexão Supabase diretamente**
```bash
# No console do navegador
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://seu-url.supabase.co',
  'sua-chave-aqui'
)
const { data, error } = await supabase.from('users').select('*')
console.log(data, error)
```

**2. Verificar dados na tabela users**
1. Abra Supabase Dashboard
2. Vá para "SQL Editor"
3. Execute: `SELECT * FROM users;`
4. Confirme que `admin` existe com password `admin123`

**3. Validar schema.sql**
```bash
# No Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```
Deve listar: `users`, `machines`, `service_orders`, `parts_tools`, `checklists`, `checklist_templates`

---

## 🔴 PROBLEMA 3: Criar O.S não funciona | Gravar dados

### Sintomas
- Botão "Iniciar Trabalho" não responde
- Erro ao tentar salvar O.S
- Dados aparecem mas não salvam

### Verificar Lista
- [ ] Login funciona?
- [ ] Máquinas aparecem no dropdown?
- [ ] Todos os campos foram preenchidos?
- [ ] Supabase está online?

### Testes

**1. Verificar máquinas na tabela**
```bash
# No Supabase SQL Editor
SELECT id, name FROM machines;
```
Deve retornar 4 máquinas (DAF, JD, Valtra, CAT)

**2. Testar create de O.S no console**
```bash
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const { data, error } = await supabase
  .from('service_orders')
  .insert({
    machine_id: 1,
    technician_name: 'João',
    operator_name: 'Maria',
    component: 'Motor',
    description: 'Teste',
    status: 'open',
    start_time: new Date().toISOString()
  })

console.log('Resultado:', data, error)
```

**3. Validar permissões RLS**
```bash
# No Supabase SQL Editor, verificar policies:
SELECT * FROM pg_policies WHERE tablename = 'service_orders';
```

Se não tiver policies, execute novamente a seção de RLS do `schema.sql`

---

## 🔴 PROBLEMA 4: Histórico vazio ou não carrega

### Sintomas
- Página Histórico abre em branco
- Não mostra nenhuma O.S
- Erro ao abrir History

### Soluções

**1. Verificar se há dados**
```bash
# No Supabase SQL Editor
SELECT COUNT(*) FROM service_orders;
```

**2. Verificar relação user-orders**
```bash
# Confirme que user_id nas O.S existe
SELECT * FROM service_orders LIMIT 10;
```

**3. Testar filtro de usuário**
```bash
# Simular o que o app faz
SELECT * FROM service_orders 
WHERE operator_name = 'seu-usuario-logado'
ORDER BY created_at DESC;
```

---

## 🔴 PROBLEMA 5: Erro "CORS" ou "Blocked by browser"

### Sintomas
```
Access to XMLHttpRequest at 'https://...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

### Solução
Isso é normal em desenvolvimento local. Para teste:
1. Use extensão CORS no navegador (apenas desenvolvimento)
2. Ou use Supabase que já tem CORS configurado

Supabase automaticamente permite requests do navegador, então se ver erro CORS:
- Verifique URL do Supabase está correta
- Verifique API key está correta
- Tente em navegador anônimo (sem cache)

---

## 🔴 PROBLEMA 6: "Cannot find module" ou import errors

### Sintomas
```
Module not found: Error: Can't resolve '@supabase/supabase-js'
```

### Solução
```bash
# Reinstalar dependências
npm install

# Se ainda não funcionar
rm -rf node_modules package-lock.json
npm install
```

---

## 🔴 PROBLEMA 7: Build no Vercel/Netlify falha

### Sintomas
```
Build failed
Error: Cannot find module 'react'
```

### Verificar

**1. package.json tem todas as dependências?**
```bash
npm list
```
Deve ter:
- react, react-dom, react-router-dom
- @supabase/supabase-js
- tailwindcss
- lucide-react
- motion

**2. Reinstalar e fazer commit**
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

**3. Trigger rebuild na plataforma**
- Vercel: Settings > Git > Rebuild
- Netlify: Deploys > Trigger deploy

---

## 🔴 PROBLEMA 8: "Environment variables undefined" em produção

### Sintomas
- Site funciona local
- Em produção aparece erro de supabase undefined
- Console mostra `import.meta.env.VITE_SUPABASE_URL` como undefined

### Solução

**Vercel:**
1. Settings > Environment Variables
2. Adicione:
   - `VITE_SUPABASE_URL` = valor do Supabase
   - `VITE_SUPABASE_ANON_KEY` = chave do Supabase
3. Clique "Redeploy"

**Netlify:**
1. Site settings > Build & deploy > Environment
2. Adicione as mesmas variáveis
3. Clique em "Trigger deploy"

**GitHub Pages:**
1. Settings > Secrets and variables > Actions
2. New repository secret:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. O workflow do GitHub Actions vai usar automaticamente

---

## 🔴 PROBLEMA 9: Dados perdidos após refresh

### Sintomas
- Crio uma O.S
- Recarrego a página (F5)
- O.S desapareceu

### Causa
**Dados estão salvando apenas em memória (usar estado local)**

### Solução

**1. Verificar que está usando Supabase**
Abra [ServiceOrders.tsx](ServiceOrders.tsx) e procure por:
```typescript
const { data: orders } = await supabase
```

**2. Se vê `useState` sem supabase**
O código não migrou para Supabase ainda. Verifique:
- Se `supabaseApi.ts` existe em `src/lib/`
- Se tem import: `import { createServiceOrder } from '../lib/supabaseApi'`
- Se está chamando `createServiceOrder()` e não apenas `setState`

**3. Regenerar schema.sql**
```bash
# Supabase SQL Editor
# Verificar que service_orders table existe
\dt service_orders
```

---

## ✅ CHECKLIST DE DIAGNÓSTICO

Quando algo não funciona, execute este checklist:

```
[ ] npm run dev funciona sem erros?
[ ] Console (F12) não mostra errors vermelhos?
[ ] .env.local existe com variáveis preenchidas?
[ ] Supabase URL correta (com https://)?
[ ] API key copiada corretamente (sem espaços)?
[ ] Teste no console: import.meta.env.VITE_SUPABASE_URL retorna URL?
[ ] Supabase login mostra usuários ao executar SELECT * FROM users?
[ ] Consegue fazer login no app com admin/admin123?
[ ] Tabelas existem em Supabase (SELECT table_name...)?
[ ] Consegue criar O.S quando logado?
[ ] Dados aparecem no Supabase após criar?
[ ] Histórico carrega corretamente?
```

Se qualquer um for [ ], vá para a seção correspondente deste documento.

---

## 🎯 TESTES RÁPIDOS

### Teste 1: Supabase conecta?
```javascript
// Console (F12 > Console)
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
console.log('URL:', url)
console.log('Key exists:', !!key)
// Ambos devem ter valores (não undefined ou null)
```

### Teste 2: Tabelas existem?
```bash
# Supabase SQL Editor
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```
Deve listar 6 tabelas principais

### Teste 3: Usuários existem?
```bash
# Supabase SQL Editor
SELECT username, password_hash FROM users;
```
Deve mostrar admin e outros usuários

### Teste 4: API funciona?
```javascript
// No console do navegador
const resp = await fetch(
  'https://seu-url.supabase.co/rest/v1/users?select=*',
  { headers: { 'apikey': 'sua-chave' } }
)
const data = await resp.json()
console.log(data)
// Deve retornar array de usuários
```

---

## 📞 Precisando de mais ajuda?

1. **Verifique erros no console** (F12 > Console)
2. **Procure a mensagem neste documento**
3. **Execute os testes sugeridos**
4. **Verifique Supabase dashboard** para dados

Se erro continua:
1. Capture screenshot do erro
2. Copie exata mensagem de erro
3. Verificar qual componente (Login, ServiceOrders, History)
4. Consulte documentação oficial:
   - [Supabase Docs](https://supabase.com/docs)
   - [Vite Docs](https://vitejs.dev)
   - [React Docs](https://react.dev)

---

**Última atualização:** 2024
