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

firebase.initializeApp(configFromQuery());
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  // Pesan bertipe `notification` sudah ditampilkan otomatis oleh SDK Firebase.
  // Kalau di sini ditampilkan lagi, hasilnya dobel.
  if (payload.notification) return;

  // Pesan data-only: tidak ada yang menampilkan otomatis, jadi kita tampilkan sendiri.
  const data = payload.data || {};
  const title = data.title || "Notifikasi";
  const body = data.body || "";

  self.registration.showNotification(title, {
    body: body,
    tag: "pulang-reminder", // tag sama = menimpa, bukan menumpuk
    data: { link: data.link || "" },
  });
});

// Klik notifikasi: fokuskan tab yang sudah terbuka, atau buka halamannya.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "";
  const target = link || self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
