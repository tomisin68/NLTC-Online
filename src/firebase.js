import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA9vzT1TBpTdRJUfyYm51goS-5HfL3FcbU',
  authDomain: 'nltc-online.vercel.app',
  projectId: 'nltc-online',
  storageBucket: 'nltc-online.firebasestorage.app',
  messagingSenderId: '267993935158',
  appId: '1:267993935158:web:723c13b2564b817fbc9797',
};

export const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const VAPID_KEY = 'BLw6s59QLZJVfXGChqf9YGgxcweSfxUjTq4iCcRXDB6BRxPDeYJhcD7dSrqVqLpFN6obHRz1Gf8ANjBH2PN8dKQ';
export const BACKEND_URL = 'https://nltc-backend.onrender.com';
export const AGORA_APP_ID = '5eae75b2cc3d48cc84446b94d3877f88';
export const ALOC_TOKEN = 'ALOC-151ffaaa75aa4dc081ef';

export async function getMessagingInstance() {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
}
