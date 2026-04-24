import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../contexts/ToastContext';
import { SkeletonListItem } from '../../components/ui/Skeleton';

export default function LiveClassesView() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db,'liveSessions'), orderBy('createdAt','desc'), limit(20)))
      .then(snap => setSessions(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  function canJoin() {
    const plan = userData?.plan || 'free';
    return plan === 'pro' || plan === 'elite';
  }

  function handleJoin(s) {
    if (!canJoin()) { showToast('Upgrade to Pro to join live classes', 'info'); return; }
    navigate(`/livestream/${s.id}`);
  }

  const live = sessions.filter(s => s.status === 'live');
  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const past = sessions.filter(s => s.status === 'ended');

  const Section = ({ title, items, empty }) => (
    <div className="card" style={{ marginBottom:16 }}>
      <div className="card-header"><div className="card-title">{title}</div></div>
      {loading ? (
        <div className="card-body">{Array.from({length:3}).map((_,i) => <SkeletonListItem key={i} />)}</div>
      ) : items.length === 0 ? (
        <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--text-3)', fontSize:'.82rem' }}>{empty}</div>
      ) : (
        <div className="card-body" style={{ padding:'8px 0' }}>
          {items.map(s => (
            <div key={s.id} className="live-session-row">
              {s.status === 'live' && <div className="live-pill-sm">LIVE</div>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'.88rem', color:'var(--navy)', marginBottom:2 }}>{s.title}</div>
                <div style={{ fontSize:'.75rem', color:'var(--text-3)' }}>
                  {s.subject} {s.viewerCount ? `· ${s.viewerCount} watching` : ''}
                  {s.host ? ` · Host: ${s.host}` : ''}
                </div>
              </div>
              {s.status === 'live' && (
                <button className="btn-error btn-sm" onClick={() => handleJoin(s)}>
                  <i className="fas fa-play" /> Join
                </button>
              )}
              {s.status === 'scheduled' && (
                <span className="badge badge-navy">{s.scheduledAt || 'Upcoming'}</span>
              )}
              {s.status === 'ended' && (
                <span className="badge badge-navy" style={{ opacity:.6 }}>Ended</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-hdr">
        <h2>Live Classes</h2>
        <p>Join interactive sessions with expert tutors in real time.</p>
      </div>
      {!canJoin() && (
        <div className="upgrade-banner" style={{ marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, color:'var(--navy)', marginBottom:4 }}>🔒 Pro Feature</div>
            <div style={{ fontSize:'.82rem', color:'var(--text-2)' }}>Upgrade to Pro to join live classes and interact with tutors.</div>
          </div>
        </div>
      )}
      <Section title="🔴 Live Now" items={live} empty="No live classes right now. Check the schedule below." />
      <Section title="📅 Upcoming" items={upcoming} empty="No upcoming sessions scheduled yet." />
      <Section title="📼 Past Sessions" items={past} empty="No past sessions recorded." />
    </div>
  );
}
