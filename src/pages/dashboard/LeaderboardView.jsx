import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, xpToLevel, LEVEL_NAMES } from '../../contexts/AuthContext';
import { SkeletonTable } from '../../components/ui/Skeleton';

export default function LeaderboardView() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // Try ordered query first (requires Firestore index on xp desc)
        const snap = await getDocs(query(collection(db,'users'), orderBy('xp','desc'), limit(50)));
        const list = snap.docs.map((d,i) => ({ id:d.id, rank:i+1, ...d.data() }));
        setUsers(list);
        const me = list.findIndex(u => u.id === currentUser?.uid);
        setMyRank(me >= 0 ? me + 1 : null);
      } catch {
        // Fallback: get all users and sort client-side (no index needed)
        try {
          const snap = await getDocs(query(collection(db,'users'), limit(200)));
          const list = snap.docs
            .map(d => ({ id:d.id, ...d.data() }))
            .sort((a,b) => (b.xp||0) - (a.xp||0))
            .slice(0, 50)
            .map((u, i) => ({ ...u, rank: i+1 }));
          setUsers(list);
          const me = list.findIndex(u => u.id === currentUser?.uid);
          setMyRank(me >= 0 ? me + 1 : null);
        } catch {
          setUsers([]);
        }
      }
      setLoading(false);
    }
    load();
  }, [currentUser]);

  const MEDALS = ['#1','#2','#3'];

  return (
    <div>
      <div className="page-hdr"><h2>Leaderboard</h2><p>Top 50 students ranked by XP earned.</p></div>

      {myRank && (
        <div className="my-rank-banner">
          <span className="my-rank-icon"><i className="fas fa-crosshairs" /></span>
          <div>
            <div style={{ fontWeight:700, color:'var(--navy)' }}>Your Rank: #{myRank}</div>
            <div style={{ fontSize:'.78rem', color:'var(--text-3)' }}>Keep studying to climb higher!</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title"><i className="fas fa-trophy" style={{marginRight:6}} />Top 50 Students</div></div>
        {loading ? <SkeletonTable rows={10} cols={4} /> : users.length === 0 ? (
          <div className="empty-state" style={{ padding:40 }}>
            <div className="empty-state-icon"><i className="fas fa-trophy" /></div>
            <h3>No rankings yet</h3>
            <p>Start studying to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Level</th>
                  <th>XP</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.id === currentUser?.uid;
                  const level = xpToLevel(u.xp || 0);
                  const levelName = LEVEL_NAMES[level-1] || 'Starter';
                  return (
                    <tr key={u.id} style={{ background: isMe ? 'var(--gold-pale)' : undefined }}>
                      <td style={{ fontWeight:800, fontSize:'.9rem', width:50 }}>
                        {u.rank <= 3 ? MEDALS[u.rank-1] : `#${u.rank}`}
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <div className="lb-avatar">{(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:'.84rem', color:'var(--navy)' }}>
                              {u.firstName || u.email?.split('@')[0] || 'Student'} {u.lastName || ''}{isMe && <span style={{ fontSize:'.68rem', color:'var(--gold)', marginLeft:4 }}>(You)</span>}
                            </div>
                            <div style={{ fontSize:'.7rem', color:'var(--text-3)' }}>{u.targetExam || 'JAMB'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-gold">{levelName}</span></td>
                      <td style={{ fontFamily:'var(--font-head)', fontWeight:800, color:'var(--gold)' }}>
                        {(u.xp||0).toLocaleString()}
                      </td>
                      <td style={{ color:'var(--text-3)', fontSize:'.8rem' }}>{u.state || '—'}</td>
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
