import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });

    if (message) {
      const timeout = setTimeout(() => {
        setToast({ message: "", type: "success" });
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, []);

  const value = useMemo(
    () => ({
      toast,
      showToast,
    }),
    [toast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast message={toast.message} type={toast.type} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
