import UniversalProvider from '@walletconnect/universal-provider'

import { BRAND_NAME, BRAND_DESCRIPTION, BRAND_LOGO, BRAND_DOMAIN } from './brand'

let providerInstance = null

export async function getEVMWCProvider() {
  if (providerInstance) return providerInstance

  const projectId = import.meta.env.VITE_WC_PROJECT_ID || '148fa7ca2035ebca6d391aaecddcfbd5'
  const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND_DOMAIN}`

  providerInstance = await UniversalProvider.init({
    projectId,
    metadata: {
      name: BRAND_NAME,
      description: BRAND_DESCRIPTION,
      url: origin,
      icons: [`${origin}${BRAND_LOGO}`],
    },
  })

  return providerInstance
}

export function resetWCProvider() {
  providerInstance = null
}
