/* =============================================================
   NLTC Online — Firebase Cloud Messaging Service Worker
   Must be served from the root path (/firebase-messaging-sw.js)
   so FCM can register it.
   Firebase version must match the one used in the app (10.12.0).
============================================================= */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyA9vzT1TBpTdRJUfyYm51goS-5HfL3FcbU',
  projectId:         'nltc-online',
  messagingSenderId: '267993935158',
  appId:             '1:267993935158:web:723c13b2564b817fbc9797'
});

const messaging = firebase.messaging();

/* ── Background / closed-tab push handler ── */
messaging.onBackgroundMessage((payload) => {
  const { title = 'NLTC', body = '', icon } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon:  icon || '/NLTC.png',
    badge: '/NLTC.png',
    data:  payload.data || {},
  });
});

/* ── Notification click → open the correct page ── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
