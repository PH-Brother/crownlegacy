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
