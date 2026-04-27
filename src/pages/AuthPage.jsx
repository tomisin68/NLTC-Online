import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../contexts/ToastContext';
import './AuthPage.css';

const ADMIN_CODE = 'NLTC-ADMIN-2024';

const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

async function saveUser(user, extras = {}) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid, email: user.email,
      firstName: extras.firstName || '',
      lastName: extras.lastName || '',
      phone: extras.phone || '', targetExam: extras.targetExam || 'JAMB',
      state: extras.state || 'Lagos', studentMode: extras.studentMode || 'online',
      center: extras.center || '', role: extras.role || 'student',
      plan: 'free', xp: 0, streak: 0, badges: [], achievements: [], cbtCount: 0,
      createdAt: serverTimestamp(),
    });
  } else if (Object.keys(extras).length > 0) {
    const { role, ...rest } = extras;
    await setDoc(ref, { ...rest, updatedAt: serverTimestamp() }, { merge: true });
  }
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-email': 'Please enter a valid email address.',
  };
  return map[code] || 'An error occurred. Please try again.';
}

export default function AuthPage() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [screen, setScreen] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [targetExam, setTargetExam] = useState('JAMB');
  const [state, setState] = useState('Lagos');
  const [studentMode, setStudentMode] = useState('online');
  const [center, setCenter] = useState('');
  const [centers, setCenters] = useState([]);
  const [adminCode, setAdminCode] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (currentUser && userData) {
      navigate(userData.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [currentUser, userData, navigate]);

  useEffect(() => {
    if (studentMode !== 'physical') return;
    getDocs(collection(db, 'centers'))
      .then(snap => setCenters(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [studentMode]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      const ud = snap.data();
      if (role === 'admin' && ud?.role !== 'admin') {
        await auth.signOut();
        showToast('This account is not an admin account.', 'error');
        setLoading(false); return;
      }
      setSuccess(true);
      setTimeout(() => navigate(ud?.role === 'admin' ? '/admin' : '/dashboard', { replace: true }), 900);
    } catch (err) {
      showToast(friendlyError(err.code), 'error');
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (role === 'admin' && adminCode !== ADMIN_CODE) {
      showToast('Invalid admin invite code', 'error'); return;
    }
    if (password !== confirmPwd) {
      showToast('Passwords do not match', 'error'); return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}` });
      await saveUser(cred.user, { firstName, lastName, phone, targetExam, state, studentMode, center, role });
      setSuccess(true);
      setTimeout(() => navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true }), 900);
    } catch (err) {
      showToast(friendlyError(err.code), 'error');
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!email.trim()) { showToast('Enter your email address first', 'error'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      showToast(friendlyError(err.code), 'error');
    }
    setLoading(false);
  }

  function switchScreen(s) {
    setScreen(s);
    setResetSent(false);
    setEmail(''); setPassword(''); setConfirmPwd('');
  }

  if (success) {
    return (
      <div className="auth-success-ov">
        <div className="auth-success-card">
          <div className="auth-success-icon">🎉</div>
          <h2>Welcome to NLTC!</h2>
          <p>Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <img src="/nltc-light.png" alt="NLTC Online" className="auth-logo" />
          <h1 className="auth-hero-title">Ace JAMB, WAEC &amp; NECO with Nigeria's #1 Exam Prep</h1>
          <p className="auth-hero-sub">Join 50,000+ students scoring higher with AI-powered CBT, live classes, and personalised study plans.</p>
          <div className="auth-trust-pills">
            <span className="auth-pill">🏆 Top-rated platform</span>
            <span className="auth-pill">📚 10,000+ questions</span>
            <span className="auth-pill">📡 Daily live classes</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">

          {/* Role toggle */}
          <div className="auth-role-toggle">
            <button className={`role-btn${role === 'student' ? ' active' : ''}`} onClick={() => setRole('student')}>
              <i className="fas fa-user-graduate" /> Student
            </button>
            <button className={`role-btn${role === 'admin' ? ' active' : ''}`} onClick={() => setRole('admin')}>
              <i className="fas fa-shield-alt" /> Admin
            </button>
          </div>

          {/* LOGIN */}
          {screen === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2 className="auth-form-title">Welcome back</h2>
              <p className="auth-form-sub">Sign in to continue your exam prep journey</p>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yourname@email.com" required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="pwd-wrap">
                  <input className="form-input" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required autoComplete="current-password" />
                  <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                    <i className={`fas fa-eye${showPwd ? '-slash' : ''}`} />
                  </button>
                </div>
              </div>

              <button type="button" className="auth-link-btn auth-forgot-btn" onClick={() => switchScreen('forgot')}>
                Forgot password?
              </button>

              <button type="submit" className="btn-gold auth-submit" disabled={loading}>
                {loading ? <span className="spinner spinner-white" style={{ width: 18, height: 18 }} /> : 'Sign In'}
              </button>

              <p className="auth-switch">New here? <button type="button" className="auth-link-btn" onClick={() => switchScreen('signup')}>Create account</button></p>
            </form>
          )}

          {/* SIGNUP */}
          {screen === 'signup' && (
            <form className="auth-form" onSubmit={handleSignup}>
              <h2 className="auth-form-title">{role === 'admin' ? 'Create Admin Account' : 'Create your account'}</h2>
              <p className="auth-form-sub">Start your journey to exam success today</p>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">First name</label>
                  <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last name</label>
                  <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yourname@email.com" required autoComplete="email" />
              </div>

              <div className="form-group">
                <label className="form-label">Phone number</label>
                <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="080xxxxxxxx" />
              </div>

              {role === 'student' && (
                <>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Target exam</label>
                      <select className="form-select" value={targetExam} onChange={e => setTargetExam(e.target.value)}>
                        {['JAMB', 'WAEC', 'NECO', 'GCE'].map(x => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <select className="form-select" value={state} onChange={e => setState(e.target.value)}>
                        {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student type</label>
                    <div className="student-mode-toggle">
                      <button type="button" className={`mode-btn${studentMode === 'online' ? ' active' : ''}`} onClick={() => setStudentMode('online')}>
                        🌐 Online Student
                      </button>
                      <button type="button" className={`mode-btn${studentMode === 'physical' ? ' active' : ''}`} onClick={() => setStudentMode('physical')}>
                        🏫 Physical Centre
                      </button>
                    </div>
                  </div>
                  {studentMode === 'physical' && centers.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">Select centre</label>
                      <select className="form-select" value={center} onChange={e => setCenter(e.target.value)} required>
                        <option value="">-- Choose centre --</option>
                        {centers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.state}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}

              {role === 'admin' && (
                <div className="form-group">
                  <label className="form-label">Admin invite code</label>
                  <input className="form-input" value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="Enter invite code" required />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="pwd-wrap">
                  <input className="form-input" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} autoComplete="new-password" />
                  <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                    <i className={`fas fa-eye${showPwd ? '-slash' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <div className="pwd-wrap">
                  <input className="form-input" type={showConfirm ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repeat password" required minLength={6} autoComplete="new-password" />
                  <button type="button" className="pwd-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                    <i className={`fas fa-eye${showConfirm ? '-slash' : ''}`} />
                  </button>
                </div>
                {confirmPwd && password !== confirmPwd && (
                  <p className="auth-pwd-mismatch">Passwords do not match</p>
                )}
              </div>

              <button type="submit" className="btn-gold auth-submit" disabled={loading || (confirmPwd && password !== confirmPwd)}>
                {loading ? <span className="spinner spinner-white" style={{ width: 18, height: 18 }} /> : 'Create Account'}
              </button>

              <p className="auth-switch">Already have an account? <button type="button" className="auth-link-btn" onClick={() => switchScreen('login')}>Sign in</button></p>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {screen === 'forgot' && (
            <div className="auth-form">
              <h2 className="auth-form-title">Reset password</h2>

              {resetSent ? (
                <div className="auth-reset-success">
                  <div className="auth-reset-icon">📧</div>
                  <h3>Check your inbox</h3>
                  <p>We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.</p>
                  <p className="auth-reset-tip">Didn't receive it? Check your spam folder or try again.</p>
                  <button className="btn-gold auth-submit" onClick={() => setResetSent(false)}>Send again</button>
                  <button type="button" className="auth-link-btn" style={{ marginTop: 12 }} onClick={() => switchScreen('login')}>
                    <i className="fas fa-arrow-left" /> Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot}>
                  <p className="auth-form-sub">Enter your email and we'll send a reset link.</p>
                  <div className="form-group">
                    <label className="form-label">Email address</label>
                    <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yourname@email.com" required autoComplete="email" />
                  </div>
                  <button type="submit" className="btn-gold auth-submit" disabled={loading}>
                    {loading ? <span className="spinner spinner-white" style={{ width: 18, height: 18 }} /> : 'Send Reset Email'}
                  </button>
                  <p className="auth-switch">
                    <button type="button" className="auth-link-btn" onClick={() => switchScreen('login')}>
                      <i className="fas fa-arrow-left" /> Back to sign in
                    </button>
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
