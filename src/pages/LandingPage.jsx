import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/landing.css';

const FEATURES = [
  { icon:'fa-film',        title:'Video Lessons', desc:'Expert-recorded JAMB, WAEC & NECO lessons across all major subjects, free and premium.' },
  { icon:'fa-file-alt',    title:'CBT Practice', desc:'Authentic exam-mode CBT with past questions from JAMB\'s ALOC database. No peeking.' },
  { icon:'fa-signal',      title:'Live Classes', desc:'Join real-time interactive sessions with certified tutors. Ask questions, get answers.' },
  { icon:'fa-trophy',      title:'XP & Leaderboard', desc:'Earn XP for every activity. Climb the leaderboard and unlock achievement badges.' },
  { icon:'fa-calendar-alt',title:'Exam Schedule', desc:'Never miss a revision session. Structured weekly timetables for every exam type.' },
  { icon:'fa-mobile-alt',  title:'Works Everywhere', desc:'Installable PWA — works on any phone, tablet, or PC, even with slow connections.' },
];

const PLANS = [
  {
    name:'Free',
    price:'₦0',
    period:'forever',
    features:['Free video lessons','Basic CBT practice','Leaderboard access','Achievement badges'],
    cta:'Get Started',
    highlight:false,
  },
  {
    name:'Pro',
    price:'₦2,000',
    period:'/ month',
    features:['Everything in Free','All video lessons','Live class access','Priority support','Advanced analytics'],
    cta:'Go Pro',
    highlight:true,
  },
  {
    name:'Elite',
    price:'₦5,000',
    period:'/ month',
    features:['Everything in Pro','1-on-1 tutoring sessions','Exam prediction reports','Dedicated study plan','Early access features'],
    cta:'Go Elite',
    highlight:false,
  },
];

const SUBJECTS = ['Mathematics','English Language','Physics','Chemistry','Biology','Economics','Government','Literature','Geography','Commerce'];

