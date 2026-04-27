import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, timeAgo } from '../contexts/AuthContext';
import { showToast } from '../contexts/ToastContext';
import { SkeletonListItem } from '../components/ui/Skeleton';
import './NotificationsPage.css';

const NOTIF_ICON_CLS = {
  welcome:'fa-graduation-cap', live_class_start:'fa-satellite-dish', session_ended:'fa-satellite-dish',
  announcement:'fa-bullhorn', new_lesson:'fa-film', class_reminder:'fa-calendar-alt',
  new_signup:'fa-user', payment:'fa-credit-card', achievement:'fa-trophy',
};
function NotifIcon({ type }) {
  const cls = NOTIF_ICON_CLS[type] || 'fa-bell';
  return <i className={`fas ${cls}`} />;
}
const FILTERS = ['All','Announcements','Lessons','Live','Achievements','Payments'];

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!currentUser) return;
    getDocs(query(collection(db,'users',currentUser.uid,'notifications'), orderBy('createdAt','desc'), limit(50)))
      .then(snap => setNotifs(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, [currentUser]);

  async function markRead(id) {
    try {
      await updateDoc(doc(db,'users',currentUser.uid,'notifications',id), { read:true });
      setNotifs(prev => prev.map(n => n.id===id ? {...n,read:true} : n));
    } catch { showToast('Error marking read','error'); }
  }

  async function markAllRead() {
    const unread = notifs.filter(n => !n.read);
    await Promise.allSettled(unread.map(n => updateDoc(doc(db,'users',currentUser.uid,'notifications',n.id), { read:true })));
    setNotifs(prev => prev.map(n => ({ ...n, read:true })));
    showToast('All marked as read', 'success');
  }

  async function deleteNotif(id) {
    try {
      await deleteDoc(doc(db,'users',currentUser.uid,'notifications',id));
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch { showToast('Error deleting','error'); }
  }

  function filterType(type) {
    if (activeFilter === 'All') return true;
    const map = { Announcements:['announcement'], Lessons:['new_lesson'], Live:['live_class_start','session_ended'], Achievements:['achievement'], Payments:['payment'] };
    return (map[activeFilter] || []).includes(type);
  }

  const displayed = notifs.filter(n => {
    if (activeTab === 'unread' && n.read) return false;
    return filterType(n.type);
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="notif-page">
      {/* Header */}
      <div className="notif-page-header">
        <button className="btn-outline btn-sm" onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
        <h1 className="notif-page-title">Notifications</h1>
        {unreadCount > 0 && (
          <button className="btn-outline btn-sm" onClick={markAllRead}>
            <i className="fas fa-check-double" /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="notif-tabs">
        <button className={`notif-tab${activeTab==='all'?' active':''}`} onClick={() => setActiveTab('all')}>All</button>
        <button className={`notif-tab${activeTab==='unread'?' active':''}`} onClick={() => setActiveTab('unread')}>
          Unread {unreadCount > 0 && <span className="notif-tab-badge">{unreadCount}</span>}
        </button>
      </div>

      {/* Filter chips */}
      <div className="notif-filter-chips">
        {FILTERS.map(f => (
          <button key={f} className={`filter-chip${activeFilter===f?' active':''}`} onClick={() => setActiveFilter(f)}>{f}</button>
        ))}
      </div>

      {/* List */}
      <div className="notif-list-page">
        {loading ? (
          Array.from({length:8}).map((_,i) => <SkeletonListItem key={i} lines={2} />)
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fas fa-bell" /></div>
            <h3>No notifications</h3>
            <p>{activeTab === 'unread' ? 'You\'re all caught up!' : 'No notifications match this filter.'}</p>
          </div>
        ) : (
          displayed.map(n => (
            <div key={n.id} className={`notif-card${!n.read?' unread':''}`}>
              <div className="notif-card-icon"><NotifIcon type={n.type} /></div>
              <div className="notif-card-body">
                <div className="notif-card-title">{n.title}</div>
                <div className="notif-card-text">{n.body}</div>
                <div className="notif-card-meta">
                  <span className="notif-card-time">{timeAgo(n.createdAt)}</span>
                  {n.type && <span className="badge badge-navy" style={{ fontSize:'.58rem' }}>{n.type.replace(/_/g,' ')}</span>}
                </div>
              </div>
              <div className="notif-card-actions">
                {!n.read && (
                  <button className="notif-action-btn" onClick={() => markRead(n.id)} title="Mark read">
                    <i className="fas fa-check" />
                  </button>
                )}
                <button className="notif-action-btn danger" onClick={() => deleteNotif(n.id)} title="Delete">
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
