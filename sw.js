/* مصروفي — service worker: يشغّل التطبيق كأبلكيشن، ويستقبل الإشعارات، وينفّذ أزرارها */
importScripts('config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
const C = self.MASROFY_CONFIG || {};
const CACHE = 'masrofy-v10';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './badge-96.png', './notif-192.png', './badge-mono-96.png'];
const ICON = new URL('notif-192.png', self.registration.scope).href, BADGE = new URL('badge-mono-96.png', self.registration.scope).href;

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (CDN.includes(u.hostname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});

function show(d) {
  const actions = [];
  for (let i = 0; i < 2; i++) if (d['a' + i]) actions.push({action: String(i), title: d['a' + i]});
  return self.registration.showNotification(d.title || 'مصروفي', {
    body: d.body || '', icon: ICON, badge: BADGE,
    tag: d.tag, dir: 'rtl', lang: 'ar', data: d, actions, requireInteraction: actions.length > 0
  });
}
if (C.firebase && C.firebase.apiKey) {
  firebase.initializeApp(C.firebase);
  firebase.messaging().onBackgroundMessage(p => show(p.data || {}));
}

self.addEventListener('notificationclick', e => {
  const n = e.notification, d = n.data || {};
  n.close();
  const i = e.action;
  if (i && d['x' + i]) {
    const note = body => self.registration.showNotification('مصروفي', {body, icon: ICON, badge: BADGE, tag: d.tag, dir: 'rtl', lang: 'ar'});
    e.waitUntil(
      fetch(C.apiUrl, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({fn: 'api_act', args: [d['x' + i], d['s' + i]]})})
        .then(r => r.json())
        .then(j => note(j.ok ? j.data : (j.error || 'حصلت مشكلة')))
        .catch(() => note('مقدرتش أوصل للسيرفر. افتح التطبيق وسجّلها من التنبيهات.'))
        .then(() => self.clients.matchAll({type: 'window'}))
        .then(cs => cs.forEach(c => c.postMessage('refresh')))
    );
    return;
  }
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
