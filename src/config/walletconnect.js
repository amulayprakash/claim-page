import UniversalProvider from '@walletconnect/universal-provider'

let providerInstance = null

export async function getEVMWCProvider() {
  if (providerInstance) return providerInstance

  const projectId = import.meta.env.VITE_WC_PROJECT_ID || '148fa7ca2035ebca6d391aaecddcfbd5'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://claim.usbt.online'

  providerInstance = await UniversalProvider.init({
    projectId,
    metadata: {
      name: 'USBT Claim',
      description: 'USBT Token Promotional Giveaway Claim',
      url: origin,
      icons: [`${origin}/tokens/usbt-lolo.png`],
    },
  })

  return providerInstance
}

export function resetWCProvider() {
  providerInstance = null
}
