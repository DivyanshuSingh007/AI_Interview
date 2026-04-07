"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuid } from "uuid";
import { ResumeUploader } from "@/components/ResumeUploader";
import { VibePicker } from "@/components/VibePicker";
import InterviewRoom from "@/components/InterviewRoom";
import { FinalReport } from "@/components/FinalReport";
import { AuthPage } from "@/components/AuthPage";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { useAuth } from "@/context/AuthContext";
import {
  CandidateProfile,
  InterviewSession,
  InterviewScore,
  VibeType,
} from "@/types/interview";
import { createTavusConversation } from "@/config/TavusConfig";
import {
  ChevronRight,
  Loader2,
  Sparkles,
  Shield,
  Code2,
  Zap,
  Brain,
  ArrowRight,
  Play,
  LogOut,
  Upload,
  Camera,
  Mic,
  X,
  AlertTriangle,
  Video,
  BarChart3,
  Users,
  CheckCircle2,
  Flame,
  BookOpen,
  MessageSquare,
  GraduationCap,
  Briefcase,
  Star,
  Trophy,
  Target,
  Cpu,
  Eye,
  TrendingUp,
} from "lucide-react";

type AppState = "landing" | "setup" | "connecting" | "interview" | "report";

// ─── Feature cards for landing ────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Interviews",
    desc: "Tavus Raven-1 sees you in real-time. Sparrow-1 ensures natural turn-taking.",
    color: "#6c63ff",
  },
  {
    icon: Code2,
    title: "Live Code Editor",
    desc: "Monaco editor syncs your code to the AI every 30s for intelligent feedback.",
    color: "#4ecdc4",
  },
  {
    icon: Shield,
    title: "Real-Time Proctoring",
    desc: "Eye-tracking and face detection keep the integrity score accurate.",
    color: "#43d98a",
  },
  {
    icon: Zap,
    title: "3 Interviewer Vibes",
    desc: "Choose The Griller, The Mentor, or The Behavioral Expert.",
    color: "#f7c948",
  },
  {
    icon: BarChart3,
    title: "Detailed Score Reports",
    desc: "Get category-by-category feedback on communication, logic, and culture fit.",
    color: "#ff4b6e",
  },
  {
    icon: Cpu,
    title: "Gemini AI Brain",
    desc: "Resume parsing, vibe recommendation, and real-time analysis powered by Gemini.",
    color: "#a78bfa",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Your Resume",
    desc: "Drop your PDF. Gemini AI extracts your skills, experience, and recommends the perfect interviewer vibe in seconds.",
    color: "#6c63ff",
  },
  {
    step: "02",
    icon: Video,
    title: "Face Your AI Interviewer",
    desc: "A Tavus-powered avatar interviews you live via webcam — asking personalized questions, reading your expressions, and adapting in real-time.",
    color: "#4ecdc4",
  },
  {
    step: "03",
    icon: BarChart3,
    title: "Get Your Score Report",
    desc: "Receive a detailed breakdown across communication, technical depth, behavioral clarity, and integrity — with actionable improvement tips.",
    color: "#43d98a",
  },
];

const PERSONAS = [
  {
    emoji: "🔥",
    name: "The Griller",
    vibe: "griller",
    tagline: "No mercy. No hints.",
    desc: "Throws rapid-fire technical puzzles, edge cases, and worst-case scenarios. Designed for FAANG-style pressure testing.",
    traits: ["Aggressive pacing", "Hard edge cases", "System design traps", "Time pressure"],
    color: "#ff4b6e",
    gradient: "linear-gradient(135deg, rgba(255,75,110,0.15), rgba(255,112,67,0.08))",
    border: "rgba(255,75,110,0.3)",
  },
  {
    emoji: "🎓",
    name: "The Mentor",
    vibe: "mentor",
    tagline: "Warm. Guiding. Educational.",
    desc: "Nurtures your thinking process with hints and follow-up questions. Great for juniors or practice sessions where learning is the goal.",
    traits: ["Helpful hints", "Growth mindset", "Explains reasoning", "Encouraging tone"],
    color: "#43d98a",
    gradient: "linear-gradient(135deg, rgba(67,217,138,0.15), rgba(78,205,196,0.08))",
    border: "rgba(67,217,138,0.3)",
  },
  {
    emoji: "💬",
    name: "The Behavioral Expert",
    vibe: "behavioral",
    tagline: "STAR method. Culture fit.",
    desc: "Probes your soft skills, leadership stories, and team dynamics through structured behavioral questions and situational analysis.",
    traits: ["STAR framework", "Culture fit probing", "Conflict resolution", "Leadership stories"],
    color: "#f7c948",
    gradient: "linear-gradient(135deg, rgba(247,201,72,0.15), rgba(108,99,255,0.08))",
    border: "rgba(247,201,72,0.3)",
  },
];

