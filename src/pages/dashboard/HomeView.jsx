import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, computeAchievements, xpToLevel, LEVEL_NAMES } from '../../contexts/AuthContext';
import { SkeletonStatCard, SkeletonAchievements, SkeletonListItem } from '../../components/ui/Skeleton';

export default function HomeView({ onNav }) {
  const { userData, currentUser } = useAuth();
  const [rank, setRank] = useState(null);
  const [miniLb, setMiniLb] = useState([]);
  const [liveSession, setLiveSession] = useState(null);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [loadingRank, setLoadingRank] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    Promise.allSettled([
      loadRank(),
      loadMiniLb(),
      loadActiveLive(),
      loadSchedule(),
    ]);
  }, [currentUser]);

  async function loadRank() {
    setLoadingRank(true);
    try {
      const snap = await getDocs(query(collection(db,'users'), orderBy('xp','desc')));
      const idx = snap.docs.findIndex(d => d.id === currentUser.uid);
      setRank(idx >= 0 ? idx + 1 : null);
    } catch { setRank(null); }
    setLoadingRank(false);
  }
  async function loadMiniLb() {
    try {
      const snap = await getDocs(query(collection(db,'users'), orderBy('xp','desc'), limit(5)));
      setMiniLb(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch { setMiniLb([]); }
  }
  async function loadActiveLive() {
    try {
      const snap = await getDocs(query(collection(db,'liveSessions'), where('status','==','live'), limit(1)));
      setLiveSession(snap.empty ? null : { id:snap.docs[0].id, ...snap.docs[0].data() });
    } catch { setLiveSession(null); }
  }
  async function loadSchedule() {
    try {
      const snap = await getDocs(query(collection(db,'schedule'), orderBy('time','asc'), limit(3)));
      setUpcomingClasses(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch { setUpcomingClasses([]); }
  }

  const xp = userData?.xp || 0;
  const streak = userData?.streak || 0;
  const cbtCount = userData?.cbtCount || 0;
  const level = xpToLevel(xp);
  const levelName = LEVEL_NAMES[level - 1] || 'Starter';
  const achievements = computeAchievements(userData);
  const earnedCount = achievements.filter(a => a.isEarned).length;

  return (
    <div>
      <div className="page-hdr">
        <h2>Welcome back, {userData?.firstName || 'Student'} 👋</h2>
        <p>Keep up the great work — every day counts!</p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card s1">
          <div className="sc-icon blue"><i className="fas fa-star" /></div>
          <div className="sc-num">{xp.toLocaleString()}</div>
          <div className="sc-label">XP Earned</div>
        </div>
        <div className="stat-card s2">
          <div className="sc-icon gold"><i className="fas fa-fire" /></div>
          <div className="sc-num">{streak}</div>
          <div className="sc-label">Day Streak</div>
        </div>
        <div className="stat-card s3">
          <div className="sc-icon green"><i className="fas fa-laptop-code" /></div>
          <div className="sc-num">{cbtCount}</div>
          <div className="sc-label">CBT Sessions</div>
        </div>
        <div className="stat-card s4">
          <div className="sc-icon teal"><i className="fas fa-trophy" /></div>
          <div className="sc-num">{loadingRank ? '…' : rank ? `#${rank}` : '—'}</div>
          <div className="sc-label">National Rank</div>
        </div>
      </div>

      {/* Level badge */}
      <div className="level-banner">
        <div className="level-banner-left">
          <span className="level-badge">⚡ {levelName}</span>
          <span className="level-text">Level {level} · Keep studying to level up!</span>
        </div>
        <button className="card-action" onClick={() => onNav('leaderboard')}>
          View Leaderboard <i className="fas fa-arrow-right" />
        </button>
      </div>

      <div className="dash-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Live now */}
          {liveSession && (
            <div className="card live-now-card">
              <div className="card-body" style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div className="live-dot-lg" />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:'.9rem', fontWeight:800, color:'var(--navy)' }}>
                    LIVE NOW: {liveSession.title}
                  </div>
                  <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginTop:2 }}>
                    {liveSession.subject} · {liveSession.viewerCount || 0} watching
                  </div>
                </div>
                <button className="btn-error btn-sm" onClick={() => onNav('live')}>
                  Join <i className="fas fa-play" />
                </button>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="card">
            <div className="card-header"><div className="card-title">⚡ Quick Start</div></div>
            <div className="card-body quick-actions-grid">
              <div className="quick-action" onClick={() => onNav('cbt')}>
                <div className="qa-icon" style={{ background:'#EFF6FF', color:'#2563EB' }}><i className="fas fa-laptop-code" /></div>
                <div className="qa-label">CBT Practice</div>
              </div>
              <div className="quick-action" onClick={() => onNav('officialquiz')}>
                <div className="qa-icon" style={{ background:'var(--gold-pale)', color:'#92600A' }}><i className="fas fa-graduation-cap" /></div>
                <div className="qa-label">Official Quiz</div>
              </div>
              <div className="quick-action" onClick={() => onNav('lessons')}>
                <div className="qa-icon" style={{ background:'var(--success-bg)', color:'#059669' }}><i className="fas fa-play-circle" /></div>
                <div className="qa-label">Video Lessons</div>
              </div>
              <div className="quick-action" onClick={() => onNav('leaderboard')}>
                <div className="qa-icon" style={{ background:'var(--teal-pale)', color:'#0E7490' }}><i className="fas fa-trophy" /></div>
                <div className="qa-label">Leaderboard</div>
              </div>
            </div>
          </div>

          {/* Upcoming schedule */}
          {upcomingClasses.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">📅 Upcoming Classes</div>
                <button className="card-action" onClick={() => onNav('schedule')}>View all <i className="fas fa-arrow-right" /></button>
              </div>
              <div className="card-body" style={{ padding:'8px 0' }}>
                {upcomingClasses.map(cls => (
                  <div key={cls.id} className="sched-item">
                    <div className="sched-dot" />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'.82rem', color:'var(--navy)' }}>{cls.title}</div>
                      <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:2 }}>{cls.subject} · {cls.day} at {cls.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Achievements */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🏆 Achievements</div>
              <span style={{ fontSize:'.72rem', color:'var(--text-3)', fontWeight:700 }}>{earnedCount}/{achievements.length}</span>
            </div>
            <div className="card-body" style={{ padding:'10px 12px' }}>
              {!userData ? <SkeletonAchievements /> : (
                <>
                  <div className="ach-grid">
                    {achievements.map(a => (
                      <div key={a.id} className={`ach-chip${a.isEarned ? ' earned' : ' locked'}`} title={`${a.desc}${a.isEarned ? ' — Earned!' : ` — ${Math.round(a.progress*100)}% complete`}`}>
                        {a.isEarned && <div className="ach-chip-badge">✓</div>}
                        <div className="ach-chip-icon">{a.icon}</div>
                        <div className="ach-chip-name">{a.label}</div>
                        {!a.isEarned && (
                          <div className="ach-chip-prog">
                            <div className="ach-chip-prog-fill" style={{ width:`${Math.round(a.progress*100)}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, fontSize:'.72rem', color:'var(--text-3)', textAlign:'center' }}>
                    {earnedCount} / {achievements.length} earned
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mini Leaderboard */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🥇 Top Students</div>
              <button className="card-action" onClick={() => onNav('leaderboard')}>Full board <i className="fas fa-arrow-right" /></button>
            </div>
            <div className="card-body" style={{ padding:'8px 12px' }}>
              {miniLb.length === 0
                ? Array.from({length:5}).map((_,i) => <SkeletonListItem key={i} lines={1} />)
                : miniLb.map((u,i) => (
                  <div key={u.id} className="mini-lb-row" style={{ background: u.id === currentUser?.uid ? 'var(--gold-pale)' : 'transparent' }}>
                    <div className="mini-lb-rank" style={{ color: i < 3 ? 'var(--gold)' : 'var(--text-3)' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                    </div>
                    <div className="mini-lb-avatar">{(u.firstName?.[0] || '?')}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'.8rem', color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {u.firstName} {u.lastName}
                      </div>
                    </div>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:'.82rem', fontWeight:800, color:'var(--gold)', flexShrink:0 }}>
                      {(u.xp||0).toLocaleString()} XP
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
