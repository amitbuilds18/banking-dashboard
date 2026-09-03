import { useEffect, useState } from "react";
import API from "../services/api";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

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
    const initialLoad = setTimeout(loadNotifications, 0);
    const interval = setInterval(loadNotifications, 5000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

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

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="border-b border-slate-700 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Notifications
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