const DIFFERENTIATORS = [
  {
    icon: Eye,
    title: "It Actually Sees You",
    desc: "Unlike text-based tools, Tavus Raven-1 watches your expressions, detects confidence, and adjusts question difficulty dynamically.",
    color: "#6c63ff",
  },
  {
    icon: Code2,
    title: "Live Code Evaluation",
    desc: "Write real code in Monaco editor. The AI reads your solution every 30 seconds and comments on logic, style, and efficiency.",
    color: "#4ecdc4",
  },
  {
    icon: Shield,
    title: "Integrity Scoring",
    desc: "Eye-gaze tracking and face presence detection generate a proctoring score — so you know exactly how you'd do in a monitored interview.",
    color: "#43d98a",
  },
  {
    icon: TrendingUp,
    title: "Fully Personalized",
    desc: "Every session is tailored to your resume. Questions reference your specific stack, projects, and experience level.",
    color: "#f7c948",
  },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    title: "Fresh Graduates",
    desc: "Practice DS&A, system design, and behavioral rounds before your first big interview.",
    tag: "Recommended: Mentor",
    tagColor: "#43d98a",
  },
  {
    icon: Briefcase,
    title: "Senior Engineers",
    desc: "Sharpen system design instincts and stay sharp under pressure-style questioning.",
    tag: "Recommended: Griller",
    tagColor: "#ff4b6e",
  },
  {
    icon: Star,
    title: "Product & Business Roles",
    desc: "Nail behavioral rounds, leadership stories, and stakeholder communication.",
    tag: "Recommended: Behavioral",
    tagColor: "#f7c948",
  },
  {
    icon: Trophy,
    title: "FAANG Aspirants",
    desc: "Simulate high-pressure Google, Meta, Amazon interviews with FAANG-caliber standards.",
    tag: "Recommended: Griller",
    tagColor: "#ff4b6e",
  },
  {
    icon: Target,
    title: "Career Switchers",
    desc: "Bridge skill gaps, practice new role interviews, and build interview confidence.",
    tag: "Recommended: Mentor",
    tagColor: "#43d98a",
  },
  {
    icon: Users,
    title: "Interview Coaches",
    desc: "Run unlimited mock sessions for clients without scheduling or availability constraints.",
    tag: "All Modes",
    tagColor: "#6c63ff",
  },
];

// ─── ScrollReveal component ───────────────────────────────────────────────────
// Each instance owns its own ref + state. Scroll listener is attached after the
// element mounts, so the ref is always valid. 100% reliable in Strict Mode.
type RevealDir = "up" | "left" | "right";
function ScrollReveal({
  children,
  delay = 0,
  from = "up" as RevealDir,
  className = "",
  style: extraStyle = {},
}: {
  children: React.ReactNode;
  delay?: number;
  from?: RevealDir;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.93) {
        setVisible(true);
        window.removeEventListener("scroll", check);
      }
    };

    // Check immediately (for elements already in viewport at page load)
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  const hidden: React.CSSProperties = {
    opacity: 0,
    transform:
      from === "left"
        ? "translateX(-40px)"
        : from === "right"
        ? "translateX(40px)"
        : "translateY(44px)",
  };
  const shown: React.CSSProperties = { opacity: 1, transform: "none" };
  const transition: React.CSSProperties = {
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...transition, ...(visible ? shown : hidden), ...extraStyle }}
    >
      {children}
    </div>
  );
}





