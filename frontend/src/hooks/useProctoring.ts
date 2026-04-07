"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ProctoringEvent, PerceptionUpdate } from "@/types/interview";

interface UseProctoringOptions {
  onAlert: (message: string, type: "warning" | "danger") => void;
  onCriticalViolation?: () => void; // Called when interview should end
  enabled?: boolean;
}

interface ProctoringState {
  isDistracted: boolean;
  multiplefaces: boolean;
  gazeAwayDuration: number;
  events: ProctoringEvent[];
  integrityScore: number;
  violationCount: number;
}

const MAX_VIOLATIONS = 3; // End interview after 3 serious violations

export function useProctoring({ onAlert, onCriticalViolation, enabled = true }: UseProctoringOptions) {
  const [state, setState] = useState<ProctoringState>({
    isDistracted: false,
    multiplefaces: false,
    gazeAwayDuration: 0,
    events: [],
    integrityScore: 100,
    violationCount: 0,
  });

  const gazeAwayStartRef = useRef<number | null>(null);
  const multipleFacesStartRef = useRef<number | null>(null);
  const tabSwitchRef = useRef<number | null>(null);
  const alertCooldownRef = useRef<Record<string, number>>({});
  const ALERT_COOLDOWN_MS = 20_000; // 20 seconds between alerts (reduced for more responsiveness)
  const violationCountRef = useRef(0);

  const canAlert = useCallback((type: string): boolean => {
    const now = Date.now();
    const lastAlert = alertCooldownRef.current[type] ?? 0;
    return now - lastAlert > ALERT_COOLDOWN_MS;
  }, []);

  const triggerAlert = useCallback((message: string, type: "warning" | "danger", alertKey: string) => {
    if (!canAlert(alertKey)) return;
    alertCooldownRef.current[alertKey] = Date.now();
    onAlert(message, type);
  }, [canAlert, onAlert]);

  const handleViolation = useCallback((violationType: string) => {
    violationCountRef.current += 1;
    setState(prev => ({ ...prev, violationCount: violationCountRef.current }));
    
    // If max violations reached, end the interview
    if (violationCountRef.current >= MAX_VIOLATIONS && onCriticalViolation) {
      onCriticalViolation();
    }
  }, [onCriticalViolation]);

  // Track tab visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs - this is a serious violation
        tabSwitchRef.current = Date.now();
        
        setState(prev => ({
          ...prev,
          integrityScore: Math.max(0, prev.integrityScore - 15),
          violationCount: violationCountRef.current,
        }));

        // Angry warning for tab switching
        triggerAlert(
          "tab_switch_warning",
          "danger",
          "tab_switch"
        );
        
        handleViolation("tab_switch");
      } else {
        if (tabSwitchRef.current) {
          const duration = (Date.now() - tabSwitchRef.current) / 1000;
          tabSwitchRef.current = null;
          
          const newEvent: ProctoringEvent = {
            timestamp: Date.now(),
            type: "tab_switch",
            duration,
          };
          setState(prev => ({
            ...prev,
            events: [...prev.events, newEvent],
          }));
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, triggerAlert, handleViolation]);

  /**
   * Main handler — called by the Tavus Daily.co frame's perception_update event
   * or by a WebSocket message from the Tavus CVI layer.
   */
  const handlePerceptionUpdate = useCallback(
    (update: PerceptionUpdate) => {
      if (!enabled) return;
      const now = Date.now();

      // ── Gaze tracking ──────────────────────────────────────────
      if (update.gaze === "distracted" || update.gaze === "looking_away") {
        if (!gazeAwayStartRef.current) {
          gazeAwayStartRef.current = now;
        }

        const duration = (now - gazeAwayStartRef.current) / 1000; // seconds

        setState((prev) => ({
          ...prev,
          isDistracted: true,
          gazeAwayDuration: duration,
          integrityScore: Math.max(0, prev.integrityScore - 0.05),
        }));

        // After 5 seconds of looking away, fire alert
        if (duration >= 5) {
          triggerAlert(
            "candidate_gaze_away",
            "warning",
            "gaze_away"
          );

          setState((prev) => ({
            ...prev,
            events: [
              ...prev.events,
              {
                timestamp: now,
                type: "gaze_away",
                duration,
              },
            ],
          }));
        }
      } else if (update.gaze === "focused") {
        if (gazeAwayStartRef.current) {
          // Resumed focus
          const duration = (now - gazeAwayStartRef.current) / 1000;
          gazeAwayStartRef.current = null;

          setState((prev) => ({
            ...prev,
            isDistracted: false,
            gazeAwayDuration: 0,
            events:
              duration > 2
                ? [
                    ...prev.events,
                    {
                      timestamp: now,
                      type: "resumed_focus",
                      duration,
                    },
                  ]
                : prev.events,
          }));
        } else {
          setState((prev) => ({ ...prev, isDistracted: false, gazeAwayDuration: 0 }));
        }
      }

      // ── Multiple faces detection ────────────────────────────────
      if (update.face_count !== undefined && update.face_count > 1) {
        if (!multipleFacesStartRef.current) {
          multipleFacesStartRef.current = now;
        }

        const duration = (now - multipleFacesStartRef.current) / 1000;

        setState((prev) => ({
          ...prev,
          multiplefaces: true,
          integrityScore: Math.max(0, prev.integrityScore - 0.1),
        }));

        if (duration >= 3) { // Reduced to 3 seconds for faster response
          // Angry warning for multiple people!
          triggerAlert(
            "multiple_faces_anger",
            "danger",
            "multiple_faces"
          );

          setState((prev) => ({
            ...prev,
            events: [
              ...prev.events,
              {
                timestamp: now,
                type: "multiple_faces",
                duration,
              },
            ],
          }));

          // This is a serious violation - count it
          handleViolation("multiple_faces");
        }
      } else if (update.face_count === 1) {
        multipleFacesStartRef.current = null;
        setState((prev) => ({ ...prev, multiplefaces: false }));
      }
    },
    [enabled, triggerAlert, handleViolation]
  );

  // Calculate integrity score (0–100) from events
  const getIntegrityScore = useCallback((): number => {
    return Math.max(0, state.integrityScore);
  }, [state.integrityScore]);

  return {
    ...state,
    handlePerceptionUpdate,
    getIntegrityScore,
  };
}
