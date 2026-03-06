# 🧪 TESTES E2E (End-to-End) - Aguia Florestal

## ✅ Testes Manuais - Executar na Ordem

Antes de fazer deploy, execute todos os testes abaixo para garantir que tudo funciona.

**Tempo estimado:** 10 minutos

---

## 1️⃣ TESTE: Ambiente Está Pronto?

### Checklist
- [ ] Node.js 18+ instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Supabase conta criada
- [ ] Projeto Supabase criado
- [ ] `.env.local` arquivo criado e preenchido
- [ ] `schema.sql` executado no Supabase
- [ ] `npm install` completado com sucesso

### Executar
```bash
# No terminal, na pasta do projeto
npm run dev
```

### Resultado Esperado
```
Local:   http://localhost:5173/
ready in 123ms.
```
✅ Se vir esta mensagem, a app está pronta!

---

## 2️⃣ TESTE: Login Funciona?

### Pré-requisito
- App rodando em http://localhost:5173

### Passos
1. Abra http://localhost:5173 no navegador
2. Deveria ver página de login
3. Insira:
   - **Usuário:** admin
   - **Senha:** admin123
4. Clique em "Entrar"

### Resultado Esperado
```
✅ Página redireciona para Dashboard
✅ Mostra "Bem-vindo, admin!"
✅ Mostra 4 módulos (O.S, Histórico, Checklists, Manuais, Usuários)
```

