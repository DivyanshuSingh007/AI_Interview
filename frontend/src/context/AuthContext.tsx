"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AuthUser {
  id:                     string;
  name:                   string;
  email:                  string;
  subscription_status?:   string;
  usage_time_seconds?:     number;
  free_limit_seconds?:    number;
  remaining_time_seconds?: number;
  is_time_exhausted?:     boolean;
}

// Extended user type with subscription info
export interface AuthUserWithSubscription extends AuthUser {
  subscription_status: string;
  usage_time_seconds: number;
  free_limit_seconds: number;
  remaining_time_seconds: number;
  is_time_exhausted: boolean;
}

interface AuthContextType {
  user:     AuthUser | null;
  token:    string | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout:   () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);   // true while hydrating from localStorage

  // ── Hydrate from localStorage or URL on mount ────────────────────────────────────
  useEffect(() => {
    // Check for token in URL (from Google OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    
    if (urlToken) {
      // Store token from URL and clean up URL
      localStorage.setItem("interviewai_token", urlToken);
      setToken(urlToken);
      fetchMe(urlToken).finally(() => {
        setLoading(false);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      });
      return;
    }
    
    const stored = localStorage.getItem("interviewai_token");
    if (stored) {
      setToken(stored);
      fetchMe(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async (jwt: string) => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error("invalid");
      const data = await res.json();
      setUser(data);
    } catch {
      // Token expired / invalid — clear it
      localStorage.removeItem("interviewai_token");
      setToken(null);
      setUser(null);
    }
  };

  const _saveSession = (jwt: string, userObj: AuthUser) => {
    localStorage.setItem("interviewai_token", jwt);
    setToken(jwt);
    setUser(userObj);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Login failed");
    }
    const data = await res.json();
    _saveSession(data.access_token, data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Registration failed");
    }
    const data = await res.json();
    _saveSession(data.access_token, data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("interviewai_token");
    setUser(null);
    setToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to refresh");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
