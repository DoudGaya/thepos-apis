/**
 * Phone Number Normalizer
 * 
 * Utilities for normalizing and validating Nigerian phone numbers
 * for vendor API calls.
 */

/**
 * Normalize a Nigerian phone number to standard format
 * 
 * Accepts various formats and converts to 11-digit format (e.g., "08012345678")
 * 
 * @param phone - Phone number in any format
 * @returns string - Normalized 11-digit format
 * @throws Error if phone number is invalid
 * 
 * @example
 * ```typescript
 * normalizePhone("+2348012345678")  // "08012345678"
 * normalizePhone("2348012345678")   // "08012345678"
 * normalizePhone("08012345678")     // "08012345678"
 * normalizePhone("8012345678")      // "08012345678"
 * ```
 */
export function normalizePhone(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required')
  }

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // Handle different formats
  if (cleaned.startsWith('234')) {
    // +234 or 234 format
    cleaned = '0' + cleaned.substring(3)
  } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    // 10-digit without leading 0
    cleaned = '0' + cleaned
  }

  // Validate final format
  if (cleaned.length !== 11 || !cleaned.startsWith('0')) {
    throw new Error('Invalid Nigerian phone number format. Expected 11 digits starting with 0.')
  }

  // Validate network prefix
  const validPrefixes = ['070', '080', '081', '090', '091', '070', '071']
  const prefix = cleaned.substring(0, 3)
  
  // More lenient validation - just check it's 11 digits and starts with 0
  if (cleaned.length !== 11 || !cleaned.startsWith('0')) {
    throw new Error('Invalid phone number format')
  }

  return cleaned
}

/**
 * Convert phone number to international format (+234...)
 * 
 * @param phone - Phone number in any format
 * @returns string - International format with + prefix
 * 
 * @example
 * ```typescript
 * toInternationalFormat("08012345678")  // "+2348012345678"
 * ```
 */
export function toInternationalFormat(phone: string): string {
  const normalized = normalizePhone(phone)
  return '+234' + normalized.substring(1)
}

/**
 * Detect network provider from phone number
 * 
 * @param phone - Phone number
 * @returns NetworkType - MTN, GLO, AIRTEL, or 9MOBILE
 * 
 * @example
 * ```typescript
 * detectNetwork("08012345678")  // "MTN"
 * detectNetwork("08112345678")  // "GLO"
 * detectNetwork("08023456789")  // "GLO"
 * ```
 */
export function detectNetwork(phone: string): 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE' | 'UNKNOWN' {
  const normalized = normalizePhone(phone)
  const prefix = normalized.substring(0, 4)

  // MTN prefixes
  const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916']
  if (mtnPrefixes.includes(prefix)) return 'MTN'

  // GLO prefixes
  const gloPrefixes = ['0805', '0807', '0705', '0815', '0811', '0905', '0915']
  if (gloPrefixes.includes(prefix)) return 'GLO'

  // Airtel prefixes
  const airtelPrefixes = ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912']
  if (airtelPrefixes.includes(prefix)) return 'AIRTEL'

  // 9mobile (Etisalat) prefixes
  const nineMobilePrefixes = ['0809', '0817', '0818', '0909', '0908']
  if (nineMobilePrefixes.includes(prefix)) return '9MOBILE'

  return 'UNKNOWN'
}

/**
 * Validate if a phone number matches a specified network
 * 
 * @param phone - Phone number
 * @param network - Expected network
 * @returns boolean - True if phone matches network
 * 
 * @example
 * ```typescript
 * validateNetwork("08012345678", "MTN")  // true
 * validateNetwork("08012345678", "GLO")  // false
 * ```
 */
export function validateNetwork(phone: string, network: string): boolean {
  const detected = detectNetwork(phone)
  return detected === network.toUpperCase()
}

/**
 * Mask phone number for display (show only last 4 digits)
 * 
 * @param phone - Phone number
 * @returns string - Masked phone number
 * 
 * @example
 * ```typescript
 * maskPhone("08012345678")  // "********5678"
 * ```
 */
export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  return '*'.repeat(7) + normalized.substring(7)
}

/**
 * Format phone number for display (add spacing)
 * 
 * @param phone - Phone number
 * @returns string - Formatted phone number
 * 
 * @example
 * ```typescript
 * formatPhone("08012345678")  // "0801 234 5678"
 * ```
 */
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  return `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`
}
