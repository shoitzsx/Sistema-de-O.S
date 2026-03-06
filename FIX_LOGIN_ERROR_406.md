# 🔧 FIX PARA ERRO 406 - LOGIN NÃO FUNCIONA

## O Problema
A tabela `users` tem RLS (Row Level Security) configurado, mas sem a política correta que permite leitura para login anônimo.

**Erro no F12:**
```
Failed to load resource: the server responded with a status of 406
```

## ✅ Solução

### Passo 1: Abra o Supabase SQL Editor
1. Acesse seu projeto no Supabase: https://supabase.com/projects
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New Query**

### Passo 2: Cole o Script de Correção
1. Copie todo o conteúdo do arquivo `FIX_RLS_POLICIES.sql` desta pasta
2. Cole no editor SQL do Supabase

### Passo 3: Execute
1. Clique em **Run** (botão verde)
2. Aguarde "Success" aparecer
3. Pronto! ✅

## 🔄 Depois de aplicar o FIX

A tabela `users` agora terá:
- ✅ **Leitura pública** (necessário para login)
- ✅ **Atualização restrita** (apenas o próprio usuário pode atualizar seus dados)

Tudo funciona normalmente!

---

## Se o Erro Persistir

Se ainda aparecer erro 406 após executar o SQL:

1. Vá em **Authentication** (menu lateral Supabase)
2. Verifique se **RLS** está habilitado
3. Se não quiser RLS (apenas para desenvolvimento), desabilite-o:
   - Clique na tabela `users`
   - Vá em **RLS** 
   - Clique em **Disable RLS**

---

## Credenciais para Teste
```
Usuário: admin
Senha: admin1234
```

Após o login funcionar, todos os outros módulos devem funcionar também! 🚀
