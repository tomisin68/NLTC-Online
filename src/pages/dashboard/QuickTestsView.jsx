import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { SkeletonListItem } from '../../components/ui/Skeleton';
import { showToast } from '../../contexts/ToastContext';

export default function QuickTestsView() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getDocs(collection(db,'quickTests'))
      .then(snap => setTests(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, []);

  function startTest(test) { setActive(test); setAnswers({}); setSubmitted(false); }

  function handleAnswer(qi, key) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qi]: key }));
  }

  function handleSubmit() {
    setSubmitted(true);
    const questions = active?.questions || [];
    const correct = questions.filter((q,i) => answers[i] === (q.answer||'').toLowerCase()).length;
    showToast(`Score: ${correct}/${questions.length}`, correct >= questions.length/2 ? 'success' : 'info');
  }

  if (active) {
    const questions = active.questions || [];
    return (
      <div>
        <div className="page-hdr">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="btn-outline btn-sm" onClick={() => setActive(null)}><i className="fas fa-arrow-left" /></button>
            <h2>{active.title}</h2>
          </div>
        </div>
        {questions.map((q,i) => {
          const ans = answers[i];
          const correctKey = (q.answer||'').toLowerCase();
          return (
            <div key={i} className="card" style={{ marginBottom:12 }}>
              <div className="card-body">
                <div style={{ fontWeight:700, marginBottom:10 }}>Q{i+1}. {q.question}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {['a','b','c','d'].map(k => {
                    const text = q[k] || q[`option_${k}`] || '';
                    if (!text) return null;
                    let cls = 'quick-option';
                    if (submitted) {
                      if (k === correctKey) cls += ' opt-correct';
                      else if (k === ans && k !== correctKey) cls += ' opt-wrong';
                    } else if (k === ans) {
                      cls += ' selected';
                    }
                    return (
                      <button key={k} className={cls} onClick={() => handleAnswer(i, k)}>
                        <span className="opt-letter">{k.toUpperCase()}</span>
                        {text}
                        {submitted && k === correctKey && <i className="fas fa-check" style={{ marginLeft:'auto', color:'var(--success)' }} />}
                        {submitted && k === ans && k !== correctKey && <i className="fas fa-times" style={{ marginLeft:'auto', color:'var(--error)' }} />}
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="quiz-explanation" style={{ marginTop:10 }}>
                    <div className="quiz-explanation-label"><i className="fas fa-lightbulb" /> Explanation</div>
                    <div style={{ fontSize:'.82rem' }}>{q.explanation}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!submitted ? (
          <button className="btn-gold" style={{ width:'100%', justifyContent:'center', padding:'12px' }} onClick={handleSubmit}>
            <i className="fas fa-paper-plane" /> Submit Test
          </button>
        ) : (
          <button className="btn-outline" style={{ width:'100%', justifyContent:'center', padding:'12px' }} onClick={() => setActive(null)}>
            <i className="fas fa-arrow-left" /> Back to Tests
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-hdr"><h2>Quick Tests</h2><p>Short, focused tests to sharpen specific skills.</p></div>
      {loading ? (
        <div className="card card-body">{Array.from({length:5}).map((_,i) => <SkeletonListItem key={i} />)}</div>
      ) : tests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-bolt" /></div>
          <h3>No quick tests yet</h3>
          <p>New tests are added regularly. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {tests.map(t => (
            <div key={t.id} className="card">
              <div className="card-body" style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ fontSize:'1.5rem', color:'var(--gold)' }}><i className="fas fa-bolt" /></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'.9rem', color:'var(--navy)' }}>{t.title}</div>
                  <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:2 }}>
                    {t.subject} · {t.questions?.length || 0} questions
                  </div>
                </div>
                <button className="btn-gold btn-sm" onClick={() => startTest(t)}>
                  <i className="fas fa-play" /> Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
