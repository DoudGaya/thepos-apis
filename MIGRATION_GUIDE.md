# Prisma Migration Guide

## Prerequisites
- PostgreSQL database running and accessible
- DATABASE_URL environment variable set in `.env`
- Node.js and npm installed

## Apply Migration

The `pinHash` field is already defined in the schema. To apply it to your database:

```bash
cd c:/projects/the-pos/the-backend

# Run migration (creates migration files and applies to DB)
npx prisma migrate dev --name add_pin_hash_field

# Generate Prisma Client with updated types
npx prisma generate
```

## Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to visually inspect the database
npx prisma studio
```

## Production Deployment

For production, use `migrate deploy` instead of `migrate dev`:

```bash
npx prisma migrate deploy
```

## Rollback (if needed)

If you need to rollback:

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually revert by removing the migration folder and reapplying
```

## Current Schema Status

The User model now includes:
- `passwordHash: String` - For login authentication
- `pinHash: String?` - For transaction authorization (optional, set after registration)

Both fields are hashed using bcrypt before storage.
