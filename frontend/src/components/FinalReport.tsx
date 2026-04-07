"use client";

import React, { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { InterviewScore, InterviewSession, ProctoringEvent } from "@/types/interview";
import { Trophy, Clock, Shield, Code2, Brain, Users, Download, RotateCcw } from "lucide-react";
import { VIBE_CONFIGS } from "@/config/TavusConfig";

interface FinalReportProps {
  session: InterviewSession;
  scores: InterviewScore;
  onRestart: () => void;
}

const SCORE_LABELS = [
  { key: "technical",      label: "Technical Accuracy", icon: Code2,  color: "#6c63ff" },
  { key: "softSkills",     label: "Soft Skills",        icon: Users,  color: "#4ecdc4" },
  { key: "problemSolving", label: "Problem Solving",    icon: Brain,  color: "#f7c948" },
  { key: "integrity",      label: "Integrity",          icon: Shield, color: "#43d98a" },
];

function ScoreMeter({ label, score, color, icon: Icon }: {
  label: string; score: number; color: string; icon: any;
}) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayScore(score), 400);
    return () => clearTimeout(timer);
  }, [score]);

  const getGrade = (s: number) => {
    if (s >= 90) return { grade: "A+", text: "Exceptional" };
    if (s >= 80) return { grade: "A",  text: "Excellent" };
    if (s >= 70) return { grade: "B",  text: "Good" };
    if (s >= 60) return { grade: "C",  text: "Satisfactory" };
    return { grade: "D", text: "Needs Work" };
  };

  const { grade, text } = getGrade(score);

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `${color}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon size={16} color={color} />
          </div>
          <div>
            <p style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{label}</p>
            <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{text}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ color, fontSize: 24, fontWeight: 800 }}>{grade}</span>
          <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{score}/100</p>
        </div>
      </div>

      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{
            width: `${displayScore}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

