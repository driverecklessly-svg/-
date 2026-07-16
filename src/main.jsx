import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Artifacts上でしか使えない window.storage を、通常のブラウザ(localStorage)用に
// 置き換える簡易ポリフィルです。shared/personal の区別はせず、同じブラウザ内で
// 共有します(別の人のスマホ・PCとはデータが共有されません)。
if (typeof window !== "undefined" && !window.storage) {
  const PREFIX = "hasha-seisan:";

  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) {
          keys.push(k.slice(PREFIX.length));
        }
      }
      return { keys, prefix, shared: false };
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
