"use client";

import React, { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight, Loader2,
} from "lucide-react";

const GOOGLE_CLIENT_ID = "619472925714-tjmjsitggnsofh9e8v3t70ck4oo1lefn.apps.googleusercontent.com";
const FRONTEND_URL = "http://localhost:3000";
const GOOGLE_REDIRECT_URI = `${FRONTEND_URL}/auth/google/callback`;

function getGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface AuthPageProps {
  onSuccess: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode]       = useState<"login" | "register">("login");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPw]     = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!name.trim()) { setError("Name is required"); setBusy(false); return; }
        await register(name, email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="gradient-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Glass card */}
      <div
        className="card animate-slide-up"
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "40px 36px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, margin: "0 auto 14px",
            }}
          >
            🤖
          </div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>
            Interview<span style={{ color: "#6c63ff" }}>AI</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
            {mode === "login" ? "Sign in to continue your journey" : "Create your free account"}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-elevated)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 28,
            border: "1px solid var(--border-subtle)",
          }}
        >
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s ease",
                background: mode === m
                  ? "linear-gradient(135deg, #6c63ff, #4ecdc4)"
                  : "transparent",
                color: mode === m ? "white" : "var(--text-muted)",
              }}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name field — register only */}
          {mode === "register" && (
            <div>
              <label style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={15}
                  color="var(--text-muted)"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  className="input-field"
                  id="input-auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Priya Sharma"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={15}
                color="var(--text-muted)"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                className="input-field"
                id="input-auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Password {mode === "register" && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(min 8 chars)</span>}
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={15}
                color="var(--text-muted)"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                className="input-field"
                id="input-auth-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: 38, paddingRight: 40 }}
                required
                minLength={mode === "register" ? 8 : 1}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                }}
              >
                {showPw
                  ? <EyeOff size={15} color="var(--text-muted)" />
                  : <Eye    size={15} color="var(--text-muted)" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(255,75,110,0.1)", border: "1px solid rgba(255,75,110,0.3)",
                color: "var(--accent-danger)", fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="btn-auth-submit"
            type="submit"
            disabled={busy}
            className="btn-primary"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px 0", fontSize: 14, fontWeight: 700,
              opacity: busy ? 0.7 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : mode === "login" ? (
              <>Sign In <ArrowRight size={16} /></>
            ) : (
              <>Create Account <Sparkles size={16} /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          <span style={{ padding: "0 12px", color: "var(--text-muted)", fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={() => window.location.href = getGoogleAuthUrl()}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 10,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Footer note */}
        <p style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
          By continuing you agree to our{" "}
          <span style={{ color: "var(--accent-primary)", cursor: "pointer" }}>Terms</span>
          {" & "}
          <span style={{ color: "var(--accent-primary)", cursor: "pointer" }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
