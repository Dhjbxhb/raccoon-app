import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// PERFORMANCE: Remove StrictMode in production for better performance
const root = ReactDOM.createRoot(document.getElementById("root"));

if (process.env.NODE_ENV === 'production') {
  root.render(<App />);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
