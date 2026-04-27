import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../contexts/ToastContext';
import { SkeletonListItem } from '../../components/ui/Skeleton';

export default function MockExamsView() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db,'mockExams'), where('status','==','active')))
      .then(snap => setExams(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, []);

  function canAccess() {
    const plan = userData?.plan || 'free';
    return plan === 'pro' || plan === 'elite';
  }

  function handleStart(exam) {
    if (!canAccess()) { showToast('Upgrade to Pro to access mock exams', 'info'); return; }
    navigate(`/cbt?mode=mock&examId=${exam.id}`);
  }

  return (
    <div>
      <div className="page-hdr"><h2>Mock Exams</h2><p>Full-length timed practice exams modeled after real JAMB and WAEC papers.</p></div>
      {!canAccess() && (
        <div className="upgrade-banner" style={{ marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, color:'var(--navy)', marginBottom:4 }}><i className="fas fa-lock" style={{marginRight:5}} />Pro Feature</div>
            <div style={{ fontSize:'.82rem', color:'var(--text-2)' }}>Upgrade to Pro or Elite to unlock full mock exams.</div>
          </div>
        </div>
      )}
      {loading ? (
        <div className="card card-body">{Array.from({length:4}).map((_,i) => <SkeletonListItem key={i} lines={2} />)}</div>
      ) : exams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-file-alt" /></div>
          <h3>No mock exams available</h3>
          <p>Check back soon — new mock exams are added regularly.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {exams.map(exam => (
            <div key={exam.id} className="card mock-exam-card">
              <div className="card-body" style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ fontSize:'1.5rem', flexShrink:0, color:'var(--gold)' }}><i className="fas fa-file-alt" /></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'.95rem', color:'var(--navy)', marginBottom:4 }}>{exam.title}</div>
                  <div style={{ fontSize:'.78rem', color:'var(--text-3)' }}>
                    {exam.subject} · {exam.questionCount || '?'} questions · {exam.duration || '?'} minutes
                  </div>
                  {exam.examType && <span className="badge badge-navy" style={{ marginTop:6 }}>{exam.examType}</span>}
                </div>
                <button className={`btn-sm ${canAccess() ? 'btn-gold' : 'btn-outline'}`} onClick={() => handleStart(exam)}>
                  {canAccess() ? <><i className="fas fa-play" /> Start</> : <><i className="fas fa-lock" /> Locked</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
