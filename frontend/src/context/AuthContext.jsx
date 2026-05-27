// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

//////////////////////////////////////////////////////////
// AUTH CONTEXT
// Single source of truth for login state
// Persists across page refreshes via localStorage
//////////////////////////////////////////////////////////

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  //////////////////////////////////////////////////////////
  // ON MOUNT — restore session from localStorage
  // Allows page refresh without logging out
  //////////////////////////////////////////////////////////

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser  = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    setLoading(false);
  }, []);

  //////////////////////////////////////////////////////////
  // LOGIN — called by Login.jsx after successful API call
  //////////////////////////////////////////////////////////

  function login(tokenValue, userValue) {
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user",  JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
  }

  //////////////////////////////////////////////////////////
  // LOGOUT — clears everything
  //////////////////////////////////////////////////////////

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  //////////////////////////////////////////////////////////
  // HELPERS
  //////////////////////////////////////////////////////////

  const isLoggedIn   = !!token;
  const isAdmin      = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const isStaff      = user?.role === "STAFF";
  const isGuest      = user?.role === "GUEST";

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isLoggedIn,
      isAdmin,
      isStaff,
      isGuest,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

//////////////////////////////////////////////////////////
// HOOK — useAuth()
// Every component calls this to access auth state
// Usage: const { user, logout, isAdmin } = useAuth();
//////////////////////////////////////////////////////////

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}