const TESTIMONIALS = [
  { img:'/testimonial.jpeg',  name:'Adaeze Okonkwo',  exam:'JAMB 2024', score:'317/400', text:'NLTC Online helped me score 317 in JAMB! The CBT practice felt exactly like the real exam. I studied every day with the live classes.' },
  { img:'/testimonial0.jpeg', name:'Emeka Nwachukwu', exam:'WAEC 2024', score:'8 A\'s',  text:'I got 8 A\'s in WAEC thanks to the video lessons. The explanations are so clear and the tutors are always available.' },
  { img:'/testimonial1.jpeg', name:'Fatima Aliyu',    exam:'JAMB 2024', score:'298/400', text:'From 180 to 298 — NLTC Online is a game changer! The question bank is huge and the analytics showed me exactly where to improve.' },
  { img:'/testimonial2.jpeg', name:'Chukwuemeka Eze', exam:'NECO 2024', score:'7 A\'s',  text:'NECO was easy because I practised with NLTC daily. The streak system kept me motivated. Highly recommended for all candidates.' },
  { img:'/testimonial3.jpeg', name:'Blessing Osei',   exam:'JAMB 2025', score:'305/400', text:'I was afraid of JAMB but the mock exams on NLTC Online prepared me perfectly. The timed exams are just like the real thing!' },
  { img:'/testimonial4.jpeg', name:'Yusuf Abdullahi', exam:'WAEC 2024', score:'6 A\'s',  text:'The live classes are incredible. My tutors answered every question I had. I improved in Mathematics from C6 to A1 in just 3 months.' },
  { img:'/testimonial5.jpeg', name:'Chisom Okeke',    exam:'JAMB 2025', score:'289/400', text:'The leaderboard kept me competitive. I was always pushing to be in the top 10 and it made me study harder every day.' },
  { img:'/testimonial6.jpeg', name:'Amina Suleiman',  exam:'JAMB 2024', score:'311/400', text:'311 in JAMB! I used NLTC for 6 months and the CBT practice was the best investment. All my friends are now using it.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [stats, setStats] = useState({ students: 0, lessons: 0, sessions: 0 });
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const heroRef = useRef(null);
  const testimonialTimer = useRef(null);

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

  // Auto-advance testimonials
  useEffect(() => {
    testimonialTimer.current = setInterval(() => {
      setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(testimonialTimer.current);
  }, []);

  const goTestimonial = (i) => {
    setTestimonialIdx(i);
    clearInterval(testimonialTimer.current);
    testimonialTimer.current = setInterval(() => {
      setTestimonialIdx(idx => (idx + 1) % TESTIMONIALS.length);
    }, 4500);
  };

  // Parallax on hero
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handler = () => el.style.setProperty('--py', `${window.scrollY * 0.35}px`);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="lp-root">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <img src="/nltc-dark.png" alt="NLTC Online" className="lp-logo-img" />
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#subjects">Subjects</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Reviews</a>
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
          <img src="/nltc-light.png" alt="NLTC Online" className="lp-hero-logo" />
          <div className="lp-hero-badge"><i className="fas fa-graduation-cap" /> Nigeria's #1 Exam Prep Platform</div>
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
            <div className="lp-stat"><span className="lp-stat-num">{stats.students > 0 ? `${stats.students.toLocaleString()}+` : '50,000+'}</span><span className="lp-stat-label">Students</span></div>
            <div className="lp-stat-div" />
            <div className="lp-stat"><span className="lp-stat-num">{stats.lessons > 0 ? `${stats.lessons}+` : '500+'}</span><span className="lp-stat-label">Lessons</span></div>
            <div className="lp-stat-div" />
            <div className="lp-stat"><span className="lp-stat-num">{stats.sessions > 0 ? `${stats.sessions}+` : '200+'}</span><span className="lp-stat-label">Live Sessions</span></div>
          </div>
        </div>
        <div className="lp-hero-scroll-hint" aria-hidden>
          <span>Scroll to explore</span>
          <i className="fas fa-chevron-down lp-bounce" />
        </div>
      </section>

      {/* YouTube Video Section */}
      <section className="lp-section lp-video-section">
        <div className="lp-section-inner">
          <div className="lp-section-label">See It In Action</div>
          <h2 className="lp-section-title">Watch how NLTC Online works</h2>
          <p className="lp-video-sub">See how thousands of Nigerian students are using our platform to prepare for their exams and score higher.</p>
          <div className="lp-yt-wrap">
            <div className="lp-yt-frame">
              <iframe
                width="560"
                height="315"
                src="https://www.youtube.com/embed/n6XBnKYImYw?si=82or7otHI-WGZ7iq"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-section lp-section-alt" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-label">Why NLTC Online?</div>
          <h2 className="lp-section-title">Everything you need to pass</h2>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon"><i className={`fas ${f.icon}`} /></div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="lp-section" id="subjects">
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

      {/* Testimonials */}
      <section className="lp-section lp-section-dark" id="testimonials">
        <div className="lp-section-inner">
          <div className="lp-section-label lp-label-light">Student Results</div>
          <h2 className="lp-section-title lp-title-light">Real students. Real results.</h2>

          {/* Main testimonial card */}
          <div className="lp-testimonial-stage">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className={`lp-testimonial-card${i === testimonialIdx ? ' active' : i === (testimonialIdx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length ? ' prev' : ''}`}>
                <div className="lp-tcard-top">
                  <img src={t.img} alt={t.name} className="lp-tcard-avatar" onError={e => { e.target.style.display='none'; }} />
                  <div>
                    <div className="lp-tcard-name">{t.name}</div>
                    <div className="lp-tcard-exam">{t.exam}</div>
                    <div className="lp-tcard-score">{t.score}</div>
                  </div>
                </div>
                <div className="lp-tcard-stars">{'★★★★★'}</div>
                <p className="lp-tcard-text">"{t.text}"</p>
              </div>
            ))}
          </div>

          {/* Thumbnail strip */}
          <div className="lp-testimonial-strip">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={i}
                className={`lp-tstrip-btn${i === testimonialIdx ? ' active' : ''}`}
                onClick={() => goTestimonial(i)}
                aria-label={t.name}
              >
                <img src={t.img} alt={t.name} onError={e => { e.target.style.display='none'; e.target.parentElement.textContent = t.name[0]; }} />
              </button>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="lp-tcard-dots">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} className={`lp-tcard-dot${i === testimonialIdx ? ' active' : ''}`} onClick={() => goTestimonial(i)} />
            ))}
          </div>
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
                    {l.photoURL ? <img src={l.photoURL} alt="" /> : (l.name || l.email || '?')[0].toUpperCase()}
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
          <img src="/nltc-light.png" alt="NLTC" className="lp-cta-logo" />
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
            <img src="/nltc-light.png" alt="NLTC Online" className="lp-footer-logo-img" />
            <p>Nigeria's exam-prep platform for JAMB, WAEC & NECO.</p>
          </div>
          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <span onClick={() => navigate('/auth')}>Sign in</span>
            <span onClick={() => navigate('/auth?mode=signup')}>Sign up</span>
            <a href="/privacy-policy.html">Privacy Policy</a>
          </div>
          <div className="lp-footer-copy">
            © {new Date().getFullYear()} NLTC Online. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