function ProctoringLog({ events }: { events: ProctoringEvent[] }) {
  if (!events.length) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <Shield size={32} color="var(--accent-success)" style={{ marginBottom: 8 }} />
        <p style={{ color: "var(--accent-success)", fontWeight: 600 }}>No integrity issues detected</p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          Perfect proctoring score!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {events.map((evt, i) => (
        <div
          key={i}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px",
            background: evt.type === "multiple_faces"
              ? "rgba(255,75,110,0.08)"
              : "rgba(247,201,72,0.08)",
            border: `1px solid ${evt.type === "multiple_faces" ? "rgba(255,75,110,0.2)" : "rgba(247,201,72,0.2)"}`,
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>
            {evt.type === "multiple_faces" ? "👥" : evt.type === "gaze_away" ? "👁️" : "✅"}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{
              color: evt.type === "multiple_faces" ? "var(--accent-danger)" : "var(--accent-warning)",
              fontSize: 12, fontWeight: 600,
            }}>
              {evt.type === "multiple_faces" ? "Multiple faces detected"
                : evt.type === "gaze_away" ? "Gaze distraction"
                : "Resumed focus"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
              {new Date(evt.timestamp).toLocaleTimeString()}
              {evt.duration ? ` · ${evt.duration.toFixed(1)}s` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinalReport({ session, scores, onRestart }: FinalReportProps) {
  const vibeConfig = VIBE_CONFIGS[session.vibe];
  const duration = session.endTime
    ? Math.floor((session.endTime - session.startTime) / 60000)
    : 0;

  const radarData = [
    { subject: "Technical",    score: scores.technical,      fullMark: 100 },
    { subject: "Soft Skills",  score: scores.softSkills,     fullMark: 100 },
    { subject: "Problem Solve",score: scores.problemSolving,  fullMark: 100 },
    { subject: "Integrity",    score: scores.integrity,      fullMark: 100 },
  ];

  const overallGrade = () => {
    const o = scores.overall;
    if (o >= 90) return { label: "Exceptional Candidate", color: "#43d98a", emoji: "🏆" };
    if (o >= 75) return { label: "Strong Candidate",      color: "#6c63ff", emoji: "⭐" };
    if (o >= 60) return { label: "Promising Candidate",   color: "#f7c948", emoji: "📈" };
    return { label: "Needs Improvement",                  color: "#ff4b6e", emoji: "📚" };
  };

  const { label: overallLabel, color: overallColor, emoji } = overallGrade();

  return (
    <div
      className="gradient-bg"
      style={{
        minHeight: "100vh",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
      }}
    >
      {/* Header */}
      <div className="animate-slide-up" style={{ textAlign: "center", maxWidth: 600 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</div>
        <h1 style={{ color: "var(--text-primary)", fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          Interview Complete
        </h1>
        <p style={{ color: overallColor, fontSize: 18, fontWeight: 600 }}>{overallLabel}</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} color="var(--text-muted)" />
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{duration} min</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{vibeConfig.icon}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{vibeConfig.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Trophy size={14} color={overallColor} />
            <span style={{ color: overallColor, fontSize: 13, fontWeight: 700 }}>
              {scores.overall}/100
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {/* Left: Radar Chart */}
        <div
          className="card animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700, marginBottom: 24 }}>
            Performance Radar
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid
                stroke="rgba(255,255,255,0.06)"
                radialLines={false}
              />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "var(--text-secondary)", fontSize: 12, fontFamily: "Inter" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                tickCount={5}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#6c63ff"
                fill="#6c63ff"
                fillOpacity={0.25}
                strokeWidth={2}
                dot={{ fill: "#6c63ff", r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                }}
                itemStyle={{ color: "#6c63ff" }}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Overall score ring */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 16,
              padding: "16px 0",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: `conic-gradient(${overallColor} ${scores.overall * 3.6}deg, var(--bg-elevated) 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "var(--bg-card)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <span style={{ color: overallColor, fontSize: 18, fontWeight: 800 }}>
                  {scores.overall}
                </span>
              </div>
            </div>
            <div>
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>Overall Score</p>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Out of 100 points</p>
            </div>
          </div>
        </div>

        {/* Right: Score breakdown */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
          className="animate-slide-up"
        >
          {SCORE_LABELS.map(({ key, label, icon, color }) => (
            <ScoreMeter
              key={key}
              label={label}
              score={scores[key as keyof InterviewScore] as number}
              color={color}
              icon={icon}
            />
          ))}
        </div>

        {/* Proctoring Log */}
        <div
          className="card animate-slide-up"
          style={{ gridColumn: "1 / -1", animationDelay: "0.2s" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Shield size={18} color="var(--accent-primary)" />
            <h2 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700 }}>
              Proctoring Log
            </h2>
            <span
              style={{
                marginLeft: "auto",
                padding: "3px 10px",
                borderRadius: 100,
                background: session.proctoringEvents.length === 0
                  ? "rgba(67,217,138,0.1)"
                  : "rgba(255,75,110,0.1)",
                color: session.proctoringEvents.length === 0
                  ? "var(--accent-success)"
                  : "var(--accent-danger)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {session.proctoringEvents.length} event{session.proctoringEvents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ProctoringLog events={session.proctoringEvents} />
        </div>
      </div>

      {/* Actions */}
      <div
        className="animate-slide-up"
        style={{ display: "flex", gap: 16, animationDelay: "0.3s" }}
      >
        <button
          id="btn-restart"
          onClick={onRestart}
          className="btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <RotateCcw size={16} />
          New Interview
        </button>
        <button
          id="btn-download-report"
          className="btn-primary"
          onClick={() => {
            const report = JSON.stringify({ session, scores }, null, 2);
            const blob = new Blob([report], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `interview-report-${session.candidate.name}.json`;
            a.click();
          }}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Download size={16} />
          Download Report
        </button>
      </div>
    </div>
  );
}
