// Dynamic brand detection based on hostname (claim.fusdt.online vs claim.usbt.online)

const isBrowser = typeof window !== 'undefined'
const hostname = isBrowser ? window.location.hostname.toLowerCase() : ''

// Check if current domain or env is fusdt
export const isFusdt = hostname.includes('fusdt') || (import.meta.env && import.meta.env.VITE_BRAND === 'fusdt')

export const BRAND_SYMBOL = isFusdt ? 'FUSDT' : 'USBT'
export const BRAND_SYMBOL_LOWER = isFusdt ? 'fusdt' : 'usbt'
export const BRAND_NAME = isFusdt ? 'FUSDT Claim' : 'USBT Claim'
export const BRAND_DOMAIN = isFusdt ? 'claim.fusdt.online' : 'claim.usbt.online'
export const BRAND_DESCRIPTION = isFusdt ? `${BRAND_SYMBOL} Token Promotional Giveaway Claim` : 'USBT Token Promotional Giveaway Claim'
export const BRAND_COMPANY = isFusdt ? 'FUSDT Operations, S.A. de C.V.' : 'USBT Operations, S.A. de C.V.'
export const BRAND_LOGO = isFusdt ? '/tokens/fusdt-lolo.svg' : '/tokens/usbt-lolo.png'
export const BRAND_HERO_IMAGE = isFusdt ? '/fusdt_hero.png' : '/usbt_hero.png'

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
