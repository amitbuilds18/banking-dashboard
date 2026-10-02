import { useEffect, useState } from "react";
import API from "../services/api";
import { useSocket } from "../context/SocketContext";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const { socket, isConnected } = useSocket();

  const loadNotifications = async () => {
    try {
      const res = await API.get("/notifications");

      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Listen to real-time socket events for instant notifications
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      loadNotifications();
    };

    socket.on("new_notification", handleRealtimeUpdate);
    socket.on("payment_received", handleRealtimeUpdate);

    return () => {
      socket.off("new_notification", handleRealtimeUpdate);
      socket.off("payment_received", handleRealtimeUpdate);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-2xl text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
        aria-label="Notifications"
      >
        🔔

        {/* Live Socket Status Dot */}
        {isConnected && (
          <span
            title="Real-Time Socket Connected"
            className="absolute -left-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            <span>Notifications</span>
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 lowercase tracking-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Real-Time
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 lowercase tracking-normal">
                Connecting...
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-400">No notifications yet.</div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`cursor-pointer border-b border-slate-700 px-4 py-3 transition ${!item.is_read ? "bg-slate-800/80" : "bg-transparent"}`}
                onClick={() => markAsRead(item.id)}
              >
                <h4 className="font-semibold text-white">{item.title}</h4>
                <p className="mt-1 text-sm text-slate-300">{item.message}</p>
                <p className="mt-2 text-[11px] text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}