export default function Home() {
  const { user, loading: authLoading, logout, token } = useAuth();
  const [appState, setAppState] = useState<AppState>("landing");
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<VibeType | null>(null);
  const [suggestedVibe, setSuggestedVibe] = useState<VibeType | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("medium");
  const [vibeReason, setVibeReason] = useState<string>("");
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [conversationUrl, setConversationUrl] = useState<string>("");
  const [finalScores, setFinalScores] = useState<InterviewScore | null>(null);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  // Camera/Mic permission state
  const [mediaPermissions, setMediaPermissions] = useState<{
    camera: "pending" | "granted" | "denied";
    microphone: "pending" | "granted" | "denied";
  }>({ camera: "pending", microphone: "pending" });
  const [showPermissionModal, setShowPermissionModal] = useState(false);


  // ── Resume upload ────────────────────────────────────────────────────
  const handleResumeUpload = useCallback(async (file: File, text: string) => {
    setIsParsingResume(true);
    try {
      let profile: CandidateProfile;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/extract-profile`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          }
        );
        if (!res.ok) throw new Error("backend");
        profile = await res.json();
      } catch {
        profile = {
          name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") || "Candidate",
          email: "candidate@example.com",
          topSkills: ["Python", "Data Structures", "System Design"],
          experience: "3 years",
          education: "B.Sc. Computer Science",
        };
      }

      setCandidate(profile);
      // Persist AI vibe suggestion if present
      if (profile.suggestedVibe) {
        setSuggestedVibe(profile.suggestedVibe as VibeType);
        setVibeReason(profile.vibeReason ?? "");
        // Pre-select the recommended vibe
        setSelectedVibe(profile.suggestedVibe as VibeType);
      }
      setSetupStep(2);
    } finally {
      setIsParsingResume(false);
    }
  }, []);

  // ── Check subscription before starting interview ───────────────────────────
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    // Allow starting if no token (anonymous/demo users)
    // They get limited free access
    if (!token) {
      setRemainingSeconds(300); // 5 minutes for demo
      return true;
    }
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/subscription/check-interview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (!data.can_start_interview) {
          setRemainingSeconds(data.remaining_time_seconds || 0);
          setShowSubscriptionModal(true);
          return false;
        }
        return true;
      }
    } catch (err) {
      console.error("Failed to check subscription:", err);
    }
    return true; // Allow starting if check fails
  }, [token]);

  // ── Check camera and microphone permissions ─────────────────────────────
  // This is now a soft check - it shows current status but doesn't block starting
  const checkMediaPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      // Check what permissions were granted
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      const permissions = {
        camera: videoTrack?.enabled ? "granted" as const : "denied" as const,
        microphone: audioTrack?.enabled ? "granted" as const : "denied" as const,
      };
      
      // Stop tracks immediately after checking
      stream.getTracks().forEach(track => track.stop());
      
      setMediaPermissions(permissions);
      
      // Always return true - allow user to proceed even without permissions
      // The actual video/audio will fail gracefully if permissions are not granted
      return true;
    } catch (err) {
      console.error("Media permission error:", err);
      setMediaPermissions({ camera: "denied", microphone: "denied" });
      // Still return true - let them try anyway
      return true;
    }
  }, []);

  // ── Start interview ──────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!candidate || !selectedVibe) return;
    
    // Check media permissions first
    const hasPermissions = await checkMediaPermissions();
    if (!hasPermissions) return;
    
    // Check subscription first
    const canProceed = await checkSubscription();
    if (!canProceed) return;
    
    setIsConnecting(true);
    setAppState("connecting");

    const sessionId = uuid();
    const newSession: InterviewSession = {
      id: sessionId,
      candidate,
      vibe: selectedVibe,
      difficulty: selectedDifficulty,
      phase: "greeting",
      startTime: Date.now(),
      proctoringEvents: [],
      codeSnapshots: [],
      feedbackNotes: [],
    };

    try {
      // Create Tavus conversation via backend — API key stays server-side
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const convRes = await fetch(`${API_URL}/api/create-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidate.name,
          vibe: selectedVibe,
        }),
      });

      if (convRes.ok) {
        const conv = await convRes.json();
        newSession.conversationId = conv.conversation_id;
        setConversationUrl(conv.conversation_url);
      } else {
        // Demo mode: no API key configured on backend
        console.warn("[InterviewAI] No TAVUS_API_KEY on backend — running in demo mode.");
        setConversationUrl("https://demo.daily.co/hello");
      }


      setSession(newSession);
      setAppState("interview");
    } catch (err) {
      console.error("[InterviewAI] Failed to create conversation:", err);
      // Fallback to demo
      setConversationUrl("https://demo.daily.co/hello");
      setSession(newSession);
      setAppState("interview");
    } finally {
      setIsConnecting(false);
    }
  }, [candidate, selectedVibe, checkSubscription, checkMediaPermissions]);

  // ── End interview ────────────────────────────────────────────────────
  const handleInterviewEnd = useCallback((scores: InterviewScore) => {
    setFinalScores(scores);
    if (session) {
      setSession((prev) => prev ? { ...prev, endTime: Date.now() } : prev);
    }
    setAppState("report");
  }, [session]);

  const handleRestart = useCallback(() => {
    setAppState("landing");
    setCandidate(null);
    setSelectedVibe(null);
    setSuggestedVibe(null);
    setVibeReason("");
    setSession(null);
    setConversationUrl("");
    setFinalScores(null);
    setSetupStep(1);
  }, []);

  // ─────────────────────────────────────────────────────────── RENDER ──

  // Auth guards — after all hooks to comply with Rules of Hooks
  if (authLoading) {
    return (
      <div className="gradient-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color="var(--accent-primary)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }
  if (!user) {
    return <AuthPage onSuccess={() => {}} />;
  }

  if (appState === "interview" && session && conversationUrl) {
    return (
      <InterviewRoom
        session={session}
        conversationUrl={conversationUrl}
        conversationId={session.conversationId}
        onEnd={handleInterviewEnd}
        difficulty={session.difficulty}
      />
    );
  }

  if (appState === "report" && session && finalScores) {
    return (
      <FinalReport
        session={session}
        scores={finalScores}
        onRestart={handleRestart}
      />
    );
  }

  if (appState === "connecting") {
    return (
      <div
        className="gradient-bg"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 100, height: 100, borderRadius: "50%",
              background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 48,
              animation: "glow-pulse 2s ease-in-out infinite",
            }}
          >
            🤖
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: -i * 20,
                borderRadius: "50%",
                border: "2px solid rgba(108,99,255,0.2)",
                animation: `pulse-ring ${1 + i * 0.3}s ease-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Preparing your interviewer...
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            Personalizing AI with your resume profile
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {[
            "Parsing resume with Gemini AI",
            "Building interviewer persona",
            "Initializing Tavus Raven-1",
            "Setting up code environment",
          ].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Loader2
                size={14}
                color="var(--accent-primary)"
                style={{ animation: "spin 1s linear infinite", animationDelay: `${i * 0.2}s` }}
              />
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── LANDING ──────────────────────────────────────────────────────────
  if (appState === "landing") {
    return (
      <div className="gradient-bg" style={{ minHeight: "100vh" }}>
        {/* Nav */}
        <nav
          className="glass"
          style={{
            position: "sticky", top: 0, zIndex: 100,
            padding: "0 40px", height: 60,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}
            >
              🤖
            </div>
            <span style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>
              Interview<span style={{ color: "#6c63ff" }}>AI</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge badge-live">
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
              BETA
            </span>
            {/* User avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg,#6c63ff,#4ecdc4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "white",
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{user.name}</span>
            </div>
            <button
              onClick={logout}
              className="btn-ghost"
              title="Sign out"
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <LogOut size={14} />
              Sign out
            </button>
            <button
              id="btn-get-started-nav"
              onClick={() => setAppState("setup")}
              className="btn-primary"
              style={{ padding: "8px 20px", fontSize: 13 }}
            >
              Start Interview
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "100px 24px 60px",
            textAlign: "center",
          }}
        >
          <ScrollReveal style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px", borderRadius: 100,
              background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
              marginBottom: 28, color: "var(--accent-primary)", fontSize: 13, fontWeight: 600,
            }}
          >
            <Sparkles size={14} />
            Powered by Tavus Raven-1 · Gemini AI · Judge0
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <h1
              style={{
                fontSize: "clamp(40px, 6vw, 68px)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-2px",
                color: "var(--text-primary)",
                marginBottom: 24,
              }}
            >
              The most realistic{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AI interview
              </span>
              <br />
              experience ever built.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.13}>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 18,
                lineHeight: 1.7,
                maxWidth: 620,
                margin: "0 auto 40px",
              }}
            >
              Upload your resume. Choose your interviewer vibe. Then face an AI that{" "}
              <strong style={{ color: "var(--text-primary)" }}>actually sees you</strong>,
              reads your code, and adapts to your performance in real-time.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.22} style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button
              id="btn-start-interview"
              onClick={() => setAppState("setup")}
              className="btn-primary"
              style={{ fontSize: 15, padding: "14px 36px", display: "flex", alignItems: "center", gap: 10 }}
            >
              <Play size={18} />
              Start Interview
            </button>
            <button
              onClick={() => {
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-ghost"
              style={{ fontSize: 15, padding: "14px 28px", display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
            >
              Pricing
              <ArrowRight size={16} />
            </button>
          </ScrollReveal>
        </section>

        {/* ── DEMO / VIDEO SECTION ───────────────────────────────────── */}
        <ScrollReveal style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 100px" }}>
          {/* Section label */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 100,
              background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
              color: "#6c63ff", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}>🎬 Live Demo</span>
          </div>
          <div
            style={{
              borderRadius: 24,
              overflow: "hidden",
              position: "relative",
              border: "1px solid rgba(108,99,255,0.25)",
              boxShadow: "0 0 80px rgba(108,99,255,0.15), 0 40px 80px rgba(0,0,0,0.4)",
            }}
          >
            {videoPlaying ? (
              /* ── Local video file ── */
              <video
                controls
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
                src="/demo-video.mp4"
              />
            ) : (
              /* ── Click-to-play thumbnail ── */
              <div
                style={{
                  height: 480,
                  background: "linear-gradient(135deg, #0d0e16 0%, #0e1022 40%, #0a0b18 100%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  gap: 24,
                  cursor: "pointer",
                }}
                onClick={() => setVideoPlaying(true)}
              >
                {/* Decorative grid */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: "linear-gradient(rgba(108,99,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.05) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }} />
                {/* Glow blob */}
                <div style={{
                  position: "absolute",
                  width: 400, height: 400, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)",
                  pointerEvents: "none",
                }} />
                {/* Animated rings */}
                {[120, 190, 260].map((size, i) => (
                  <div key={size} style={{
                    position: "absolute",
                    width: size, height: size,
                    borderRadius: "50%",
                    border: `1px solid rgba(108,99,255,${0.18 - i * 0.05})`,
                    animation: `pulse-ring ${2.2 + i * 0.5}s ease-out infinite`,
                    animationDelay: `${i * 0.35}s`,
                  }} />
                ))}
                {/* Play button */}
                <div
                  style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 48px rgba(108,99,255,0.55), 0 0 0 8px rgba(108,99,255,0.12)",
                    zIndex: 2,
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    animation: "glow-pulse 2.5s ease-in-out infinite",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "scale(1.12)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 64px rgba(108,99,255,0.8), 0 0 0 12px rgba(108,99,255,0.18)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 48px rgba(108,99,255,0.55), 0 0 0 8px rgba(108,99,255,0.12)";
                  }}
                >
                  <Play size={36} color="white" style={{ marginLeft: 5 }} />
                </div>
                {/* Text */}
                <div style={{ textAlign: "center", zIndex: 2 }}>
                  <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 20, marginBottom: 8, letterSpacing: "-0.5px" }}>
                    Watch a Live Interview Demo
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    See how the AI adapts, codes alongside, and scores in real-time
                  </p>
                </div>
                {/* Status badges */}
                <div style={{
                  position: "absolute", bottom: 24, left: 0, right: 0,
                  display: "flex", gap: 10, justifyContent: "center", zIndex: 2,
                  flexWrap: "wrap", padding: "0 24px",
                }}>
                  {["🤖 AI Interviewer Active", "👁️ Proctoring ON", "💻 Code Editor Ready"].map(label => (
                    <span key={label} style={{
                      padding: "6px 14px", borderRadius: 100,
                      background: "rgba(108,99,255,0.14)",
                      border: "1px solid rgba(108,99,255,0.3)",
                      color: "#a09aff",
                      fontSize: 12, fontWeight: 600,
                      backdropFilter: "blur(8px)",
                    }}>{label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
          <ScrollReveal style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 100,
              background: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.3)",
              color: "#4ecdc4", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
              textTransform: "uppercase", marginBottom: 16,
            }}>How It Works</span>
            <h2 style={{ color: "var(--text-primary)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
              From resume to report in{" "}
              <span style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                3 simple steps
              </span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
              No setup. No scheduling. Just you and an AI that's ready whenever you are.
            </p>
          </ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, position: "relative" }}>
            {/* Connector line (desktop only) */}
            <div style={{
              position: "absolute", top: 56, left: "16%", right: "16%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(108,99,255,0.3), rgba(78,205,196,0.3), transparent)",
              zIndex: 0,
            }} />
            {HOW_IT_WORKS.map((step, i) => (
              <ScrollReveal key={step.step} delay={i * 0.1} className="card" style={{
                animationDelay: `${i * 0.12}s`, position: "relative", zIndex: 1,
              }}>
                <div style={{
                  borderColor: `${step.color}25`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 40px ${step.color}20`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
                >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: `${step.color}20`,
                    border: `1px solid ${step.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <step.icon size={24} color={step.color} />
                  </div>
                  <span style={{
                    fontSize: 42, fontWeight: 900, color: `${step.color}20`,
                    lineHeight: 1, fontVariantNumeric: "tabular-nums",
                    position: "absolute", top: 16, right: 20,
                  }}>{step.step}</span>
                </div>
                <h3 style={{ color: "var(--text-primary)", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{step.desc}</p>
              </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── KEY FEATURES ──────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
          <ScrollReveal style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 100,
              background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
              color: "#6c63ff", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
              textTransform: "uppercase", marginBottom: 16,
            }}>Key Features</span>
            <h2 style={{ color: "var(--text-primary)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-1px" }}>
              Everything you need to{" "}
              <span style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                ace any interview
              </span>
            </h2>
          </ScrollReveal>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}>
            {FEATURES.map((f, i) => (
              <ScrollReveal
                key={f.title}
                delay={i * 0.08}
                className="card"
                style={{
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
              >
                <div
                  style={{
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 32px ${f.color}18`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${f.color}18`,
                    border: `1px solid ${f.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 16,
                  }}>
                    <f.icon size={22} color={f.color} />
                  </div>
                  <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                    {f.title}
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.65 }}>
                    {f.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── PERSONAS ──────────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
          <ScrollReveal style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 100,
              background: "rgba(247,201,72,0.1)", border: "1px solid rgba(247,201,72,0.3)",
              color: "#f7c948", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
              textTransform: "uppercase", marginBottom: 16,
            }}>Interviewer Personas</span>
            <h2 style={{ color: "var(--text-primary)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
              Choose your{" "}
              <span style={{ background: "linear-gradient(135deg, #f7c948, #ff4b6e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                interviewer style
              </span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
              Each persona uses a distinct questioning style. Gemini AI recommends the best one based on your resume.
            </p>
          </ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {PERSONAS.map((p, i) => (
              <ScrollReveal key={p.vibe} delay={i * 0.1}>
                <div style={{
                  animationDelay: `${i * 0.1}s`,
                  borderRadius: 20,
                  padding: 28,
                  background: p.gradient,
                  border: `1px solid ${p.border}`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 24px 48px ${p.color}20`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
                >
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <span style={{ fontSize: 40 }}>{p.emoji}</span>
                  <div>
                    <h3 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{p.name}</h3>
                    <p style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.tagline}</p>
                  </div>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{p.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.traits.map(trait => (
                    <div key={trait} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={14} color={p.color} />
                      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{trait}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setAppState("setup")}
                  style={{
                    marginTop: 24, width: "100%", padding: "12px",
                    borderRadius: 10, border: `1px solid ${p.border}`,
                    background: `${p.color}15`, color: p.color,
                    fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${p.color}30`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${p.color}15`; }}
                >
                  Try {p.name} →
                </button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── WHY IT'S DIFFERENT ────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
          <div style={{
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(78,205,196,0.05) 100%)",
            border: "1px solid rgba(108,99,255,0.15)",
            padding: "60px 48px",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
              <ScrollReveal from="left">
                <span style={{
                  display: "inline-block", padding: "4px 14px", borderRadius: 100,
                  background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
                  color: "#6c63ff", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
                  textTransform: "uppercase", marginBottom: 20,
                }}>Why InterviewAI?</span>
                <h2 style={{ color: "var(--text-primary)", fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 20, lineHeight: 1.2 }}>
                  Not just another mock interview tool.
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
                  Most tools give you text questions and a timer. InterviewAI gives you a live AI face, live code feedback, live proctoring, and a full post-session report — all personalized to your resume.
                </p>
                <button
                  id="btn-why-cta"
                  onClick={() => setAppState("setup")}
                  className="btn-primary"
                  style={{ fontSize: 14, padding: "14px 32px", display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  Start Your Free Interview
                  <ArrowRight size={16} />
                </button>
              </ScrollReveal>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {DIFFERENTIATORS.map((d, i) => (
                  <ScrollReveal key={d.title} from="right" delay={i * 0.08} style={{
                    animationDelay: `${i * 0.08}s`,
                  }}>
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 16,
                      padding: "18px 20px", borderRadius: 14,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-subtle)",
                      transition: "border-color 0.3s ease",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${d.color}40`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-subtle)"; }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: `${d.color}18`, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <d.icon size={18} color={d.color} />
                      </div>
                      <div>
                        <h4 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{d.title}</h4>
                        <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>{d.desc}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── USE CASES ────────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
          <ScrollReveal style={{ textAlign: "center", marginBottom: 60 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 100,
              background: "rgba(67,217,138,0.1)", border: "1px solid rgba(67,217,138,0.3)",
              color: "#43d98a", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
              textTransform: "uppercase", marginBottom: 16,
            }}>Who Should Use This</span>
            <h2 style={{ color: "var(--text-primary)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
              Built for every{" "}
              <span style={{ background: "linear-gradient(135deg, #43d98a, #4ecdc4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                stage of your career
              </span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
              Whether you're just starting out or aiming for Staff Engineer, there's a mode built for you.
            </p>
          </ScrollReveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {USE_CASES.map((uc, i) => (
              <ScrollReveal
                key={uc.title}
                delay={i * 0.07}
                className="card"
                style={{
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div
                  style={{
                    display: "flex", flexDirection: "column", gap: 12,
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: "rgba(108,99,255,0.1)",
                    border: "1px solid rgba(108,99,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <uc.icon size={22} color="#6c63ff" />
                  </div>
                  <h3 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700 }}>{uc.title}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.65, flex: 1 }}>{uc.desc}</p>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 12px", borderRadius: 100,
                    background: `${uc.tagColor}15`,
                    border: `1px solid ${uc.tagColor}30`,
                    color: uc.tagColor, fontSize: 11, fontWeight: 600,
                    alignSelf: "flex-start",
                  }}>
                    <Target size={10} />
                    {uc.tag}
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── PRICING SECTION ────────────────────────────────────────────────── */}
        <section id="pricing-section" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 100px" }}>
          <ScrollReveal style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 100,
              background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
              color: "#6c63ff", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
              textTransform: "uppercase", marginBottom: 16,
            }}>Pricing</span>
            <h2 style={{ color: "var(--text-primary)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
              Smart video distribution — get the full AI interview experience at a fraction of the cost.
            </p>
          </ScrollReveal>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {/* Free Plan */}
            <ScrollReveal delay={0.1}>
              <div className="card" style={{ padding: 32, textAlign: "center" }}>
                <h3 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Free</h3>
                <div style={{ color: "var(--text-primary)", fontSize: 36, fontWeight: 900, marginBottom: 4 }}>$0</div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>forever</p>
                <ul style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "left", paddingLeft: 20, marginBottom: 24 }}>
                  <li style={{ marginBottom: 8 }}>🎥 5 min video + 20 min audio = 25 min total</li>
                  <li style={{ marginBottom: 8 }}>Basic code editor</li>
                  <li style={{ marginBottom: 8 }}>One interviewer persona</li>
                  <li>Standard performance report</li>
                </ul>
                <button className="btn-primary" style={{ width: "100%", padding: "12px" }}>Get Started</button>
              </div>
            </ScrollReveal>

            {/* Premium Plan */}
            <ScrollReveal delay={0.2}>
              <div className="card" style={{ 
                padding: 32, 
                textAlign: "center",
                background: "linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(78,205,196,0.08) 100%)",
                border: "1px solid rgba(108,99,255,0.3)",
              }}>
                <div style={{ 
                  display: "inline-block", 
                  padding: "4px 12px", 
                  borderRadius: 100,
                  background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                  color: "white",
                  fontSize: 11, 
                  fontWeight: 700, 
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}>Most Popular</div>
                <h3 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Premium</h3>
                <div style={{ color: "var(--text-primary)", fontSize: 36, fontWeight: 900, marginBottom: 4 }}>₹299</div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>per month</p>
                <ul style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "left", paddingLeft: 20, marginBottom: 24 }}>
                  <li style={{ marginBottom: 8 }}>🎥 <strong>Unlimited</strong> video minutes</li>
                  <li style={{ marginBottom: 8 }}>All 3 interviewer personas</li>
                  <li style={{ marginBottom: 8 }}>Advanced code analysis</li>
                  <li style={{ marginBottom: 8 }}>Detailed performance analytics</li>
                  <li>Priority support</li>
                </ul>
                <button 
                  className="btn-primary" 
                  style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)" }}
                  onClick={() => { setShowSubscriptionModal(true); }}
                >Upgrade Now</button>
              </div>
            </ScrollReveal>

            {/* Pro Plan */}
            {/* <ScrollReveal delay={0.3}>
              <div className="card" style={{ padding: 32, textAlign: "center" }}>
                <h3 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Pro</h3>
                <div style={{ color: "var(--text-primary)", fontSize: 36, fontWeight: 900, marginBottom: 4 }}>₹799</div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>per month</p>
                <ul style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "left", paddingLeft: 20, marginBottom: 24 }}>
                  <li style={{ marginBottom: 8 }}>Everything in Premium</li>
                  <li style={{ marginBottom: 8 }}>Unlimited practice sessions</li>
                  <li style={{ marginBottom: 8 }}>Custom interviewer personas</li>
                  <li style={{ marginBottom: 8 }}>API access</li>
                  <li>Dedicated account manager</li>
                </ul>
                <button className="btn-ghost" style={{ width: "100%", padding: "12px" }}>Contact Sales</button>
              </div>
            </ScrollReveal> */}
          </div>
        </section>

        {/* ── HOW IT WORKS: Smart Video Distribution ─────────────────────────
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 100px" }}>
          <ScrollReveal style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 100,
              background: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.3)",
              color: "#4ecdc4", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
              textTransform: "uppercase", marginBottom: 16,
            }}>How It Works</span>
            <h2 style={{ color: "var(--text-primary)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
              Smart Video Distribution
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              Our AI splits your 25-minute interview intelligently — video for key moments, audio for the rest. 
              You get the full interactive experience at a fraction of the Tavus API cost.
            </p>
          </ScrollReveal>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { phase: "🎥 Intro", time: "1 min", type: "Video", desc: "AI greets you with full video presence" },
              { phase: "🎙️ Questions", time: "4 min", type: "Audio", desc: "Deep-dive questions via voice" },
              { phase: "🎥 Reaction", time: "1 min", type: "Video", desc: "AI responds to your answers" },
              { phase: "💻 Coding", time: "6 min", type: "Audio", desc: "Code while discussing with AI" },
              { phase: "🎥 Feedback", time: "2 min", type: "Video", desc: "Final wrap-up with video" },
            ].map((item, i) => (
              <ScrollReveal key={item.phase} delay={i * 0.1}>
                <div className="card" style={{ padding: 20, textAlign: "center" }}>
                  <div style={{ 
                    fontSize: 24, 
                    marginBottom: 8,
                    color: item.type === "Video" ? "#6c63ff" : "#4ecdc4"
                  }}>{item.phase}</div>
                  <div style={{ 
                    display: "inline-block", 
                    padding: "2px 10px", 
                    borderRadius: 100,
                    background: item.type === "Video" ? "rgba(108,99,255,0.15)" : "rgba(78,205,196,0.15)",
                    color: item.type === "Video" ? "#6c63ff" : "#4ecdc4",
                    fontSize: 11, 
                    fontWeight: 600,
                    marginBottom: 8,
                  }}>{item.time}</div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section> */}

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <ScrollReveal style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 120px" }}>
          <div style={{
            borderRadius: 28,
            padding: "72px 48px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(78,205,196,0.08) 50%, rgba(108,99,255,0.06) 100%)",
            border: "1px solid rgba(108,99,255,0.25)",
            boxShadow: "0 0 100px rgba(108,99,255,0.1)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Background decoration */}
            <div style={{
              position: "absolute", top: -60, right: -60,
              width: 240, height: 240, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(78,205,196,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: -40, left: -40,
              width: 200, height: 200, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span style={{ fontSize: 52, display: "block", marginBottom: 20 }}>🚀</span>
              <h2 style={{
                color: "var(--text-primary)",
                fontSize: "clamp(30px, 5vw, 52px)",
                fontWeight: 900,
                letterSpacing: "-2px",
                marginBottom: 20,
                lineHeight: 1.1,
              }}>
                Ready to ace your{" "}
                <span style={{
                  background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  next interview?
                </span>
              </h2>
              <p style={{
                color: "var(--text-secondary)",
                fontSize: 17, lineHeight: 1.7,
                maxWidth: 520, margin: "0 auto 40px",
              }}>
                Join thousands of candidates who practice smarter with an AI that actually challenges them — powered by the same video AI used in production-grade applications.
              </p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  id="btn-final-cta"
                  onClick={() => setAppState("setup")}
                  className="btn-primary"
                  style={{ fontSize: 16, padding: "16px 40px", display: "inline-flex", alignItems: "center", gap: 10 }}
                >
                  <Play size={20} />
                  Start Interview — It's Free
                </button>
                <a
                  href="https://platform.tavus.io"
                  target="_blank"
                  rel="noopener"
                  className="btn-ghost"
                  style={{ fontSize: 15, padding: "16px 32px", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                >
                  View Tavus Docs
                  <ArrowRight size={16} />
                </a>
              </div>
              <div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 48 }}>
                {[
                  { value: "3", label: "Interviewer Modes" },
                  { value: "∞", label: "Practice Sessions" },
                  { value: "100%", label: "Personalized" },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 900, letterSpacing: "-1px" }}>{stat.value}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "28px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
            }}>🤖</div>
            <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>
              Interview<span style={{ color: "#6c63ff" }}>AI</span>
            </span>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            © 2026 InterviewAI · Built with Tavus CVI, Next.js 15, FastAPI & Gemini
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Contact"].map(link => (
              <a key={link} href="#" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)"; }}
              >{link}</a>
            ))}
          </div>
        </footer>

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          remainingSeconds={remainingSeconds}
        />
      </div>
    );
  }

  // ── SETUP ────────────────────────────────────────────────────────────
  return (
    <div className="gradient-bg" style={{ minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
            }}
          >
            🤖
          </div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Set Up Your Interview
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            {setupStep === 1
              ? "Upload your resume so our AI can personalize the interview experience."
              : `Hi ${candidate?.name}! Now choose your interviewer style.`}
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36, justifyContent: "center" }}>
          {[
            { n: 1, label: "Resume" },
            { n: 2, label: "Choose Vibe" },
          ].map((step, i) => (
            <React.Fragment key={step.n}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: setupStep >= step.n ? "var(--accent-primary)" : "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: setupStep >= step.n ? "rgba(108,99,255,0.2)" : "var(--bg-elevated)",
                    border: `2px solid ${setupStep >= step.n ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    color: setupStep >= step.n ? "var(--accent-primary)" : "var(--text-muted)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {step.n}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{step.label}</span>
              </div>
              {i < 1 && (
                <ChevronRight size={16} color="var(--text-muted)" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Resume */}
        {setupStep === 1 && (
          <div className="card animate-slide-up">
            <h2 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              Upload Resume
            </h2>
            <ResumeUploader onUpload={handleResumeUpload} isLoading={isParsingResume} />

            {/* OR: manual entry */}
            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>OR FILL MANUALLY</span>
              <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
            </div>

            <ManualProfileEntry
              onSubmit={(p) => {
                setCandidate(p);
                setSetupStep(2);
              }}
            />
          </div>
        )}

        {/* Step 2: Vibe */}
        {setupStep === 2 && candidate && (
          <div className="animate-slide-up">
            {/* Parsed profile preview */}
            <div
              className="card"
              style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}
            >
              <div
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}
              >
                {candidate?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>
                  {candidate?.name ?? "Candidate"}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {candidate?.experience ?? ""} {candidate?.education ?? ""}
                </p>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {candidate?.topSkills?.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 500,
                        background: "rgba(108,99,255,0.1)", color: "var(--accent-primary)",
                        border: "1px solid rgba(108,99,255,0.2)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSetupStep(1)}
                className="btn-ghost"
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                Change
              </button>
            </div>

            <VibePicker
              selected={selectedVibe}
              onSelect={setSelectedVibe}
              recommended={suggestedVibe}
              recommendReason={vibeReason}
            />

            {/* Difficulty Selector */}
            <div style={{ marginTop: 28 }}>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14, marginBottom: 12, textAlign: "center" }}>
                Select Coding Difficulty
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {[
                  { id: "easy", label: "Easy", color: "#43d98a", desc: "For beginners" },
                  { id: "medium", label: "Medium", color: "#f7c948", desc: "Standard interview" },
                  { id: "hard", label: "Hard", color: "#ff4b6e", desc: "Advanced level" },
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedDifficulty(level.id)}
                    style={{
                      flex: 1,
                      maxWidth: 140,
                      padding: "16px 12px",
                      borderRadius: 12,
                      border: `2px solid ${selectedDifficulty === level.id ? level.color : "var(--border-subtle)"}`,
                      background: selectedDifficulty === level.id ? `${level.color}15` : "var(--bg-elevated)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <p style={{ color: selectedDifficulty === level.id ? level.color : "var(--text-primary)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {level.label}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {level.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button
                id="btn-launch-interview"
                onClick={handleStart}
                disabled={!selectedVibe}
                className="btn-primary"
                style={{
                  fontSize: 16,
                  padding: "16px 48px",
                  opacity: selectedVibe ? 1 : 0.4,
                  cursor: selectedVibe ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Play size={18} />
                Launch Interview
              </button>
              {!selectedVibe && (
                <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10 }}>
                  Select an interviewer vibe to continue
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subscription Modal for setup screen */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        remainingSeconds={remainingSeconds}
      />

      {/* Permission Modal */}
      {showPermissionModal && (
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
            <button
              onClick={() => setShowPermissionModal(false)}
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

            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255, 75, 110, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <AlertTriangle size={40} color="#ff4b6e" />
            </div>

            <h2 style={{ color: "var(--text-primary)", fontSize: 24, marginBottom: 12 }}>
              Camera & Microphone Required
            </h2>
            
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              This interview requires access to your camera and microphone for proctoring. 
              Please grant permissions to continue.
            </p>

            <div
              style={{
                background: "var(--bg-primary)",
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Camera size={20} color={mediaPermissions.camera === "granted" ? "#43d98a" : "#ff4b6e"} />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Camera</span>
                <span style={{ color: mediaPermissions.camera === "granted" ? "#43d98a" : "#ff4b6e", marginLeft: "auto" }}>
                  {mediaPermissions.camera === "granted" ? "Granted" : "Denied"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Mic size={20} color={mediaPermissions.microphone === "granted" ? "#43d98a" : "#ff4b6e"} />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Microphone</span>
                <span style={{ color: mediaPermissions.microphone === "granted" ? "#43d98a" : "#ff4b6e", marginLeft: "auto" }}>
                  {mediaPermissions.microphone === "granted" ? "Granted" : "Denied"}
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                // Check permissions and proceed regardless
                await checkMediaPermissions();
                setShowPermissionModal(false);
                handleStart();
              }}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                color: "white",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Camera size={18} />
              Grant Permissions & Continue
            </button>

            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16 }}>
              Make sure to allow camera and microphone access in your browser settings
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Manual profile entry form ────────────────────────────────────────────────
function ManualProfileEntry({ onSubmit }: { onSubmit: (p: CandidateProfile) => void }) {
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [exp, setExp] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      topSkills: skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
      experience: exp || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
          Full Name *
        </label>
        <input
          id="input-candidate-name"
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya Sharma"
          required
        />
      </div>
      <div>
        <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
          Top Skills (comma-separated)
        </label>
        <input
          id="input-skills"
          className="input-field"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="e.g. Python, React, System Design"
        />
      </div>
      <div>
        <label style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
          Years of Experience
        </label>
        <input
          id="input-experience"
          className="input-field"
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          placeholder="e.g. 3 years"
        />
      </div>
      <button
        id="btn-continue-manual"
        type="submit"
        className="btn-primary"
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8 }}
      >
        Continue
        <ChevronRight size={16} />
      </button>
    </form>
  );
}
