import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useBackendFetch } from '../../hooks/useBackendFetch';
import { showToast } from '../../contexts/ToastContext';
import Calculator from '../../components/ui/Calculator';

/* ─── helpers ─── */
const SUBJECTS = ['Mathematics','English','Physics','Chemistry','Biology','Economics','Government','Literature'];
const OPTION_KEYS = ['a','b','c','d'];
const OPTION_LABELS = ['A','B','C','D'];

function getOptionText(q, key) { return q[key] || q[`option_${key}`] || q.options?.[key] || q.option?.[key] || ''; }
function getAnswer(q) { return (q.answer || q.correct_option || '').toLowerCase(); }

/* ─── Setup screen ─── */
function SetupScreen({ onStart }) {
  const [subject, setSubject] = useState('Mathematics');
  const [count, setCount] = useState(20);
  return (
    <div className="quiz-setup">
      <div className="quiz-setup-card">
        <div className="quiz-setup-top">
          <div style={{ fontSize:'2.5rem', marginBottom:10, color:'var(--gold)' }}><i className="fas fa-file-alt" /></div>
          <h2 className="quiz-setup-title">NLTC Official Quiz</h2>
          <p className="quiz-setup-sub">Test yourself with our curated question bank</p>
        </div>
        <div className="quiz-setup-body">
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-select" value={subject} onChange={e=>setSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Number of questions</label>
            <select className="form-select" value={count} onChange={e=>setCount(Number(e.target.value))}>
              {[10,20,30,40,50].map(n => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>
          <button className="btn-gold" style={{ width:'100%', justifyContent:'center', padding:'12px' }} onClick={() => onStart(subject, count)}>
            <i className="fas fa-play" /> Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading screen ─── */
function LoadingScreen() {
  return (
    <div className="quiz-loading">
      <div className="spinner" style={{ width:36, height:36, borderWidth:3 }} />
      <p style={{ color:'var(--text-3)', marginTop:12 }}>Loading questions…</p>
    </div>
  );
}

/* ─── Question Map ─── */
function QuestionMap({ questions, answers, currentIdx, phase, onJump }) {
  return (
    <div className="qmap-wrap">
      <div className="qmap-title">Questions</div>
      <div className="qmap-grid">
        {questions.map((q, i) => {
          const ans = answers[i];
          let cls = 'qmap-dot';
          if (phase === 'review') {
            if (!ans) cls += ' qmap-skipped';
            else if (ans === getAnswer(q)) cls += ' qmap-correct';
            else cls += ' qmap-wrong';
          } else {
            if (ans) cls += ' qmap-answered';
          }
          if (i === currentIdx) cls += ' qmap-current';
          return (
            <button key={i} className={cls} onClick={() => onJump(i)}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="qmap-legend">
        {phase === 'review' ? (
          <>
            <span className="qmap-leg qmap-correct" /> Correct
            <span className="qmap-leg qmap-wrong" style={{marginLeft:8}} /> Wrong
            <span className="qmap-leg qmap-skipped" style={{marginLeft:8}} /> Skipped
          </>
        ) : (
          <>
            <span className="qmap-leg qmap-answered" /> Answered
            <span className="qmap-leg" style={{marginLeft:8}} /> Unanswered
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Exam screen ─── */
function ExamScreen({ questions, answers, currentIdx, onAnswer, onPrev, onNext, onSubmit, timeLeft, subject }) {
  const [calcOpen, setCalcOpen] = useState(false);
  const q = questions[currentIdx];
  const selectedAns = answers[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const isLast = currentIdx === questions.length - 1;

  function fmtTime(s) {
    const m = Math.floor(s/60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  return (
    <div className="quiz-exam">
      {/* Top bar */}
      <div className="quiz-topbar">
        <div className="quiz-progress-info">
          <span className="quiz-qnum">{currentIdx + 1} / {questions.length}</span>
          <span className="quiz-subject-tag">{subject}</span>
        </div>
        <div className={`quiz-timer${timeLeft !== null && timeLeft < 60 ? ' danger' : timeLeft !== null && timeLeft < 300 ? ' warn' : ''}`}>
          {timeLeft !== null ? <><i className="fas fa-clock" /> {fmtTime(timeLeft)}</> : null}
        </div>
        <div className="quiz-answered-count">{answeredCount}/{questions.length} answered</div>
        <button className="quiz-calc-btn" onClick={() => setCalcOpen(o => !o)} title="Calculator">
          <i className="fas fa-calculator" />
        </button>
      </div>

      {calcOpen && (
        <div className="quiz-calc-float">
          <Calculator onClose={() => setCalcOpen(false)} />
        </div>
      )}

      {/* Progress bar */}
      <div style={{ height:3, background:'var(--surface-2)' }}>
        <div style={{ height:'100%', background:'var(--gold)', width:`${((currentIdx+1)/questions.length)*100}%`, transition:'width .3s' }} />
      </div>

      <div className="quiz-body">
        <div className="quiz-main">
          {/* Question */}
          <div className="quiz-question-card">
            <div className="quiz-q-num">Question {currentIdx + 1}</div>
            <div className="quiz-q-text" dangerouslySetInnerHTML={{ __html: q.question || q.body || '' }} />
            {q.image && <img src={q.image} alt="question" className="quiz-q-img" />}

            {/* Options — no immediate correct/wrong reveal */}
            <div className="quiz-options">
              {OPTION_KEYS.map((k, ki) => {
                const text = getOptionText(q, k);
                if (!text) return null;
                const isSelected = selectedAns === k;
                return (
                  <button
                    key={k}
                    className={`quiz-option${isSelected ? ' selected' : ''}`}
                    onClick={() => onAnswer(currentIdx, k)}
                  >
                    <span className="opt-letter">{OPTION_LABELS[ki]}</span>
                    <span dangerouslySetInnerHTML={{ __html: text }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="quiz-nav-btns">
            <button className="btn-outline" onClick={onPrev} disabled={currentIdx === 0}>
              <i className="fas fa-arrow-left" /> Previous
            </button>
            {isLast ? (
              <button className="btn-gold" onClick={onSubmit}>
                <i className="fas fa-paper-plane" /> Submit Quiz
              </button>
            ) : (
              <button className="btn-navy" onClick={onNext}>
                Next <i className="fas fa-arrow-right" />
              </button>
            )}
          </div>
        </div>

        {/* Question map sidebar */}
        <div className="quiz-sidebar-map">
          <QuestionMap questions={questions} answers={answers} currentIdx={currentIdx} phase="exam" onJump={(i) => { /* handled by parent */ }} />
          <button className="btn-error btn-sm" style={{ width:'100%', marginTop:12, justifyContent:'center' }} onClick={onSubmit}>
            <i className="fas fa-paper-plane" /> Submit Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Results screen ─── */
function ResultsScreen({ questions, answers, subject, elapsed, onReview, onRetry }) {
  let correct = 0, wrong = 0, skipped = 0;
  questions.forEach((q, i) => {
    const ans = answers[i];
    if (!ans) skipped++;
    else if (ans === getAnswer(q)) correct++;
    else wrong++;
  });
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);
  const pass = pct >= 50;
  const minutes = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="quiz-results">
      <div className="quiz-score-ring-wrap">
        <svg viewBox="0 0 100 100" className="quiz-score-ring">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={pass?'var(--success)':'var(--error)'} strokeWidth="8"
            strokeDasharray={`${pct * 2.639} 264`} strokeDashoffset="66" strokeLinecap="round"
            style={{ transition:'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="quiz-score-label">
          <div className="quiz-score-pct" style={{ color: pass ? 'var(--success)' : 'var(--error)' }}>{pct}%</div>
          <div className="quiz-score-tag">{pass ? <><i className="fas fa-check" /> PASSED</> : 'TRY AGAIN'}</div>
        </div>
      </div>

      <div className="quiz-result-stats">
        <div className="qrs-item qrs-correct"><span>{correct}</span> Correct</div>
        <div className="qrs-item qrs-wrong"><span>{wrong}</span> Wrong</div>
        <div className="qrs-item qrs-skip"><span>{skipped}</span> Skipped</div>
        <div className="qrs-item"><span>{minutes}m {secs}s</span> Time</div>
      </div>

      <p style={{ textAlign:'center', color:'var(--text-3)', fontSize:'.82rem', marginBottom:24 }}>
        You scored {correct} out of {total} in {subject}
      </p>

      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <button className="btn-navy" onClick={onReview}><i className="fas fa-eye" /> Review Answers</button>
        <button className="btn-gold" onClick={onRetry}><i className="fas fa-redo" /> Try Again</button>
      </div>
    </div>
  );
}

/* ─── Review screen ─── */
function ReviewScreen({ questions, answers, onBack }) {
  const [filter, setFilter] = useState('all');
  const [currentIdx, setCurrentIdx] = useState(0);

  const filtered = questions.map((q,i) => ({ q, i, ans: answers[i], correct: answers[i] === getAnswer(q) }))
    .filter(({ans, correct}) => {
      if (filter === 'wrong') return ans && !correct;
      if (filter === 'skipped') return !ans;
      return true;
    });

  if (filtered.length === 0) return (
    <div className="quiz-review">
      <div className="empty-state"><div className="empty-state-icon"><i className="fas fa-trophy" /></div><h3>All correct!</h3><p>No {filter} questions to review.</p></div>
      <div style={{ textAlign:'center', marginTop:16 }}>
        <button className="btn-outline" onClick={onBack}><i className="fas fa-arrow-left" /> Back to results</button>
      </div>
    </div>
  );

  const item = filtered[currentIdx] || filtered[0];
  if (!item) return null;
  const { q, i, ans } = item;
  const correctKey = getAnswer(q);

  return (
    <div className="quiz-review">
      <div className="quiz-review-header">
        <button className="btn-outline btn-sm" onClick={onBack}><i className="fas fa-arrow-left" /> Results</button>
        <div className="filter-pills">
          {['all','wrong','skipped'].map(f => (
            <button key={f} className={`filter-pill${filter===f?' active':''}`} onClick={() => { setFilter(f); setCurrentIdx(0); }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ fontSize:'.78rem', color:'var(--text-3)' }}>{currentIdx+1}/{filtered.length}</span>
      </div>

      {/* Question map */}
      <div className="qmap-wrap" style={{ marginBottom:16 }}>
        <div className="qmap-grid">
          {filtered.map((item2, fi) => {
            let cls = `qmap-dot${fi === currentIdx ? ' qmap-current' : ''}`;
            if (!item2.ans) cls += ' qmap-skipped';
            else if (item2.correct) cls += ' qmap-correct';
            else cls += ' qmap-wrong';
            return <button key={fi} className={cls} onClick={() => setCurrentIdx(fi)}>{item2.i+1}</button>;
          })}
        </div>
      </div>

      {/* Review card */}
      <div className="quiz-review-card">
        <div className="quiz-q-num">Question {i + 1}</div>
        <div className="quiz-q-text" dangerouslySetInnerHTML={{ __html: q.question || q.body || '' }} />
        {q.image && <img src={q.image} alt="question" className="quiz-q-img" />}

        <div className="quiz-options review-mode">
          {OPTION_KEYS.map((k, ki) => {
            const text = getOptionText(q, k);
            if (!text) return null;
            const isCorrect = k === correctKey;
            const isUserAns = k === ans;
            let cls = 'quiz-option';
            if (isCorrect) cls += ' opt-correct';
            else if (isUserAns && !isCorrect) cls += ' opt-wrong';
            return (
              <div key={k} className={cls}>
                <span className="opt-letter">{OPTION_LABELS[ki]}</span>
                <span dangerouslySetInnerHTML={{ __html: text }} />
                {isCorrect && <span className="opt-marker correct"><i className="fas fa-check" /></span>}
                {isUserAns && !isCorrect && <span className="opt-marker wrong"><i className="fas fa-times" /></span>}
              </div>
            );
          })}
        </div>

        {/* Explanation — only shown in review */}
        {(q.explanation || q.solution) && (
          <div className="quiz-explanation">
            <div className="quiz-explanation-label"><i className="fas fa-lightbulb" /> Explanation</div>
            <div dangerouslySetInnerHTML={{ __html: q.explanation || q.solution }} />
          </div>
        )}
      </div>

      <div className="quiz-nav-btns" style={{ marginTop:16 }}>
        <button className="btn-outline" onClick={() => setCurrentIdx(p => Math.max(0,p-1))} disabled={currentIdx===0}>
          <i className="fas fa-arrow-left" /> Previous
        </button>
        <button className="btn-navy" onClick={() => setCurrentIdx(p => Math.min(filtered.length-1,p+1))} disabled={currentIdx===filtered.length-1}>
          Next <i className="fas fa-arrow-right" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function NLTCQuizView() {
  const backendFetch = useBackendFetch();
  const [phase, setPhase] = useState('setup'); // setup | loading | exam | results | review
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [elapsedInterval, setElapsedInterval] = useState(null);

  function cleanup() {
    if (elapsedInterval) clearInterval(elapsedInterval);
  }

  async function startQuiz(subj, count) {
    setSubject(subj);
    setPhase('loading');
    try {
      const snap = await getDocs(collection(db,'questions'));
      let all = snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .filter(q => (q.subject || '').toLowerCase() === subj.toLowerCase());
      if (all.length === 0) throw new Error('No questions found for this subject');
      // shuffle & slice
      all = all.sort(() => Math.random() - .5).slice(0, count);
      setQuestions(all);
      setAnswers({});
      setCurrentIdx(0);
      const t = Date.now();
      setStartTime(t);
      const iv = setInterval(() => setElapsed(Math.floor((Date.now() - t) / 1000)), 1000);
      setElapsedInterval(iv);
      setPhase('exam');
    } catch (err) {
      showToast(err.message || 'Failed to load questions', 'error');
      setPhase('setup');
    }
  }

  function handleAnswer(idx, key) {
    setAnswers(prev => ({ ...prev, [idx]: key }));
  }

  function handleSubmit() {
    cleanup();
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    setPhase('results');
    // Award XP
    const correct = questions.filter((q,i) => answers[i] === getAnswer(q)).length;
    const pct = correct / questions.length;
    backendFetch('POST', '/gamification/cbt-session', {
      subject, exam: 'nltc_quiz', score: pct * 100,
      correct, total: questions.length
    }).catch(() => {});
  }

  function jumpTo(idx) { setCurrentIdx(idx); }

  if (phase === 'setup') return <SetupScreen onStart={startQuiz} />;
  if (phase === 'loading') return <LoadingScreen />;
  if (phase === 'results') return (
    <ResultsScreen questions={questions} answers={answers} subject={subject} elapsed={elapsed}
      onReview={() => setPhase('review')}
      onRetry={() => { cleanup(); setPhase('setup'); }} />
  );
  if (phase === 'review') return (
    <ReviewScreen questions={questions} answers={answers} onBack={() => setPhase('results')} />
  );

  return (
    <ExamScreen
      questions={questions} answers={answers} currentIdx={currentIdx} subject={subject} timeLeft={null}
      onAnswer={handleAnswer}
      onPrev={() => setCurrentIdx(p => Math.max(0, p-1))}
      onNext={() => setCurrentIdx(p => Math.min(questions.length-1, p+1))}
      onSubmit={handleSubmit}
    />
  );
}
