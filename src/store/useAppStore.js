import { create } from 'zustand'
import { BRAND_SYMBOL } from '@/config/brand'

const useAppStore = create((set) => ({
  slippage: 2,
  swapFromToken: BRAND_SYMBOL,
  swapToToken: 'USDT',
  modals: {
    walletConnect: false,
    tokenSelector: false,
    slippage: false,
    sendConfirm: false,
    swapConfirm: false,
  },

  setSlippage: (slippage) => set({ slippage }),
  setSwapPair: (from, to) => set({ swapFromToken: from, swapToToken: to }),

  openModal: (name) =>
    set((s) => ({ modals: { ...s.modals, [name]: true } })),

  closeModal: (name) =>
    set((s) => ({ modals: { ...s.modals, [name]: false } })),

  closeAllModals: () =>
    set({
      modals: {
        walletConnect: false,
        tokenSelector: false,
        slippage: false,
        sendConfirm: false,
        swapConfirm: false,
      },
    }),
}))

export default useAppStore
