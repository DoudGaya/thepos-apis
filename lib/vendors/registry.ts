import { AmigoAdapter } from './amigo.adapter'
import { EBillsAdapter } from './ebills.adapter'
import { VTPassAdapter } from './vtpass.adapter'
import { SubAndGainAdapter } from './subandgain.adapter'
import { MonnifyAdapter } from './monnify.adapter'

export const ADAPTER_REGISTRY: Record<string, any> = {
  'AMIGO': AmigoAdapter,
  'EBILLS': EBillsAdapter,
  'VTPASS': VTPassAdapter,
  'SUBANDGAIN': SubAndGainAdapter,
  'MONNIFY': MonnifyAdapter,
}
