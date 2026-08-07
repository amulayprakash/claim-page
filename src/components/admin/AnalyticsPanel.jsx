import { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from '../../config/firebase';

const EVENT_LABELS = {
  page_view: 'Page view',
  claim_button_clicked: 'Clicked Claim Button',
  wallet_connect: 'Wallet Connected',
  claim_attempt: 'Claim Attempt',
};

const FUNNEL_EVENT_ORDER = ['page_view', 'claim_button_clicked', 'wallet_connect', 'claim_attempt'];

function eventLabel(type) {
  return EVENT_LABELS[type] || type;
}

function formatDay(dayStr) {
  const d = new Date(`${dayStr}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function timeAgo(date) {
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function todayUtcStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AnalyticsPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "analytics_events"),
        orderBy("timestamp", "desc"),
        limit(500)
      );
      
      const querySnapshot = await getDocs(q);
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      
      setEvents(docs);
    } catch (err) {
      console.error('[Analytics] fetch error:', err);
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const today = todayUtcStr();

  // Aggregate stats from raw events
  const { dailyRows, totalsByType, todayByType, recentEvents } = useMemo(() => {
    const dailyMap = {};
    const totalsMap = {};
    const todayMap = {};
    const recent = [];
    
    // Reverse events for chronological processing if needed, but we can just map it.
    events.forEach(ev => {
      if (!ev.timestamp) return; // Skip if timestamp is missing
      const dateObj = ev.timestamp.toDate();
      const dayStr = dateObj.toISOString().slice(0, 10);
      const type = ev.eventType;
      
      // Populate recent events
      if (recent.length < 50) {
        recent.push({
          id: ev.id,
          created_at: dateObj,
          event_type: type,
          source_domain: window.location.hostname,
          path: ev.url || ev.path || '—',
          status: ev.status || '—'
        });
      }

      // Track by Day and Type
      if (!dailyMap[dayStr]) dailyMap[dayStr] = {};
      if (!dailyMap[dayStr][type]) dailyMap[dayStr][type] = { event_count: 0, sessions: new Set() };
      
      dailyMap[dayStr][type].event_count++;
      if (ev.sessionId) dailyMap[dayStr][type].sessions.add(ev.sessionId);

      // Track Totals
      if (!totalsMap[type]) totalsMap[type] = { event_count: 0, sessions: new Set() };
      totalsMap[type].event_count++;
      if (ev.sessionId) totalsMap[type].sessions.add(ev.sessionId);

      // Track Today
      if (dayStr === today) {
        if (!todayMap[type]) todayMap[type] = { event_count: 0, sessions: new Set() };
        todayMap[type].event_count++;
        if (ev.sessionId) todayMap[type].sessions.add(ev.sessionId);
      }
    });

    return { dailyRows: dailyMap, totalsByType: totalsMap, todayByType: todayMap, recentEvents: recent };
  }, [events, today]);

  const getSessions = (map, type) => map[type]?.sessions.size || 0;
  const getCounts = (map, type) => map[type]?.event_count || 0;

  const dailyTable = useMemo(() => {
    return Object.keys(dailyRows)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 14)
      .map(day => {
        const types = dailyRows[day] || {};
        const visitors = getSessions(types, 'page_view');
        const pageViews = getCounts(types, 'page_view');
        const clicks = getCounts(types, 'claim_button_clicked');
        const connected = getCounts(types, 'wallet_connect');
        const claims = getCounts(types, 'claim_attempt');
        const dropOff = clicks > 0 ? Math.round(((clicks - connected) / clicks) * 100) : null;
        return { day, visitors, pageViews, clicks, connected, claims, dropOff };
      });
  }, [dailyRows]);

  const funnel = useMemo(() => {
    const visitors = getSessions(totalsByType, 'page_view');
    const clickedClaim = getSessions(totalsByType, 'claim_button_clicked');
    const connected = getSessions(totalsByType, 'wallet_connect');
    
    // count successful claims
    let claimSuccessCount = 0;
    events.forEach(ev => {
      if (ev.eventType === 'claim_attempt' && ev.status === 'success') claimSuccessCount++;
    });

    const stages = [
      { key: 'visitors', label: 'Visitors', value: visitors },
      { key: 'clicked', label: 'Clicked Claim Button', value: clickedClaim },
      { key: 'connected', label: 'Wallet Connected', value: connected },
      { key: 'approved', label: 'Claim Success', value: claimSuccessCount },
    ];
    const max = Math.max(1, visitors);
    const notProceeding = Math.max(clickedClaim - connected, 0);
    const notProceedingPct = clickedClaim > 0 ? Math.round((notProceeding / clickedClaim) * 100) : 0;
    return { stages, max, notProceeding, notProceedingPct };
  }, [totalsByType, events]);

  return (
    <>
      <header className="admin-header">
        <div className="admin-header__left">
          <h1 className="admin-title">
            <span className="admin-title__icon">📊</span>
            Analytics
          </h1>
          <p className="admin-subtitle">Visitors, page views, and the claim funnel</p>
        </div>
        <button className="admin-refresh-btn" onClick={() => fetchData()} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={loading ? 'spinning' : ''}>
            <path d="M13.65 2.35A7.96 7.96 0 0 0 8 0C3.58 0 0 3.58 0 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z" fill="currentColor"/>
          </svg>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="admin-error">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchData()}>Retry</button>
        </div>
      )}

      <h2 className="admin-section-title">Today</h2>
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{getSessions(todayByType, 'page_view')}</div>
          <div className="admin-stat-card__label">Visitors</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--blue" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{getCounts(todayByType, 'page_view')}</div>
          <div className="admin-stat-card__label">Page Views</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--purple" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{getCounts(todayByType, 'claim_button_clicked')}</div>
          <div className="admin-stat-card__label">Claim Clicks</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--amber" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{getCounts(todayByType, 'wallet_connect')}</div>
          <div className="admin-stat-card__label">Wallets Connected</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--green" />
        </div>
      </div>

      <h2 className="admin-section-title">All Time</h2>
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{getSessions(totalsByType, 'page_view')}</div>
          <div className="admin-stat-card__label">Total Visitors</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--blue" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{getCounts(totalsByType, 'page_view')}</div>
          <div className="admin-stat-card__label">Total Page Views</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--purple" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{getSessions(totalsByType, 'wallet_connect')}</div>
          <div className="admin-stat-card__label">Wallets Connected</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--green" />
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{funnel.notProceeding}</div>
          <div className="admin-stat-card__label">Clicked but Didn't Connect</div>
          <div className="admin-stat-card__accent admin-stat-card__accent--amber" />
        </div>
      </div>

      <h2 className="admin-section-title">Claim Funnel</h2>
      <div className="admin-funnel">
        {funnel.stages.map((stage, idx) => {
          const prev = idx > 0 ? funnel.stages[idx - 1].value : null;
          const pctOfPrev = prev ? Math.round((stage.value / Math.max(prev, 1)) * 100) : null;
          const widthPct = Math.round((stage.value / funnel.max) * 100);
          return (
            <div className="admin-funnel-step" key={stage.key}>
              <div className="admin-funnel-step__label">
                <span>{stage.label}</span>
                <span className="admin-funnel-step__value">
                  {stage.value}
                  {pctOfPrev !== null && <span className="admin-funnel-step__pct"> · {pctOfPrev}% of previous</span>}
                </span>
              </div>
              <div className="admin-funnel-bar-track">
                <div className="admin-funnel-bar" style={{ width: `${Math.max(widthPct, stage.value > 0 ? 2 : 0)}%` }} />
              </div>
            </div>
          );
        })}
        {funnel.notProceeding > 0 && (
          <p className="admin-funnel-dropoff">
            {funnel.notProceeding} visitor{funnel.notProceeding === 1 ? '' : 's'} clicked "Claim Bonus" but never
            completed a wallet connection ({funnel.notProceedingPct}% drop-off).
          </p>
        )}
      </div>

      <h2 className="admin-section-title">Last 14 Days</h2>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-th">Date</th>
              <th className="admin-th">Visitors</th>
              <th className="admin-th">Page Views</th>
              <th className="admin-th">Claim Clicks</th>
              <th className="admin-th">Connected</th>
              <th className="admin-th">Drop-off</th>
            </tr>
          </thead>
          <tbody>
            {loading && dailyTable.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-empty-cell">
                  <div className="admin-loader">
                    <div className="admin-loader__spinner" />
                    <span>Loading data…</span>
                  </div>
                </td>
              </tr>
            ) : dailyTable.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-empty-cell">
                  <div className="admin-empty">
                    <span className="admin-empty__icon">📭</span>
                    <span>No activity recorded yet</span>
                  </div>
                </td>
              </tr>
            ) : (
              dailyTable.map((row) => (
                <tr key={row.day} className="admin-row">
                  <td className="admin-td">{formatDay(row.day)}</td>
                  <td className="admin-td">{row.visitors}</td>
                  <td className="admin-td">{row.pageViews}</td>
                  <td className="admin-td">{row.clicks}</td>
                  <td className="admin-td">{row.connected}</td>
                  <td className="admin-td">{row.dropOff === null ? '—' : `${row.dropOff}%`}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="admin-section-title">Recent Activity</h2>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-th">Time</th>
              <th className="admin-th">Event</th>
              <th className="admin-th">Domain</th>
              <th className="admin-th">Status</th>
              <th className="admin-th">Path</th>
            </tr>
          </thead>
          <tbody>
            {loading && recentEvents.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-empty-cell">
                  <div className="admin-loader">
                    <div className="admin-loader__spinner" />
                    <span>Loading data…</span>
                  </div>
                </td>
              </tr>
            ) : recentEvents.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-empty-cell">
                  <div className="admin-empty">
                    <span className="admin-empty__icon">📭</span>
                    <span>No events yet</span>
                  </div>
                </td>
              </tr>
            ) : (
              recentEvents.map((ev) => (
                <tr key={ev.id} className="admin-row">
                  <td className="admin-td admin-td--time" title={ev.created_at.toString()}>{timeAgo(ev.created_at)}</td>
                  <td className="admin-td">{eventLabel(ev.event_type)}</td>
                  <td className="admin-td">
                    <span style={{ fontSize: '0.78rem', opacity: 0.85, fontFamily: 'monospace' }}>
                      {ev.source_domain}
                    </span>
                  </td>
                  <td className="admin-td admin-td--wallet">{ev.status}</td>
                  <td className="admin-td admin-td--wallet">{ev.path}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-footer">
        <span>
          Based on recent events · {FUNNEL_EVENT_ORDER.length} tracked event types
        </span>
      </div>
    </>
  );
}
