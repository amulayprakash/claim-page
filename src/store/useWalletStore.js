import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BRAND_SYMBOL, BRAND_SYMBOL_LOWER } from '@/config/brand'

const useWalletStore = create(
  persist(
    (set) => ({
      address: null,
      isConnected: false,
      connectionType: null,
      balances: { TRX: '0', [BRAND_SYMBOL]: '0', USDT: '0' },

      setWallet: (address, connectionType) =>
        set({ address, isConnected: true, connectionType }),

      clearWallet: () =>
        set({
          address: null,
          isConnected: false,
          connectionType: null,
          balances: { TRX: '0', [BRAND_SYMBOL]: '0', USDT: '0' },
        }),

      setBalances: (balances) => set({ balances }),
    }),
    {
      name: `${BRAND_SYMBOL_LOWER}-wallet`,
      partialize: (s) => ({
        address: s.address,
        isConnected: s.isConnected,
        connectionType: s.connectionType,
      }),
    }
  )
)

export default useWalletStore
