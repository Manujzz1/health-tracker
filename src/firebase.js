// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxfQXbnfPWGwtlgxuLf6Sas6rB9JOGWYU",
  authDomain: "health-tracker-21d43.firebaseapp.com",
  projectId: "health-tracker-21d43",
  storageBucket: "health-tracker-21d43.appspot.com",
  messagingSenderId: "1086755747536",
  appId: "1:1086755747536:web:b678dbe82a504302c850d5"
};

// ✅ Initialize Firebase services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

/**
 * 🔔 Request Notification Permission + Get FCM Token
 * Returns true if permission granted and token fetched.
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BJe4Ia1nzOqBl2yQCrXReTbm5yuLjYitGpZMi_fa-VyI213ru0GgczFh-vo3CE32ePaCrDtv6tNQRo6xjfXaLIc",
      });
      console.log("✅ FCM Token:", token);
      return true;
    } else {
      console.warn("⚠️ Notification permission denied");
      return false;
    }
  } catch (error) {
    console.error("❌ Error getting FCM token:", error);
    return false;
  }
};

/**
 * 🎯 Foreground Push Notification Handler (optional for FCM messages)
 */
export const onForegroundMessage = (onMessageCallback) => {
  onMessage(messaging, (payload) => {
    console.log("📩 Foreground message received:", payload);
    if (Notification.permission === "granted") {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || "/icon.png",
      });
    }
    if (onMessageCallback) {
      onMessageCallback(payload);
    }
  });
};
