# Supabase — migrations do Sistema de O.S

Projeto Supabase: **Águia Florestal PCM**.

> ⚠️ O banco de produção não tem histórico de migrations (`list_migrations` vazio em 2026-10-23). Os arquivos `.sql` da raiz do repositório foram aplicados à mão e não reproduzem o estado atual. Esta pasta começa com a correção de segurança abaixo. O próximo passo é gerar uma baseline com `supabase db pull`.

## `20261023120000_remove_public_policies.sql` — **NÃO APLICADA**

Remove o acesso anônimo que ainda existia no banco:

| Antes (observado em 2026-10-23) | Depois |
|---|---|
| `machines`: leitura, criação, edição e exclusão para qualquer pessoa | leitura para usuários logados; escrita só para admin (`is_admin_user()`) |
| `audit_logs`: leitura e inclusão para qualquer pessoa | admin lê tudo; operador lê os logs das OS que já enxerga; inclusão só em nome próprio (`user_id = current_app_user_id()`) |
| Storage `machines`/`manuals`: listar, enviar, substituir e apagar para qualquer pessoa | listar só logado; enviar, substituir e apagar só admin. Os buckets continuam públicos, então os links de `getPublicUrl` seguem funcionando |
| `anon` com GRANT total nas tabelas | GRANTs do `anon` revogados nas tabelas (a view `login_directory` não muda) |

**Fora do escopo:** a view `login_directory`, que expõe nome, usuário e papel antes do login. Corrigir exige mudar o fluxo de login no front-end.

### Mudanças de comportamento esperadas
- Operadores deixam de ver, nas notificações e no histórico, logs de OS que não são deles.
- Uma alteração em máquina feita offline e sincronizada depois que a sessão expirou é recusada pelo banco. A fila já marca esses itens como `permissionBlocked`.

### Como validar sem tocar no banco
```bash
npm install --no-save @electric-sql/pglite@0.5.10
node supabase/tests/remove_public_policies.test.mjs \
  supabase/migrations/20261023120000_remove_public_policies.sql \
  supabase/rollback/20261023120000_remove_public_policies.rollback.sql
```
O teste recria as policies de produção num PostgreSQL descartável e mostra o problema antes. Depois aplica a migration e testa os papéis anon, operador e admin. Por fim, reverte e reaplica. Resultado em 2026-10-23: **44 PASS, 0 FAIL**.

### Como aplicar (só com autorização)
1. Fazer backup (Database → Backups) ou `pg_dump` das policies.
2. Colar o arquivo no SQL Editor **dentro de uma transação** (`begin; ... commit;`).
3. Conferir: `select tablename, policyname from pg_policies where 'public' = any(roles) or 'anon' = any(roles);` deve retornar 0 linhas.
4. Testar no app: login como admin (criar/editar máquina, enviar manual) e como operador (abrir e fechar OS, ver o histórico).
5. Se algo quebrar: `supabase/rollback/20261023120000_remove_public_policies.rollback.sql`.
