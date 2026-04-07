"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  CandidateProfile,
  InterviewSession,
  InterviewPhase,
  InterviewScore,
  VibeType,
  CodeExecutionResult,
} from "@/types/interview";
import { useProctoring } from "@/hooks/useProctoring";
import { useCodeSync } from "@/hooks/useCodeSync";
import { useAuth } from "@/context/AuthContext";
import { TavusVideoCall } from "@/components/TavusVideoCall";
import { CodeEditorPanel } from "@/components/CodeEditorPanel";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { VIBE_CONFIGS } from "@/config/TavusConfig";
import {
  Clock,
  AlertTriangle,
  Code2,
} from "lucide-react";

// ─── Starter code map ─────────────────────────────────────────────────────────
const DEFAULT_CODE: Record<string, string> = {
  python: `# Two Sum - Return indices of two numbers that add to target
def two_sum(nums: list[int], target: int) -> list[int]:
    # Your solution here
    pass

# Test
print(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]
`,
  javascript: `// Two Sum - Return indices of two numbers that add to target
function twoSum(nums, target) {
  // Your solution here
}
console.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]
`,
};

interface InterviewRoomProps {
  session:         InterviewSession;
  conversationUrl: string;
  conversationId?: string;           // Tavus conversation ID for live code context
  onEnd:           (scores: InterviewScore) => void;
  difficulty?:     string;            // "easy", "medium", "hard" - passed to get random questions
}

function PhaseBadge({ phase }: { phase: InterviewPhase }) {
  const map: Record<string, { label: string; color: string }> = {
    greeting:   { label: "Greeting",   color: "#4ecdc4" },
    technical:  { label: "Technical",  color: "#6c63ff" },
    coding:     { label: "Coding",     color: "#f7c948" },
    behavioral: { label: "Behavioral", color: "#43d98a" },
    wrap_up:    { label: "Wrap Up",    color: "#ff4b6e" },
    connecting: { label: "Connecting", color: "#8b95a8" },
  };
  const cfg = map[phase] ?? { label: phase, color: "#8b95a8" };

  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 100,
        background: `${cfg.color}20`,
        border: `1px solid ${cfg.color}44`,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
      }}
    >
      {cfg.label}
    </span>
  );
}

function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  
  const elapsedMs = elapsed;
  const elapsedM = Math.floor(elapsedMs / 60000);
  const elapsedS = Math.floor((elapsedMs % 60000) / 1000);

  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        color: "var(--text-secondary)",
      }}
    >
      {`${String(elapsedM).padStart(2, "0")}:${String(elapsedS).padStart(2, "0")}`}
    </span>
  );
}

