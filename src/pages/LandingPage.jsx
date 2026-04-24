import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/landing.css';

const FEATURES = [
  { icon:'🎬', title:'Video Lessons', desc:'Expert-recorded JAMB, WAEC & NECO lessons across all major subjects, free and premium.' },
  { icon:'📝', title:'CBT Practice', desc:'Authentic exam-mode CBT with past questions from JAMB\'s ALOC database. No peeking.' },
  { icon:'📡', title:'Live Classes', desc:'Join real-time interactive sessions with certified tutors. Ask questions, get answers.' },
  { icon:'🏆', title:'XP & Leaderboard', desc:'Earn XP for every activity. Climb the leaderboard and unlock achievement badges.' },
  { icon:'📅', title:'Exam Schedule', desc:'Never miss a revision session. Structured weekly timetables for every exam type.' },
  { icon:'📱', title:'Works Everywhere', desc:'Installable PWA — works on any phone, tablet, or PC, even with slow connections.' },
];

const PLANS = [
  {
    name:'Free',
    price:'₦0',
    period:'forever',
    color:'border',
    features:['Free video lessons','Basic CBT practice','Leaderboard access','Achievement badges'],
    cta:'Get Started',
    highlight:false,
  },
  {
    name:'Pro',
    price:'₦2,000',
    period:'/ month',
    color:'gold',
    features:['Everything in Free','All video lessons','Live class access','Priority support','Advanced analytics'],
    cta:'Go Pro',
    highlight:true,
  },
  {
    name:'Elite',
    price:'₦5,000',
    period:'/ month',
    color:'navy',
    features:['Everything in Pro','1-on-1 tutoring sessions','Exam prediction reports','Dedicated study plan','Early access features'],
    cta:'Go Elite',
    highlight:false,
  },
];

const SUBJECTS = ['Mathematics','English Language','Physics','Chemistry','Biology','Economics','Government','Literature','Geography','Commerce'];

