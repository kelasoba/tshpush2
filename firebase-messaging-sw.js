// Versi baru langsung menggantikan versi lama, tanpa menunggu tab ditutup atau unregister manual.
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

importScripts("https://cdnjs.cloudflare.com/ajax/libs/firebase/8.10.1/firebase-app.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/firebase/8.10.1/firebase-messaging.js");

function configFromQuery() {
  const params = new URLSearchParams(self.location.search);
  return {
    apiKey: params.get("apiKey"),
    authDomain: params.get("authDomain"),
    projectId: params.get("projectId"),
    storageBucket: params.get("storageBucket"),
    messagingSenderId: params.get("messagingSenderId"),
    appId: params.get("appId"),
  };
}

const CONFIG = configFromQuery();
firebase.initializeApp(CONFIG);
const messaging = firebase.messaging();

// Catat event ke Firestore lewat REST API — SDK Firestore penuh terlalu berat
// buat dijalankan di service worker, jadi cukup fetch ke endpoint REST-nya.
function logEvent(eventType, extra) {
  extra = extra || {};
  const projectId = CONFIG.projectId;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/notification_events`;

  const fields = {
    event_type: { stringValue: eventType },
    timestamp: { timestampValue: new Date().toISOString() },
  };
  if (extra.message_id) fields.message_id = { stringValue: extra.message_id };
  if (extra.tag) fields.tag = { stringValue: extra.tag };

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: fields }),
  }).catch(function (err) {
    console.error("Gagal log event:", err);
  });
}

messaging.onBackgroundMessage(function (payload) {
  // Pesan bertipe `notification` sudah ditampilkan otomatis oleh SDK Firebase.
  // Kalau di sini ditampilkan lagi, hasilnya dobel.
  if (payload.notification) return;

  // Pesan data-only: tidak ada yang menampilkan otomatis, jadi kita tampilkan sendiri.
  const data = payload.data || {};
  const title = data.title || "Notifikasi";
  const body = data.body || "";

  logEvent("delivered_background", { message_id: data.message_id || "" });

  self.registration.showNotification(title, {
    body: body,
    tag: "pulang-reminder", // tag sama = menimpa, bukan menumpuk
    data: { link: data.link || "", message_id: data.message_id || "" },
  });
});

// Klik notifikasi: fokuskan tab yang sudah terbuka, atau buka halamannya.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "";
  const target = link || self.registration.scope;
  const messageId = (event.notification.data && event.notification.data.message_id) || "";

  event.waitUntil(
    Promise.all([
      logEvent("clicked", { message_id: messageId, tag: event.notification.tag }),
      clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
        for (const client of list) {
          if (client.url.startsWith(self.registration.scope) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(target);
      }),
    ])
  );
});

// Notifikasi ditutup tanpa diklik (swipe / tombol X) — Chrome & Firefox mendukung ini,
// Safari tidak selalu, jadi anggap "dismissed" ini best-effort saja.
self.addEventListener("notificationclose", function (event) {
  const messageId = (event.notification.data && event.notification.data.message_id) || "";
  event.waitUntil(logEvent("dismissed", { message_id: messageId, tag: event.notification.tag }));
});
