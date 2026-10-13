# CrackFlow Database Migration Runbook

## Zero-Downtime Migration Strategy

### Pre-Migration Checklist
- [ ] Backup database before migration
- [ ] Review migration files for breaking changes
- [ ] Test migration on staging environment
- [ ] Notify team of planned migration window
- [ ] Ensure rollback plan is ready

### Migration Types

#### 1. Safe Migrations (No Downtime)
These can be applied without stopping the application:
- Adding new tables
- Adding nullable columns
- Adding indexes (use `ALGORITHM=INPLACE, LOCK=NONE`)
- Adding new foreign keys

```bash
# Run migration
docker compose exec server npx sequelize-cli db:migrate

# Verify
docker compose exec server npx sequelize-cli db:migrate:status
```

#### 2. Risky Migrations (Requires Planning)
These need careful handling:
- Renaming columns/tables
- Changing column types
- Removing columns
- Modifying constraints

**Strategy: Expand-Contract Pattern**

1. **Expand Phase** (Deploy 1)
   - Add new column alongside old
   - Update application to write to both
   - Backfill data to new column

2. **Contract Phase** (Deploy 2)
   - Update application to read from new column
   - Remove old column

### Migration Commands

```bash
# Check migration status
docker compose exec server npx sequelize-cli db:migrate:status

# Run pending migrations
docker compose exec server npx sequelize-cli db:migrate

# Rollback last migration
docker compose exec server npx sequelize-cli db:migrate:undo

# Rollback all migrations
docker compose exec server npx sequelize-cli db:migrate:undo:all

# Create new migration
docker compose exec server npx sequelize-cli migration:generate --name <name>
```

### Rollback Procedure

1. **Immediate Rollback** (within 5 minutes)
   ```bash
   docker compose exec server npx sequelize-cli db:migrate:undo
   ```

2. **Restore from Backup** (if rollback fails)
   ```bash
   # Stop application
   docker compose stop server
   
   # Restore database
   ./deploy/scripts/restore.sh /backups/crackflow_YYYYMMDD_HHMMSS.sql.gz
   
   # Restart application
   docker compose start server
   ```

### Post-Migration Verification

```bash
# Check application health
curl -f http://localhost/api/health

# Check database connectivity
docker compose exec server node -e "
  const db = require('./src/models');
  db.sequelize.authenticate().then(() => console.log('OK')).catch(console.error);
"

# Run smoke tests
docker compose exec server npm run test:smoke
```

### Emergency Contacts
- Database Admin: <contact>
- DevOps Lead: <contact>
- On-Call Engineer: <contact>
