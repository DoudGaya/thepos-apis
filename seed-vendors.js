const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Seeding Vendors...\n')

  try {
    // ==========================================
    // 1. AMIGO (Primary for Data)
    // ==========================================
    const amigoToken = process.env.AMIGO_API_TOKEN || 'placeholder-token'
    
    console.log('🔹 Configuring Amigo (Data Primary)...')
    await prisma.vendorConfig.upsert({
      where: { adapterId: 'AMIGO' },
      update: {
        vendorName: 'Amigo',
        type: 'DATA', // Primarily data
        isEnabled: true,
        isPrimary: true, // Primary for Data
        priority: 100,
        supportsAirtime: false,
        supportsData: true,
        supportsElectric: false,
        supportsCableTV: false,
        supportsBetting: false,
        supportsEPINS: false,
        credentials: {
          apiToken: amigoToken
        }
      },
      create: {
        vendorName: 'Amigo',
        adapterId: 'AMIGO',
        type: 'DATA',
        isEnabled: true,
        isPrimary: true,
        priority: 100,
        supportsAirtime: false,
        supportsData: true,
        supportsElectric: false,
        supportsCableTV: false,
        supportsBetting: false,
        supportsEPINS: false,
        credentials: {
          apiToken: amigoToken
        }
      }
    })
    console.log('✅ Amigo configured.')
  } catch (error) {
    console.error('❌ Error configuring Amigo:', error)
  }

  try {
    // ==========================================
    // 2. VT PASS (Primary for Airtime, Utility)
    // ==========================================
    const vtpassApiKey = process.env.VTPASS_API_KEY || 'placeholder-api-key'
    const vtpassPublicKey = process.env.VTPASS_PUBLIC_KEY || 'placeholder-public-key'
    const vtpassSecretKey = process.env.VTPASS_SECRET_KEY || 'placeholder-secret-key'
    const vtpassUseSandbox = process.env.VTPASS_USE_SANDBOX === 'true'

    console.log('🔹 Configuring VT Pass (Airtime/Utility Primary)...')
    await prisma.vendorConfig.upsert({
      where: { adapterId: 'VTPASS' },
      update: {
        vendorName: 'VTpass',
        type: 'ALL',
        isEnabled: true,
        isPrimary: true, // Primary for others
        priority: 90, // Slightly lower general priority, but will be routed specifically
        supportsAirtime: true,
        supportsData: true, // Can do data too
        supportsElectric: true,
        supportsCableTV: true,
        supportsBetting: true,
        supportsEPINS: true,
        credentials: {
          apiKey: vtpassApiKey,
          publicKey: vtpassPublicKey,
          secretKey: vtpassSecretKey,
          useSandbox: vtpassUseSandbox
        }
      },
      create: {
        vendorName: 'VTpass',
        adapterId: 'VTPASS',
        type: 'ALL',
        isEnabled: true,
        isPrimary: true,
        priority: 90,
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: true,
        supportsCableTV: true,
        supportsBetting: true,
        supportsEPINS: true,
        credentials: {
          apiKey: vtpassApiKey,
          publicKey: vtpassPublicKey,
          secretKey: vtpassSecretKey,
          useSandbox: vtpassUseSandbox
        }
      }
    })
    console.log('✅ VT Pass configured.')
  } catch (error) {
    console.error('❌ Error configuring VT Pass:', error)
  }

  try {
    // ==========================================
    // 3. VTU.NG (Fallback)
    // ==========================================
    const vtuNgUsername = process.env.VTU_NG_USERNAME || 'placeholder-username'
    const vtuNgPassword = process.env.VTU_NG_PASSWORD || 'placeholder-password'

    console.log('🔹 Configuring VTU.ng (Fallback)...')
    await prisma.vendorConfig.upsert({
      where: { adapterId: 'VTU_NG' },
      update: {
        vendorName: 'VTU.ng',
        type: 'ALL',
        isEnabled: true,
        isPrimary: false,
        priority: 50, // Lower priority
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: true,
        supportsCableTV: true,
        supportsBetting: false,
        supportsEPINS: false,
        credentials: {
          username: vtuNgUsername,
          password: vtuNgPassword
        }
      },
      create: {
        vendorName: 'VTU.ng',
        adapterId: 'VTU_NG',
        type: 'ALL',
        isEnabled: true,
        isPrimary: false,
        priority: 50,
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: true,
        supportsCableTV: true,
        supportsBetting: false,
        supportsEPINS: false,
        credentials: {
          username: vtuNgUsername,
          password: vtuNgPassword
        }
      }
    })
    console.log('✅ VTU.ng configured.')
  } catch (error) {
    console.error('❌ Error configuring VTU.ng:', error)
  }

  try {
    // ==========================================
    // 4. SUBANDGAIN (Fallback)
    // ==========================================
    const subAndGainUsername = process.env.SUBANDGAIN_USERNAME || 'placeholder-username'
    const subAndGainApiKey = process.env.SUBANDGAIN_API_KEY || 'placeholder-api-key'

    console.log('🔹 Configuring SubAndGain (Fallback)...')
    await prisma.vendorConfig.upsert({
      where: { adapterId: 'SUBANDGAIN' },
      update: {
        vendorName: 'SubAndGain',
        type: 'ALL',
        isEnabled: true,
        isPrimary: false,
        priority: 50, // Lower priority
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: true,
        supportsCableTV: true,
        supportsBetting: false,
        supportsEPINS: false,
        credentials: {
          username: subAndGainUsername,
          apiKey: subAndGainApiKey
        }
      },
      create: {
        vendorName: 'SubAndGain',
        adapterId: 'SUBANDGAIN',
        type: 'ALL',
        isEnabled: true,
        isPrimary: false,
        priority: 50,
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: true,
        supportsCableTV: true,
        supportsBetting: false,
        supportsEPINS: false,
        credentials: {
          username: subAndGainUsername,
          apiKey: subAndGainApiKey
        }
      }
    })
    console.log('✅ SubAndGain configured.')
  } catch (error) {
    console.error('❌ Error configuring SubAndGain:', error)
  }

  console.log('\n🎉 Vendor seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
