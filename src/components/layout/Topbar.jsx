import { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, timeAgo } from '../../contexts/AuthContext';
import './Topbar.css';

const NOTIF_ICONS = {
  welcome:'🎓', live_class_start:'📡', session_ended:'📡',
  announcement:'📢', new_lesson:'🎬', class_reminder:'📅',
  new_signup:'👤', payment:'💳', achievement:'🏆',
};

export default function Topbar({ title, onHamburger, streak, onSearch }) {
  const { currentUser } = useAuth();
  const [dropOpen, setDropOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function loadNotifs() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db,'users',currentUser.uid,'notifications'),
        orderBy('createdAt','desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      setNotifs(items);
      setUnread(items.filter(n => !n.read).length);
    } catch {
      setNotifs([]);
    }
    setLoading(false);
  }

  async function markAllRead() {
    if (!currentUser) return;
    const unreadItems = notifs.filter(n => !n.read);
    await Promise.allSettled(
      unreadItems.map(n => updateDoc(doc(db,'users',currentUser.uid,'notifications',n.id), { read:true }))
    );
    setNotifs(prev => prev.map(n => ({ ...n, read:true })));
    setUnread(0);
  }

  function handleBellClick() {
    const next = !dropOpen;
    setDropOpen(next);
    if (next && notifs.length === 0) loadNotifs();
  }

  return (
    <header className="topbar">
      <button className="hamburger" onClick={onHamburger} aria-label="Menu">
        <span /><span /><span />
      </button>
      <div className="topbar-title">{title}</div>

      {streak > 0 && (
        <div className="tb-streak">🔥 {streak} day{streak !== 1 ? 's' : ''}</div>
      )}

      {onSearch && (
        <div className="topbar-search">
          <i className="fas fa-search" />
          <input placeholder="Search…" onChange={e => onSearch(e.target.value)} />
        </div>
      )}

      {/* Notification bell */}
      <div className="notif-bell-wrap" ref={dropRef}>
        <button className="tb-btn" onClick={handleBellClick} aria-label="Notifications">
          <i className="fas fa-bell" />
          {unread > 0 && <span className="tb-notif-dot" />}
        </button>
        <div className={`notif-dropdown${dropOpen ? ' open' : ''}`}>
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Notifications</span>
            {unread > 0 && <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="notif-list">
            {loading && (
              <div style={{padding:'16px',textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <p>No notifications yet</p>
              </div>
            )}
            {!loading && notifs.map(n => (
              <div key={n.id} className={`notif-item${!n.read ? ' unread' : ''}`}>
                <span className="notif-item-icon">{NOTIF_ICONS[n.type] || '📌'}</span>
                <div className="notif-item-body">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-text">{n.body}</div>
                  <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && <div className="notif-unread-dot" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
