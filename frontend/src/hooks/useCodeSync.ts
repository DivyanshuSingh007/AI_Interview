"use client";

import { useEffect, useRef, useCallback } from "react";
import { CodeSnapshot, InterviewPhase } from "@/types/interview";

interface UseCodeSyncOptions {
  code:           string;
  language:       string;
  phase:          InterviewPhase;
  sessionId:      string;
  conversationId?: string;       // Tavus conversation ID for live context injection
  intervalMs?:    number;
  onSnapshot?:    (snapshot: CodeSnapshot) => void;
  enabled?:       boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Sends a code snapshot to the backend every `intervalMs` ms.
 * If `conversationId` is provided, also PATCHes the live Tavus conversation
 * so the AI avatar can see and discuss the candidate's code in real-time.
 */
export function useCodeSync({
  code,
  language,
  phase,
  sessionId,
  conversationId,
  intervalMs = 20_000,    // every 20 s (reduced from 30 for snappier AI awareness)
  onSnapshot,
  enabled = true,
}: UseCodeSyncOptions) {
  const codeRef     = useRef(code);
  const lastSentRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep latest code in ref without causing re-renders
  useEffect(() => { codeRef.current = code; }, [code]);

  const sendSnapshot = useCallback(async () => {
    if (!enabled || !sessionId) return;
    const currentCode = codeRef.current;

    // Skip if code hasn't changed since last send
    if (currentCode === lastSentRef.current) return;
    lastSentRef.current = currentCode;

    const snapshot: CodeSnapshot = {
      timestamp: Date.now(),
      code:      currentCode,
      language,
      phase,
    };

    onSnapshot?.(snapshot);

    try {
      if (conversationId) {
        // ── Primary path: push code to Tavus context via backend ───────
        // Backend reads TAVUS_API_KEY from its own .env — key never
        // leaves the server.
        await fetch(`${API}/api/push-code-context`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            session_id:      sessionId,
            code:            currentCode,
            language,
            phase,
          }),
        });
      } else {
        // ── Fallback: store snapshot locally only ─────────────────────
        await fetch(`${API}/api/code-snapshot`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, snapshot }),
        });
      }
    } catch (err) {
      console.warn("[CodeSync] Failed to send snapshot:", err);
    }

  }, [enabled, sessionId, conversationId, language, phase, onSnapshot]);

  useEffect(() => {
    if (!enabled) return;
    intervalRef.current = setInterval(sendSnapshot, intervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled, intervalMs, sendSnapshot]);

  const forceSync = useCallback(() => { sendSnapshot(); }, [sendSnapshot]);

  return { forceSync };
}
