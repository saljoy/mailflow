import React, { useState, useEffect } from 'react';
import { getCampaigns, getStats } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  statCard: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px' },
  statNum: { fontSize: '28px', fontWeight: '500', color: '#111', marginBottom: '2px' },
  statLabel: { fontSize: '12px', color: '#888' },
  statSub: { fontSize: '11px', color: '#3B6D11', marginTop: '4px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '14px' },
  campRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '13px' },
  campName: { flex: 1, color: '#111', fontWeight: '500' },
  metricBox: { textAlign: 'center', minWidth: '60px' },
  metricNum: { fontSize: '15px', fontWeight: '500', color: '#111' },
  metricLabel: { fontSize: '10px', color: '#888', marginTop: '1px' },
  bar: { height: '6px', borderRadius: '3px', background: '#f0f0ea', overflow: 'hidden', marginTop: '4px' },
  barFill: { height: '100%', borderRadius: '3px' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px' },
  pillRunning: { background: '#eaf3de', color: '#3B6D11' },
  pillPaused: { background: '#faeeda', color: '#854F0B' },
  pillDraft: { background: '#f0f0ea', color: '#666' },
  pillCompleted: { background: '#e6f1fb', color: '#185FA5' },
};

function RateBar({ value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <span style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{pct}%</span>
      <div style={s.bar}>
        <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);

  const load = async () => {
    try {
      const [c, st] = await Promise.all([getCampaigns(), getStats()]);
      setCampaigns(c.data);
      setStats(st.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((s, c) => s + (c.open_count || 0), 0);
  const totalReplies = campaigns.reduce((s, c) => s + (c.reply_count || 0), 0);
  const totalUnsubs = campaigns.reduce((s, c) => s + (c.unsubscribe_count || 0), 0);
  const totalBounces = campaigns.reduce((s, c) => s + (c.bounce_count || 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.failed_count || 0), 0);

  const overallOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
  const overallReplyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

  const getPillStyle = (status) => {
    if (status === 'running') return { ...s.pill, ...s.pillRunning };
    if (status === 'paused') return { ...s.pill, ...s.pillPaused };
    if (status === 'completed') return { ...s.pill, ...s.pillCompleted };
    return { ...s.pill, ...s.pillDraft };
  };

  return (
    <div>
      <div style={s.title}>Analytics</div>
      <div style={s.sub}>Performance overview across all campaigns</div>

      <div style={s.grid4}>
        <div style={s.statCard}>
          <div style={s.statNum}>{totalSent.toLocaleString()}</div>
          <div style={s.statLabel}>Total sent</div>
          <div style={s.statSub}>+{stats?.today_sent || 0} today</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{overallOpenRate}%</div>
          <div style={s.statLabel}>Open rate</div>
          <div style={s.statSub}>{totalOpens.toLocaleString()} opens</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{overallReplyRate}%</div>
          <div style={s.statLabel}>Reply rate</div>
          <div style={s.statSub}>{totalReplies.toLocaleString()} replies</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{totalUnsubs.toLocaleString()}</div>
          <div style={s.statLabel}>Unsubscribes</div>
          <div style={s.statSub}>{totalBounces} bounces</div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Campaign performance</div>
        {campaigns.length === 0 && (
          <div style={{ fontSize: '13px', color: '#888', padding: '20px 0' }}>No campaigns yet.</div>
        )}
        {campaigns.map(c => (
          <div key={c.id} style={s.campRow}>
            <div style={{ flex: 2, minWidth: '140px' }}>
              <div style={s.campName}>{c.name}</div>
              <span style={getPillStyle(c.status)}>{c.status}</span>
            </div>
            <div style={s.metricBox}>
              <div style={s.metricNum}>{c.sent_count || 0}</div>
              <div style={s.metricLabel}>Sent</div>
            </div>
            <div style={{ minWidth: '80px' }}>
              <div style={s.metricLabel}>Opens</div>
              <RateBar value={c.open_count || 0} total={c.sent_count || 0} color="#185FA5" />
            </div>
            <div style={{ minWidth: '80px' }}>
              <div style={s.metricLabel}>Replies</div>
              <RateBar value={c.reply_count || 0} total={c.sent_count || 0} color="#3B6D11" />
            </div>
            <div style={{ minWidth: '80px' }}>
              <div style={s.metricLabel}>Bounces</div>
              <RateBar value={c.bounce_count || 0} total={c.sent_count || 0} color="#854F0B" />
            </div>
            <div style={{ minWidth: '80px' }}>
              <div style={s.metricLabel}>Unsubs</div>
              <RateBar value={c.unsubscribe_count || 0} total={c.sent_count || 0} color="#A32D2D" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}