export default function InterviewRoom({
  session,
  conversationUrl,
  conversationId,
  onEnd,
  difficulty = "medium",
}: InterviewRoomProps) {
  const { user, token, refreshUser } = useAuth();
  const [code, setCode] = useState(DEFAULT_CODE["python"]);
  const [language, setLanguage] = useState("python");

  // Handle language change and update code to use question's starter code
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    // If we have a fetched question, use its starter code
    if (currentQuestion?.starter_code?.[lang]) {
      setCode(currentQuestion.starter_code[lang]);
    } else if (DEFAULT_CODE[lang]) {
      setCode(DEFAULT_CODE[lang]);
    }
  };
  const [phase, setPhase] = useState<InterviewPhase>(session.phase ?? "greeting");
  const [proctoringAlerts, setProctoringAlerts] = useState<
    { message: string; type: "warning" | "danger"; id: number }[]
  >([]);
  const alertIdRef = useRef(0);
  const codeSnapshotsRef = useRef(session.codeSnapshots ?? []);
  
  // Subscription tracking state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const lastTrackTimeRef = useRef<number>(0);
  const videoTrackTimeRef = useRef<number>(0);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // State for random question based on difficulty
  const [currentQuestion, setCurrentQuestion] = useState<{
    title: string;
    description: string;
    starter_code: Record<string, string>;
    difficulty: string;
    category: string;
  } | null>(null);

  // Helper function to generate starter code with problem details
  const generateCodeWithProblem = (questionData: any, lang: string): string => {
    if (!questionData) return DEFAULT_CODE[lang] || "";

    const starterCode = questionData.starter_code?.[lang] || "";
    if (!starterCode) return DEFAULT_CODE[lang] || "";

    // Build problem description as comments
    let header = `// ═══════════════════════════════════════════════════════════════\n`;
    header += `// ${questionData.title} (${questionData.difficulty.toUpperCase()})\n`;
    header += `// Category: ${questionData.category}\n`;
    header += `// ═══════════════════════════════════════════════════════════════\n\n`;
    header += `// PROBLEM DESCRIPTION:\n`;
    header += `// ${questionData.description}\n\n`;

    // Add examples
    if (questionData.examples && questionData.examples.length > 0) {
      header += `// EXAMPLES:\n`;
      questionData.examples.forEach((ex: any, i: number) => {
        header += `// Example ${i + 1}:\n`;
        header += `//   Input: ${ex.input}\n`;
        header += `//   Output: ${ex.output}\n`;
        if (ex.explanation) {
          header += `//   Explanation: ${ex.explanation}\n`;
        }
        header += `//\n`;
      });
      header += `\n`;
    }

    // Add constraints
    if (questionData.constraints && questionData.constraints.length > 0) {
      header += `// CONSTRAINTS:\n`;
      questionData.constraints.forEach((c: string) => {
        header += `// • ${c}\n`;
      });
      header += `\n`;
    }

    // Add test cases info
    if (questionData.test_cases && questionData.test_cases.length > 0) {
      header += `// TEST CASES:\n`;
      questionData.test_cases.forEach((tc: any, i: number) => {
        header += `// Test ${i + 1}: ${tc.description}\n`;
        header += `//   Input: ${JSON.stringify(tc.input)}\n`;
        header += `//   Expected: ${JSON.stringify(tc.expected)}\n`;
      });
      header += `\n`;
    }

    header += `// ═══════════════════════════════════════════════════════════════\n`;
    header += `// Write your solution below:\n`;
    header += `// ═══════════════════════════════════════════════════════════════\n\n`;

    return header + starterCode;
  };

  // Fetch random question based on difficulty
  useEffect(() => {
    const fetchRandomQuestion = async () => {
      try {
        const res = await fetch(`${API}/api/questions/random?difficulty=${difficulty}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentQuestion(data);
          // Set the starter code WITH problem details as comments
          setCode(generateCodeWithProblem(data, language));
        }
      } catch (err) {
        console.error("Failed to fetch random question:", err);
      }
    };
    fetchRandomQuestion();
  }, [difficulty]);

  // Fetch initial subscription status
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API}/subscription/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIsPremium(data.subscription_status === "premium");
          
          // Check if video is exhausted (but don't disable for unlimited usage)
          // Video limits removed - always keep video enabled
          if (data.is_time_exhausted && data.subscription_status !== "premium") {
            setShowSubscriptionModal(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subscription status:", err);
      }
    };
    
    fetchSubscriptionStatus();
  }, [token, API]);

  // Track usage every 30 seconds
  const trackUsage = useCallback(async (durationSeconds: number, isVideo: boolean = false) => {
    if (!token || isPremium) return;
    
    try {
      const res = await fetch(`${API}/subscription/track-usage`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          duration_seconds: durationSeconds,
          is_video: isVideo 
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Time limits removed - no more usage tracking
        if (data.is_time_exhausted) {
          setShowSubscriptionModal(true);
        }
      }
    } catch (err) {
      console.error("Failed to track usage:", err);
    }
  }, [token, isPremium, API]);

  // ── Proctoring ──────────────────────────────────────────────────────
  const { isDistracted, multiplefaces, getIntegrityScore, handlePerceptionUpdate, events, violationCount } =
    useProctoring({
      enabled: true,
      onAlert: (message, type) => {
        const id = alertIdRef.current++;
        setProctoringAlerts((prev) => [...prev, { message, type, id }]);
        setTimeout(() => {
          setProctoringAlerts((prev) => prev.filter((a) => a.id !== id));
        }, 8000);
      },
      onCriticalViolation: () => {
        // End interview with very bad score due to repeated violations
        const badScore: InterviewScore = {
          technical: 0,
          softSkills: 0,
          problemSolving: 0,
          integrity: 0,
          overall: 0,
          feedback: "Interview terminated due to multiple integrity violations (tab switching, multiple people detected, etc.)",
        };
        onEnd(badScore);
      },
    });

  // Angry warning messages based on violation type
  const getAngryWarning = (message: string): string => {
    switch (message) {
      case "tab_switch_warning":
        return "❌ I saw you switch tabs! This is unacceptable! Stay focused or I'm ending this interview!";
      case "multiple_faces_anger":
        return "⚠️ WHO IS THAT?! Are you getting help?! This is cheating! One more time and you're done!";
      case "candidate_gaze_away":
        return "👀 Hey! Where are you looking? Pay attention to the problem!";
      default:
        return "⚠️ Pay attention! This is your final warning!";
    }
  };

  // Time tracking removed - no time limit

  // ── Code Sync — pushes code into Tavus live context so AI can discuss it ──
  // Sync more frequently (every 10 seconds) for better AI awareness
  const { forceSync } = useCodeSync({
    code,
    language,
    phase,
    sessionId:      session.id,
    conversationId: conversationId ?? session.conversationId,
    intervalMs:     10_000,    // every 10 s — faster for real-time AI awareness
    enabled:        true,      // sync across ALL phases so AI always has context
    onSnapshot: (snap) => {
      codeSnapshotsRef.current.push(snap);
    },
  });

  const handleCodeRun = useCallback(
    (_result: CodeExecutionResult) => {
      forceSync();
    },
    [forceSync]
  );

  const handleEndInterview = useCallback(() => {
    // Track final usage time (from last track to now)
    const now = Date.now();
    if (lastTrackTimeRef.current > 0 && !isPremium) {
      const finalElapsed = Math.floor((now - lastTrackTimeRef.current) / 1000);
      if (finalElapsed > 0) {
        trackUsage(finalElapsed);
      }
    }
    
    const integrityScore = getIntegrityScore();

    // Simple heuristic scoring (replace with LLM-based scoring from backend)
    const scores: InterviewScore = {
      technical:      Math.min(100, 60 + Math.random() * 35),
      softSkills:     Math.min(100, 55 + Math.random() * 40),
      problemSolving: Math.min(100, 50 + Math.random() * 45),
      integrity:      integrityScore,
      overall:        0,
    };
    scores.technical      = Math.round(scores.technical);
    scores.softSkills     = Math.round(scores.softSkills);
    scores.problemSolving = Math.round(scores.problemSolving);
    scores.integrity      = Math.round(scores.integrity);
    scores.overall = Math.round(
      (scores.technical + scores.softSkills + scores.problemSolving + scores.integrity) / 4
    );

    onEnd(scores);
  }, [getIntegrityScore, onEnd, isPremium, trackUsage]);

  const vibeConfig = VIBE_CONFIGS[session.vibe];

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
          gap: 16,
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            🤖
          </div>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>
            InterviewAI
          </span>
        </div>

        <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />

        {/* Candidate name */}
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {session.candidate.name}
        </span>

        {/* Vibe badge */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 10px",
            borderRadius: 100,
            background: vibeConfig.accentColor,
            border: `1px solid ${vibeConfig.borderColor}`,
            color: vibeConfig.color,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {vibeConfig.icon} {vibeConfig.name}
        </span>

        {/* Phase */}
        <PhaseBadge phase={phase} />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Timer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 8,
            background: "var(--bg-elevated)",
          }}
        >
          <Clock size={12} color="var(--text-muted)" />
          <ElapsedTimer startTime={session.startTime} />
        </div>

        {/* Phase selector */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["greeting", "coding", "behavioral", "wrap_up"] as InterviewPhase[]).map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                background: phase === p ? "rgba(108,99,255,0.2)" : "transparent",
                border: `1px solid ${phase === p ? "rgba(108,99,255,0.4)" : "transparent"}`,
                color: phase === p ? "var(--accent-primary)" : "var(--text-muted)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s ease",
              }}
            >
              {p.replace("_", " ")}
            </button>
          ))}
        </div>

        <button
          id="btn-end-interview"
          onClick={handleEndInterview}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            background: "rgba(255,75,110,0.1)",
            border: "1px solid rgba(255,75,110,0.3)",
            color: "var(--accent-danger)",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          End Interview
        </button>
      </div>

      {/* ── Main Split Panel ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", gap: 0 }}>
        {/* Left: Video */}
        <div
          style={{
            width: "42%",
            minWidth: 360,
            maxWidth: 560,
            display: "flex",
            flexDirection: "column",
            padding: 16,
            gap: 12,
            borderRight: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>
            <TavusVideoCall
              conversationUrl={conversationUrl}
              onPerceptionUpdate={handlePerceptionUpdate}
              onCallEnded={handleEndInterview}
              isDistracted={isDistracted}
              multipleFaces={multiplefaces}
              isVideoEnabled={true}
              onVideoDisabled={() => {}}  // Video always enabled now
            />
          </div>

          {/* Candidate skills */}
          <div
            style={{
              padding: "10px 14px",
              background: "var(--bg-elevated)",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
              Top Skills (from resume)
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {session.candidate.topSkills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: "rgba(108,99,255,0.1)",
                    border: "1px solid rgba(108,99,255,0.2)",
                    color: "var(--accent-primary)",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Code Editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Code panel header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <Code2 size={14} color="var(--accent-primary)" />
            <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
              Code Editor
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
              · AI can see your code in real-time
            </span>
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(67,217,138,0.08)",
                border: "1px solid rgba(67,217,138,0.2)",
              }}
            >
              <div
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--accent-success)",
                  animation: "glow-pulse 2s ease-in-out infinite",
                }}
              />
              <span style={{ color: "var(--accent-success)", fontSize: 11, fontWeight: 600 }}>
                SYNC ON
              </span>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <CodeEditorPanel
              code={code}
              language={language}
              onCodeChange={setCode}
              onLanguageChange={handleLanguageChange}
              onRun={handleCodeRun}
              question={currentQuestion || undefined}
            />
          </div>
        </div>
      </div>

      {/* ── Proctoring Alert Toasts ───────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        {proctoringAlerts.map((alert) => (
          <div
            key={alert.id}
            className="animate-slide-up"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              borderRadius: 12,
              background:
                alert.type === "danger"
                  ? "rgba(255,75,110,0.95)"
                  : "rgba(247,201,72,0.95)",
              backdropFilter: "blur(12px)",
              boxShadow:
                alert.type === "danger"
                  ? "0 8px 32px rgba(255,75,110,0.4)"
                  : "0 8px 32px rgba(247,201,72,0.3)",
              border: `1px solid ${alert.type === "danger" ? "rgba(255,75,110,0.5)" : "rgba(247,201,72,0.5)"}`,
              pointerEvents: "auto",
            }}
          >
            <AlertTriangle size={16} color="white" />
            <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>
              {alert.message === "candidate_gaze_away"
                ? "🎯 Proctoring: Gaze distraction detected — AI notified"
                : "⚠️ Proctoring: Multiple faces detected — AI notified"}
            </span>
          </div>
        ))}
      </div>

      {/* Subscription Modal removed - no time limits */}
    </div>
  );
}
