import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBackendFetch } from '../../hooks/useBackendFetch';
import { showToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDate } from '../../contexts/AuthContext';

const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
const EXAMS = ['JAMB','WAEC','NECO','GCE'];

export default function SettingsView() {
  const { currentUser, userData, saveProfile } = useAuth();
  const backendFetch = useBackendFetch();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('Lagos');
  const [targetExam, setTargetExam] = useState('JAMB');
  const [savingProfile, setSavingProfile] = useState(false);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [payLoading, setPayLoading] = useState(false);

  const [lessonAmt, setLessonAmt] = useState('');
  const [lessonMonth, setLessonMonth] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonLoading, setLessonLoading] = useState(false);

  const [payHistory, setPayHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!userData) return;
    setFirstName(userData.firstName || '');
    setLastName(userData.lastName || '');
    setPhone(userData.phone || '');
    setState(userData.state || 'Lagos');
    setTargetExam(userData.targetExam || 'JAMB');
  }, [userData]);

  useEffect(() => {
    if (!currentUser) return;
    backendFetch('GET', '/payments/history')
      .then(data => setPayHistory(data.payments || []))
      .catch(() => setPayHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [currentUser]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await saveProfile({ firstName, lastName, phone, state, targetExam });
      showToast('Profile saved!', 'success');
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    }
    setSavingProfile(false);
  }

  async function handlePayment() {
    setPayLoading(true);
    try {
      const data = await backendFetch('POST', '/paystack/initialize', {
        plan: selectedPlan,
        callbackUrl: 'https://nltc-backend.onrender.com/payment/callback',
      });
      window.location.href = data.authorizationUrl;
    } catch (err) {
      showToast(err.message || 'Payment failed', 'error');
      setPayLoading(false);
    }
  }

  async function handleLessonFee(e) {
    e.preventDefault();
    const amt = parseInt(lessonAmt);
    if (amt < 100) { showToast('Enter a valid amount (min ₦100)', 'error'); return; }
    if (!lessonMonth) { showToast('Please select a month', 'error'); return; }
    setLessonLoading(true);
    try {
      const data = await backendFetch('POST', '/paystack/initialize', {
        amount: amt,
        description: `Lesson fee – ${lessonMonth}${lessonDesc ? `: ${lessonDesc}` : ''}`,
        metadata: { type:'lesson_fee', month:lessonMonth },
      });
      window.location.href = data.authorizationUrl;
    } catch (err) {
      showToast(err.message || 'Payment failed', 'error');
      setLessonLoading(false);
    }
  }

  const plan = userData?.plan || 'free';
  const MONTHS = Array.from({length:12}, (_,i) => new Date(0, i).toLocaleString('default',{month:'long'}) + ' ' + new Date().getFullYear());

  return (
    <div>
      <div className="page-hdr"><h2>Settings</h2><p>Manage your profile and account preferences.</p></div>

      <div className="settings-grid">
        {/* Profile */}
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="fas fa-user" style={{marginRight:6}} />Profile Information</div></div>
          <form className="card-body" onSubmit={handleSaveProfile}>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">First name</label>
                <input className="form-input" value={firstName} onChange={e=>setFirstName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Last name</label>
                <input className="form-input" value={lastName} onChange={e=>setLastName(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={currentUser?.email || ''} disabled style={{ opacity:.6, cursor:'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="080xxxxxxxx" />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">State</label>
                <select className="form-select" value={state} onChange={e=>setState(e.target.value)}>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Target exam</label>
                <select className="form-select" value={targetExam} onChange={e=>setTargetExam(e.target.value)}>
                  {EXAMS.map(x => <option key={x}>{x}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-gold" disabled={savingProfile}>
              {savingProfile ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-save" /> Save Profile</>}
            </button>
          </form>
        </div>

        {/* Subscription */}
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="fas fa-credit-card" style={{marginRight:6}} />Subscription</div></div>
          <div className="card-body">
            <div className="current-plan-box">
              <div style={{ fontSize:'.82rem', color:'var(--text-3)', marginBottom:4 }}>Current Plan</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span className={`plan-tag plan-${plan}`} style={{ fontSize:'.9rem', padding:'4px 14px' }}>
                  {plan === 'elite' ? <><i className="fas fa-star" /> Elite</> : plan === 'pro' ? <><i className="fas fa-fire" /> Pro</> : 'Free'}
                </span>
              </div>
            </div>
            {plan === 'free' && (
              <button className="btn-gold" style={{ marginTop:14, width:'100%', justifyContent:'center' }} onClick={() => setUpgradeOpen(true)}>
                <i className="fas fa-rocket" /> Upgrade Now
              </button>
            )}
          </div>

          {/* Lesson Fee */}
          <div className="card-header" style={{ borderTop:'1px solid var(--border)' }}><div className="card-title"><i className="fas fa-book" style={{marginRight:6}} />Pay Lesson Fee</div></div>
          <form className="card-body" onSubmit={handleLessonFee}>
            <div className="form-group">
              <label className="form-label">Amount (₦)</label>
              <input className="form-input" type="number" min="100" value={lessonAmt} onChange={e=>setLessonAmt(e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="form-select" value={lessonMonth} onChange={e=>setLessonMonth(e.target.value)}>
                <option value="">-- Select month --</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input className="form-input" value={lessonDesc} onChange={e=>setLessonDesc(e.target.value)} placeholder="e.g. Physics tuition" />
            </div>
            <button type="submit" className="btn-navy" disabled={lessonLoading}>
              {lessonLoading ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-credit-card" /> Pay with Paystack</>}
            </button>
          </form>
        </div>
      </div>

      {/* Payment history */}
      <div className="card" style={{ marginTop:16 }}>
        <div className="card-header"><div className="card-title"><i className="fas fa-history" style={{marginRight:6}} />Payment History</div></div>
        {loadingHistory ? (
          <div style={{ padding:'20px', textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : payHistory.length === 0 ? (
          <div className="empty-state" style={{ padding:'28px' }}>
            <div className="empty-state-icon"><i className="fas fa-receipt" /></div>
            <h3>No payments yet</h3>
            <p>Your payment history will appear here.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {payHistory.map((p,i) => (
                  <tr key={i}>
                    <td>{formatDate(p.createdAt || p.date)}</td>
                    <td>{p.description || p.plan || '—'}</td>
                    <td style={{ fontWeight:700 }}>₦{(p.amount||0).toLocaleString()}</td>
                    <td><span className={`badge ${p.status==='success'?'badge-success':'badge-error'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade modal */}
      <Modal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} title="Upgrade Your Plan">
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          {['pro','elite'].map(p => (
            <div key={p} className={`plan-card${selectedPlan===p?' selected':''}`} onClick={() => setSelectedPlan(p)} style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--font-head)', fontWeight:800, color:'var(--navy)', marginBottom:4 }}>
                {p === 'pro' ? 'Pro' : 'Elite Bundle'}
              </div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'1.2rem', fontWeight:900, color: p==='elite'?'#7C3AED':'var(--gold)', marginBottom:8 }}>
                {p === 'pro' ? '₦5,000' : '₦10,000'}<span style={{ fontSize:'.68rem', color:'var(--text-3)', fontFamily:'var(--font-body)' }}>/mo</span>
              </div>
              <div style={{ fontSize:'.73rem', color:'var(--text-2)', lineHeight:1.7 }}>
                {p === 'pro' ? 'All lessons · Live classes · Priority CBT' : 'Everything in Pro · 1-on-1 tutor · Study plan'}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-outline" style={{ flex:1, justifyContent:'center' }} onClick={() => setUpgradeOpen(false)}>Cancel</button>
          <button className="btn-gold" style={{ flex:2, justifyContent:'center' }} onClick={handlePayment} disabled={payLoading}>
            {payLoading ? <span className="spinner spinner-white" style={{width:16,height:16}} /> : <><i className="fas fa-credit-card" /> Pay with Paystack</>}
          </button>
        </div>
        <div style={{ textAlign:'center', marginTop:11, fontSize:'.72rem', color:'var(--text-3)' }}><i className="fas fa-lock" style={{marginRight:4}} />Secured by Paystack · Cancel anytime</div>
      </Modal>
    </div>
  );
}
