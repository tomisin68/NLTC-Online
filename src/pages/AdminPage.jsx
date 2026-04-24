import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, limit, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';
import { SkeletonTable, SkeletonStatCard } from '../components/ui/Skeleton';
import { formatDate, timeAgo } from '../contexts/AuthContext';
import '../styles/admin.css';
import '../styles/dashboard.css';

/* ── Admin Sidebar ── */
function AdminSidebar({ view, onNav, open, onClose }) {
  const { signOut, userData } = useAuth();
  return (
    <>
      <div className={`sb-overlay${open?' show':''}`} onClick={onClose} />
      <aside className={`sidebar${open?' open':''}`}>
        <div className="sb-logo"><img src="/NLTC.png" alt="NLTC" className="sb-logo-img" /></div>
        <div className="sb-user">
          <div className="sb-avatar" style={{ background:'linear-gradient(135deg,#F0A500,#FFBE33)' }}>A</div>
          <div>
            <div className="sb-user-name">{userData?.firstName} {userData?.lastName}</div>
            <span className="badge badge-gold" style={{ fontSize:'.62rem' }}>Admin Panel</span>
          </div>
        </div>
        <nav className="sb-nav">
          <div className="sb-sec">Overview</div>
          {[['overview','fas fa-chart-pie','Dashboard'],['analytics','fas fa-chart-line','Analytics']].map(([v,i,l]) => (
            <button key={v} className={`sb-link${view===v?' active':''}`} onClick={() => { onNav(v); onClose(); }}>
              <i className={i} />{l}
            </button>
          ))}
          <div className="sb-sec">Management</div>
          {[['students','fas fa-users','Students'],['videos','fas fa-film','Video Lessons'],['cbt','fas fa-laptop-code','CBT Manager'],['quicktests','fas fa-bolt','Quick Tests'],['mockexams','fas fa-file-alt','Mock Exams'],['centres','fas fa-school','Physical Centres'],['teachers','fas fa-chalkboard-teacher','Teachers']].map(([v,i,l]) => (
            <button key={v} className={`sb-link${view===v?' active':''}`} onClick={() => { onNav(v); onClose(); }}>
              <i className={i} />{l}
            </button>
          ))}
          <div className="sb-sec">Live &amp; Comms</div>
          {[['live','fas fa-signal','Live Classes'],['broadcasts','fas fa-bullhorn','Broadcasts'],['schedule','fas fa-calendar-alt','Schedule']].map(([v,i,l]) => (
            <button key={v} className={`sb-link${view===v?' active':''}`} onClick={() => { onNav(v); onClose(); }}>
              <i className={i} />{l}
            </button>
          ))}
          <div className="sb-sec">System</div>
          {[['revenue','fas fa-money-bill-wave','Revenue'],['settings','fas fa-cog','Settings']].map(([v,i,l]) => (
            <button key={v} className={`sb-link${view===v?' active':''}`} onClick={() => { onNav(v); onClose(); }}>
              <i className={i} />{l}
            </button>
          ))}
        </nav>
        <div className="sb-bottom">
          <button className="sb-logout" onClick={signOut}><i className="fas fa-sign-out-alt" /> Sign Out</button>
        </div>
      </aside>
    </>
  );
}

