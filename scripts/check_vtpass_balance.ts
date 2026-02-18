
import { PrismaClient } from '@prisma/client'
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter'
import dotenv from 'dotenv'
import path from 'path'
import axios from 'axios'

// Init env
dotenv.config({ path: path.join(__dirname, '../.env') })

async function checkBalance() {
  console.log('--- Checking VTPass Balance ---')
  
  const apiKey = process.env.VTPASS_API_KEY
  const publicKey = process.env.VTPASS_PUBLIC_KEY
  const secretKey = process.env.VTPASS_SECRET_KEY
  const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true'

  if (!apiKey || !publicKey || !secretKey) {
    console.error('❌ Missing VTPass credentials in .env')
    return
  }

  console.log(`Environment: ${useSandbox ? 'SANDBOX' : 'LIVE'}`)
  console.log(`API Key: ${apiKey.substring(0, 8)}...`)

  const adapter = new VTPassAdapter({
    apiKey,
    publicKey,
    secretKey,
    useSandbox
  })

  // TEST 1: Conventional Balance Check (Primary Method)
  try {
    console.log('Calling getBalance() [GET]...')
    const balance = await adapter.getBalance()
    
    console.log('✅ Balance Check Successful!')
    console.log(`Balance: ${balance.currency} ${balance.balance}`)
    
  } catch (error: any) {
    console.error('❌ Balance Check Failed:')
    console.error(error.message)
    
    if (error.vendorResponse) {
      console.error('Vendor Response:', JSON.stringify(error.vendorResponse, null, 2))
    }

    // Comprehensive IP Diagnosis
    if (error.message.includes('IP NOT WHITELISTED') || 
        (error.vendorResponse && error.vendorResponse.code === '027') ||
        (error.vendorResponse && error.vendorResponse.content && error.vendorResponse.content.errors && error.vendorResponse.content.errors.includes('IP'))) {
        
        console.log('\n--- 🛑 DIAGNOSIS: IP BLOCK DETECTED 🛑 ---')
        console.log('The VTPass API is explicitly rejecting requests from this server due to IP restrictions.')
        console.log('This happens even if "API Key Authentication" is selected on the dashboard.')
        
        try {
            console.log('Fetching your public IP...')
            const ipRes = await axios.get('https://api.ipify.org?format=json');
            const myIP = ipRes.data.ip;
            console.log(`YOUR PUBLIC IP: ${myIP}`)
            console.log('\n--- 🛠️  REQUIRED ACTION 🛠️ ---')
            console.log(`You MUST add this IP address (${myIP}) to your VTPass Dashboard.`)
            console.log('1. Go to https://vtpass.com/dashboard/api-settings')
            console.log('2. Add IP: ' + myIP)
            console.log('3. Wait 5-10 minutes for propagation.')
            console.log('---------------------------------')
        } catch (ipError) {
            console.log('Could not fetch public IP automatically. Please check https://whatismyip.com manually.')
        }
    }
  }

  // TEST 2: POST Check (Optional validation)
  console.log('\n--- Checking POST Request (Transaction Status) ---')
  console.log('Note: POST requests use Secret Key instead of Public Key.')
  try {
      const result = await adapter.queryTransaction('DUMMY_' + Date.now())
      console.log('POST Response:', JSON.stringify(result, null, 2))
      
      if (result.metadata && (JSON.stringify(result.metadata).includes('IP NOT WHITELISTED') || result.metadata.errors?.includes('IP'))) {
         console.log('❌ POST requests are ALSO getting IP blocked.')
      } else {
         console.log('✅ POST request structure valid (though dummy reference failed lookup as expected).')
      }
  } catch(e: any) {
      console.log('POST Request Error:', e.message)
  }
}

checkBalance()
