import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { SkeletonListItem } from '../../components/ui/Skeleton';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const SUBJECT_COLORS = {
  Mathematics:'#2E90FA', English:'#7A5AF8', Physics:'#F04438', Chemistry:'#12B76A',
  Biology:'#16B364', Economics:'#F79009', Government:'#0BA5EC', Literature:'#9E77ED',
};

export default function ScheduleView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db,'schedule'), orderBy('day','asc')))
      .then(snap => setItems(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = DAYS.reduce((acc, d) => {
    acc[d] = items.filter(i => i.day === d);
    return acc;
  }, {});

  const today = new Date().toLocaleDateString('en-US', { weekday:'long' });

  return (
    <div>
      <div className="page-hdr"><h2>Class Schedule</h2><p>Weekly timetable for all live classes.</p></div>
      {loading ? (
        <div className="card card-body">{Array.from({length:6}).map((_,i) => <SkeletonListItem key={i} />)}</div>
      ) : (
        DAYS.map(day => {
          const dayItems = grouped[day] || [];
          const isToday = day === today;
          return (
            <div key={day} className="card" style={{ marginBottom:12 }}>
              <div className="card-header" style={{ background: isToday ? 'var(--gold-pale)' : undefined }}>
                <div className="card-title" style={{ color: isToday ? 'var(--gold)' : undefined }}>
                  {isToday ? '📍 ' : ''}{day}
                </div>
                {isToday && <span className="badge badge-gold">Today</span>}
              </div>
              {dayItems.length === 0 ? (
                <div style={{ padding:'12px 16px', color:'var(--text-3)', fontSize:'.8rem' }}>No classes scheduled</div>
              ) : (
                <div className="card-body" style={{ padding:'8px 0' }}>
                  {dayItems.map(item => {
                    const color = SUBJECT_COLORS[item.subject] || 'var(--navy)';
                    return (
                      <div key={item.id} className="sched-row">
                        <div className="sched-time-col">{item.time || '—'}</div>
                        <div className="sched-line" style={{ background: color }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:'.84rem', color:'var(--navy)' }}>{item.title}</div>
                          <div style={{ fontSize:'.74rem', color:'var(--text-3)', marginTop:2 }}>
                            {item.subject} {item.duration ? `· ${item.duration}` : ''}
                          </div>
                        </div>
                        {item.teacher && <div style={{ fontSize:'.72rem', color:'var(--text-3)' }}>by {item.teacher}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
