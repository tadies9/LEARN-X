# Database Migrations

## 🚨 **Migration Strategy Change**

**As of the database cleanup, this directory no longer contains migration files.**

All database schema information has been consolidated into:
- **`docs/database/schema/CURRENT_SCHEMA.sql`** - Single source of truth for current database state

## 🔄 **Current Migration Approach**

### Active Migrations
All active migrations are now located in:
- **`backend/src/migrations/`** - Backend-specific migrations (8 files)
  - PGMQ setup, vector search, embeddings, etc.

### Schema Reference
For complete database structure, use:
- **`docs/database/schema/CURRENT_SCHEMA.sql`** - Complete current schema
- **`docs/database/schema/QUICK_REFERENCE.md`** - Developer quick reference

## 📋 **Migration Best Practices**

1. **New Features**: Add migrations to `backend/src/migrations/`
2. **Schema Changes**: Use Supabase migrations via CLI
3. **Documentation**: Update `CURRENT_SCHEMA.sql` after changes
4. **Testing**: Always test against actual database state

## 🗂️ **Migration Locations**

| Location | Purpose | Status |
|----------|---------|--------|
| `backend/src/migrations/` | Active backend migrations | ✅ Active |
| `docs/database/schema/` | Schema documentation | ✅ Current |
| `docs/database/migrations/` | Legacy migrations | ❌ Cleaned up |

## 🔧 **Running Migrations**

### Using Supabase CLI
```bash
# Apply new migrations
supabase db push

# Reset database (development only)
supabase db reset
```

### For New Installations
Use the complete schema file:
```sql
-- Apply the complete current schema
\i docs/database/schema/CURRENT_SCHEMA.sql
```

## 📝 **Related Documentation**

- [Current Schema](../schema/CURRENT_SCHEMA.sql) - Complete database schema
- [Schema README](../schema/README.md) - Schema documentation
- [Quick Reference](../schema/QUICK_REFERENCE.md) - Developer guide

## ⚠️ **Important Notes**

1. **No legacy migrations** - All outdated migration files have been removed
2. **Single source of truth** - Use `CURRENT_SCHEMA.sql` for schema reference
3. **Active migrations only** - Only `backend/src/migrations/` contains active files
4. **Database verified** - Current schema matches actual database state