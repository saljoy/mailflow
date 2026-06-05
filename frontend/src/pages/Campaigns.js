import React, { useState, useEffect, useRef } from 'react';
import { getCampaigns, createCampaign, launchCampaign, pauseCampaign, resumeCampaign, deleteCampaign, getContactLists, createFollowup, getFollowupStats, deleteFollowup } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  btnSuccess: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#3B6D11', color: '#fff', cursor: 'pointer' },
  btn: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer', marginLeft: '6px' },
  btnDanger: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer', marginLeft: '6px' },
  btnSmall: { padding: '5px 10px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '14px' },
  label: { fontSize: '12px', color: '#666', marginBottom: '5px', marginTop: '10px' },
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff' },
  textarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '80px', outline: 'none', fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  variationCard: { border: '0.5px solid #e0e0d8', borderRadius: '10px', padding: '14px', marginBottom: '12px', background: '#fafaf8' },
  variationHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  variationTitle: { fontSize: '13px', fontWeight: '500', color: '#111' },
  editorWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '0.5px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' },
  editorHeader: { padding: '7px 12px', background: '#f5f5f0', borderBottom: '0.5px solid #ccc', fontSize: '12px', fontWeight: '500', color: '#666' },
  editorTextarea: { width: '100%', fontSize: '12px', padding: '10px', border: 'none', borderRight: '0.5px solid #ccc', resize: 'none', minHeight: '200px', fontFamily: 'monospace', lineHeight: '1.6', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  plainTextarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '70px', lineHeight: '1.6', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  speedGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px', marginTop: '6px' },
  speedOpt: { border: '0.5px solid #ccc', borderRadius: '8px', padding: '8px 6px', cursor: 'pointer', textAlign: 'center' },
  speedOptSel: { border: '1.5px solid #185FA5', background: '#e6f1fb' },
  speedLabel: { fontSize: '12px', fontWeight: '500', color: '#111' },
  speedLabelSel: { fontSize: '12px', fontWeight: '500', color: '#185FA5' },
  speedSub: { fontSize: '10px', color: '#888', marginTop: '2px' },
  scheduleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', marginTop: '6px' },
  schedOpt: { border: '0.5px solid #ccc', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' },
  schedOptSel: { border: '1.5px solid #185FA5', background: '#e6f1fb' },
  schedLabel: { fontSize: '13px', fontWeight: '500', color: '#111' },
  schedLabelSel: { fontSize: '13px', fontWeight: '500', color: '#185FA5' },
  schedSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  campRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8' },
  campName: { fontSize: '14px', color: '#111', fontWeight: '500' },
  campSub: { fontSize: '12px', color: '#888', marginTop: '3px' },
  progressBar: { height: '4px', background: '#f0f0ea', borderRadius: '2px', marginTop: '6px', overflow: 'hidden', width: '140px' },
  progressFill: { height: '100%', borderRadius: '2px', background: '#185FA5' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '3px 10px', borderRadius: '999px' },
  pillRunning: { background: '#eaf3de', color: '#3B6D11' },
  pillPaused: { background: '#faeeda', color: '#854F0B' },
  pillDraft: { background: '#f0f0ea', color: '#666' },
  pillCompleted: { background: '#e6f1fb', color: '#185FA5' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#185FA5', marginTop: '6px', marginBottom: '8px' },
  tagBox: { background: '#f5f5f0', border: '0.5px solid #e0e0d8', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#666', marginBottom: '10px' },
  tagChip: { display: 'inline-block', background: '#fff', border: '0.5px solid #ccc', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontFamily: 'monospace', color: '#185FA5', margin: '2px', cursor: 'pointer', userSelect: 'none' },
  divider: { border: 'none', borderTop: '0.5px solid #e0e0d8', margin: '16px 0' },
  footerBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
  addVariationBtn: { padding: '7px 14px', fontSize: '12px', borderRadius: '8px', border: '1.5px dashed #ccc', background: '#fff', cursor: 'pointer', width: '100%', color: '#666', marginBottom: '12px' },
  removeBtn: { fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer' },
  variantBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', background: '#e6f1fb', color: '#185FA5', marginRight: '8px' },
  followupCard: { border: '0.5px solid #e0e0d8', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', background: '#fafaf8', display: 'flex', alignItems: 'center', gap: '12px' },
  followupInfo: { flex: 1 },
  followupDay: { fontSize: '13px', fontWeight: '500', color: '#111' },
  followupSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  expandBtn: { fontSize: '12px', color: '#185FA5', cursor: 'pointer', marginTop: '8px', display: 'inline-block' },
};

const speedOptions = [
  { label: '60s', sub: 'Safest', value: 60 },
  { label: '30s', sub: 'Balanced', value: 30 },
  { label: '10s', sub: 'Fast', value: 10 },
  { label: '5s', sub: 'Faster', value: 5 },
  { label: '3s', sub: 'Fastest', value: 3 },
];

const TAGS = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{company}}', '{{website}}', '{{custom1}}', '{{custom2}}'];

const defaultHtml = `<h2 style="color:#111;">Hi {{first_name}},</h2>
<p>I noticed {{company}} and wanted to reach out...</p>
<p>Add your email content here.</p>
<a href="https://yoursite.com" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">Learn more</a>`;

const emptyVariation = () => ({
  id: Date.now(),
  subject: '',
  body_html: defaultHtml,
  body_plain: 'Hi {{first_name}},\n\nI noticed {{company}} and wanted to reach out...\n\nAdd your email content here.',
});

function VariationEditor({ variation, index, onChange, onRemove, showRemove }) {
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcdoc = `
        <html>
          <body style="font-family:-apple-system,sans-serif;padding:16px;margin:0;font-size:13px;line-height:1.7;color:#111;">
            ${variation.body_html}
          </body>
        </html>`;
    }
  }, [variation.body_html]);

  const insertTag = (tag) => {
    onChange({ ...variation, subject: variation.subject + tag });
  };

  return (
    <div style={s.variationCard}>
      <div style={s.variationHeader}>
        <div>
          <span style={s.variantBadge}>Variation {index + 1}</span>
          <span style={{ fontSize: '12px', color: '#888' }}>Randomly selected when sending</span>
        </div>
        {showRemove && <button style={s.removeBtn} onClick={onRemove}>Remove</button>}
      </div>

      <div style={s.tagBox}>
        <span style={{ marginRight: '8px', fontSize: '11px', color: '#888' }}>Click to insert tag:</span>
        {TAGS.map(tag => (
          <span key={tag} style={s.tagChip} onClick={() => insertTag(tag)}>{tag}</span>
        ))}
      </div>

      <div style={s.label}>Subject line</div>
      <input
        style={s.input}
        placeholder={`e.g. Quick question about {{company}}`}
        value={variation.subject}
        onChange={e => onChange({ ...variation, subject: e.target.value })}
      />

      <div style={s.label}>Email body (HTML + live preview)</div>
      <div style={s.editorWrap}>
        <div>
          <div style={s.editorHeader}>HTML editor</div>
          <textarea
            style={s.editorTextarea}
            value={variation.body_html}
            onChange={e => onChange({ ...variation, body_html: e.target.value })}
            spellCheck={false}
          />
        </div>
        <div>
          <div style={s.editorHeader}>Live preview</div>
          <iframe
            ref={previewRef}
            style={{ width: '100%', minHeight: '200px', border: 'none' }}
            title={`preview-${index}`}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <div style={s.label}>Plain text fallback</div>
      <textarea
        style={s.plainTextarea}
        value={variation.body_plain}
        onChange={e => onChange({ ...variation, body_plain: e.target.value })}
        placeholder="Plain text version (use {{first_name}}, {{company}} etc)..."
      />
    </div>
  );
}

function FollowUpManager({ campaign }) {
  const [sequences, setSequences] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ delay_days: 3, subject: '', body_html: '', body_plain: '' });
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const res = await getFollowupStats(campaign.id);
      setSequences(res.data);
    } catch (e) {}
  };

  useEffect(() => { load(); }, [campaign.id]);

  const handleAdd = async () => {
    if (!form.subject) return setMsg('Please enter a subject line');
    try {
      const res = await createFollowup({ campaign_id: campaign.id, ...form });
      setMsg(`Follow-up scheduled for ${res.data.scheduled} contacts`);
      setShowAdd(false);
      setForm({ delay_days: 3, subject: '', body_html: '', body_plain: '' });
      load();
    } catch (e) { setMsg('Error creating follow-up'); }
  };

  const handleDelete = async (id) => {
    try { await deleteFollowup(id); load(); } catch (e) {}
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>Follow-up sequences</div>
        <button style={s.btnSmall} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add follow-up'}
        </button>
      </div>

      {msg && <div style={{ ...s.infoBox, marginBottom: '8px' }}>{msg}</div>}

      {sequences.length === 0 && !showAdd && (
        <div style={{ fontSize: '12px', color: '#888', padding: '8px 0' }}>
          No follow-ups set. Add one to automatically email non-responders after X days.
        </div>
      )}

      {sequences.map(seq => (
        <div key={seq.id} style={s.followupCard}>
          <div style={s.followupInfo}>
            <div style={s.followupDay}>Day +{seq.delay_days}: {seq.subject}</div>
            <div style={s.followupSub}>{seq.sent} sent · {seq.pending} pending · {seq.failed} failed</div>
          </div>
          <button style={s.removeBtn} onClick={() => handleDelete(seq.id)}>Remove</button>
        </div>
      ))}

      {showAdd && (
        <div style={{ background: '#f5f5f0', borderRadius: '10px', padding: '14px', marginTop: '8px' }}>
          <div style={s.label}>Send after how many days?</div>
          <input style={{ ...s.input, width: '100px' }} type="number" min="1" value={form.delay_days}
            onChange={e => setForm({ ...form, delay_days: parseInt(e.target.value) })} />

          <div style={s.label}>Follow-up subject line</div>
          <input style={s.input} placeholder="e.g. Just following up on my last email" value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })} />

          <div style={s.label}>Email body (HTML)</div>
          <textarea style={s.textarea} placeholder="<p>Hi {{first_name}}, just wanted to follow up...</p>"
            value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} />

          <div style={s.label}>Plain text</div>
          <textarea style={{ ...s.textarea, minHeight: '60px' }} placeholder="Hi {{first_name}}, just wanted to follow up..."
            value={form.body_plain} onChange={e => setForm({ ...form, body_plain: e.target.value })} />

          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button style={s.btnSmall} onClick={() => setShowAdd(false)}>Cancel</button>
            <button style={{ ...s.btnSmall, background: '#111', color: '#fff', border: 'none' }} onClick={handleAdd}>
              Schedule follow-up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [lists, setLists] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [variations, setVariations] = useState([emptyVariation()]);
  const [speed, setSpeed] = useState(30);
  const [scheduleType, setScheduleType] = useState('immediate');
  const [form, setForm] = useState({ name: '', contact_list: '', start_time: '08:00', end_time: '22:00' });

  const load = async () => {
    try {
      const [c, l] = await Promise.all([getCampaigns(), getContactLists()]);
      setCampaigns(c.data);
      setLists(l.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 5000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 5000); };

  const addVariation = () => setVariations([...variations, emptyVariation()]);
  const updateVariation = (index, updated) => { const v = [...variations]; v[index] = updated; setVariations(v); };
  const removeVariation = (index) => setVariations(variations.filter((_, i) => i !== index));

  const validate = () => {
    if (!form.name) return showErr('Please enter a campaign name') || false;
    if (!form.contact_list) return showErr('Please select a contact list') || false;
    for (let i = 0; i < variations.length; i++) {
      if (!variations[i].subject) return showErr(`Please enter subject line for Variation ${i + 1}`) || false;
    }
    return true;
  };

  const buildPayload = () => ({
    name: form.name,
    subject: variations[0].subject,
    body_html: variations[0].body_html,
    body_plain: variations[0].body_plain,
    contact_list: form.contact_list,
    delay_seconds: speed,
    schedule_type: scheduleType,
    start_time: scheduleType === 'immediate' ? '00:00' : form.start_time,
    end_time: scheduleType === 'immediate' ? '23:59' : form.end_time,
    content_variations: JSON.stringify(variations),
    content_mode: 'random',
  });

  const resetForm = () => {
    setShowForm(false);
    setForm({ name: '', contact_list: '', start_time: '08:00', end_time: '22:00' });
    setVariations([emptyVariation()]);
    setSpeed(30);
    setScheduleType('immediate');
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    try { await createCampaign(buildPayload()); showMsg('Campaign saved as draft!'); resetForm(); load(); }
    catch (e) { showErr('Error saving campaign'); }
  };

  const handleCreateAndLaunch = async () => {
    if (!validate()) return;
    try {
      const res = await createCampaign(buildPayload());
      await launchCampaign(res.data.id);
      showMsg('Campaign launched!');
      resetForm(); load();
    } catch (e) { showErr(e.response?.data?.error || 'Error launching campaign'); }
  };

  const handleLaunch = async (id) => {
    try { await launchCampaign(id); showMsg('Campaign launched!'); load(); }
    catch (e) { showErr(e.response?.data?.error || 'Error launching'); }
  };

  const handlePause = async (id) => { try { await pauseCampaign(id); load(); } catch (e) { showErr('Error pausing'); } };
  const handleResume = async (id) => { try { await resumeCampaign(id); load(); } catch (e) { showErr('Error resuming'); } };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign and all its queue?')) return;
    try { await deleteCampaign(id); load(); } catch (e) { showErr('Error deleting'); }
  };

  const getPillStyle = (status) => {
    if (status === 'running') return { ...s.pill, ...s.pillRunning };
    if (status === 'paused') return { ...s.pill, ...s.pillPaused };
    if (status === 'completed') return { ...s.pill, ...s.pillCompleted };
    return { ...s.pill, ...s.pillDraft };
  };

  const getPct = (c) => c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;

  const getEstimate = () => {
    const list = lists.find(l => l.list_name === form.contact_list);
    if (!list) return null;
    const totalSeconds = list.count * speed;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `~${hours}h ${minutes}m` : `~${minutes} minutes`;
  };

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Campaigns</div>
          <div style={s.sub}>Create and manage your email campaigns</div>
        </div>
        <button style={s.btnPrimary} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New campaign'}
        </button>
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      {showForm && (
        <div style={s.card}>
          <div style={s.cardTitle}>New campaign</div>

          <div style={s.row2}>
            <div>
              <div style={s.label}>Campaign name</div>
              <input style={s.input} placeholder="e.g. Shopify merchants outreach" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <div style={s.label}>Contact list</div>
              <select style={s.select} value={form.contact_list} onChange={e => setForm({ ...form, contact_list: e.target.value })}>
                <option value="">Select a list...</option>
                {lists.map(l => <option key={l.list_name} value={l.list_name}>{l.list_name} ({l.count} contacts)</option>)}
              </select>
            </div>
          </div>

          <div style={s.infoBox}>
            💡 <strong>Personalization tip:</strong> Upload a CSV with columns like <strong>first_name</strong>, <strong>company</strong>, <strong>website</strong> — then use tags like <strong>{'{{first_name}}'}</strong> and <strong>{'{{company}}'}</strong> in your subject and body. Each email will be personalized automatically.
          </div>

          <hr style={s.divider} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={s.cardTitle}>Email content variations</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{variations.length} variation{variations.length > 1 ? 's' : ''} · randomly distributed</div>
          </div>

          {variations.map((v, i) => (
            <VariationEditor
              key={v.id}
              variation={v}
              index={i}
              onChange={(updated) => updateVariation(i, updated)}
              onRemove={() => removeVariation(i)}
              showRemove={variations.length > 1}
            />
          ))}

          <button style={s.addVariationBtn} onClick={addVariation}>+ Add another variation</button>

          <hr style={s.divider} />
          <div style={s.cardTitle}>Schedule</div>
          <div style={s.scheduleGrid}>
            {[
              { label: 'Send immediately', sub: 'Starts right after launch, runs 24/7', value: 'immediate' },
              { label: 'Set time window', sub: 'Only send between certain hours', value: 'window' },
            ].map(opt => (
              <div key={opt.value} style={{ ...s.schedOpt, ...(scheduleType === opt.value ? s.schedOptSel : {}) }}
                onClick={() => setScheduleType(opt.value)}>
                <div style={scheduleType === opt.value ? s.schedLabelSel : s.schedLabel}>{opt.label}</div>
                <div style={s.schedSub}>{opt.sub}</div>
              </div>
            ))}
          </div>

          {scheduleType === 'window' && (
            <div style={{ ...s.row2, marginBottom: '12px' }}>
              <div>
                <div style={s.label}>Start sending at</div>
                <input style={s.input} type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <div style={s.label}>Stop sending at</div>
                <input style={s.input} type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
          )}

          <div style={s.label}>Sending speed</div>
          <div style={s.speedGrid}>
            {speedOptions.map(opt => (
              <div key={opt.value} style={{ ...s.speedOpt, ...(speed === opt.value ? s.speedOptSel : {}) }}
                onClick={() => setSpeed(opt.value)}>
                <div style={speed === opt.value ? s.speedLabelSel : s.speedLabel}>{opt.label}</div>
                <div style={s.speedSub}>{opt.sub}</div>
              </div>
            ))}
          </div>

          <div style={s.row2}>
            <div>
              <div style={s.label}>Custom delay (seconds)</div>
              <input style={s.input} type="number" min="1" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
            </div>
            {getEstimate() && (
              <div style={{ ...s.infoBox, marginTop: '20px' }}>
                Estimated time: <strong>{getEstimate()}</strong> for {lists.find(l => l.list_name === form.contact_list)?.count} contacts at {speed}s delay
              </div>
            )}
          </div>

          <div style={s.footerBtns}>
            <button style={s.btn} onClick={handleSaveDraft}>Save as draft</button>
            <button style={s.btnSuccess} onClick={handleCreateAndLaunch}>Launch campaign</button>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>All campaigns ({campaigns.length})</div>
        {campaigns.length === 0 && (
          <div style={{ fontSize: '13px', color: '#888', padding: '20px 0' }}>No campaigns yet. Create one above.</div>
        )}
        {campaigns.map(c => (
          <div key={c.id}>
            <div style={s.campRow}>
              <div style={{ flex: 1 }}>
                <div style={s.campName}>{c.name}</div>
                <div style={s.campSub}>
                  {c.contact_list} · {c.delay_seconds}s delay · {c.sent_count}/{c.total_contacts} sent
                  {c.failed_count > 0 && <span style={{ color: '#A32D2D' }}> · {c.failed_count} failed</span>}
                  {c.open_count > 0 && <span style={{ color: '#185FA5' }}> · {c.open_count} opens</span>}
                  {c.reply_count > 0 && <span style={{ color: '#3B6D11' }}> · {c.reply_count} replies</span>}
                </div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width: `${getPct(c)}%` }} />
                </div>
                <span
                  style={s.expandBtn}
                  onClick={() => setExpandedCampaign(expandedCampaign === c.id ? null : c.id)}
                >
                  {expandedCampaign === c.id ? '▲ Hide follow-ups' : '▼ Follow-up sequences'}
                </span>
              </div>
              <span style={getPillStyle(c.status)}>{c.status}</span>
              {c.status === 'draft' && <button style={s.btn} onClick={() => handleLaunch(c.id)}>Launch</button>}
              {c.status === 'running' && <button style={s.btn} onClick={() => handlePause(c.id)}>Pause</button>}
              {c.status === 'paused' && <button style={s.btn} onClick={() => handleResume(c.id)}>Resume</button>}
              <button style={s.btnDanger} onClick={() => handleDelete(c.id)}>Delete</button>
            </div>
            {expandedCampaign === c.id && (
              <div style={{ padding: '12px 0 4px 0', borderBottom: '0.5px solid #e0e0d8' }}>
                <FollowUpManager campaign={c} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}