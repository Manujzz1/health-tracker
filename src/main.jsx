// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { requestNotificationPermission } from "./firebase";

requestNotificationPermission(); // 🔔 Request permission at startup

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("✅ Service Worker Registered:", registration);
    })
    .catch((err) => {
      console.error("❌ Service Worker Registration Failed:", err);
    });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
