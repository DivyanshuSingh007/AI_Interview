"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Crown, X, Loader2, CheckCircle } from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingSeconds?: number;
}

export function SubscriptionModal({ isOpen, onClose, remainingSeconds = 0 }: SubscriptionModalProps) {
  const { token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!token) return;
    
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/subscription/upgrade`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upgrade failed");
      }
      
      setSuccess(true);
      await refreshUser();
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          borderRadius: 20,
          padding: 40,
          maxWidth: 440,
          width: "90%",
          textAlign: "center",
          border: "1px solid var(--border-subtle)",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: 4,
          }}
        >
          <X size={20} />
        </button>

        {success ? (
          <>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #43d98a, #4ecdc4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle size={40} color="white" />
            </div>
            <h2 style={{ color: "var(--text-primary)", fontSize: 24, marginBottom: 12 }}>
              Upgraded to Premium!
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              You now have unlimited access to AI interviews.
            </p>
          </>
        ) : (
          <>
            {/* Crown icon */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Crown size={40} color="white" />
            </div>

            <h2 style={{ color: "var(--text-primary)", fontSize: 24, marginBottom: 12 }}>
              {remainingSeconds > 0 ? "Time Almost Up!" : "Free Time Exhausted"}
            </h2>
            
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              {remainingSeconds > 0 
                ? `You have ${formatTime(remainingSeconds)} remaining. Upgrade to premium for unlimited access.`
                : "You've used your free 25 minutes. Upgrade to continue practicing with AI interviews."
              }
            </p>

            {/* Premium features */}
            <div
              style={{
                background: "var(--bg-primary)",
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <h3 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Premium Benefits:
              </h3>
              <ul style={{ color: "var(--text-secondary)", fontSize: 13, paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 8 }}>Unlimited interview practice</li>
                <li style={{ marginBottom: 8 }}>All interviewer personas (Griller, Mentor, Behavioral)</li>
                <li style={{ marginBottom: 8 }}>Detailed performance analytics</li>
                <li>Priority support</li>
              </ul>
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(255,75,110,0.1)",
                  border: "1px solid rgba(255,75,110,0.3)",
                  color: "#ff4b6e",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                color: "white",
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Upgrading...
                </>
              ) : (
                <>
                  <Crown size={18} />
                  Upgrade to Premium — ₹299/mo
                </>
              )}
            </button>

            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16 }}>
              Or continue with {formatTime(remainingSeconds)} remaining
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
