"use client";

import React from "react";
import { VIBE_CONFIGS } from "@/config/TavusConfig";
import { VibeType } from "@/types/interview";
import { CheckCircle, Sparkles } from "lucide-react";

interface VibePickerProps {
  selected:      VibeType | null;
  onSelect:      (vibe: VibeType) => void;
  recommended?:  VibeType | null;     // AI-suggested vibe from resume
  recommendReason?: string;           // One-line explanation
}

export function VibePicker({
  selected,
  onSelect,
  recommended,
  recommendReason,
}: VibePickerProps) {
  const vibes = Object.values(VIBE_CONFIGS);

  return (
    <div>
      {/* AI recommendation banner */}
      {recommended && recommendReason && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 12,
            background: "rgba(108,99,255,0.08)",
            border: "1px solid rgba(108,99,255,0.25)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg,#6c63ff,#4ecdc4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Sparkles size={16} color="white" />
          </div>
          <div>
            <p style={{ color: "var(--accent-primary)", fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
              AI RECOMMENDATION
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>
              {recommendReason}
            </p>
          </div>
        </div>
      )}

      {/* Vibe cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {vibes.map((vibe) => {
          const isSelected    = selected    === vibe.id;
          const isRecommended = recommended === vibe.id;

          return (
            <button
              key={vibe.id}
              id={`vibe-${vibe.id}`}
              type="button"
              onClick={() => onSelect(vibe.id)}
              style={{
                background:   isSelected ? vibe.accentColor : "var(--bg-elevated)",
                border:       `2px solid ${isSelected ? vibe.color : isRecommended ? "rgba(108,99,255,0.5)" : "var(--border-subtle)"}`,
                borderRadius: 16,
                padding:      "20px 16px",
                cursor:       "pointer",
                textAlign:    "left",
                transition:   "all 0.3s ease",
                position:     "relative",
                boxShadow:    isSelected
                  ? `0 0 30px ${vibe.color}33`
                  : isRecommended
                    ? "0 0 20px rgba(108,99,255,0.15)"
                    : "none",
              }}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <CheckCircle size={16} color={vibe.color} />
                </div>
              )}

              {/* "AI Pick" badge — shown on non-selected recommended card */}
              {isRecommended && !isSelected && (
                <div
                  style={{
                    position: "absolute", top: 10, right: 10,
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 100,
                    background: "linear-gradient(135deg,#6c63ff,#4ecdc4)",
                  }}
                >
                  <Sparkles size={10} color="white" />
                  <span style={{ color: "white", fontSize: 9, fontWeight: 700, letterSpacing: "0.5px" }}>
                    AI PICK
                  </span>
                </div>
              )}

              {/* Vibe icon */}
              <div style={{ fontSize: 32, marginBottom: 10 }}>{vibe.icon}</div>

              {/* Name */}
              <h3
                style={{
                  color: isSelected ? vibe.color : "var(--text-primary)",
                  fontSize: 15, fontWeight: 700, marginBottom: 4,
                }}
              >
                {vibe.name}
              </h3>

              {/* Tagline */}
              <p
                style={{
                  color: "var(--text-secondary)", fontSize: 12,
                  lineHeight: 1.5, marginBottom: 12,
                }}
              >
                {vibe.tagline}
              </p>

              {/* Trait tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {vibe.traits.map((trait) => (
                  <span
                    key={trait}
                    style={{
                      fontSize: 10, fontWeight: 600,
                      padding: "2px 8px", borderRadius: 100,
                      background: isSelected ? `${vibe.color}22` : "var(--bg-card)",
                      color:      isSelected ? vibe.color          : "var(--text-muted)",
                      border:     `1px solid ${isSelected ? `${vibe.color}44` : "var(--border-subtle)"}`,
                      textTransform: "uppercase", letterSpacing: "0.4px",
                    }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
