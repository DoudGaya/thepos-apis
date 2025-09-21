/**
 * Referral and Commission Processing API
 */
import { NextRequest, NextResponse } from 'next/server';

// POST /api/referrals/process - Process referral bonus when user makes first purchase
export async function POST(request: NextRequest) {
  try {
    const { userId, transactionId, transactionAmount } = await request.json();

    if (!userId || !transactionId || !transactionAmount) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, transactionId, transactionAmount' 
      }, { status: 400 });
    }

    // Mock processing for now since database isn't connected
    // In production, this would:
    // 1. Check if user has a referrer
    // 2. Check if this is user's first successful purchase
    // 3. Credit referrer with ₦100 bonus
    // 4. Credit agent with commission (₦50-₦100 based on transaction)
    // 5. Update user's referral earning records

    // Calculate commission based on transaction amount
    let agentCommission = 50; // Base commission
    if (transactionAmount >= 5000) agentCommission = 100;
    else if (transactionAmount >= 2000) agentCommission = 75;

    const referralBonus = 100; // Fixed ₦100 for first purchase

    console.log(`Processing referral for user ${userId}:`);
    console.log(`- Transaction: ${transactionId} (₦${transactionAmount})`);
    console.log(`- Referral bonus: ₦${referralBonus}`);
    console.log(`- Agent commission: ₦${agentCommission}`);

    return NextResponse.json({
      success: true,
      data: {
        referralBonus,
        agentCommission,
        totalEarnings: referralBonus + agentCommission,
        message: 'Referral bonuses processed successfully',
      },
    });
  } catch (error) {
    console.error('Referral processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process referral bonuses' },
      { status: 500 }
    );
  }
}