/* ── Overview ── */
function OverviewView() {
  const [stats, setStats] = useState({ total:0, pro:0, elite:0, free:0 });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db,'users'), orderBy('createdAt','desc'), limit(100)))
      .then(snap => {
        const users = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        const pro = users.filter(u => u.plan==='pro').length;
        const elite = users.filter(u => u.plan==='elite').length;
        setStats({ total:users.length, pro, elite, free:users.length-pro-elite });
        setStudents(users.slice(0,10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const revenue = stats.pro * 5000 + stats.elite * 10000;

  return (
    <div>
      <div className="page-hdr"><h2>Admin Overview</h2><p>Platform health at a glance.</p></div>
      <div className="stats-grid">
        <div className="stat-card s1"><div className="sc-icon blue"><i className="fas fa-users" /></div><div className="sc-num">{stats.total}</div><div className="sc-label">Total Students</div></div>
        <div className="stat-card s2"><div className="sc-icon gold"><i className="fas fa-fire" /></div><div className="sc-num">{stats.pro}</div><div className="sc-label">Pro Members</div></div>
        <div className="stat-card s3"><div className="sc-icon green"><i className="fas fa-star" /></div><div className="sc-num">{stats.elite}</div><div className="sc-label">Elite Members</div></div>
        <div className="stat-card s4"><div className="sc-icon teal"><i className="fas fa-naira-sign" /></div><div className="sc-num">₦{(revenue/1000).toFixed(0)}k</div><div className="sc-label">Est. Revenue</div></div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">👥 Recent Students</div></div>
        {loading ? <SkeletonTable rows={8} cols={5} /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Exam</th><th>Plan</th><th>Joined</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:700 }}>{s.firstName} {s.lastName}</td>
                    <td style={{ color:'var(--text-3)' }}>{s.email}</td>
                    <td><span className="badge badge-navy">{s.targetExam||'JAMB'}</span></td>
                    <td><span className={`plan-tag plan-${s.plan||'free'}`}>{s.plan||'free'}</span></td>
                    <td style={{ color:'var(--text-3)' }}>{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Students ── */
function StudentsView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  useEffect(() => {
    getDocs(query(collection(db,'users'), orderBy('createdAt','desc')))
      .then(snap => setStudents(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    (planFilter === 'all' || s.plan === planFilter) &&
    (`${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase()))
  );

  async function updatePlan(uid, plan) {
    try {
      await updateDoc(doc(db,'users',uid), { plan });
      setStudents(prev => prev.map(s => s.id===uid ? {...s,plan} : s));
      showToast(`Plan updated to ${plan}`, 'success');
    } catch { showToast('Update failed','error'); }
  }

  return (
    <div>
      <div className="page-hdr"><h2>Students</h2><p>{students.length} registered students</p></div>
      <div className="filter-bar">
        <div className="filter-input-wrap" style={{ flex:1 }}>
          <i className="fas fa-search" />
          <input className="filter-input" placeholder="Search students…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={planFilter} onChange={e=>setPlanFilter(e.target.value)}>
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
      </div>
      <div className="card">
        {loading ? <SkeletonTable rows={10} cols={6} /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>State</th><th>Plan</th><th>XP</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:700 }}>{s.firstName} {s.lastName}</td>
                    <td style={{ color:'var(--text-3)', fontSize:'.78rem' }}>{s.email}</td>
                    <td style={{ color:'var(--text-3)' }}>{s.state||'—'}</td>
                    <td><span className={`plan-tag plan-${s.plan||'free'}`}>{s.plan||'free'}</span></td>
                    <td style={{ fontWeight:700, color:'var(--gold)' }}>{(s.xp||0).toLocaleString()}</td>
                    <td>
                      <select value={s.plan||'free'} onChange={e=>updatePlan(s.id,e.target.value)}
                        style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border-2)', fontSize:'.74rem', cursor:'pointer' }}>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="elite">Elite</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Broadcasts ── */
function BroadcastsView() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title:'', body:'', category:'General' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db,'announcements'), orderBy('createdAt','desc'), limit(30)))
      .then(snap => setBroadcasts(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setBroadcasts([]))
      .finally(() => setLoading(false));
  }, []);

  async function sendBroadcast(e) {
    e.preventDefault();
    if (!form.title || !form.body) { showToast('Fill all fields','error'); return; }
    setSending(true);
    try {
      const ref = await addDoc(collection(db,'announcements'), { ...form, createdAt:serverTimestamp() });
      setBroadcasts(prev => [{ id:ref.id, ...form, createdAt:{ seconds:Date.now()/1000 } }, ...prev]);
      setForm({ title:'', body:'', category:'General' });
      setModalOpen(false);
      showToast('Broadcast sent!', 'success');
    } catch { showToast('Send failed','error'); }
    setSending(false);
  }

  return (
    <div>
      <div className="page-hdr" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><h2>Broadcasts</h2><p>Send announcements to all students.</p></div>
        <button className="btn-gold" onClick={() => setModalOpen(true)}><i className="fas fa-plus" /> New Broadcast</button>
      </div>
      <div className="card">
        {loading ? <SkeletonTable rows={5} cols={3} /> : broadcasts.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📢</div><h3>No broadcasts yet</h3></div>
        ) : (
          <div>
            {broadcasts.map(b => (
              <div key={b.id} className="annc-item">
                <div className="annc-icon">📢</div>
                <div style={{ flex:1 }}>
                  <div className="annc-header"><div className="annc-title">{b.title}</div>
                    {b.category && <span className="badge badge-navy">{b.category}</span>}
                  </div>
                  <div className="annc-text">{b.body}</div>
                  <div className="annc-time">{timeAgo(b.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Broadcast">
        <form onSubmit={sendBroadcast}>
          <div className="form-group"><label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Announcement title" required />
          </div>
          <div className="form-group"><label className="form-label">Message</label>
            <textarea className="form-input" rows={4} value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} placeholder="Message body…" style={{ resize:'vertical' }} required />
          </div>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
              {['JAMB','WAEC','NECO','General','Platform Update'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn-outline" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex:2, justifyContent:'center' }} disabled={sending}>
              {sending ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-paper-plane" /> Send Broadcast</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── Live Classes (admin) ── */
function LiveView() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title:'', subject:'', channel:'' });
  const [saving, setSaving] = useState(false);
  const { currentUser, userData } = useAuth();

  useEffect(() => {
    getDocs(query(collection(db,'liveSessions'), orderBy('createdAt','desc'), limit(20)))
      .then(snap => setSessions(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  async function createSession(e) {
    e.preventDefault();
    if (!form.title || !form.subject || !form.channel) { showToast('Fill all fields','error'); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,'liveSessions'), {
        ...form, status:'scheduled', viewerCount:0,
        host: `${userData?.firstName} ${userData?.lastName}`,
        createdAt:serverTimestamp(),
      });
      setSessions(prev => [{ id:ref.id, ...form, status:'scheduled', viewerCount:0 }, ...prev]);
      setModalOpen(false);
      setForm({ title:'', subject:'', channel:'' });
      showToast('Session created!','success');
    } catch { showToast('Failed to create session','error'); }
    setSaving(false);
  }

  async function setStatus(id, status) {
    try {
      await updateDoc(doc(db,'liveSessions',id), { status });
      setSessions(prev => prev.map(s => s.id===id ? {...s,status} : s));
      showToast(`Session ${status}`, 'success');
    } catch { showToast('Update failed','error'); }
  }

  return (
    <div>
      <div className="page-hdr" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><h2>Live Classes</h2><p>Manage and host live sessions.</p></div>
        <button className="btn-gold" onClick={() => setModalOpen(true)}><i className="fas fa-plus" /> Create Session</button>
      </div>
      <div className="card">
        {loading ? <SkeletonTable rows={5} cols={4} /> : sessions.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📡</div><h3>No sessions yet</h3></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Title</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:700 }}>{s.title}</td>
                    <td>{s.subject}</td>
                    <td>
                      <span className={`badge ${s.status==='live'?'badge-error':s.status==='ended'?'badge-navy':'badge-gold'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ display:'flex', gap:6 }}>
                      {s.status !== 'live' && s.status !== 'ended' && (
                        <button className="btn-error btn-xs" onClick={() => setStatus(s.id,'live')}>
                          <i className="fas fa-play" /> Go Live
                        </button>
                      )}
                      {s.status === 'live' && (
                        <>
                          <a href={`/livestream/${s.id}`} target="_blank" rel="noopener noreferrer" className="btn-gold btn-xs">
                            <i className="fas fa-external-link-alt" /> Host
                          </a>
                          <button className="btn-outline btn-xs" onClick={() => setStatus(s.id,'ended')}>End</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Live Session">
        <form onSubmit={createSession}>
          <div className="form-group"><label className="form-label">Session Title</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. JAMB Maths Intensive" required />
          </div>
          <div className="form-group"><label className="form-label">Subject</label>
            <input className="form-input" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="e.g. Mathematics" required />
          </div>
          <div className="form-group"><label className="form-label">Channel Name</label>
            <input className="form-input" value={form.channel} onChange={e=>setForm(p=>({...p,channel:e.target.value}))} placeholder="e.g. maths-live-001" required />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn-outline" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex:2, justifyContent:'center' }} disabled={saving}>
              {saving ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-plus" /> Create</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── Revenue ── */
function RevenueView() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pro:0, elite:0 });

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db,'users'), where('plan','in',['pro','elite']))),
    ]).then(([snap]) => {
      const pro = snap.docs.filter(d => d.data().plan==='pro').length;
      const elite = snap.docs.filter(d => d.data().plan==='elite').length;
      setStats({ pro, elite });
    }).catch(() => {});
    // Simulated payment history
    setLoading(false);
  }, []);

  const mrr = stats.pro * 5000 + stats.elite * 10000;
  const fee = Math.round(mrr * 0.015);

  return (
    <div>
      <div className="page-hdr"><h2>Revenue</h2><p>Financial overview and payment tracking.</p></div>
      <div className="stats-grid">
        <div className="stat-card s1"><div className="sc-icon blue"><i className="fas fa-chart-line" /></div><div className="sc-num">₦{mrr.toLocaleString()}</div><div className="sc-label">Estimated MRR</div></div>
        <div className="stat-card s2"><div className="sc-icon gold"><i className="fas fa-fire" /></div><div className="sc-num">{stats.pro}</div><div className="sc-label">Pro Subscribers</div></div>
        <div className="stat-card s3"><div className="sc-icon green"><i className="fas fa-star" /></div><div className="sc-num">{stats.elite}</div><div className="sc-label">Elite Subscribers</div></div>
        <div className="stat-card s4"><div className="sc-icon teal"><i className="fas fa-percent" /></div><div className="sc-num">₦{fee.toLocaleString()}</div><div className="sc-label">Paystack Fees (est.)</div></div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Revenue Summary</div></div>
        <div className="card-body">
          <table className="data-table">
            <tbody>
              <tr><td>Pro subscribers ({stats.pro} × ₦5,000)</td><td style={{ fontWeight:700, textAlign:'right' }}>₦{(stats.pro*5000).toLocaleString()}</td></tr>
              <tr><td>Elite subscribers ({stats.elite} × ₦10,000)</td><td style={{ fontWeight:700, textAlign:'right' }}>₦{(stats.elite*10000).toLocaleString()}</td></tr>
              <tr><td>Paystack fee (1.5%)</td><td style={{ color:'var(--error)', textAlign:'right' }}>-₦{fee.toLocaleString()}</td></tr>
              <tr><td style={{ fontWeight:700 }}>Net Revenue</td><td style={{ fontWeight:800, color:'var(--success)', textAlign:'right' }}>₦{(mrr-fee).toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Main Admin Page ── */
const VIEW_TITLES = {
  overview:'Overview', analytics:'Analytics', students:'Students', videos:'Video Lessons',
  cbt:'CBT Manager', quicktests:'Quick Tests', mockexams:'Mock Exams', centres:'Physical Centres',
  teachers:'Teachers', live:'Live Classes', broadcasts:'Broadcasts', schedule:'Schedule',
  revenue:'Revenue', settings:'Settings',
};

export default function AdminPage() {
  const { userData } = useAuth();
  const [view, setView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function renderView() {
    switch (view) {
      case 'overview':    return <OverviewView />;
      case 'students':    return <StudentsView />;
      case 'broadcasts':  return <BroadcastsView />;
      case 'live':        return <LiveView />;
      case 'revenue':     return <RevenueView />;
      default: return (
        <div className="empty-state" style={{ marginTop:60 }}>
          <div className="empty-state-icon">🚧</div>
          <h3>{VIEW_TITLES[view] || view}</h3>
          <p>This section is coming soon.</p>
        </div>
      );
    }
  }

  return (
    <div className="dash-layout">
      <AdminSidebar view={view} onNav={setView} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="dash-main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}><span /><span /><span /></button>
          <div className="topbar-title">{VIEW_TITLES[view] || 'Admin Panel'}</div>
          <span className="badge badge-gold" style={{ flexShrink:0 }}>Admin</span>
        </header>
        <div className="dash-content">{renderView()}</div>
      </div>
    </div>
  );
}
