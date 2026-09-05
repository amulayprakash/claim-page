// Dynamic brand detection based on hostname (claim.usdt.online vs claim.usbt.online)

const isBrowser = typeof window !== 'undefined'
const hostname = isBrowser ? window.location.hostname.toLowerCase() : ''

// Check if current domain or env is usdt (defaults to USDT unless domain is explicitly usbt)
export const isUsdt = !hostname.includes('usbt')
export const isFusdt = isUsdt

export const BRAND_SYMBOL = isUsdt ? 'USDT' : 'USBT'
export const BRAND_SYMBOL_LOWER = isUsdt ? 'usdt' : 'usbt'
export const BRAND_NAME = isUsdt ? 'USDT Claim' : 'USBT Claim'
export const BRAND_DOMAIN = isUsdt ? 'claim.usdt.online' : 'claim.usbt.online'
export const BRAND_DESCRIPTION = isUsdt ? `${BRAND_SYMBOL} Related Token Claim Reward` : 'USBT Related Token Claim Reward'
export const BRAND_COMPANY = isUsdt ? 'USDT Operations, S.A. de C.V.' : 'USBT Operations, S.A. de C.V.'
export const BRAND_LOGO = isUsdt ? '/tokens/fusdt-lolo.svg' : '/tokens/usbt-lolo.png'
export const BRAND_HERO_IMAGE = isUsdt ? '/usbt_hero.png' : '/usbt_hero.png'

export function getBrandConfig() {
  return {
    symbol: BRAND_SYMBOL,
    symbolLower: BRAND_SYMBOL_LOWER,
    name: BRAND_NAME,
    domain: BRAND_DOMAIN,
    description: BRAND_DESCRIPTION,
    company: BRAND_COMPANY,
    logo: BRAND_LOGO,
    heroImage: BRAND_HERO_IMAGE,
  }
}

