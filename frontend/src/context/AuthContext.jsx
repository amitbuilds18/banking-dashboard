import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

function isTokenValid(token) {
  if (!token) return false;

  try {
    const payload = token.split(".")[1];
    if (!payload) return false;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));

    if (!decoded.exp) return false;

    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function getStoredAuth() {
  try {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    return {
      token,
      user,
      isAuthenticated: isTokenValid(token),
    };
  } catch {
    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const initial = getStoredAuth();
    return {
      ...initial,
      token: initial.token ?? undefined,
    };
  });

  useEffect(() => {
    if (!auth.token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const clearAuth = setTimeout(() => {
        setAuth({ token: null, user: null, isAuthenticated: false });
      }, 0);

      return () => clearTimeout(clearAuth);
    }

    if (!isTokenValid(auth.token)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const clearAuth = setTimeout(() => {
        setAuth({ token: null, user: null, isAuthenticated: false });
      }, 0);

      return () => clearTimeout(clearAuth);
    }
  }, [auth.token]);

  const login = (token, user) => {
    if (!token) return;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user || null));
    setAuth({ token, user: user || null, isAuthenticated: true });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null, isAuthenticated: false });
  };

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: auth.isAuthenticated,
      login,
      logout,
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
