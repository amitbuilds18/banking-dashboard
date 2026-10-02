import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { SocketProvider } from "./context/SocketContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
);
