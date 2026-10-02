import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const SocketContext = createContext(null);

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app"
    : "http://localhost:5000");

// Web Audio API Realistic Banking Payment Chime
function playPaymentChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Harmonic bell sequence: 659.25Hz (E5) -> 880Hz (A5) -> 1318.51Hz (E6)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.setValueAtTime(880, now + 0.08);
    osc.frequency.setValueAtTime(1318.51, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  } catch (err) {
    // Graceful fallback if browser audio context is restricted
  }
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [lastPaymentEvent, setLastPaymentEvent] = useState(null);
  const [liveBalance, setLiveBalance] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket client
    const socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // If user is already authenticated, join their private channel
      if (user?.id) {
        socket.emit("join_user", user.id);
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // 1. Live Payment Received Event
    socket.on("payment_received", (data) => {
      setLastPaymentEvent(data);
      if (data.newBalance !== undefined) {
        setLiveBalance(data.newBalance);
      }
      playPaymentChime();
      const amountStr = Number(data.amount || 0).toLocaleString("en-IN");
      showToast(
        `🎉 Payment Received! ₹${amountStr} from ${data.senderName || "User"}`,
        "success"
      );
    });

    // 2. Live Balance Updated Event
    socket.on("balance_updated", (data) => {
      if (data.balance !== undefined) {
        setLiveBalance(data.balance);
      }
    });

    // 3. Live Notification Event
    socket.on("new_notification", (data) => {
      showToast(data.message || data.title, "info");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // When auth state changes, join or leave user room
  useEffect(() => {
    if (socketRef.current && isConnected) {
      if (user?.id) {
        socketRef.current.emit("join_user", user.id);
      }
    }
  }, [user?.id, isConnected]);

  const joinPaymentLinkRoom = useCallback((linkCode) => {
    if (socketRef.current && linkCode) {
      socketRef.current.emit("join_payment_link", linkCode);
    }
  }, []);

  const onPaymentLinkSettled = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on("payment_link_settled", callback);
      return () => {
        socketRef.current?.off("payment_link_settled", callback);
      };
    }
    return () => {};
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        lastPaymentEvent,
        liveBalance,
        setLiveBalance,
        joinPaymentLinkRoom,
        onPaymentLinkSettled,
        playPaymentChime,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

export default SocketContext;
