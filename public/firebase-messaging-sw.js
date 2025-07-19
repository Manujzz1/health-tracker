/* public/firebase-messaging-sw.js */

// Import Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Firebase initialization
firebase.initializeApp({
  apiKey: "AIzaSyBxfQXbnfPWGwtlgxuLf6Sas6rB9JOGWYU",
  authDomain: "health-tracker-21d43.firebaseapp.com",
  projectId: "health-tracker-21d43",
  storageBucket: "health-tracker-21d43.appspot.com",
  messagingSenderId: "1086755747536",
  appId: "1:1086755747536:web:b678dbe82a504302c850d5"
});

const messaging = firebase.messaging();

// ✅ Firebase background messages
messaging.onBackgroundMessage((payload) => {
  console.log("🔕 Firebase Background Message:", payload);

  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title, {
    body: body || "You have a new message.",
    icon: icon || "/icon.png"
  });
});

// ✅ Custom push notifications (e.g., reminders)
self.addEventListener("push", (event) => {
  console.log("📦 Custom Push Event:", event);

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.warn("⚠️ Push event data was not JSON:", e);
  }

  const notificationTitle = data.title || "Reminder";
  const notificationOptions = {
    body: data.body || "You have a reminder.",
    icon: data.icon || "/icon.png"
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});
