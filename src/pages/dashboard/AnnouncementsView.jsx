import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, timeAgo } from '../../contexts/AuthContext';
import { SkeletonListItem } from '../../components/ui/Skeleton';

export default function AnnouncementsView() {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db,'announcements'), orderBy('createdAt','desc'), limit(30)))
      .then(snap => setAnnouncements(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  const CATEGORY_COLORS = { JAMB:'#2E90FA', WAEC:'#12B76A', NECO:'#F79009', General:'var(--navy)', Platform:'var(--gold)' };

  return (
    <div>
      <div className="page-hdr"><h2>Announcements</h2><p>Stay updated with the latest news and updates.</p></div>
      <div className="card">
        {loading ? (
          <div className="card-body">{Array.from({length:6}).map((_,i) => <SkeletonListItem key={i} lines={2} />)}</div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fas fa-bullhorn" /></div>
            <h3>No announcements yet</h3>
            <p>Check back soon for updates.</p>
          </div>
        ) : (
          <div style={{ padding:'0' }}>
            {announcements.map(a => (
              <div key={a.id} className="annc-item">
                <div className="annc-icon"><i className="fas fa-bullhorn" /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="annc-header">
                    <div className="annc-title">{a.title}</div>
                    {a.category && (
                      <span className="badge" style={{ background: CATEGORY_COLORS[a.category] + '18', color: CATEGORY_COLORS[a.category] }}>
                        {a.category}
                      </span>
                    )}
                  </div>
                  <div className="annc-text">{a.body}</div>
                  <div className="annc-time">{timeAgo(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
