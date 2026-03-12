# Backup and Recovery Runbook

## Objetivo
Garantir backup recorrente com verificacao e restauracao simples para incidentes.

## Escopo minimo
- Estrutura + dados das tabelas criticas: users, machines, service_orders, checklists, checklist_schedules, audit_logs.
- Arquivos de storage (bucket manuals/machines) em job separado.

## Frequencia recomendada
1. Backup full diario (fora do horario de pico).
2. Backup incremental a cada 4 horas.
3. Retencao:
- Diario: 30 dias
- Semanal: 12 semanas
- Mensal: 12 meses

## Checklist do job de backup
1. Executar dump SQL + dados.
2. Gerar hash SHA256 do arquivo.
3. Subir arquivo para storage de backup.
4. Registrar linha de verificacao em tabela de controle.

## Tabela de controle (sugestao)
```sql
CREATE TABLE IF NOT EXISTS backup_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP,
  backup_type TEXT NOT NULL, -- full | incremental
  status TEXT NOT NULL,      -- success | failed
  file_name TEXT,
  file_size_bytes BIGINT,
  sha256 TEXT,
  verification_status TEXT,  -- pending | ok | failed
  notes TEXT
);
```

## Verificacao diaria (obrigatoria)
1. Validar hash do ultimo backup.
2. Fazer restore de teste em ambiente homolog.
3. Rodar smoke test:
- login admin
- listagem de O.S
- abertura e finalizacao de O.S
- leitura de checklist
4. Registrar resultado no backup_runs.verification_status.

## Fluxo de restauracao
1. Abrir incidente e congelar escrita no sistema.
2. Escolher ponto de recuperacao (ultimo backup valido).
3. Restaurar base em ambiente staging.
4. Executar smoke test completo.
5. Se aprovado, restaurar em producao.
6. Reabrir escrita e monitorar por 60 minutos.

## Comandos de referencia (exemplo)
> Ajuste para sua infraestrutura (Supabase CLI / Postgres direto).

```bash
# Dump
pg_dump "$DATABASE_URL" --format=custom --file backup_full_$(date +%F).dump

# Hash
sha256sum backup_full_$(date +%F).dump > backup_full_$(date +%F).sha256

# Restore teste
pg_restore --clean --if-exists --no-owner --dbname "$STAGING_DATABASE_URL" backup_full_$(date +%F).dump
```

## RTO/RPO sugeridos
- RTO: 2 horas
- RPO: 4 horas

## Responsaveis
- Dono tecnico: Time de desenvolvimento
- Aprovacao para restore em producao: Administrador da operacao + responsavel de TI
