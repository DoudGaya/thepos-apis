
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('--- VTpass Env Check ---');
console.log('VTPASS_API_KEY prefix:', process.env.VTPASS_API_KEY?.substring(0, 4));
console.log('VTPASS_PUBLIC_KEY prefix:', process.env.VTPASS_PUBLIC_KEY?.substring(0, 4));
console.log('VTPASS_SECRET_KEY prefix:', process.env.VTPASS_SECRET_KEY?.substring(0, 4));
// Note: VTPASS_USE_SANDBOX is often handled in the adapter or scripts by passing true/false directly
// but let's see if it's in the env anyway.
console.log('VTPASS_USE_SANDBOX:', process.env.VTPASS_USE_SANDBOX);
