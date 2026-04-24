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
    getDocs(query(collection(db,'users'), orderBy('xp','desc'), limit(50)))
      .then(snap => {
        const list = snap.docs.map((d,i) => ({ id:d.id, rank:i+1, ...d.data() }));
        setUsers(list);
        const me = list.findIndex(u => u.id === currentUser?.uid);
        setMyRank(me >= 0 ? me + 1 : null);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const MEDALS = ['🥇','🥈','🥉'];

  return (
    <div>
      <div className="page-hdr"><h2>Leaderboard</h2><p>Top 50 students ranked by XP earned.</p></div>

      {myRank && (
        <div className="my-rank-banner">
          <span className="my-rank-icon">🎯</span>
          <div>
            <div style={{ fontWeight:700, color:'var(--navy)' }}>Your Rank: #{myRank}</div>
            <div style={{ fontSize:'.78rem', color:'var(--text-3)' }}>Keep studying to climb higher!</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title">🏆 Top 50 Students</div></div>
        {loading ? <SkeletonTable rows={10} cols={4} /> : (
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
                      <td style={{ fontWeight:800, fontSize:'.9rem' }}>
                        {u.rank <= 3 ? MEDALS[u.rank-1] : `#${u.rank}`}
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <div className="lb-avatar">{(u.firstName?.[0]||'?')}</div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:'.84rem', color:'var(--navy)' }}>
                              {u.firstName} {u.lastName} {isMe && <span style={{ fontSize:'.68rem', color:'var(--gold)' }}>(You)</span>}
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
