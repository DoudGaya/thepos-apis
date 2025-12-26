/**
 * Database Switcher Script
 * 
 * Usage:
 *   node switch-database.js local    - Switch to local PostgreSQL
 *   node switch-database.js neon     - Switch to Neon (cloud)
 *   node switch-database.js status   - Show current database
 */

const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env')

const NEON_URL = 'postgresql://neondb_owner:npg_N4Gmu3dxMSJl@ep-empty-boat-af8cotts-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&connection_limit=20&pool_timeout=10'
const LOCAL_URL = 'postgresql://postgres:postgres@localhost:5432/NillarPay?schema=public'

const command = process.argv[2]

function readEnv() {
  return fs.readFileSync(envPath, 'utf8')
}

function writeEnv(content) {
  fs.writeFileSync(envPath, content)
}

function getCurrentDb() {
  const env = readEnv()
  const match = env.match(/DATABASE_URL="([^"]+)"/)
  if (!match) return 'unknown'
  
  if (match[1].includes('neon.tech')) return 'neon'
  if (match[1].includes('localhost')) return 'local'
  return 'unknown'
}

function switchDatabase(target) {
  let env = readEnv()
  const current = getCurrentDb()
  
  if (current === target) {
    console.log(`✅ Already using ${target} database`)
    return
  }
  
  const newUrl = target === 'local' ? LOCAL_URL : NEON_URL
  
  // Replace DATABASE_URL
  env = env.replace(
    /DATABASE_URL="[^"]+"/,
    `DATABASE_URL="${newUrl}"`
  )
  
  writeEnv(env)
  
  console.log(`✅ Switched to ${target.toUpperCase()} database`)
  console.log(`\n📍 Connection: ${target === 'local' ? 'localhost:5432' : 'Neon Cloud'}`)
  
  if (target === 'local') {
    console.log(`
⚠️  Make sure PostgreSQL is running locally!

If you haven't set up local PostgreSQL yet:
1. Download from https://www.postgresql.org/download/windows/
2. Install with default settings, set password to 'postgres'
3. Create database: CREATE DATABASE NillarPay;
4. Run migrations: npx prisma migrate deploy

Or adjust the password in .env if different.
`)
  } else {
    console.log(`\n🌐 Connected to Neon cloud database`)
  }
}

function showStatus() {
  const current = getCurrentDb()
  const env = readEnv()
  const match = env.match(/DATABASE_URL="([^"]+)"/)
  const url = match ? match[1] : 'not found'
  
  console.log(`
📊 Database Status
==================
Current: ${current.toUpperCase()}
Host: ${current === 'neon' ? 'Neon Cloud (us-west-2)' : current === 'local' ? 'localhost:5432' : 'Unknown'}

Connection String (masked):
${url.replace(/:[^:@]+@/, ':****@')}

Commands:
  node switch-database.js local  - Use local PostgreSQL
  node switch-database.js neon   - Use Neon cloud
`)
}

// Main
switch (command) {
  case 'local':
    switchDatabase('local')
    break
  case 'neon':
    switchDatabase('neon')
    break
  case 'status':
    showStatus()
    break
  default:
    console.log(`
Database Switcher
=================
Usage:
  node switch-database.js local    Switch to local PostgreSQL
  node switch-database.js neon     Switch to Neon cloud
  node switch-database.js status   Show current database
`)
}
