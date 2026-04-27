import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../contexts/ToastContext';
import { SkeletonVideoCard } from '../../components/ui/Skeleton';

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function VideoPlayer({ video, onClose }) {
  const vidRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const SPEEDS = [0.5,0.75,1,1.25,1.5,2];
  const ytId = getYouTubeId(video.url);

  function togglePlay() {
    if (!vidRef.current) return;
    if (vidRef.current.paused) { vidRef.current.play(); setPlaying(true); }
    else { vidRef.current.pause(); setPlaying(false); }
  }
  function seek(dir) { if (vidRef.current) vidRef.current.currentTime += dir; }
  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed)+1) % SPEEDS.length];
    setSpeed(next);
    if (vidRef.current) vidRef.current.playbackRate = next;
  }
  function onTimeUpdate() {
    if (!vidRef.current) return;
    setProgress((vidRef.current.currentTime / vidRef.current.duration) * 100 || 0);
  }
  function onSeekClick(e) {
    if (!vidRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    vidRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * vidRef.current.duration;
  }

  return (
    <div className="video-overlay" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="video-player-box">
        <div className="vp-header">
          <div className="vp-title">{video.title}</div>
          <button className="vp-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="vp-stage">
          {ytId ? (
            <iframe
              width="100%" height="100%"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ aspectRatio:'16/9', minHeight:280 }}
            />
          ) : (
            <video ref={vidRef} src={video.url} onTimeUpdate={onTimeUpdate}
              style={{width:'100%',maxHeight:'60vh',background:'#000'}}
              controls
            />
          )}
        </div>
        {!ytId && (
          <div className="vp-controls">
            <div className="vp-progress" onClick={onSeekClick}>
              <div className="vp-progress-fill" style={{width:`${progress}%`}} />
            </div>
            <div className="vp-btns">
              <button onClick={() => seek(-10)}><i className="fas fa-redo" style={{transform:'scaleX(-1)'}} />-10s</button>
              <button onClick={togglePlay}><i className={`fas fa-${playing?'pause':'play'}`} /></button>
              <button onClick={() => seek(10)}>+10s<i className="fas fa-redo" /></button>
              <button onClick={cycleSpeed}>{speed}×</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VideoLessonsView() {
  const { userData } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterAccess, setFilterAccess] = useState('all');
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    getDocs(query(collection(db,'videos'), orderBy('createdAt','desc')))
      .then(snap => setVideos(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  function canAccess(video) {
    const plan = userData?.plan || 'free';
    if (video.access === 'free') return true;
    if (video.access === 'pro') return plan === 'pro' || plan === 'elite';
    if (video.access === 'elite') return plan === 'elite';
    return false;
  }

  const subjects = [...new Set(videos.map(v => v.subject).filter(Boolean))];
  const filtered = videos.filter(v =>
    (filterSubject === 'all' || v.subject === filterSubject) &&
    (filterAccess === 'all' || v.access === filterAccess) &&
    (v.title?.toLowerCase().includes(search.toLowerCase()) || v.subject?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-hdr"><h2>Video Lessons</h2><p>Learn at your own pace with curated exam content.</p></div>

      <div className="filter-bar">
        <div className="filter-input-wrap">
          <i className="fas fa-search" />
          <input className="filter-input" placeholder="Search lessons…" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterSubject} onChange={e=>setFilterSubject(e.target.value)}>
          <option value="all">All Subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filterAccess} onChange={e=>setFilterAccess(e.target.value)}>
          <option value="all">All Access</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
      </div>

      {loading ? (
        <div className="videos-grid">
          {Array.from({length:6}).map((_,i) => <SkeletonVideoCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="fas fa-film" /></div>
          <h3>No lessons found</h3>
          <p>Try adjusting your filters or check back soon.</p>
        </div>
      ) : (
        <div className="videos-grid">
          {filtered.map(v => {
            const accessible = canAccess(v);
            return (
              <div key={v.id} className={`video-card${accessible ? '' : ' locked'}`} onClick={() => {
                if (!accessible) { showToast('Upgrade to access this lesson', 'info'); return; }
                setPlaying(v);
              }}>
                <div className="video-thumb">
                  {v.thumbnail ? <img src={v.thumbnail} alt={v.title} /> : <div className="video-thumb-placeholder"><i className="fas fa-play-circle" /></div>}
                  {!accessible && <div className="video-lock-overlay"><i className="fas fa-lock" /></div>}
                  <span className={`video-access-badge ${v.access || 'free'}`}>{v.access === 'elite' ? <><i className="fas fa-star" /> Elite</> : v.access === 'pro' ? <><i className="fas fa-fire" /> Pro</> : <><i className="fas fa-check" /> Free</>}</span>
                </div>
                <div className="video-info">
                  <div className="video-title">{v.title}</div>
                  <div className="video-meta">{v.subject} {v.duration ? `· ${v.duration}` : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
