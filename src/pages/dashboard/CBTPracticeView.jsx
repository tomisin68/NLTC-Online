import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { formatDate } from '../../contexts/AuthContext';

const SUBJECTS = [
  { key:'mathematics', name:'Mathematics', emoji:'📐', color:'#2E90FA' },
  { key:'english',     name:'English',     emoji:'📖', color:'#7A5AF8' },
  { key:'physics',     name:'Physics',     emoji:'⚛️',  color:'#F04438' },
  { key:'chemistry',   name:'Chemistry',   emoji:'🧪', color:'#12B76A' },
  { key:'biology',     name:'Biology',     emoji:'🌿', color:'#16B364' },
  { key:'economics',   name:'Economics',   emoji:'📊', color:'#F79009' },
  { key:'government',  name:'Government',  emoji:'⚖️',  color:'#0BA5EC' },
  { key:'literature',  name:'Literature',  emoji:'📚', color:'#9E77ED' },
];

export default function CBTPracticeView() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('jamb');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getDocs(query(collection(db,'users',currentUser.uid,'results'), orderBy('submittedAt','desc'), limit(10)))
      .then(snap => setHistory(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [currentUser]);

  function launch(modeOverride, subject = null) {
    const m = modeOverride || mode;
    const params = new URLSearchParams({ mode: m });
    if (subject) params.set('subject', subject);
    navigate(`/cbt?${params.toString()}`);
  }

  return (
    <div>
      <div className="page-hdr"><h2>CBT Practice</h2><p>Simulate real exam conditions with timed sessions.</p></div>

      {/* Mode selector */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header"><div className="card-title">⚙️ Exam Mode</div></div>
        <div className="card-body">
          <div className="cbt-mode-grid">
            {[
              { k:'jamb', icon:'🎯', name:'JAMB', desc:'4 subjects · 180 qs · 2 hrs' },
              { k:'waec', icon:'📋', name:'WAEC', desc:'1 subject · 45 min' },
              { k:'practice', icon:'🔁', name:'Practice', desc:'Custom subject & count' },
              { k:'postutme', icon:'🏛️', name:'Post UTME', desc:'1 subject · 30 min' },
            ].map(m => (
              <div key={m.k} className={`cbt-mode-card${mode===m.k?' selected':''}`} onClick={() => setMode(m.k)}>
                <div className="cbt-mode-icon">{m.icon}</div>
                <div className="cbt-mode-name">{m.name}</div>
                <div className="cbt-mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>
          <button className="btn-gold" style={{ marginTop:14, width:'100%', justifyContent:'center', padding:'12px' }}
            onClick={() => launch()}>
            <i className="fas fa-play" /> Start {mode.toUpperCase()} Session
          </button>
        </div>
      </div>

      {/* Quick subject practice */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header"><div className="card-title">⚡ Quick Practice by Subject</div></div>
        <div className="card-body">
          <div className="cbt-subj-grid">
            {SUBJECTS.map(s => (
              <div key={s.key} className="quick-cbt-card" onClick={() => launch('practice', s.key)}>
                <div style={{ fontSize:'1.4rem', marginBottom:6 }}>{s.emoji}</div>
                <div className="qcc-name">{s.name}</div>
                <div className="qcc-sub">Practice</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header"><div className="card-title">📜 Past Sessions</div></div>
        {loadingHistory ? <SkeletonTable rows={5} cols={4} /> : history.length === 0 ? (
          <div className="empty-state" style={{ padding:'32px 20px' }}>
            <div className="empty-state-icon">📋</div>
            <h3>No sessions yet</h3>
            <p>Start your first CBT session above!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Subject</th><th>Exam</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>
                {history.map(h => {
                  const pct = Math.round((h.correct||0) / (h.total||1) * 100);
                  return (
                    <tr key={h.id}>
                      <td style={{ fontWeight:700 }}>{h.subject}</td>
                      <td><span className="badge badge-navy">{h.exam?.toUpperCase()}</span></td>
                      <td>
                        <span style={{ fontWeight:700, color: pct>=50?'var(--success)':'var(--error)' }}>
                          {h.correct}/{h.total} ({pct}%)
                        </span>
                      </td>
                      <td style={{ color:'var(--text-3)' }}>{formatDate(h.submittedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
