import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, limit, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useAuth, formatDate, timeAgo } from '../contexts/AuthContext';
import { showToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';
import { SkeletonTable, SkeletonStatCard } from '../components/ui/Skeleton';
import '../styles/admin.css';
import '../styles/dashboard.css';

/* ── Admin Sidebar ── */
function AdminSidebar({ view, onNav, open, onClose }) {
  const { signOut, userData } = useAuth();
  return (
    <>
      <div className={`sb-overlay${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sb-logo"><img src="/nltc-light.png" alt="NLTC Online" className="sb-logo-img" /></div>
        <div className="sb-user">
          <div className="sb-avatar" style={{ background:'linear-gradient(135deg,#F0A500,#FFBE33)' }}>A</div>
          <div>
            <div className="sb-user-name">{userData?.firstName} {userData?.lastName}</div>
            <span className="badge badge-gold" style={{ fontSize:'.62rem' }}>Admin Panel</span>
          </div>
        </div>
        <nav className="sb-nav">
          <div className="sb-sec">Overview</div>
          {[['overview','fas fa-chart-pie','Dashboard']].map(([v,i,l]) => (
            <button key={v} className={`sb-link${view===v?' active':''}`} onClick={() => { onNav(v); onClose(); }}>
              <i className={i} />{l}
            </button>
          ))}
          <div className="sb-sec">Management</div>
          {[['students','fas fa-users','Students'],['videos','fas fa-film','Video Lessons'],['broadcasts','fas fa-bullhorn','Broadcasts']].map(([v,i,l]) => (
            <button key={v} className={`sb-link${view===v?' active':''}`} onClick={() => { onNav(v); onClose(); }}>
              <i className={i} />{l}
            </button>
          ))}
          <div className="sb-sec">Live &amp; Comms</div>
          {[['live','fas fa-signal','Live Classes'],['schedule','fas fa-calendar-alt','Schedule']].map(([v,i,l]) => (
            <button key={v} className={`sb-link${view===v?' active':''}`} onClick={() => { onNav(v); onClose(); }}>
              <i className={i} />{l}
            </button>
          ))}
          <div className="sb-sec">Finance</div>
          {[['revenue','fas fa-money-bill-wave','Revenue']].map(([v,i,l]) => (
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
    async function load() {
      try {
        // Get accurate total count
        const allSnap = await getDocs(collection(db,'users'));
        const users = allSnap.docs.map(d => ({ id:d.id, ...d.data() }));
        const pro = users.filter(u => u.plan==='pro').length;
        const elite = users.filter(u => u.plan==='elite').length;
        setStats({ total:users.length, pro, elite, free:users.length-pro-elite });
        // Recent 10
        const sorted = [...users].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
        setStudents(sorted.slice(0,10));
      } catch { }
      setLoading(false);
    }
    load();
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
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    getDocs(collection(db,'users'))
      .then(snap => {
        const users = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        setStudents(users.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
      })
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

  async function sendPasswordReset(student) {
    if (!student?.email) return;
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, student.email);
      showToast(`Password reset email sent to ${student.email}`, 'success');
      setModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to send reset email', 'error');
    }
    setResetting(false);
  }

  function openStudent(s) { setSelected(s); setModalOpen(true); }

  return (
    <div>
      <div className="page-hdr"><h2>Students</h2><p>{students.length} registered students total</p></div>
      <div className="filter-bar">
        <div className="filter-input-wrap" style={{ flex:1 }}>
          <i className="fas fa-search" />
          <input className="filter-input" placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={planFilter} onChange={e=>setPlanFilter(e.target.value)}>
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
      </div>
      <div className="card">
        {loading ? <SkeletonTable rows={10} cols={7} /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>State</th><th>Plan</th><th>XP</th><th>Change Plan</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:700, whiteSpace:'nowrap' }}>{s.firstName} {s.lastName}</td>
                    <td style={{ color:'var(--text-3)', fontSize:'.78rem' }}>{s.email}</td>
                    <td style={{ color:'var(--text-3)' }}>{s.state||'—'}</td>
                    <td><span className={`plan-tag plan-${s.plan||'free'}`}>{s.plan||'free'}</span></td>
                    <td style={{ fontWeight:700, color:'var(--gold)' }}>{(s.xp||0).toLocaleString()}</td>
                    <td>
                      <select value={s.plan||'free'} onChange={e=>updatePlan(s.id,e.target.value)}
                        style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border-2)', fontSize:'.74rem', cursor:'pointer', background:'white' }}>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="elite">Elite</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn-outline btn-xs" onClick={() => openStudent(s)}>
                        <i className="fas fa-user" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student detail modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title="Student Details">
        {selected && (
          <div>
            <div className="admin-student-detail">
              <div className="asd-avatar">{(selected.firstName?.[0]||'?').toUpperCase()}</div>
              <div>
                <div className="asd-name">{selected.firstName} {selected.lastName}</div>
                <div className="asd-email">{selected.email}</div>
              </div>
            </div>
            <div className="asd-grid">
              <div className="asd-item"><span>Plan</span><span className={`plan-tag plan-${selected.plan||'free'}`}>{selected.plan||'free'}</span></div>
              <div className="asd-item"><span>XP</span><strong>{(selected.xp||0).toLocaleString()}</strong></div>
              <div className="asd-item"><span>Streak</span><strong>{selected.streak||0} days</strong></div>
              <div className="asd-item"><span>Target Exam</span><strong>{selected.targetExam||'JAMB'}</strong></div>
              <div className="asd-item"><span>State</span><strong>{selected.state||'—'}</strong></div>
              <div className="asd-item"><span>Mode</span><strong>{selected.studentMode||'online'}</strong></div>
            </div>

            <div style={{ borderTop:'1px solid var(--border)', marginTop:16, paddingTop:16 }}>
              <div style={{ fontWeight:700, fontSize:'.84rem', color:'var(--navy)', marginBottom:8 }}>Change Plan</div>
              <select
                defaultValue={selected.plan||'free'}
                onChange={e => updatePlan(selected.id, e.target.value)}
                className="form-select"
                style={{ marginBottom:16 }}
              >
                <option value="free">Free</option>
                <option value="pro">Pro (₦2,000)</option>
                <option value="elite">Elite (₦5,000)</option>
              </select>

              <div style={{ fontWeight:700, fontSize:'.84rem', color:'var(--navy)', marginBottom:8 }}>Password Reset</div>
              <p style={{ fontSize:'.8rem', color:'var(--text-3)', marginBottom:10 }}>
                This will send a password reset email to <strong>{selected.email}</strong>. The student can then set a new password.
              </p>
              <button
                className="btn-error"
                style={{ width:'100%', justifyContent:'center' }}
                onClick={() => sendPasswordReset(selected)}
                disabled={resetting}
              >
                {resetting ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-key" /> Send Password Reset Email</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Video Lessons (admin upload) ── */
function VideosView() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:'', subject:'', url:'', thumbnail:'', access:'free', duration:'' });
  const SUBJECTS = ['Mathematics','English','Physics','Chemistry','Biology','Economics','Government','Literature','CRK','Accounting','Geography'];

  useEffect(() => {
    getDocs(query(collection(db,'videos'), orderBy('createdAt','desc')))
      .then(snap => setVideos(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveVideo(e) {
    e.preventDefault();
    if (!form.title || !form.url) { showToast('Title and URL are required','error'); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,'videos'), { ...form, createdAt:serverTimestamp() });
      setVideos(prev => [{ id:ref.id, ...form, createdAt:{ seconds:Date.now()/1000 } }, ...prev]);
      setForm({ title:'', subject:'', url:'', thumbnail:'', access:'free', duration:'' });
      setModalOpen(false);
      showToast('Video added!', 'success');
    } catch { showToast('Failed to add video','error'); }
    setSaving(false);
  }

  async function deleteVideo(id) {
    if (!window.confirm('Delete this video?')) return;
    try {
      await deleteDoc(doc(db,'videos',id));
      setVideos(prev => prev.filter(v => v.id !== id));
      showToast('Video deleted','success');
    } catch { showToast('Delete failed','error'); }
  }

  return (
    <div>
      <div className="page-hdr" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><h2>Video Lessons</h2><p>Manage all video content.</p></div>
        <button className="btn-gold" onClick={() => setModalOpen(true)}><i className="fas fa-plus" /> Add Video</button>
      </div>
      <div className="card">
        {loading ? <SkeletonTable rows={6} cols={5} /> : videos.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🎬</div><h3>No videos yet</h3><p>Add your first video lesson.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Title</th><th>Subject</th><th>Access</th><th>Duration</th><th>Actions</th></tr></thead>
              <tbody>
                {videos.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight:700 }}>{v.title}</td>
                    <td>{v.subject}</td>
                    <td><span className={`plan-tag plan-${v.access||'free'}`}>{v.access||'free'}</span></td>
                    <td style={{ color:'var(--text-3)' }}>{v.duration||'—'}</td>
                    <td style={{ display:'flex', gap:6 }}>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn-outline btn-xs"><i className="fas fa-external-link-alt" /></a>
                      <button className="btn-error btn-xs" onClick={() => deleteVideo(v.id)}><i className="fas fa-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Video Lesson">
        <form onSubmit={saveVideo}>
          <div className="form-group"><label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. JAMB Maths – Quadratic Equations" required />
          </div>
          <div className="form-row-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group"><label className="form-label">Subject</label>
              <select className="form-select" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Access Level</label>
              <select className="form-select" value={form.access} onChange={e=>setForm(p=>({...p,access:e.target.value}))}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="elite">Elite</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Video URL * (YouTube or direct MP4)</label>
            <input className="form-input" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} placeholder="https://youtube.com/watch?v=... or https://..." required />
          </div>
          <div className="form-group"><label className="form-label">Thumbnail URL</label>
            <input className="form-input" value={form.thumbnail} onChange={e=>setForm(p=>({...p,thumbnail:e.target.value}))} placeholder="https://..." />
          </div>
          <div className="form-group"><label className="form-label">Duration</label>
            <input className="form-input" value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} placeholder="e.g. 45 min" />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn-outline" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex:2, justifyContent:'center' }} disabled={saving}>
              {saving ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-plus" /> Add Video</>}
            </button>
          </div>
        </form>
      </Modal>
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

  async function deleteBroadcast(id) {
    try {
      await deleteDoc(doc(db,'announcements',id));
      setBroadcasts(prev => prev.filter(b => b.id !== id));
      showToast('Deleted','success');
    } catch { showToast('Delete failed','error'); }
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
                <button className="btn-error btn-xs" style={{ flexShrink:0 }} onClick={() => deleteBroadcast(b.id)}>
                  <i className="fas fa-trash" />
                </button>
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
  const { userData } = useAuth();

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
      const hostName = `${userData?.firstName||''} ${userData?.lastName||''}`.trim() || 'Admin';
      const ref = await addDoc(collection(db,'liveSessions'), {
        title: form.title,
        subject: form.subject,
        channel: form.channel,
        status: 'scheduled',
        viewerCount: 0,
        hostName,
        createdAt: serverTimestamp(),
      });
      setSessions(prev => [{ id:ref.id, ...form, status:'scheduled', viewerCount:0, hostName }, ...prev]);
      setModalOpen(false);
      setForm({ title:'', subject:'', channel:'' });
      showToast('Session created!','success');
    } catch(err) {
      showToast(err.message || 'Failed to create session','error');
    }
    setSaving(false);
  }

  async function setStatus(id, status) {
    try {
      await updateDoc(doc(db,'liveSessions',id), { status });
      setSessions(prev => prev.map(s => s.id===id ? {...s,status} : s));
      showToast(`Session ${status}`, 'success');
    } catch { showToast('Update failed','error'); }
  }

  async function deleteSession(id) {
    if (!window.confirm('Delete this session?')) return;
    try {
      await deleteDoc(doc(db,'liveSessions',id));
      setSessions(prev => prev.filter(s => s.id !== id));
      showToast('Deleted','success');
    } catch { showToast('Delete failed','error'); }
  }

  return (
    <div>
      <div className="page-hdr" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><h2>Live Classes</h2><p>Manage and host live sessions.</p></div>
        <button className="btn-gold" onClick={() => setModalOpen(true)}><i className="fas fa-plus" /> Create Session</button>
      </div>
      <div className="card">
        {loading ? <SkeletonTable rows={5} cols={4} /> : sessions.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📡</div><h3>No sessions yet</h3><p>Create your first live class.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Title</th><th>Subject</th><th>Channel</th><th>Status</th><th>Viewers</th><th>Actions</th></tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:700 }}>{s.title}</td>
                    <td>{s.subject}</td>
                    <td style={{ fontFamily:'monospace', fontSize:'.75rem', color:'var(--text-3)' }}>{s.channel}</td>
                    <td>
                      <span className={`badge ${s.status==='live'?'badge-error':s.status==='ended'?'badge-navy':'badge-gold'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ color:'var(--text-3)' }}>{s.viewerCount||0}</td>
                    <td style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {s.status !== 'live' && s.status !== 'ended' && (
                        <button className="btn-gold btn-xs" onClick={() => setStatus(s.id,'live')}>
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
                      <button className="btn-error btn-xs" onClick={() => deleteSession(s.id)}><i className="fas fa-trash" /></button>
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
          <div className="form-group"><label className="form-label">Session Title *</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. JAMB Maths Intensive" required />
          </div>
          <div className="form-group"><label className="form-label">Subject *</label>
            <input className="form-input" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="e.g. Mathematics" required />
          </div>
          <div className="form-group"><label className="form-label">Channel Name *</label>
            <input className="form-input" value={form.channel} onChange={e=>setForm(p=>({...p,channel:e.target.value}))} placeholder="e.g. maths-live-001 (no spaces)" required />
            <p style={{ fontSize:'.74rem', color:'var(--text-3)', marginTop:4 }}>Use lowercase letters, numbers and hyphens only.</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn-outline" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex:2, justifyContent:'center' }} disabled={saving}>
              {saving ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-plus" /> Create Session</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── Schedule ── */
function ScheduleView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:'', subject:'', day:'Monday', time:'', duration:'60' });
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  useEffect(() => {
    getDocs(collection(db,'schedule'))
      .then(snap => setItems(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveSchedule(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,'schedule'), { ...form, createdAt:serverTimestamp() });
      setItems(prev => [...prev, { id:ref.id, ...form }]);
      setForm({ title:'', subject:'', day:'Monday', time:'', duration:'60' });
      setModalOpen(false);
      showToast('Schedule added!','success');
    } catch { showToast('Failed','error'); }
    setSaving(false);
  }

  async function deleteItem(id) {
    try {
      await deleteDoc(doc(db,'schedule',id));
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { showToast('Delete failed','error'); }
  }

  const grouped = DAYS.reduce((acc, d) => {
    acc[d] = items.filter(i => i.day === d);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-hdr" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><h2>Schedule</h2><p>Manage weekly class timetable.</p></div>
        <button className="btn-gold" onClick={() => setModalOpen(true)}><i className="fas fa-plus" /> Add Class</button>
      </div>
      {loading ? <div className="card"><SkeletonTable rows={5} cols={4} /></div> : (
        DAYS.map(day => grouped[day].length > 0 && (
          <div key={day} className="card" style={{ marginBottom:12 }}>
            <div className="card-header"><div className="card-title">{day}</div></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Time</th><th>Title</th><th>Subject</th><th>Duration</th><th></th></tr></thead>
                <tbody>
                  {grouped[day].map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight:700, color:'var(--gold)' }}>{s.time}</td>
                      <td>{s.title}</td>
                      <td>{s.subject}</td>
                      <td style={{ color:'var(--text-3)' }}>{s.duration} min</td>
                      <td><button className="btn-error btn-xs" onClick={() => deleteItem(s.id)}><i className="fas fa-trash" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
      {items.length === 0 && !loading && (
        <div className="empty-state"><div className="empty-state-icon">📅</div><h3>No schedule yet</h3><p>Add your first class to the timetable.</p></div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add to Schedule">
        <form onSubmit={saveSchedule}>
          <div className="form-group"><label className="form-label">Class Title</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. JAMB Mathematics" required />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group"><label className="form-label">Day</label>
              <select className="form-select" value={form.day} onChange={e=>setForm(p=>({...p,day:e.target.value}))}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Time</label>
              <input className="form-input" type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} required />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group"><label className="form-label">Subject</label>
              <input className="form-input" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="Mathematics" />
            </div>
            <div className="form-group"><label className="form-label">Duration (min)</label>
              <input className="form-input" type="number" value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))} min={10} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn-outline" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex:2, justifyContent:'center' }} disabled={saving}>
              {saving ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-plus" /> Add</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── Revenue ── */
function RevenueView() {
  const [stats, setStats] = useState({ pro:0, elite:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db,'users'))
      .then(snap => {
        const pro = snap.docs.filter(d => d.data().plan==='pro').length;
        const elite = snap.docs.filter(d => d.data().plan==='elite').length;
        setStats({ pro, elite });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mrr = stats.pro * 5000 + stats.elite * 10000;
  const fee = Math.round(mrr * 0.015);

  return (
    <div>
      <div className="page-hdr"><h2>Revenue</h2><p>Financial overview and payment tracking.</p></div>
      {loading ? (
        <div className="stats-grid">{[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}</div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card s1"><div className="sc-icon blue"><i className="fas fa-chart-line" /></div><div className="sc-num">₦{mrr.toLocaleString()}</div><div className="sc-label">Estimated MRR</div></div>
          <div className="stat-card s2"><div className="sc-icon gold"><i className="fas fa-fire" /></div><div className="sc-num">{stats.pro}</div><div className="sc-label">Pro Subscribers</div></div>
          <div className="stat-card s3"><div className="sc-icon green"><i className="fas fa-star" /></div><div className="sc-num">{stats.elite}</div><div className="sc-label">Elite Subscribers</div></div>
          <div className="stat-card s4"><div className="sc-icon teal"><i className="fas fa-percent" /></div><div className="sc-num">₦{fee.toLocaleString()}</div><div className="sc-label">Paystack Fees (est.)</div></div>
        </div>
      )}
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
  overview:'Overview', students:'Students', videos:'Video Lessons',
  broadcasts:'Broadcasts', live:'Live Classes', schedule:'Schedule', revenue:'Revenue',
};

export default function AdminPage() {
  const [view, setView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function renderView() {
    switch (view) {
      case 'overview':   return <OverviewView />;
      case 'students':   return <StudentsView />;
      case 'videos':     return <VideosView />;
      case 'broadcasts': return <BroadcastsView />;
      case 'live':       return <LiveView />;
      case 'schedule':   return <ScheduleView />;
      case 'revenue':    return <RevenueView />;
      default:           return <OverviewView />;
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
