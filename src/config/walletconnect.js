import { WalletConnectWallet } from '@tronweb3/walletconnect-tron'

export function createWCWallet() {
  const projectId = import.meta.env.VITE_WC_PROJECT_ID || '148fa7ca2035ebca6d391aaecddcfbd5'
  return new WalletConnectWallet({
    network: 'tron:0x2b6653dc',
    options: {
      relayUrl: 'wss://relay.walletconnect.com',
      projectId,
      metadata: {
        name: 'USBT Claim',
        description: 'USBT Token Promotional Giveaway Claim',
        url: window.location.origin,
        icons: [`${window.location.origin}/usbt-lolo.png`],
      },
    },
  })
}
