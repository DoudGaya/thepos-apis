import axios from 'axios'

async function tryGet(url: string) {
    try {
        console.log(`GET ${url}...`)
        const res = await axios.get(url, { headers: { 'Accept': 'application/json' } })
        console.log(`✅ ${res.status} OK`)
    } catch (e: any) {
        console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`)
        if (e.response?.data) console.log('   Data:', JSON.stringify(e.response.data).substring(0, 100))
    }
}

async function tryPost(url: string) {
    try {
        console.log(`POST ${url}...`)
        // Empty body to trigger 401 hopefully
        const res = await axios.post(url, {}, { headers: { 'Content-Type': 'application/json' } })
        console.log(`✅ ${res.status} OK`)
    } catch (e: any) {
        console.log(`❌ ${e.response?.status || 'Error'}: ${e.message}`)
        if (e.response?.data) console.log('   Data:', JSON.stringify(e.response.data).substring(0, 100))
    }
}

async function main() {
    console.log('--- Testing Plans Endpoints ---');
    await tryGet('https://amigo.ng/api/plans/efficiency')
    await tryGet('https://amigo.ng/api/plans/efficiency/') // Trailing slash
    
    console.log('\n--- Testing Purchase Endpoints ---');
    await tryPost('https://amigo.ng/api/data/') 
    await tryPost('https://amigo.ng/api/data')
}
main()
