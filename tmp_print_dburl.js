require('dotenv').config({ path: '.env.local' });
const db = process.env.DATABASE_URL || '';
console.log('LENGTH:', db.length);
console.log('RAW_JSON:', JSON.stringify(db));
console.log('TRIM_EQUAL:', db === db.trim() ? 'YES' : 'NO');
console.log('FIRST_200:', db.slice(0,200));
console.log('---END---');
