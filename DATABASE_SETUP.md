# ============================================
# DATABASE CONFIGURATION - BACKUP/LOCAL SETUP
# ============================================
# This file contains the instructions to switch between Neon (cloud) and Local PostgreSQL

# ============================================
# OPTION 1: NEON DATABASE (Cloud - Current)
# ============================================
# DATABASE_URL="postgresql://neondb_owner:npg_N4Gmu3dxMSJl@ep-empty-boat-af8cotts-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=10"

# ============================================
# OPTION 2: LOCAL POSTGRESQL DATABASE
# ============================================
# To use local PostgreSQL, update DATABASE_URL in .env to:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thepos?schema=public"

# ============================================
# SETUP LOCAL POSTGRESQL ON WINDOWS
# ============================================
# 
# Method 1: Using PostgreSQL Installer (Recommended)
# --------------------------------------------------
# 1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
# 2. Run the installer and set password to 'postgres' (or your choice)
# 3. Open pgAdmin or psql and create database:
#    CREATE DATABASE thepos;
# 4. Update .env: DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/thepos"
# 5. Run: npx prisma migrate deploy
#
# Method 2: Using Docker Desktop (If installed)
# --------------------------------------------------
# docker run --name thepos-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=thepos -p 5432:5432 -d postgres:15
#
# Method 3: Using WSL2 + Docker
# --------------------------------------------------
# 1. Install WSL2 and Docker Desktop
# 2. Run the docker command above

# ============================================
# SWITCHING DATABASES
# ============================================
# 
# To switch from Neon to Local:
# 1. Backup your .env file
# 2. Change DATABASE_URL to local connection string
# 3. Run: npx prisma migrate deploy (applies migrations to local DB)
# 4. Optionally seed data: npx prisma db seed
#
# To switch from Local to Neon:
# 1. Change DATABASE_URL back to Neon connection string
# 2. No migration needed (already applied on Neon)

# ============================================
# SYNC DATA BETWEEN DATABASES
# ============================================
# To export data from Neon and import to Local:
# 
# Export from Neon:
# pg_dump "postgresql://neondb_owner:npg_N4Gmu3dxMSJl@ep-empty-boat-af8cotts-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require" > neon_backup.sql
#
# Import to Local:
# psql -h localhost -U postgres -d thepos < neon_backup.sql
