import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useAuth } from '../contexts/AuthContext';
import { useBackendFetch } from '../hooks/useBackendFetch';
import '../styles/dashboard.css';

import HomeView         from './dashboard/HomeView';
import VideoLessonsView from './dashboard/VideoLessonsView';
import CBTPracticeView  from './dashboard/CBTPracticeView';
import NLTCQuizView     from './dashboard/NLTCQuizView';
import QuickTestsView   from './dashboard/QuickTestsView';
import LiveClassesView  from './dashboard/LiveClassesView';
import MockExamsView    from './dashboard/MockExamsView';
import LeaderboardView  from './dashboard/LeaderboardView';
import AnnouncementsView from './dashboard/AnnouncementsView';
import ScheduleView     from './dashboard/ScheduleView';
import SettingsView     from './dashboard/SettingsView';

const VIEW_TITLES = {
  home:        'Dashboard',
  lessons:     'Video Lessons',
  cbt:         'CBT Practice',
  officialquiz:'NLTC Official Quiz',
  quicktest:   'Quick Tests',
  live:        'Live Classes',
  mockexams:   'Mock Exams',
  leaderboard: 'Leaderboard',
  announcements:'Announcements',
  schedule:    'Schedule',
  settings:    'Settings',
};

export default function DashboardPage() {
  const { userData, currentUser } = useAuth();
  const backendFetch = useBackendFetch();
  const navigate = useNavigate();
  const [view, setView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* daily streak */
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().slice(0,10);
    const key = `nltc_streak_${currentUser.uid}`;
    if (localStorage.getItem(key) === today) return;
    backendFetch('POST', '/gamification/xp', { action:'daily_streak' })
      .then(() => localStorage.setItem(key, today))
      .catch(() => {});
  }, [currentUser]);

  /* CBT score listener (from /cbt page postMessage) */
  useEffect(() => {
    function onMessage(e) {
      if (e.data?.type !== 'nltc_cbt_score') return;
      const { score, subject, correct, total, exam } = e.data;
      backendFetch('POST', '/gamification/cbt-session', { subject, exam:'cbt', score, correct, total })
        .catch(() => {});
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [backendFetch]);

  /* Admin guard */
  useEffect(() => {
    if (userData && userData.role === 'admin') navigate('/admin', { replace:true });
  }, [userData, navigate]);

  function renderView() {
    switch (view) {
      case 'home':         return <HomeView onNav={setView} />;
      case 'lessons':      return <VideoLessonsView />;
      case 'cbt':          return <CBTPracticeView />;
      case 'officialquiz': return <NLTCQuizView />;
      case 'quicktest':    return <QuickTestsView />;
      case 'live':         return <LiveClassesView />;
      case 'mockexams':    return <MockExamsView />;
      case 'leaderboard':  return <LeaderboardView />;
      case 'announcements':return <AnnouncementsView />;
      case 'schedule':     return <ScheduleView />;
      case 'settings':     return <SettingsView />;
      default:             return <HomeView onNav={setView} />;
    }
  }

  return (
    <div className="dash-layout">
      <Sidebar
        activeView={view}
        onNav={setView}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="dash-main">
        <Topbar
          title={VIEW_TITLES[view] || 'Dashboard'}
          onHamburger={() => setSidebarOpen(o => !o)}
          streak={userData?.streak || 0}
        />
        <div className="dash-content">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
