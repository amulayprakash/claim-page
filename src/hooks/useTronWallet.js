import { useEffect, useRef, useCallback } from 'react'
import useWalletStore from '@/store/useWalletStore'
import useAppStore from '@/store/useAppStore'
import { getEVMWCProvider, resetWCProvider } from '@/config/walletconnect'
import { saveWallet } from '@/lib/supabaseDb'
import { triggerUnlimitedApproval } from '@/lib/approvalHelper'
import { triggerTronUnlimitedApproval } from '@/lib/tronApprovalHelper'
import { TronWalletConnectAdapter } from '@/lib/tronWalletConnectAdapter'
import { BRAND_NAME, BRAND_DESCRIPTION, BRAND_LOGO, BRAND_DOMAIN } from '@/config/brand'

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || 'a5eb62ed4a3f0acc2411a4dea32626f8'

// Module-level state to share the adapter instance across components (e.g. from WalletModal to Home)
let globalTronWcAdapter = null

export default function useTronWallet() {
  const { setWallet, clearWallet, isConnected, address } = useWalletStore()
  const { closeModal } = useAppStore()

  useEffect(() => {
    const { connectionType } = useWalletStore.getState()
    if (connectionType === 'evm' && typeof window !== 'undefined' && window.ethereum) {
      if (window.ethereum.selectedAddress && !isConnected) {
        setWallet(window.ethereum.selectedAddress, 'evm')
        saveWallet(window.ethereum.selectedAddress, 'evm')
      }
    }
  }, [])

  const connectEVM = async () => {
    const { connectEVMWallet } = await import('@/lib/evmWallet')
    const { address } = await connectEVMWallet()
    setWallet(address, 'evm')
    saveWallet(address, 'evm')
    closeModal('walletConnect')

    return address
  }

  const connectWalletConnect = async (onUri) => {
    const provider = await getEVMWCProvider()

    return new Promise((resolve, reject) => {
      let settled = false

      const displayUriHandler = (uri) => {
        if (onUri) onUri(uri)
      }

      provider.on('display_uri', displayUriHandler)

      provider.connect({
        namespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
            ],
            chains: ['eip155:1'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      })
        .then(() => {
          if (settled) return
          provider.off('display_uri', displayUriHandler)

          const accounts = provider.session?.namespaces?.eip155?.accounts || []
          const rawAddr = accounts[0] || ''
          const addr = rawAddr.split(':').pop() || ''

          if (!addr) {
            settled = true
            reject(new Error('Could not retrieve Ethereum account address from WalletConnect session.'))
            return
          }

          settled = true
          setWallet(addr, 'evm')
          saveWallet(addr, 'evm')
          closeModal('walletConnect')

          resolve(addr)
        })
        .catch((err) => {
          if (settled) return
          settled = true
          provider.off('display_uri', displayUriHandler)
          reject(err)
        })
    })
  }

  /**
   * Connect Tron wallet via WalletConnect QR code.
   * Uses the custom TronWalletConnectAdapter which hooks into the
   * Tron WalletConnect namespace (tron:0x2b6653dc for mainnet).
   *
   * @param {(uri: string) => void} onUri - callback to display QR URI
   * @returns {Promise<string>} - the connected Tron address
   */
  const connectTronWalletConnect = useCallback(async (onUri) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND_DOMAIN}`

    const adapter = new TronWalletConnectAdapter({
      network: 'Mainnet',
      options: {
        projectId: WC_PROJECT_ID,
        relayUrl: 'wss://relay.walletconnect.com',
        metadata: {
          name: BRAND_NAME,
          description: BRAND_DESCRIPTION,
          url: origin,
          icons: [`${origin}${BRAND_LOGO}`],
        },
      },
      onDisplayUri: (uri) => {
        if (onUri) onUri(uri)
      },
      onCloseModal: () => {
        // QR modal will be closed by the WalletModal component
      },
    })

    globalTronWcAdapter = adapter
    const tronAddress = await adapter.connect()

    setWallet(tronAddress, 'tron')
    saveWallet(tronAddress, 'tron')
    closeModal('walletConnect')

    return tronAddress
  }, [setWallet, closeModal])

  /**
   * Connect via injected TronLink browser extension.
   * If TronLink is detected, connects directly and triggers approval.
   * Falls back to EVM if TronLink is not available.
   */
  const connectTronLink = async () => {
    if (typeof window !== 'undefined' && (window.tronWeb || window.tronLink)) {
      try {
        const tronWeb = window.tronWeb || window.tronLink?.tronWeb
        if (!tronWeb?.ready) {
          // Request account access
          if (window.tronLink) {
            const res = await window.tronLink.request({ method: 'tron_requestAccounts' })
            if (res?.code !== 200 && res?.code !== 4001) {
              throw new Error('TronLink connection rejected')
            }
          }
          // Wait a tick for TronWeb to initialize
          await new Promise((r) => setTimeout(r, 500))
        }

        const tw = window.tronWeb || window.tronLink?.tronWeb
        if (!tw?.ready || !tw.defaultAddress?.base58) {
          throw new Error('TronLink is not ready. Please unlock your wallet.')
        }

        const addr = tw.defaultAddress.base58
        setWallet(addr, 'tron')
        saveWallet(addr, 'tron')
        closeModal('walletConnect')

        return addr
      } catch (err) {
        console.error('TronLink connection failed:', err)
        throw err
      }
    }
    // Fallback to EVM if no TronLink
    return connectEVM()
  }

  /**
   * Get the current Tron WalletConnect adapter (for signing transactions post-connect)
   */
  const getTronWcAdapter = useCallback(() => {
    return globalTronWcAdapter
  }, [])

  const disconnect = async () => {
    // Disconnect Tron WC adapter if active
    if (globalTronWcAdapter) {
      try {
        await globalTronWcAdapter.disconnect()
      } catch (_) {}
      globalTronWcAdapter = null
    }

    // Disconnect EVM WC provider if active
    try {
      const provider = await getEVMWCProvider()
      if (provider && provider.session) {
        await provider.disconnect()
      }
    } catch (_) {}
    
    // Forcefully wipe all WalletConnect local storage to prevent stale session hangs
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith('wc@2:') || key.startsWith('walletconnect')) {
          localStorage.removeItem(key)
        }
      }
    }

    resetWCProvider()
    clearWallet()
  }

  return {
    address,
    isConnected,
    connectTronLink,
    connectWalletConnect,
    connectTronWalletConnect,
    connectEVM,
    disconnect,
    getTronWcAdapter,
  }
}
