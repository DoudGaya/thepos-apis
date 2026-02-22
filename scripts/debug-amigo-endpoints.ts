import axios from 'axios'
import * as dotenv from 'dotenv'
dotenv.config()

async function main() {
    console.log('Starting Amigo API Debug Script (Comprehensive)...')
    
    const base = 'https://amigo.ng/api'
    const apiKey = process.env.AMIGO_API_KEY || 'test_key'
    console.log(`Using API Key: ${apiKey.substring(0, 4)}...`)

    const testCases = [
        // Auth Header: Authorization: Token ...
        {
            desc: 'GET /plans/efficiency (Auth: Token)',
            url: 'https://amigo.ng/api/plans/efficiency',
            method: 'GET',
            headers: { 'Authorization': `Token ${apiKey}` }
        },
        {
            desc: 'GET /data/ (Auth: Token)',
            url: 'https://amigo.ng/api/data/',
            method: 'GET',
            headers: { 'Authorization': `Token ${apiKey}` }
        },
        
        // Auth Header: X-API-Key ...
        {
            desc: 'GET /plans/efficiency (Auth: X-API-Key)',
            url: 'https://amigo.ng/api/plans/efficiency',
            method: 'GET',
            headers: { 'X-API-Key': apiKey }
        },
        {
            desc: 'GET /data/ (Auth: X-API-Key)',
            url: 'https://amigo.ng/api/data/',
            method: 'GET',
            headers: { 'X-API-Key': apiKey }
        },

        // Auth Header: Authorization: Bearer ...
        {
            desc: 'GET /plans/efficiency (Auth: Bearer)',
            url: 'https://amigo.ng/api/plans/efficiency',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        },
    ]

    for (const test of testCases) {
        console.log(`\n--- Testing ${test.desc} ---`)
        console.log(`URL: ${test.url}`)
        
        try {
            const res = await axios({
                method: test.method,
                url: test.url,
                headers: {
                    'Content-Type': 'application/json',
                    ...test.headers
                },
                validateStatus: () => true
            })

            console.log(`Status: ${res.status} ${res.statusText}`)
            // console.log(`Headers:`, res.headers)
            
            if (res.data) {
                const dataStr = JSON.stringify(res.data)
                console.log(`Response: ${dataStr.substring(0, 150)}${dataStr.length > 150 ? '...' : ''}`)
            }
            
        } catch (error: any) {
            console.log(`ERROR: ${error.message}`)
        }
    }
}

main().catch(err => console.error(err))
