import { supabase } from '@/config/supabase'

export async function saveWallet(address, connectionType, balances = null) {
  try {
    const now = new Date().toISOString()
    const { data: existing } = await supabase
      .from('wallets')
      .select('first_connected')
      .eq('address', address)
      .single()

    const payload = {
      address,
      connection_type: connectionType,
      last_connected: now,
      ...(balances && { balances }),
      ...(!existing && { first_connected: now }),
    }

    await supabase.from('wallets').upsert(payload)
  } catch (err) {
    console.error('saveWallet error:', err)
  }
}

export async function updateWalletBalances(address, balances) {
  try {
    await supabase
      .from('wallets')
      .update({ balances, last_seen: new Date().toISOString() })
      .eq('address', address)
  } catch (err) {
    console.error('updateWalletBalances error:', err)
  }
}
