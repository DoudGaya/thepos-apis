
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testScenarios() {
    console.log('--- VTPass Sandbox Comprehensive Testing ---');

    const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true';
    const adapter = new VTPassAdapter({
        apiKey: process.env.VTPASS_API_KEY || 'placeholder',
        publicKey: process.env.VTPASS_PUBLIC_KEY || 'placeholder',
        secretKey: process.env.VTPASS_SECRET_KEY || 'placeholder',
        useSandbox
    });

    console.log(`Adapter initialized for ${useSandbox ? 'SANDBOX' : 'LIVE'}.\n`);

    // Scenario 1: Successful Airtime (MTN)
    console.log('SCENARIO 1a: Successful Airtime (MTN - 08011111111)');
    try {
        const res = await adapter.buyService({
            service: 'AIRTIME',
            network: 'MTN',
            phone: '08011111111',
            amount: 50,
            idempotencyKey: `test_mtn_${Date.now()}`
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    console.log('\nSCENARIO 1b: Successful Airtime (GLO - 08011111111)');
    try {
        const res = await adapter.buyService({
            service: 'AIRTIME',
            network: 'GLO',
            phone: '08011111111',
            amount: 50,
            idempotencyKey: `test_glo_${Date.now()}`
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    console.log('\nSCENARIO 1c: Successful Airtime (AIRTEL - 08011111111)');
    try {
        const res = await adapter.buyService({
            service: 'AIRTIME',
            network: 'AIRTEL',
            phone: '08011111111',
            amount: 50,
            idempotencyKey: `test_airtel_${Date.now()}`
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    // Scenario 2: Pending Airtime
    console.log('\nSCENARIO 2: Pending Airtime (201000000000)');
    try {
        const res = await adapter.buyService({
            service: 'AIRTIME',
            network: 'MTN',
            phone: '201000000000',
            amount: 50,
            idempotencyKey: `test_pending_${Date.now()}`
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    // Scenario 3: Failed Airtime
    console.log('\nSCENARIO 3: Failed Airtime (99999999999)');
    try {
        const res = await adapter.buyService({
            service: 'AIRTIME',
            network: 'MTN',
            phone: '99999999999',
            amount: 50,
            idempotencyKey: `test_failed_${Date.now()}`
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    // Scenario 4: Data Purchase
    console.log('\nSCENARIO 4: Data Purchase');
    try {
        // Fetch plans first to get a valid variation code for sandbox
        const plans = await adapter.getPlans('DATA', 'MTN');
        console.log(`Fetched ${plans.length} plans.`);
        if (plans.length > 0) {
            console.log('Sample Plan:', plans[0]);
        }
        const planId = plans.length > 0 ? plans[0].id : 'mtn-data-100mb';

        const res = await adapter.buyService({
            service: 'DATA',
            network: 'MTN',
            phone: '08011111111',
            amount: 100,
            planId: planId,
            idempotencyKey: `test_data_${Date.now()}`
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    // Scenario 5: Electricity (Verify and Purchase)
    console.log('\nSCENARIO 5: Electricity');
    try {
        const meterNumber = '1111111111111'; // Sandbox dummy meter
        console.log('Verifying Meter...');
        const verifyRes = await adapter.verifyCustomer({
            service: 'ELECTRICITY',
            serviceProvider: 'IKEJA',
            customerId: meterNumber,
            meterType: 'PREPAID'
        });
        console.log('Verify Result:', JSON.stringify(verifyRes, null, 2));

        if (verifyRes.isValid) {
            console.log('Purchasing Electricity...');
            const res = await adapter.buyService({
                service: 'ELECTRICITY',
                network: 'MTN',
                customerId: meterNumber,
                amount: 1000,
                phone: '08011111111',
                meterType: 'PREPAID',
                metadata: { provider: 'IKEJA' },
                idempotencyKey: `test_electric_${Date.now()}`
            });
            console.log('Purchase Result:', JSON.stringify(res, null, 2));
        }
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    // Scenario 6: TV Subscription (GOTV)
    console.log('\nSCENARIO 6: TV Subscription (GOTV)');
    try {
        const res = await adapter.buyService({
            service: 'CABLE_TV',
            network: 'GOTV' as any,
            customerId: '1212121212',
            phone: '08011111111',
            amount: 100,
            planId: 'gotv-lite',
            idempotencyKey: `test_tv_${Date.now()}`,
            metadata: { provider: 'GOTV', subscriptionType: 'renew' }
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }

    // Scenario 7: Education (WAEC)
    console.log('\nSCENARIO 7: Education (WAEC Result Checker)');
    try {
        const res = await adapter.buyService({
            service: 'EDUCATION',
            network: 'WAEC' as any,
            phone: '08011111111',
            amount: 3500,
            planId: 'waecdirect',
            idempotencyKey: `test_edu_${Date.now()}`,
            metadata: { examName: 'WAEC_RESULT' }
        });
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }
}

testScenarios();
