import { useState } from 'react';
import AnalyticsPanel from '../components/admin/AnalyticsPanel';
import './Admin.css';

const ADMIN_USER = 'john';
const ADMIN_PASS = 'Qspl@1234';

function LoginGate({ onAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      sessionStorage.setItem('adminAuth', '1');
      onAuth();
    } else {
      setErr('Invalid username or password.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-glow admin-glow--1" />
      <div className="admin-glow admin-glow--2" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 320 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', fontWeight: 700, textAlign: 'center' }}>🔒 Admin Login</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="admin-search"
            style={{ marginTop: 8 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="admin-search"
          />
          {err && <span style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>{err}</span>}
          <button type="submit" className="admin-refresh-btn" style={{ width: '100%', justifyContent: 'center' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('adminAuth') === '1');
  const [tab, setTab] = useState('analytics');

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;

  return (
    <div className="admin-page">
      {/* Background glow effects */}
      <div className="admin-glow admin-glow--1" />
      <div className="admin-glow admin-glow--2" />

      <div className="admin-container">
        <nav className="admin-tabs">
          <button
            className={`admin-tab${tab === 'analytics' ? ' admin-tab--active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            Analytics
          </button>
        </nav>

        {tab === 'analytics' && <AnalyticsPanel />}
      </div>
    </div>
  );
}
