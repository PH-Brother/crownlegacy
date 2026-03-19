import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const splash = document.getElementById("splash");
if (splash) {
  setTimeout(() => {
    splash.style.opacity = "0";
    splash.style.transition = "opacity 0.4s ease";
    setTimeout(() => splash.remove(), 400);
  }, 300);
}

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}
