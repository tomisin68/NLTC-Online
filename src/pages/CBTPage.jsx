import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, ALOC_TOKEN } from '../firebase';
import { useBackendFetch } from '../hooks/useBackendFetch';
import { showToast } from '../contexts/ToastContext';
import Modal from '../components/ui/Modal';
import Calculator from '../components/ui/Calculator';
import '../styles/cbt.css';

/* ─── Constants ─── */
const ALOC_BASE = 'https://questions.aloc.com.ng/api/v2';
const SUBJECTS_CONFIG = {
  mathematics:{ name:'Mathematics', icon:'fa-calculator',    color:'#2E90FA' },
  english:    { name:'English',     icon:'fa-book',          color:'#7A5AF8' },
  physics:    { name:'Physics',     icon:'fa-atom',          color:'#F04438' },
  chemistry:  { name:'Chemistry',   icon:'fa-flask',         color:'#12B76A' },
  biology:    { name:'Biology',     icon:'fa-leaf',          color:'#16B364' },
  economics:  { name:'Economics',   icon:'fa-chart-bar',     color:'#F79009' },
  government: { name:'Government',  icon:'fa-balance-scale', color:'#0BA5EC' },
  literature: { name:'Literature',  icon:'fa-book-open',     color:'#9E77ED' },
  crk:        { name:'CRK',         icon:'fa-cross',         color:'#E77729' },
  accounting: { name:'Accounting',  icon:'fa-coins',         color:'#2D9D78' },
};
const OPTION_KEYS   = ['a','b','c','d'];
const OPTION_LABELS = ['A','B','C','D'];

function getOptionText(q, k) { return q[k] || q[`option_${k}`] || q.options?.[k] || q.option?.[k] || ''; }
function getAnswer(q)        { return (q.answer || q.correct_option || '').toLowerCase().trim(); }
function fmtTime(s)          { const m=Math.floor(s/60); return `${m}:${(s%60).toString().padStart(2,'0')}`; }

