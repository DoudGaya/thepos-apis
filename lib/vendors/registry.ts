import { AmigoAdapter } from './amigo.adapter'
import { VTUNGAdapter } from './vtu-ng.adapter'
import { ClubKonnectAdapter } from './clubkonnect.adapter'
import { EBillsAdapter } from './ebills.adapter'
import { VTPassAdapter } from './vtpass.adapter'
import { SubAndGainAdapter } from './subandgain.adapter'

export const ADAPTER_REGISTRY: Record<string, any> = {
  'AMIGO': AmigoAdapter,
  'VTU_NG': VTUNGAdapter,
  'CLUBKONNECT': ClubKonnectAdapter,
  'EBILLS': EBillsAdapter,
  'VTPASS': VTPassAdapter,
  'SUBANDGAIN': SubAndGainAdapter,
}
