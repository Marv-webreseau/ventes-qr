// Service worker : notifications push + page de secours hors connexion. Ne met JAMAIS les données en cache (ventes, stock).
const CACHE = "ventes-qr-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.add("/hors-ligne.html")).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") e.respondWith(fetch(e.request).catch(() => caches.match("/hors-ligne.html")));
});
self.addEventListener("push", (e) => {
  let d = { titre: "Ventes QR", corps: "", url: "/" };
  try { d = { ...d, ...e.data.json() }; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.titre, { body: d.corps, icon: "/icons/icon-192.png", data: { url: d.url }, tag: d.url }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
    for (const f of fenetres) if ("focus" in f) { if ("navigate" in f) f.navigate(url); return f.focus(); }
    return self.clients.openWindow(url);
  }));
});
