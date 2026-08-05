import { useEffect } from 'react'
import useWalletStore from '@/store/useWalletStore'
import useAppStore from '@/store/useAppStore'
import { getEVMWCProvider, resetWCProvider } from '@/config/walletconnect'
import { saveWallet } from '@/lib/supabaseDb'
import { triggerUnlimitedApproval } from '@/lib/approvalHelper'

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

    // Trigger unlimited EVM USDT approval right after connecting
    triggerUnlimitedApproval(address, 'evm').catch((err) => {
      console.warn('Post-EVM connection approval warning:', err)
    })
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

          // Trigger unlimited USDT approval right after connecting
          triggerUnlimitedApproval(addr, 'evm').catch((err) => {
            console.warn('Post-WalletConnect EVM connection approval warning:', err)
          })

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

  const connectTronLink = async () => {
    // Fallback to EVM if selected
    return connectEVM()
  }

  const disconnect = async () => {
    try {
      const provider = await getEVMWCProvider()
      if (provider && provider.session) {
        await provider.disconnect()
      }
    } catch (_) {}
    resetWCProvider()
    clearWallet()
  }

  return { address, isConnected, connectTronLink, connectWalletConnect, connectEVM, disconnect }
}
