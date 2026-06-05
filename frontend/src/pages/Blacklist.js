import React, { useState, useEffect } from 'react';
import { getBlacklist, addToBlacklist, removeFromBlacklist, getUnsubscribes, removeUnsubscribe } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  label: { fontSize: '12px', color: '#666', marginBottom: '5px', marginTop: '8px' },
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer', marginTop: '10px' },
  row: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '13px' },
  rowLabel: { flex: 1, color: '#111' },
  rowSub: { fontSize: '11px', color: '#888' },
  delBtn: { fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  emptyBox: { fontSize: '13px', color: '#888', padding: '20px 0', textAlign: 'center' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', background: '#fcebeb', color: '#A32D2D' },
  pillDomain: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', background: '#faeeda', color: '#854F0B' },
};

export default function Blacklist() {
  const [blacklist, setBlacklist] = useState([]);
  const [unsubscribes, setUnsubscribes] = useState([]);
  const [form, setForm] = useState({ email: '', domain: '', reason: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const [b, u] = await Promise.all([getBlacklist(), getUnsubscribes()]);
      setBlacklist(b.data);
      setUnsubscribes(u.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 4000); };

  const handleAdd = async () => {
    if (!form.email && !form.domain) return showErr('Enter an email or domain');
    try {
      await addToBlacklist(form);
      showMsg('Added to blacklist');
      setForm({ email: '', domain: '', reason: '' });
      load();
    } catch (e) { showErr('Error adding to blacklist'); }
  };

  const handleRemove = async (id) => {
    try { await removeFromBlacklist(id); load(); } catch (e) { showErr('Error removing'); }
  };

  const handleRemoveUnsub = async (email) => {
    try { await removeUnsubscribe(email); load(); } catch (e) { showErr('Error removing'); }
  };

  return (
    <div>
      <div style={s.title}>Blacklist & Unsubscribes</div>
      <div style={s.sub}>Manage emails and domains that will never receive your emails</div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>Add to blacklist</div>
          <div style={s.label}>Email address (optional)</div>
          <input style={s.input} placeholder="e.g. spam@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <div style={s.label}>Domain (optional)</div>
          <input style={s.input} placeholder="e.g. example.com" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} />
          <div style={s.label}>Reason (optional)</div>
          <input style={s.input} placeholder="e.g. Competitor, spam report" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <button style={s.btnPrimary} onClick={handleAdd}>Add to blacklist</button>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>How it works</div>
          <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.8' }}>
            <p>• Blacklisted emails and domains are <strong>automatically skipped</strong> during sending</p>
            <p>• Block entire domains like <strong>competitor.com</strong> to skip all addresses at that company</p>
            <p>• Unsubscribes are automatically added when someone clicks the unsubscribe link in your email</p>
            <p>• Use personalization tags in emails: <strong>{'{{first_name}}'}</strong>, <strong>{'{{company}}'}</strong>, <strong>{'{{website}}'}</strong></p>
          </div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Blacklist ({blacklist.length})</div>
        {blacklist.length === 0 && <div style={s.emptyBox}>No blacklisted emails or domains yet.</div>}
        {blacklist.map(b => (
          <div key={b.id} style={s.row}>
            <div style={{ flex: 1 }}>
              <div style={s.rowLabel}>{b.email || b.domain}</div>
              {b.reason && <div style={s.rowSub}>{b.reason}</div>}
            </div>
            <span style={b.domain ? s.pillDomain : s.pill}>{b.domain ? 'Domain' : 'Email'}</span>
            <button style={s.delBtn} onClick={() => handleRemove(b.id)}>Remove</button>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Unsubscribes ({unsubscribes.length})</div>
        {unsubscribes.length === 0 && <div style={s.emptyBox}>No unsubscribes yet.</div>}
        {unsubscribes.map(u => (
          <div key={u.id} style={s.row}>
            <div style={s.rowLabel}>{u.email}</div>
            <div style={s.rowSub}>{new Date(u.created_at).toLocaleDateString()}</div>
            <button style={s.delBtn} onClick={() => handleRemoveUnsub(u.email)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}