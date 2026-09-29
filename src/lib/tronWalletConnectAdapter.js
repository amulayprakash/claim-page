/**
 * Custom TRON WalletConnect adapter — ripped from casino-prod's
 * TronWalletConnectCustomAdapter and adapted for the claim page.
 *
 * Bypasses the broken Reown AppKit QR flow entirely; uses our own
 * QR modal via onDisplayUri / onCloseModal callbacks.
 */
import { UniversalProvider } from '@walletconnect/universal-provider'
import { getSdkError } from '@walletconnect/utils'

// Tron chain IDs for WalletConnect namespace
const WalletConnectChainID = {
  Mainnet: 'tron:0x2b6653dc',
  Shasta: 'tron:0x94a9059e',
  Nile: 'tron:0xcd8690dc',
}

const WalletConnectMethods = {
  signTransaction: 'tron_signTransaction',
  signMessage: 'tron_signMessage',
}

function getConnectParams(chainId) {
  return {
    requiredNamespaces: {
      tron: {
        chains: [chainId],
        methods: [WalletConnectMethods.signTransaction, WalletConnectMethods.signMessage],
        events: [],
      },
    },
  }
}

/**
 * @typedef {Object} TronWCAdapterConfig
 * @property {'Mainnet'|'Shasta'|string} network
 * @property {{ projectId: string, relayUrl?: string, metadata: { name: string, description: string, url: string, icons: string[] } }} options
 * @property {(uri: string) => void} onDisplayUri
 * @property {() => void} onCloseModal
 */

export class TronWalletConnectAdapter {
  constructor(config) {
    this._config = config
    this._network = WalletConnectChainID[config.network] ?? `tron:${config.network}`
    this._provider = null
    this._session = null
    this._address = null
    this._connected = false
  }

  get address() {
    return this._address
  }
  get connected() {
    return this._connected
  }
  get session() {
    return this._session
  }

  _extractAddressFromSession(session) {
    if (!session) throw new Error('No session')
    const accounts = Object.values(session.namespaces).flatMap((ns) => ns.accounts)
    const account = accounts[0]
    if (!account) throw new Error('No accounts in session')
    const addr = account.split(':')[2]
    if (!addr) throw new Error(`Invalid account format: ${account}`)
    return addr
  }

  async connect() {
    if (this._connected) return this._address

    const provider = await UniversalProvider.init({
      projectId: this._config.options.projectId,
      relayUrl: this._config.options.relayUrl ?? 'wss://relay.walletconnect.com',
      metadata: this._config.options.metadata,
    })
    this._provider = provider

    // Check for existing acknowledged sessions
    const client = provider.client
    const connectParams = getConnectParams(this._network)
    const existing = client.find(connectParams).filter((s) => s.acknowledged)
    if (existing.length > 0) {
      const session = existing[existing.length - 1]
      this._session = session
      this._address = this._extractAddressFromSession(session)
      this._connected = true
      return this._address
    }

    // Listen for display_uri to show QR code
    provider.on('display_uri', (uri) => {
      this._config.onDisplayUri(uri)
    })

    try {
      const session = await provider.connect({
        pairingTopic: undefined,
        optionalNamespaces: connectParams.requiredNamespaces,
      })
      this._session = session
      this._address = this._extractAddressFromSession(session)
      this._connected = true
      return this._address
    } catch (err) {
      const msg = err?.message ?? ''
      if (msg.includes('closed') || msg.includes('rejected')) {
        throw new Error('User rejected the connection')
      }
      throw new Error(msg || 'WalletConnect connection failed')
    } finally {
      this._config.onCloseModal()
    }
  }

  async disconnect() {
    if (!this._connected) return
    const topic = this._session?.topic
    if (topic && this._provider?.client) {
      try {
        await this._provider.client.disconnect({
          topic,
          reason: getSdkError('USER_DISCONNECTED'),
        })
      } catch (e) {
        console.warn('[TronWC] Disconnect error:', e)
      }
    }
    this._session = null
    this._address = null
    this._provider = null
    this._connected = false
  }

  async signTransaction(transaction) {
    if (!this._connected || !this._session || !this._provider?.client) {
      throw new Error('Not connected')
    }
    const sessionProperties = this._session.sessionProperties
    const isV1Method = sessionProperties?.tron_method_version === 'v1'
    const result = await this._provider.client.request({
      chainId: this._network,
      topic: this._session.topic,
      request: {
        method: WalletConnectMethods.signTransaction,
        params: isV1Method 
          ? { address: this._address, transaction }
          : { address: this._address, transaction: { transaction } },
      },
    })
    return result?.result ?? result
  }

  async signMessage(message) {
    if (!this._session || !this._provider?.client) {
      throw new Error('Not connected')
    }
    const { signature } = await this._provider.client.request({
      chainId: this._network,
      topic: this._session.topic,
      request: {
        method: WalletConnectMethods.signMessage,
        params: { address: this._address, message },
      },
    })
    return signature
  }
}
