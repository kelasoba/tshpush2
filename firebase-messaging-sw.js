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
  const title = (payload.notification && payload.notification.title) || "Notifikasi";
  const body = (payload.notification && payload.notification.body) || "";
  self.registration.showNotification(title, { body: body });
});
