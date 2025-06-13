# Database Migrations

This directory contains all database migration scripts for the LEARN-X platform.

## Migration Files

- **COMPLETE_MIGRATION.sql** - Complete database setup migration (creates all tables, indexes, and policies)
- **PERSONAS_MIGRATION.sql** - Adds persona-related tables and features

## Migration Strategy

1. **Initial Setup**: Run `COMPLETE_MIGRATION.sql` for new installations
2. **Feature Migrations**: Apply specific migration files as features are added
3. **Version Control**: All migrations are tracked in git

## Running Migrations

### Using Supabase CLI
```bash
# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

### Manual Application
1. Connect to your Supabase project
2. Navigate to SQL Editor
3. Run migration files in order

## Migration Best Practices

1. Always test migrations in development first
2. Include rollback statements when possible
3. Document breaking changes
4. Never modify existing migration files
5. Create new migrations for schema changes

## Migration Order

1. `COMPLETE_MIGRATION.sql` (base schema)
2. `PERSONAS_MIGRATION.sql` (persona features)
3. Future migrations as needed

## Related Documentation

- [Schema Documentation](../schema/README.md)
- [Database Overview](../README.md)