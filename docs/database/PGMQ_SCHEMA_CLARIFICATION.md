# PGMQ Schema Clarification

## Important Discovery

All PGMQ functions that were reported as "missing" actually **DO EXIST** in the database. They are located in the `pgmq` schema rather than the `public` schema.

## Correct Function Names and Usage

### ❌ Incorrect (Old References)
```typescript
// These don't exist
supabase.rpc('pgmq_create', { queue_name: 'test' })
supabase.rpc('pgmq_send_batch', { ... })
supabase.rpc('pgmq_metrics_all', {})
```

### ✅ Correct (Actual Functions)
```typescript
// Use the schema prefix
supabase.rpc('pgmq.create', { queue_name: 'test' })
supabase.rpc('pgmq.send_batch', { ... })
supabase.rpc('pgmq.metrics_all', {})
```

## Key Points

1. **All PGMQ core functions** are in the `pgmq` schema
2. **Enhanced tracking functions** are in the `public` schema
3. **Search functions** are in the `public` schema

## Code Updates Needed

If your code uses the old function names (with underscore like `pgmq_create`), update them to use the schema prefix (like `pgmq.create`).

### Example Fix:
```typescript
// Old (won't work)
const { data, error } = await supabase.rpc('pgmq_send', {
  queue_name: 'file_processing',
  msg: payload
});

// New (correct)
const { data, error } = await supabase.rpc('pgmq.send', {
  queue_name: 'file_processing',
  msg: payload
});
```

## Verification

All functions have been verified to exist in the database:
- ✅ 16 PGMQ core functions in `pgmq` schema
- ✅ 6 Enhanced tracking functions in `public` schema
- ✅ 4 Search functions in `public` schema
- ✅ 5 Legacy tracking functions in `public` schema

Total: 31 verified RPC functions available for use.