**Se Login FALHAR:**
→ Ver seção "Login não funciona" em [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 3️⃣ TESTE: Dashboard Carrega?

### Pré-requisito
- Estar logado como admin

### Passos
1. Após login, vê Dashboard
2. Deveria ter 5 módulos:
   - ✅ Ordens de Serviço (com ícone ⚙️)
   - ✅ Histórico de O.S (com ícone 📋)
   - ✅ Checklists (com ícone ✓)
   - ✅ Manuais (com ícone 📚)
   - ✅ Gestão de Usuários (com ícone 👥)

### Resultado Esperado
```
Dashboard carrega com 5 cards
Cada card tem título e descrição
Cada card é clicável
```

---

## 4️⃣ TESTE: Criar Ordem de Serviço

### Pré-requisito
- Estar logado
- Dashboard carregando

### Passos
1. No Dashboard, clique em "Ordens de Serviço"
2. Clique em "Criar Nova O.S"
3. Preencha:
   - **Máquina:** DAF Truck (selecione do dropdown)
   - **Técnico:** João da Silva
   - **Operador:** Pedro Oliveira
   - **Componente:** Motor
   - **Descrição:** Revisão do motor
   - **Tipo:** Preventiva

4. Clique em "Iniciar Trabalho"

### Resultado Esperado
```
✅ No apareça erro "Por favor, selecione uma máquina"
✅ Página mostra "O.S #1" criada com sucesso
✅ Card aparece na lista com status "aberta"
✅ Botões "Editar" e "Finalizar" aparecem
```

**Se FALHAR:**
→ Ver [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - "Criar O.S não funciona"

---

## 5️⃣ TESTE: Validação de Campos Obrigatórios

### Pré-requisito
- Estar na página de criar O.S

### Passos - Teste 1: Sem máquina
1. Deixe máquina em branco
2. Preencha outros campos normalmente
3. Clique em "Iniciar Trabalho"

### Resultado Esperado
```
❌ Popup aparece: "Por favor, selecione uma máquina"
❌ O.S NÃO é criada
```

### Passos - Teste 2: Sem técnico
1. Selecione máquina
2. Deixe "Técnico" em branco
3. Preencha resto
4. Clique em "Iniciar Trabalho"

### Resultado Esperado
```
❌ Popup aparece: "Por favor, preencha o nome do técnico"
❌ O.S NÃO é criada
```

### Passos - Teste 3: Sem componente
1. Selecione máquina
2. Preencha técnico
3. Deixe "Componente" em branco
4. Clique em "Iniciar Trabalho"

### Resultado Esperado
```
❌ Popup aparece: "Por favor, preencha o componente"
❌ O.S NÃO é criada
```

---

## 6️⃣ TESTE: Adicionar Ferramentas/Peças

### Pré-requisito
- Uma O.S criada e aberta

### Passos
1. Na O.S aberta, clique em "+ Adicionar Ferramenta/Peça"
2. Selecione "Chave Phillips"
3. Quantidade: 1
4. Clique em "Adicionar"

### Resultado Esperado
```
✅ "Chave Phillips" aparece na lista
✅ Mostra "Qty: 1"
✅ Botão "x" para remover aparece
```

### Passos 2 - Remover item
1. Clique no "x" ao lado de "Chave Phillips"

### Resultado Esperado
```
✅ Item é removido
✅ Lista fica vazia ou sem esse item
```

---

## 7️⃣ TESTE: Finalizar O.S

### Pré-requisito
- Uma O.S criada

### Passos
1. Na O.S aberta, clique em "Finalizar"
2. Modal aparece pedindo relatório
3. **Deixe em branco** (teste se é opcional)
4. Clique em "Concluir"

### Resultado Esperado
```
✅ O.S é finalizada SEM relatório
✅ Status muda para "fechada"
✅ Botões "Editar" e "Finalizar" desaparecem
✅ Mostra "Finalizado em: [data/hora]"
```

### Passos 2 - Com relatório
1. Crie nova O.S
2. Clique em "Finalizar"
3. Preencha relatório: "Trabalho concluído com sucesso, máquina ok"
4. Clique em "Concluir"

### Resultado Esperado
```
✅ O.S finalizada COM relatório
✅ Relatório aparece na exibição
```

---

## 8️⃣ TESTE: Editar O.S Aberta

### Pré-requisito
- Uma O.S aberta (status "aberta")

### Passos
1. Clique em "Editar" na O.S
2. Mude:
   - **Componente:** Motor → Transmissão
   - **Descrição:** Adicione " - Urgente"
3. Clique em "Salvar Alterações"

### Resultado Esperado
```
✅ Componente muda para "Transmissão"
✅ Descrição atualiza
✅ Modal fecha
✅ Dados salvos no Supabase
```

---

## 9️⃣ TESTE: Histórico de O.S

### Pré-requisito
- Ter criado pelo menos 2-3 O.S
- Ter finalizado pelo menos 1

### Passos
1. No Dashboard, clique em "Histórico de O.S"
2. Página deveria mostrar todas as O.S criadas

### Resultado Esperado
```
✅ Lista mostra todas as O.S
✅ Mostra colunas: Máquina, Técnico, Status, Data
✅ Mostra datas de início/fim
✅ Cálculo de duração correto
```

### Passos 2 - Filtros
1. Clique em "Filtro"
2. Selecione **Status: Fechadas**
3. Clique em "Aplicar"

### Resultado Esperado
```
✅ Lista só mostra O.S fechadas
✅ As abertas desaparecem da lista
```

### Passos 3 - Busca
1. Em busca, digite "Motor"
2. Pressione Enter

### Resultado Esperado
```
✅ Filtra O.S que contêm "Motor" no componente
✅ Outras desaparecem
```

### Passos 4 - Exportar CSV
1. Clique em "Exportar CSV"

### Resultado Esperado
```
✅ Arquivo baixado (histórico.csv)
✅ Abre em Excel mostrando dados corretamente
```

---

## 🔟 TESTE: Múltiplos Usuários

### Pré-requisites
- Schema com usuários criado
- Admin e operadores existem

### Passos
1. Logout (clique em nome de usuário → Logout)
2. Login com **joao / 1234**
3. No Dashboard, deveria ver:
   - ✅ Ordens de Serviço
   - ✅ Histórico de O.S
   - ✅ Checklists
   - ❌ NÃO deveria ver Gestão de Usuários

4. Vá para Histórico
5. Deveria ver apenas O.S criadas por "joao"

### Resultado Esperado
```
✅ Admin vê TODOS os módulos
✅ Operador (joao) vê apenas seu módulo permitido
✅ Histórico filtra por usuário logado
```

---

## 1️⃣1️⃣ TESTE: Console Sem Erros

### Passos
1. Abra navegador (F12 para DevTools)
2. Vá para aba "Console"
3. Use app normalmente (login, criar O.S, etc)

### Resultado Esperado
```
✅ Nenhuma mensagem de erro em vermelho
✅ Pode haver warnings amarelos (ok)
✅ Logs azuis são informações (ok)
```

**Se houver erros vermelhos:**
→ Consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 1️⃣2️⃣ TESTE: Conexão Supabase

### Passos
1. No console (F12), execute:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
   ```

### Resultado Esperado
```
https://seu-projeto.supabase.co
seu-anon-key-aqui
```

Se mostrar `undefined`:
→ `.env.local` não configurado corretamente

---

## 1️⃣3️⃣ TESTE: Dados Salvam no Supabase?

### Passos
1. Crie uma O.S (ex: "Teste E2E")
2. Abra Supabase dashboard
3. Vá para "SQL Editor"
4. Execute:
   ```sql
   SELECT * FROM service_orders WHERE description LIKE '%Teste E2E%';
   ```

### Resultado Esperado
```
✅ A O.S que você criou aparece na query
✅ Todos os dados estão lá (machine_id, technician, etc)
✅ created_at tem timestamp recente
```

Se não aparecer:
→ Dados estão apenas em memória (não integrado com Supabase)
→ Verifique [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - "Dados não salvam"

---

## 🎯 CHECKLIST FINAL

```
AMBIENTE
[ ] Node.js 18+ instalado
[ ] Supabase projeto criado
[ ] schema.sql executado
[ ] .env.local preenchido

FUNCIONALIDADE
[ ] Login com admin/admin123 funciona
[ ] Dashboard carrega com 5 módulos
[ ] Criar O.S funciona
[ ] Validação de campos funciona
[ ] Adicionar ferramentas funciona
[ ] Finalizar O.S funciona
[ ] Editar O.S funciona
[ ] Histórico carrega
[ ] Filtros do histórico funcionam
[ ] Exportar CSV funciona
[ ] Múltiplos usuários funcionam
[ ] Sem erros no console

DATA
[ ] Console mostra env vars corretos
[ ] Supabase recebe dados criados
[ ] Dados persistem após refresh (F5)
[ ] Histórico mostra todas as O.S

✅ TUDO PASSOU? Pronto para deploy!
```

---

## 📊 Resumo dos Testes

| # | Teste | Status | Notas |
|---|-------|--------|-------|
| 1 | Ambiente | ⏳ | npm run dev deve funcionar |
| 2 | Login | ⏳ | admin/admin123 |
| 3 | Dashboard | ⏳ | 5 módulos devem aparecer |
| 4 | Criar O.S | ⏳ | Máquina obrigatória |
| 5 | Validação | ⏳ | 4 campos obrigatórios |
| 6 | Ferramentas | ⏳ | Adicionar/remover |
| 7 | Finalizar | ⏳ | Relatório opcional |
| 8 | Editar | ⏳ | Dados atualizam |
| 9 | Histórico | ⏳ | Filtros e busca |
| 10 | Usuários | ⏳ | RBAC funciona |
| 11 | Console | ⏳ | Sem erros |
| 12 | Supabase | ⏳ | Env vars corretas |
| 13 | Data | ⏳ | Salva no banco |

---

**Boa sorte nos testes! 🚀**

Após passar em TODOS os testes, você está pronto para fazer deploy usando [DEPLOYMENT_VISUAL.md](DEPLOYMENT_VISUAL.md).
