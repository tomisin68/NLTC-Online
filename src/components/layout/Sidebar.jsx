import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, xpToLevel, xpProgressInLevel, LEVEL_NAMES } from '../../contexts/AuthContext';
import './Sidebar.css';

export default function Sidebar({ activeView, onNav, open, onClose }) {
  const { currentUser, userData, signOut } = useAuth();
  const [liveActive, setLiveActive] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /* live session dot */
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db,'liveSessions'), where('status','==','live'));
    const unsub = onSnapshot(q, snap => setLiveActive(snap.size > 0), () => {});
    return unsub;
  }, [currentUser]);

  /* unread notifications badge — only real new notifications */
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db,'users',currentUser.uid,'notifications'), where('read','==',false));
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size), () => {});
    return unsub;
  }, [currentUser]);

  const xp = userData?.xp || 0;
  const level = xpToLevel(xp);
  const progress = xpProgressInLevel(xp);
  const levelName = LEVEL_NAMES[level - 1] || 'Starter';
  const nextXP = [0,500,1500,3500,7000,12000,20000,999999][level] || 20000;
  const plan = userData?.plan || 'free';
  const firstName = userData?.firstName || userData?.displayName?.split(' ')[0] || 'Student';
  const lastName = userData?.lastName || userData?.displayName?.split(' ')[1] || '';
  const initials = (firstName[0] || '') + (lastName[0] || '');

  const nav = (view) => { onNav(view); onClose(); };

  const Link = ({ view, icon, label, dot, badge }) => (
    <button
      className={`sb-link${activeView === view ? ' active' : ''}`}
      onClick={() => nav(view)}
    >
      <i className={icon} />
      {label}
      {dot && <div className="sb-live-dot" />}
      {badge > 0 && <span className="sb-badge">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );

  return (
    <>
      <div className={`sb-overlay${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Logo — light version on dark sidebar */}
        <div className="sb-logo">
          <img src="/nltc-light.png" alt="NLTC Online" className="sb-logo-img" />
        </div>

        {/* User info */}
        <div className="sb-user">
          <div className="sb-avatar">{initials || '👤'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="sb-user-name">{firstName} {lastName}</div>
            <span className={`plan-tag plan-${plan}`}>
              {plan === 'elite' ? '⭐ Elite' : plan === 'pro' ? '🔥 Pro' : 'Free'}
            </span>
          </div>
        </div>

        {/* XP bar */}
        <div className="sb-xp">
          <div className="sb-xp-row">
            <span className="sb-xp-label">{levelName}</span>
            <span className="sb-xp-val">{xp.toLocaleString()} XP</span>
          </div>
          <div className="xp-track"><div className="xp-fill" style={{ width: `${Math.round(progress*100)}%` }} /></div>
          <div className="sb-level">Level {level} · {Math.round(xp)} / {nextXP.toLocaleString()} XP</div>
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          <div className="sb-sec">Main</div>
          <Link view="home"        icon="fas fa-th-large"      label="Dashboard" />
          <Link view="lessons"     icon="fas fa-play-circle"   label="Video Lessons" />
          <Link view="cbt"         icon="fas fa-laptop-code"   label="CBT Practice" />
          <Link view="officialquiz" icon="fas fa-graduation-cap" label="NLTC Official Quiz" />
          <Link view="quicktest"   icon="fas fa-bolt"          label="Quick Tests" />

          <div className="sb-sec">Live &amp; Community</div>
          <Link view="live"        icon="fas fa-signal"        label="Live Classes" dot={liveActive} />
          <Link view="mockexams"   icon="fas fa-file-alt"      label="Mock Exams" />
          <Link view="leaderboard" icon="fas fa-trophy"        label="Leaderboard" />
          <Link view="announcements" icon="fas fa-bullhorn"    label="Announcements" badge={unreadCount} />

          <div className="sb-sec">More</div>
          <Link view="schedule"    icon="fas fa-calendar-alt"  label="Schedule" />
          <Link view="settings"    icon="fas fa-cog"           label="Settings" />
        </nav>

        {/* Upgrade */}
        {plan === 'free' && (
          <button className="sb-upgrade" onClick={() => nav('settings')}>
            <div className="sb-upgrade-label">Upgrade to Pro 🚀</div>
            <div className="sb-upgrade-sub">Unlock all lessons + live classes</div>
          </button>
        )}

        {/* Logout */}
        <div className="sb-bottom">
          <button className="sb-logout" onClick={signOut}>
            <i className="fas fa-sign-out-alt" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
