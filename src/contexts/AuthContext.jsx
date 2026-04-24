import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const LEVEL_NAMES = ['Starter','Scholar','Explorer','Achiever','Champion','Elite','Legend'];
const LEVEL_THRESHOLDS = [0,500,1500,3500,7000,12000,20000];

export function xpToLevel(xp) {
  let l = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) { if (xp >= LEVEL_THRESHOLDS[i]) l = i + 1; }
  return Math.min(l, LEVEL_NAMES.length);
}
export function xpProgressInLevel(xp) {
  const t = [0,500,1500,3500,7000,12000,20000,999999];
  for (let i = 0; i < t.length - 1; i++) { if (xp < t[i+1]) return (xp - t[i]) / (t[i+1] - t[i]); }
  return 1;
}
export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });
}
export function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - (ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime());
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

export const ALL_ACHIEVEMENTS = [
  { id:'first_lesson', icon:'🎬', label:'First Lesson', desc:'Watch your first video', threshold:null },
  { id:'streak_3',    icon:'🔥', label:'3-Day Streak',  desc:'Study 3 days in a row', field:'streak', threshold:3 },
  { id:'streak_7',    icon:'⚡', label:'7-Day Streak',  desc:'Study 7 days in a row', field:'streak', threshold:7 },
  { id:'cbt_5',       icon:'📝', label:'CBT Starter',  desc:'Complete 5 CBT sessions', field:'cbtCount', threshold:5 },
  { id:'cbt_10',      icon:'🧠', label:'CBT Master',   desc:'Complete 10 CBT sessions', field:'cbtCount', threshold:10 },
  { id:'xp_500',      icon:'⭐', label:'500 XP',        desc:'Earn 500 XP', field:'xp', threshold:500 },
  { id:'xp_1000',     icon:'💫', label:'1,000 XP',      desc:'Earn 1,000 XP', field:'xp', threshold:1000 },
  { id:'top_10',      icon:'🏆', label:'Top 10',        desc:'Reach Top 10 nationwide', threshold:null },
  { id:'top_50',      icon:'🎖️', label:'Top 50',        desc:'Reach Top 50 nationwide', threshold:null },
];

export function computeAchievements(userData) {
  const earned = userData?.achievements || [];
  const xp = userData?.xp || 0;
  const cbtCount = userData?.cbtCount || 0;
  const streak = userData?.streak || 0;

  return ALL_ACHIEVEMENTS.map(a => {
    let isEarned = earned.includes(a.id);
    let progress = isEarned ? 1 : 0;

    if (!isEarned && a.field && a.threshold) {
      const val = a.field === 'xp' ? xp : a.field === 'cbtCount' ? cbtCount : streak;
      progress = Math.min(val / a.threshold, 1);
      if (progress >= 1) isEarned = true;
    }
    return { ...a, isEarned, progress };
  });
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reloadUserData = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) setUserData({ id: snap.id, ...snap.data() });
    } catch (e) { console.warn('reloadUserData', e.message); }
  }, []);

  const updateUserData = useCallback((patch) => {
    setUserData(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  const saveProfile = useCallback(async (data) => {
    if (!currentUser) return;
    const payload = { ...data, updatedAt: serverTimestamp() };
    await updateDoc(doc(db, 'users', currentUser.uid), payload);
    setUserData(prev => ({ ...prev, ...data }));
  }, [currentUser]);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) setUserData({ id: snap.id, ...snap.data() });
          else setUserData({ uid: user.uid, email: user.email, xp:0, streak:0, plan:'free', role:'student', achievements:[], cbtCount:0 });
        } catch (e) {
          setUserData({ uid: user.uid, email: user.email, xp:0, streak:0, plan:'free', role:'student', achievements:[], cbtCount:0 });
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, reloadUserData, updateUserData, saveProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