export default function LandingPage() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [stats, setStats] = useState({ students: 0, lessons: 0, sessions: 0 });
  const heroRef = useRef(null);

  useEffect(() => {
    getDocs(query(collection(db,'users'), orderBy('xp','desc'), limit(5)))
      .then(snap => setLeaders(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => {});
    Promise.all([
      getDocs(collection(db,'users')),
      getDocs(collection(db,'videos')),
      getDocs(collection(db,'liveSessions')),
    ]).then(([u,v,l]) => setStats({ students:u.size, lessons:v.size, sessions:l.size })).catch(()=>{});
  }, []);

  // Parallax on hero
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handler = () => {
      const y = window.scrollY;
      el.style.setProperty('--py', `${y * 0.35}px`);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="lp-root">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <img src="/NLTC.png" alt="NLTC" className="lp-logo-img" onError={e => e.target.style.display='none'} />
            <span className="lp-logo-text">NLTC<span>Online</span></span>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#subjects">Subjects</a>
            <a href="#pricing">Pricing</a>
            <a href="#leaderboard">Top Students</a>
          </div>
          <div className="lp-nav-cta">
            <button className="btn-outline btn-sm" onClick={() => navigate('/auth')}>Log in</button>
            <button className="btn-gold btn-sm" onClick={() => navigate('/auth?mode=signup')}>Sign up free</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-bg" />
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">🎓 Nigeria's #1 Exam Prep Platform</div>
          <h1 className="lp-hero-title">
            Ace <span className="lp-hero-accent">JAMB, WAEC</span><br />& NECO with Confidence
          </h1>
          <p className="lp-hero-sub">
            Video lessons, live classes, AI-powered CBT practice, and a community of ambitious Nigerian students — all in one place.
          </p>
          <div className="lp-hero-btns">
            <button className="btn-gold lp-hero-btn-main" onClick={() => navigate('/auth?mode=signup')}>
              Start for Free <i className="fas fa-arrow-right" />
            </button>
            <button className="btn-outline lp-hero-btn-sec" onClick={() => navigate('/auth')}>
              Log in
            </button>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-stat"><span className="lp-stat-num">{stats.students.toLocaleString()}+</span><span className="lp-stat-label">Students</span></div>
            <div className="lp-stat-div" />
            <div className="lp-stat"><span className="lp-stat-num">{stats.lessons}+</span><span className="lp-stat-label">Lessons</span></div>
            <div className="lp-stat-div" />
            <div className="lp-stat"><span className="lp-stat-num">{stats.sessions}+</span><span className="lp-stat-label">Live Sessions</span></div>
          </div>
        </div>
        <div className="lp-hero-scroll-hint" aria-hidden>
          <span>Scroll to explore</span>
          <i className="fas fa-chevron-down" />
        </div>
      </section>

      {/* Features */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-label">Why NLTC Online?</div>
          <h2 className="lp-section-title">Everything you need to pass</h2>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="lp-section lp-section-alt" id="subjects">
        <div className="lp-section-inner">
          <div className="lp-section-label">Coverage</div>
          <h2 className="lp-section-title">All major exam subjects</h2>
          <div className="lp-subjects-wrap">
            {SUBJECTS.map(s => (
              <div key={s} className="lp-subject-chip">{s}</div>
            ))}
          </div>
          <p className="lp-subjects-note">+ more subjects updated regularly</p>
        </div>
      </section>

      {/* Leaderboard teaser */}
      {leaders.length > 0 && (
        <section className="lp-section" id="leaderboard">
          <div className="lp-section-inner">
            <div className="lp-section-label">Community</div>
            <h2 className="lp-section-title">Top students this month</h2>
            <div className="lp-leaders">
              {leaders.map((l, i) => (
                <div key={l.id} className={`lp-leader${i === 0 ? ' lp-leader-1' : ''}`}>
                  <div className="lp-leader-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
                  <div className="lp-leader-avatar">
                    {l.photoURL
                      ? <img src={l.photoURL} alt="" />
                      : (l.name || l.email || '?')[0].toUpperCase()
                    }
                  </div>
                  <div className="lp-leader-info">
                    <div className="lp-leader-name">{l.name || l.email?.split('@')[0] || 'Student'}</div>
                    <div className="lp-leader-xp">{(l.xp||0).toLocaleString()} XP</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-outline lp-view-all" onClick={() => navigate('/auth')}>
              Join & compete <i className="fas fa-arrow-right" />
            </button>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section className="lp-section lp-section-alt" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-section-label">Pricing</div>
          <h2 className="lp-section-title">Simple, affordable plans</h2>
          <div className="lp-plans">
            {PLANS.map(p => (
              <div key={p.name} className={`lp-plan${p.highlight ? ' lp-plan-highlight' : ''}`}>
                {p.highlight && <div className="lp-plan-badge">Most Popular</div>}
                <div className="lp-plan-name">{p.name}</div>
                <div className="lp-plan-price">
                  {p.price}<span className="lp-plan-period"> {p.period}</span>
                </div>
                <ul className="lp-plan-features">
                  {p.features.map(f => (
                    <li key={f}><i className="fas fa-check" /> {f}</li>
                  ))}
                </ul>
                <button
                  className={p.highlight ? 'btn-gold' : 'btn-outline'}
                  onClick={() => navigate('/auth?mode=signup')}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="lp-cta-banner">
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to start your journey?</h2>
          <p className="lp-cta-sub">Join thousands of Nigerian students already using NLTC Online to prepare for their exams.</p>
          <button className="btn-gold lp-cta-btn" onClick={() => navigate('/auth?mode=signup')}>
            Create Free Account <i className="fas fa-arrow-right" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-logo">
            <span className="lp-logo-text">NLTC<span>Online</span></span>
            <p>Nigeria's exam-prep platform for JAMB, WAEC & NECO.</p>
          </div>
          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <span onClick={() => navigate('/auth')}>Sign in</span>
            <span onClick={() => navigate('/auth?mode=signup')}>Sign up</span>
          </div>
          <div className="lp-footer-copy">
            © {new Date().getFullYear()} NLTC Online. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