/* ─── ALOC fetch ─── */
async function fetchAlocQuestions(subject, count = 40, examType = 'utme', onProgress = null) {
  const headers = { 'AccessToken': ALOC_TOKEN };
  let questions = [];

  async function tryEndpoint(url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  }

  const urls = [
    `${ALOC_BASE}/q?subject=${encodeURIComponent(subject)}&type=${examType}&limit=${count}`,
    `${ALOC_BASE}/m?subject=${encodeURIComponent(subject)}&limit=${count}`,
  ];

  for (let i = 0; i < urls.length; i++) {
    try {
      onProgress?.(0.3 + i * 0.3);
      const qs = await tryEndpoint(urls[i]);
      onProgress?.(0.9);
      questions = qs.slice(0, count);
      if (questions.length > 0) break;
    } catch { /* try next */ }
  }

  // deduplicate
  const seen = new Set();
  questions = questions.filter(q => {
    const key = q.id || (q.question||'').slice(0,40);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  onProgress?.(1);
  return questions;
}

/* ═══════════════════════════════════════
   SETUP SCREEN
═══════════════════════════════════════ */
const JAMB_OPTIONAL_SUBJECTS = Object.entries(SUBJECTS_CONFIG)
  .filter(([k]) => k !== 'english')
  .map(([k,v]) => ({ key:k, ...v }));

function SetupScreen({ onStart, initialMode, initialSubject }) {
  const [mode, setMode] = useState(initialMode || 'jamb');
  const [subject, setSubject] = useState(initialSubject || 'mathematics');
  const [count, setCount] = useState(40);
  const [examType, setExamType] = useState('utme');
  // JAMB: english is required + user picks up to 3 more
  const [jambExtra, setJambExtra] = useState(['mathematics','physics','chemistry']);

  const toggleJambSubject = (key) => {
    setJambExtra(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, key];
    });
  };

  const MODES = [
    { k:'jamb',     icon:'fa-bullseye',       name:'JAMB',     desc:'English + 3 subjects · 2 hrs' },
    { k:'practice', icon:'fa-sync-alt',       name:'Practice', desc:'Custom subject & count' },
    { k:'waec',     icon:'fa-clipboard-list', name:'WAEC',     desc:'1 subject · 45 min' },
    { k:'postutme', icon:'fa-university',     name:'Post UTME', desc:'1 subject · 30 min' },
    { k:'topic',    icon:'fa-map-marker-alt', name:'Topic',    desc:'Practice by topic' },
  ];

  function handleStart() {
    if (mode === 'jamb') {
      if (jambExtra.length === 0) { alert('Please select at least 1 subject alongside English.'); return; }
      onStart({ mode, subject: jambExtra[0], count, examType, jambSubjects: jambExtra });
    } else {
      onStart({ mode, subject, count, examType });
    }
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-top">
          <img src="/nltc-dark.png" alt="NLTC" style={{ height:44, marginBottom:12, margin:'0 auto 12px' }} />
          <h1 className="setup-title">CBT Exam Practice</h1>
          <p className="setup-sub">Choose your exam mode to get started</p>
        </div>
        <div className="setup-body">
          <div className="mode-grid">
            {MODES.map(m => (
              <div key={m.k} className={`mode-card${mode===m.k?' selected':''}`} onClick={() => setMode(m.k)}>
                {mode===m.k && <span className="mode-rec">Selected</span>}
                <div className="mode-icon"><i className={`fas ${m.icon}`} /></div>
                <div className="mode-name">{m.name}</div>
                <div className="mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>

          {mode === 'jamb' && (
            <div className="jamb-subject-picker">
              <div className="section-label"><i className="fas fa-book" /> English (Required)</div>
              <div className="jamb-english-chip">
                <span><i className="fas fa-book" /> English Language</span>
                <span className="jamb-chip-lock"><i className="fas fa-lock" /></span>
              </div>
              <div className="section-label" style={{ marginTop:12 }}>
                Pick up to 3 more subjects ({jambExtra.length}/3)
              </div>
              <div className="jamb-subject-grid">
                {JAMB_OPTIONAL_SUBJECTS.map(s => (
                  <button
                    key={s.key}
                    className={`jamb-subj-chip${jambExtra.includes(s.key) ? ' selected' : ''}`}
                    onClick={() => toggleJambSubject(s.key)}
                    disabled={!jambExtra.includes(s.key) && jambExtra.length >= 3}
                  >
                    <i className={`fas ${s.icon}`} /> {s.name}
                    {jambExtra.includes(s.key) && <i className="fas fa-check" style={{ marginLeft:4 }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode !== 'jamb' && (
            <>
              <div className="section-label">Subject</div>
              <select className="ctrl-select" style={{ width:'100%', marginBottom:12 }} value={subject} onChange={e=>setSubject(e.target.value)}>
                {Object.entries(SUBJECTS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </>
          )}

          {mode === 'practice' && (
            <div className="custom-controls">
              <div className="ctrl-group">
                <div className="ctrl-label">Questions</div>
                <select className="ctrl-select" value={count} onChange={e=>setCount(Number(e.target.value))}>
                  {[20,30,40,50,60].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="ctrl-group">
                <div className="ctrl-label">Exam Type</div>
                <select className="ctrl-select" value={examType} onChange={e=>setExamType(e.target.value)}>
                  <option value="utme">UTME</option>
                  <option value="wassce">WASSCE</option>
                </select>
              </div>
            </div>
          )}

          <button className="start-btn" onClick={handleStart}>
            <i className="fas fa-play" /> Start Exam
          </button>

          <div className="powered-by">Powered by ALOC Question Bank</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   LOADING SCREEN
═══════════════════════════════════════ */
function LoadingScreen({ subjects, progress }) {
  return (
    <div className="loading-screen">
      <div className="loading-logo"><img src="/nltc-dark.png" alt="NLTC" style={{ height:48 }} /></div>
      <div className="loading-status-txt">Loading your exam questions…</div>
      <div className="load-subjects">
        {subjects.map((s,i) => {
          const cfg = SUBJECTS_CONFIG[s.key] || {};
          const pct = Math.round((progress[i] || 0) * 100);
          return (
            <div key={s.key} className="load-subj-row">
              <span className="load-subj-icon"><i className={`fas ${cfg.icon || 'fa-book'}`} /></span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span className="load-subj-name">{cfg.name}</span>
                  <span className="load-subj-count" style={{ fontFamily:'monospace', color:'var(--gold)', fontSize:'.72rem' }}>
                    {pct < 100 ? (pct < 40 ? 'Connecting…' : pct < 90 ? 'Downloading…' : 'Processing…') : `✓ ${s.questions?.length || 0} qs`}
                  </span>
                </div>
                <div className="load-subj-bar">
                  <div className="load-subj-fill" style={{ background: cfg.color || 'var(--gold)', width:`${pct}%`, transition:'width .3s' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="loading-spinner" />
    </div>
  );
}

/* ═══════════════════════════════════════
   EXAM SCREEN
═══════════════════════════════════════ */
function ExamScreen({ subjects, currentSubIdx, currentQIdx, answers, onAnswer, onNav, onSubmit, timeLeft, mode }) {
  const [mapOpen, setMapOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const sub = subjects[currentSubIdx];
  if (!sub) return null;
  const q = sub.questions[currentQIdx];
  if (!q) return null;
  const cfg = SUBJECTS_CONFIG[sub.key] || {};
  const subAnswers = answers[currentSubIdx] || {};
  const selectedAns = subAnswers[currentQIdx];
  const totalAnswered = subjects.reduce((acc, s, si) => acc + Object.keys(answers[si] || {}).length, 0);
  const totalQs = subjects.reduce((acc, s) => acc + s.questions.length, 0);

  /* Question map — no correct/wrong during exam */
  const QuestionMap = () => (
    <div className={`qmap-panel${mapOpen ? ' open' : ''}`}>
      <div className="qmap-panel-header">
        <span>Question Map</span>
        <button onClick={() => setMapOpen(false)}><i className="fas fa-times" /></button>
      </div>
      {subjects.map((s, si) => {
        const sCfg = SUBJECTS_CONFIG[s.key] || {};
        return (
          <div key={si} style={{ marginBottom:14 }}>
            <div style={{ fontSize:'.68rem', fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>
              {sCfg.icon && <i className={`fas ${sCfg.icon}`} />} {sCfg.name}
            </div>
            <div className="qmap-grid-exam">
              {s.questions.map((_, qi) => {
                const ans = (answers[si] || {})[qi];
                const isCurrent = si === currentSubIdx && qi === currentQIdx;
                return (
                  <button
                    key={qi}
                    className={`qmap-dot-exam${isCurrent ? ' current' : ans ? ' answered' : ''}`}
                    onClick={() => { onNav(si, qi); setMapOpen(false); }}
                  >
                    {qi + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop:12, fontSize:'.7rem', color:'rgba(255,255,255,.35)' }}>
        {totalAnswered}/{totalQs} answered
      </div>
    </div>
  );

  const isLastQ   = currentQIdx >= sub.questions.length - 1;
  const isLastSub = currentSubIdx >= subjects.length - 1;
  const isVeryLast = isLastQ && isLastSub;

  return (
    <div className="exam-screen">
      {/* Topbar */}
      <div className="exam-topbar">
        <div className="exam-logo-sm">
          <img src="/nltc-light.png" alt="NLTC" style={{ height:32 }} />
        </div>
        <div className="exam-subject-pills">
          {subjects.map((s,si) => {
            const sCfg = SUBJECTS_CONFIG[s.key] || {};
            const done = Object.keys(answers[si]||{}).length;
            return (
              <button
                key={si}
                className={`exam-sub-pill${si===currentSubIdx?' active':''}`}
                style={{ '--pill-color': sCfg.color }}
                onClick={() => onNav(si, 0)}
              >
                {sCfg.icon && <i className={`fas ${sCfg.icon}`} />} {sCfg.name.split(' ')[0]}
                <span className="pill-count">{done}/{s.questions.length}</span>
              </button>
            );
          })}
        </div>
        <div className={`exam-timer${timeLeft !== null && timeLeft < 60 ? ' danger' : timeLeft !== null && timeLeft < 300 ? ' warn' : ''}`}>
          <i className="fas fa-clock" /> {timeLeft !== null ? fmtTime(timeLeft) : '∞'}
        </div>
        <button className="exam-map-btn" onClick={() => setMapOpen(o => !o)}>
          <i className="fas fa-th" />
          <span className="exam-map-badge">{totalAnswered}</span>
        </button>
        <button className="exam-calc-btn" onClick={() => setCalcOpen(o => !o)} title="Calculator">
          <i className="fas fa-calculator" />
        </button>
      </div>

      {/* Floating calculator */}
      {calcOpen && (
        <div className="exam-calc-float">
          <Calculator onClose={() => setCalcOpen(false)} />
        </div>
      )}

      {/* Progress bar */}
      <div className="exam-progress-bar">
        <div style={{ width:`${(totalAnswered/Math.max(totalQs,1))*100}%`, height:'100%', background:'var(--gold)', transition:'width .3s', borderRadius:2 }} />
      </div>

      {/* Main content */}
      <div className="exam-body">
        {/* Question */}
        <div className="exam-question-wrap">
          <div className="exam-q-header">
            <span className="exam-q-label" style={{ color: cfg.color }}>{cfg.icon && <i className={`fas ${cfg.icon}`} />} {cfg.name}</span>
            <span className="exam-q-num">Q{currentQIdx + 1} of {sub.questions.length}</span>
            {q.year && <span className="exam-year-tag">{q.year}</span>}
          </div>
          <div className="exam-q-text" dangerouslySetInnerHTML={{ __html: q.question || q.body || '' }} />
          {q.image && <img src={q.image} alt="question" className="exam-q-img" />}

          {/* Options — neutral styling, selected highlight only, NO green/red */}
          <div className="exam-options">
            {OPTION_KEYS.map((k, ki) => {
              const text = getOptionText(q, k);
              if (!text) return null;
              const isSelected = selectedAns === k;
              return (
                <button
                  key={k}
                  className={`exam-option${isSelected ? ' selected' : ''}`}
                  onClick={() => onAnswer(currentSubIdx, currentQIdx, k)}
                >
                  <span className="opt-label" style={{ background: isSelected ? cfg.color : undefined, color: isSelected ? 'white' : undefined }}>
                    {OPTION_LABELS[ki]}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: text }} />
                </button>
              );
            })}
          </div>

          {/* Nav buttons */}
          <div className="exam-nav-row">
            <button
              className="btn-outline btn-sm"
              onClick={() => {
                if (currentQIdx > 0) onNav(currentSubIdx, currentQIdx - 1);
                else if (currentSubIdx > 0) onNav(currentSubIdx - 1, subjects[currentSubIdx-1].questions.length - 1);
              }}
              disabled={currentQIdx === 0 && currentSubIdx === 0}
            >
              <i className="fas fa-arrow-left" /> Previous
            </button>

            {isVeryLast ? (
              <button className="btn-gold" onClick={() => setConfirmOpen(true)}>
                <i className="fas fa-paper-plane" /> Submit Exam
              </button>
            ) : (
              <button
                className="btn-navy"
                onClick={() => {
                  if (!isLastQ) onNav(currentSubIdx, currentQIdx + 1);
                  else if (!isLastSub) onNav(currentSubIdx + 1, 0);
                }}
              >
                Next <i className="fas fa-arrow-right" />
              </button>
            )}
          </div>
        </div>

        <QuestionMap />
      </div>

      {/* Submit confirm */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit Exam?">
        <p style={{ fontSize:'.9rem', color:'var(--text-2)', marginBottom:20, lineHeight:1.6 }}>
          You have answered <strong>{totalAnswered}</strong> of <strong>{totalQs}</strong> questions.
          {totalQs - totalAnswered > 0 && <> <span style={{ color:'var(--error)' }}>{totalQs - totalAnswered} unanswered</span> will be marked wrong.</>}
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-outline" style={{ flex:1, justifyContent:'center' }} onClick={() => setConfirmOpen(false)}>Continue</button>
          <button className="btn-error" style={{ flex:1, justifyContent:'center' }} onClick={() => { setConfirmOpen(false); onSubmit(); }}>
            <i className="fas fa-paper-plane" /> Submit Now
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════
   RESULTS SCREEN
═══════════════════════════════════════ */
function ResultsScreen({ subjects, answers, elapsed, mode, onReview, onRetry, onExit }) {
  const results = subjects.map((s, si) => {
    let correct = 0, wrong = 0, skipped = 0;
    s.questions.forEach((q, qi) => {
      const ans = (answers[si]||{})[qi];
      if (!ans) skipped++;
      else if (ans === getAnswer(q)) correct++;
      else wrong++;
    });
    const total = s.questions.length;
    return { key:s.key, name:s.name, correct, wrong, skipped, total, pct:Math.round(correct/total*100) };
  });

  const totalCorrect  = results.reduce((a,r) => a+r.correct, 0);
  const totalQs       = results.reduce((a,r) => a+r.total, 0);
  const overallPct    = Math.round(totalCorrect / totalQs * 100);
  const jambScore     = mode === 'jamb' ? Math.round(overallPct / 100 * 400) : null;
  const pass          = mode === 'jamb' ? jambScore >= 200 : overallPct >= 50;

  return (
    <div className="results-screen">
      <div className="results-card">
        <div className="results-top">
          <div className="results-score-ring">
            <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={pass?'#34D399':'#F87171'} strokeWidth="8"
                strokeDasharray={`${overallPct*2.639} 264`} strokeDashoffset="66" strokeLinecap="round" />
            </svg>
            <div className="results-score-inner">
              {jambScore !== null ? (
                <>
                  <div className="results-score-main">{jambScore}</div>
                  <div className="results-score-sub">/400</div>
                </>
              ) : (
                <>
                  <div className="results-score-main">{overallPct}%</div>
                  <div className="results-score-sub">{totalCorrect}/{totalQs}</div>
                </>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-cbt-head)', fontSize:'1.1rem', fontWeight:800, color:'white', marginBottom:4 }}>
              {pass ? <><i className="fas fa-trophy" /> Excellent Work!</> : <><i className="fas fa-book" /> Keep Practising</>}
            </div>
            <div className={`results-verdict ${pass?'pass':'fail'}`}>{pass ? 'PASSED' : 'FAILED'}</div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:'.78rem', marginTop:6 }}>
              Time: {fmtTime(elapsed)}
            </div>
          </div>
        </div>

        {/* Per-subject breakdown */}
        <div className="results-subjects">
          {results.map(r => {
            const cfg = SUBJECTS_CONFIG[r.key] || {};
            return (
              <div key={r.key} className="results-subj-row">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span><i className={`fas ${cfg.icon || 'fa-book'}`} /></span>
                  <span style={{ fontWeight:700, fontSize:'.84rem', color:'white' }}>{cfg.name || r.name}</span>
                  <span style={{ marginLeft:'auto', fontWeight:800, color: r.pct>=50?'#34D399':'#F87171' }}>{r.pct}%</span>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:'.72rem', color:'rgba(255,255,255,.5)' }}>
                  <span style={{ color:'#34D399' }}><i className="fas fa-check" /> {r.correct}</span>
                  <span style={{ color:'#F87171' }}><i className="fas fa-times" /> {r.wrong}</span>
                  <span style={{ color:'rgba(255,255,255,.4)' }}><i className="fas fa-minus" /> {r.skipped}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="results-actions">
          <button className="results-btn" onClick={onReview}><i className="fas fa-eye" /> Review Answers</button>
          <button className="results-btn primary" onClick={onRetry}><i className="fas fa-redo" /> Try Again</button>
          <button className="results-btn" onClick={onExit}><i className="fas fa-home" /> Dashboard</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   REVIEW SCREEN
═══════════════════════════════════════ */
function ReviewScreen({ subjects, answers, onBack }) {
  const [si, setSi] = useState(0);
  const [qi, setQi] = useState(0);
  const [filter, setFilter] = useState('all');

  const sub = subjects[si];
  if (!sub) return null;
  const q = sub.questions[qi];
  const cfg = SUBJECTS_CONFIG[sub.key] || {};
  const subAnswers = answers[si] || {};
  const userAns = subAnswers[qi];
  const correctKey = getAnswer(q);

  function navigate(dir) {
    if (dir === 'next') {
      if (qi < sub.questions.length - 1) setQi(q => q+1);
      else if (si < subjects.length - 1) { setSi(s => s+1); setQi(0); }
    } else {
      if (qi > 0) setQi(q => q-1);
      else if (si > 0) { setSi(s => s-1); setQi(subjects[si-1].questions.length-1); }
    }
  }

  return (
    <div className="review-screen">
      {/* Header */}
      <div className="review-header">
        <button className="btn-outline btn-sm" onClick={onBack}><i className="fas fa-arrow-left" /> Results</button>
        <div className="filter-pills">
          {['all','correct','wrong','skipped'].map(f => (
            <button key={f} className={`filter-pill${filter===f?' active':''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Subject tabs */}
      <div className="review-sub-tabs">
        {subjects.map((s,i) => (
          <button key={i} className={`review-sub-tab${i===si?' active':''}`} onClick={() => { setSi(i); setQi(0); }}>
            {(SUBJECTS_CONFIG[s.key]||{}).icon && <i className={`fas ${(SUBJECTS_CONFIG[s.key]||{}).icon}`} />} {(SUBJECTS_CONFIG[s.key]||{}).name?.split(' ')[0] || s.key}
          </button>
        ))}
      </div>

      {/* Question map — shows correct/wrong */}
      <div className="review-qmap">
        {sub.questions.map((_,i) => {
          const ans = subAnswers[i];
          const isCorrect = ans === getAnswer(sub.questions[i]);
          let cls = 'qmap-dot-exam';
          if (!ans) cls += ' skipped';
          else if (isCorrect) cls += ' correct';
          else cls += ' wrong';
          if (i === qi) cls += ' current';
          return (
            <button key={i} className={cls} onClick={() => setQi(i)}>{i+1}</button>
          );
        })}
      </div>

      {/* Question card */}
      <div className="review-question-card">
        <div className="exam-q-header">
          <span className="exam-q-label" style={{ color:cfg.color }}>{cfg.icon && <i className={`fas ${cfg.icon}`} />} {cfg.name}</span>
          <span className="exam-q-num">Q{qi+1}</span>
          {q.year && <span className="exam-year-tag">{q.year}</span>}
        </div>
        <div className="exam-q-text" dangerouslySetInnerHTML={{ __html: q.question || q.body || '' }} />
        {q.image && <img src={q.image} alt="" className="exam-q-img" />}

        <div className="exam-options">
          {OPTION_KEYS.map((k,ki) => {
            const text = getOptionText(q, k);
            if (!text) return null;
            const isCorrect = k === correctKey;
            const isUserWrong = k === userAns && !isCorrect;
            let cls = 'exam-option review-opt';
            if (isCorrect) cls += ' correct';
            else if (isUserWrong) cls += ' wrong';
            return (
              <div key={k} className={cls}>
                <span className="opt-label">{OPTION_LABELS[ki]}</span>
                <span dangerouslySetInnerHTML={{ __html: text }} />
                {isCorrect && <span style={{ marginLeft:'auto', color:'#34D399', fontSize:'.85rem' }}><i className="fas fa-check" /></span>}
                {isUserWrong && <span style={{ marginLeft:'auto', color:'#F87171', fontSize:'.85rem' }}><i className="fas fa-times" /></span>}
              </div>
            );
          })}
        </div>

        {/* Explanation — ONLY in review */}
        {(q.explanation || q.solution) && (
          <div className="review-explanation">
            <div className="review-explanation-label"><i className="fas fa-lightbulb" /> Explanation</div>
            <div dangerouslySetInnerHTML={{ __html: q.explanation || q.solution }} />
          </div>
        )}
      </div>

      <div className="exam-nav-row" style={{ marginTop:14 }}>
        <button className="btn-outline btn-sm" onClick={() => navigate('prev')} disabled={si===0&&qi===0}>
          <i className="fas fa-arrow-left" /> Previous
        </button>
        <button className="btn-navy btn-sm" onClick={() => navigate('next')} disabled={si===subjects.length-1&&qi===sub.questions.length-1}>
          Next <i className="fas fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN CBT PAGE
═══════════════════════════════════════ */
export default function CBTPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const backendFetch = useBackendFetch();

  const [phase, setPhase] = useState('setup');
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState([]);
  const [currentSubIdx, setCurrentSubIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const modeRef = useRef('jamb');

  const initialMode    = searchParams.get('mode') || 'jamb';
  const initialSubject = searchParams.get('subject') || 'mathematics';

  function clearTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }

  async function handleStart({ mode, subject, count, examType, jambSubjects }) {
    modeRef.current = mode;
    setPhase('loading');

    let queue = [];
    if (mode === 'jamb') {
      const extras = (jambSubjects || [subject || 'mathematics']).slice(0, 3);
      queue = [
        { key:'english', count:60 },
        ...extras.map(k => ({ key:k, count:40 })),
      ].filter((v,i,a) => a.findIndex(x=>x.key===v.key)===i);
    } else {
      queue = [{ key:subject, count }];
    }

    const progs = queue.map(() => 0);
    setProgress([...progs]);
    setSubjects(queue.map(q => ({ key:q.key, questions:[], name:(SUBJECTS_CONFIG[q.key]||{}).name||q.key })));

    const results = await Promise.allSettled(queue.map(async (sl, i) => {
      const qs = await fetchAlocQuestions(sl.key, sl.count, examType || 'utme', (p) => {
        progs[i] = p;
        setProgress([...progs]);
      });
      return { key:sl.key, questions:qs, name:(SUBJECTS_CONFIG[sl.key]||{}).name||sl.key };
    }));

    const loaded = results
      .filter(r => r.status === 'fulfilled' && r.value.questions.length > 0)
      .map(r => r.value);

    if (loaded.length === 0) {
      showToast('Failed to load questions. Check your connection.', 'error');
      setPhase('setup'); return;
    }

    setSubjects(loaded);
    setProgress(loaded.map(() => 1));
    setAnswers(loaded.map(() => ({})));
    setCurrentSubIdx(0);
    setCurrentQIdx(0);

    const t0 = Date.now();
    setStartTime(t0);

    // Timer setup
    const TIMERS = { jamb:7200, waec:2700, postutme:1800 };
    const secs = TIMERS[mode] || null;
    setTimeLeft(secs);
    if (secs) {
      clearTimer();
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearTimer(); handleSubmit(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }

    setPhase('exam');
  }

  function handleAnswer(si, qi, key) {
    setAnswers(prev => {
      const next = prev.map((s,i) => i === si ? { ...s, [qi]: key } : s);
      return next;
    });
  }

  function handleNav(si, qi) { setCurrentSubIdx(si); setCurrentQIdx(qi); }

  function handleSubmit() {
    clearTimer();
    setElapsed(startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);
    setPhase('results');

    // Award XP
    const totalCorrect = subjects.reduce((acc, s, si) => {
      return acc + s.questions.filter((q,qi) => (answers[si]||{})[qi] === getAnswer(q)).length;
    }, 0);
    const totalQs = subjects.reduce((acc, s) => acc + s.questions.length, 0);
    const mainSub = subjects[0]?.key || 'general';
    backendFetch('POST', '/gamification/cbt-session', {
      subject: mainSub, exam: modeRef.current, score: Math.round(totalCorrect/totalQs*100),
      correct: totalCorrect, total: totalQs,
    }).catch(() => {});

    // Notify parent
    if (window.opener) {
      window.opener.postMessage({ type:'nltc_cbt_score', score:Math.round(totalCorrect/totalQs*100), subject:mainSub, correct:totalCorrect, total:totalQs }, '*');
    }
  }

  function handleRetry() { clearTimer(); setPhase('setup'); }
  function handleExit()  { clearTimer(); navigate('/dashboard'); }

  if (phase === 'setup')   return <SetupScreen onStart={handleStart} initialMode={initialMode} initialSubject={initialSubject} />;
  if (phase === 'loading') return <LoadingScreen subjects={subjects} progress={progress} />;
  if (phase === 'results') return <ResultsScreen subjects={subjects} answers={answers} elapsed={elapsed} mode={modeRef.current} onReview={() => setPhase('review')} onRetry={handleRetry} onExit={handleExit} />;
  if (phase === 'review')  return <ReviewScreen subjects={subjects} answers={answers} onBack={() => setPhase('results')} />;

  return (
    <ExamScreen
      subjects={subjects} currentSubIdx={currentSubIdx} currentQIdx={currentQIdx}
      answers={answers} timeLeft={timeLeft} mode={modeRef.current}
      onAnswer={handleAnswer} onNav={handleNav} onSubmit={handleSubmit}
    />
  );
}
