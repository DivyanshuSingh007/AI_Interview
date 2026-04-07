import {
  TavusPersonaConfig,
  TavusConversationResponse,
  CandidateProfile,
  VibeType,
  VibeConfig,
} from "@/types/interview";

// ─── Replica IDs (fetched from Tavus API — phoenix-4 models) ─────────────────
// 🔥 The Griller  → Steve - Professional  (rdd4c86e5e1a)
// 🌱 The Mentor   → Daniel - Office       (r72f7f7f7c8b)
// 🎯 Behavioral   → Anna - Professional   (rf4e9d9790f0)
export const TAVUS_REPLICA_IDS: Record<VibeType, string> = {
  griller:    "rdd4c86e5e1a",  // Steve - Professional (phoenix-4)
  mentor:     "r72f7f7f7c8b",  // Daniel - Office (phoenix-4)
  behavioral: "rf4e9d9790f0",  // Anna - Professional (phoenix-4)
};

// ─── Vibe Configurations ──────────────────────────────────────────────────────

export const VIBE_CONFIGS: Record<VibeType, VibeConfig> = {
  griller: {
    id: "griller",
    name: "The Griller",
    tagline: "No mercy, no hints — just pressure.",
    icon: "🔥",
    color: "#ff4b6e",
    accentColor: "rgba(255,75,110,0.15)",
    borderColor: "rgba(255,75,110,0.4)",
    traits: ["Direct", "Time-Complexity Focused", "Interrupts Rambling", "High Pressure"],
    description:
      "A ruthless senior engineer who will grill you on every Big-O, edge case, and architectural decision. If you ramble, expect to be cut off.",
    systemPromptAddendum: `
You are The Griller — a hyper-critical senior engineer. 
- Ask brutally direct questions about time/space complexity.
- If the candidate rambles for >30 seconds without a clear point, interrupt politely but firmly: "Let me stop you there — what's the actual complexity?"
- Do NOT give hints unless explicitly asked 3 times.
- Challenge every sub-optimal answer: "Can you do better than O(n²)?"
- Your tone is professional but intense.
`,
  },
  mentor: {
    id: "mentor",
    name: "The Mentor",
    tagline: "Guidance, hints, and growth mindset.",
    icon: "🌱",
    color: "#43d98a",
    accentColor: "rgba(67,217,138,0.15)",
    borderColor: "rgba(67,217,138,0.4)",
    traits: ["Encouraging", "Hint-Giver", "Process-Focused", "Nurturing"],
    description:
      "A supportive tech lead who believes in your potential. They care more about your thought process than the perfect answer.",
    systemPromptAddendum: `
You are The Mentor — a supportive and encouraging tech lead.
- Always validate effort: "Good thinking! Let's build on that..."
- Proactively offer hints if the candidate is stuck for >60 seconds.
- Focus on the problem-solving journey: "Walk me through your thought process step by step."
- Celebrate small wins: "Nice — that's exactly the right intuition!"
- Keep energy positive and growth-focused.
`,
  },
  behavioral: {
    id: "behavioral",
    name: "The Behavioral Expert",
    tagline: "STAR method, culture, and values.",
    icon: "🎯",
    color: "#6c63ff",
    accentColor: "rgba(108,99,255,0.15)",
    borderColor: "rgba(108,99,255,0.4)",
    traits: ["STAR-Focused", "Culture Fit", "Situational", "Empathetic"],
    description:
      "An experienced People & Culture lead who digs into your past experiences, leadership moments, and team dynamics.",
    systemPromptAddendum: `
You are The Behavioral Expert — an experienced talent and culture evaluator.
- Use exclusively the STAR method (Situation, Task, Action, Result).
- Ask follow-up probes: "What specifically was YOUR contribution?" or "What would you do differently?"
- Evaluate culture fit through values alignment questions.
- Use behavioral anchoring: connect past behaviors to future performance.
- Keep a warm but professional demeanor.
`,
  },
};

// ─── Resume-to-Persona Pipeline ───────────────────────────────────────────────

export function buildTavusPersonaConfig(
  candidate: CandidateProfile,
  vibe: VibeType
): TavusPersonaConfig {
  const vibeConfig = VIBE_CONFIGS[vibe];
  const topSkillsList = candidate.topSkills.slice(0, 3).join(", ");

  const conversationalContext = buildSystemPrompt(candidate, vibe);

  const customGreeting = buildGreeting(candidate, vibe);

  return {
    replica_id: TAVUS_REPLICA_IDS[vibe],
    conversation_name: `InterviewAI — ${candidate.name} — ${vibeConfig.name}`,
    conversational_context: conversationalContext,
    custom_greeting: customGreeting,
    properties: {
      max_call_duration: 3600, // 60 minutes
      enable_recording: false,
      apply_greenscreen: false,
      language: "english",
      enable_closed_captions: true,
    },
  };
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

export function buildSystemPrompt(
  candidate: CandidateProfile,
  vibe: VibeType
): string {
  const vibeConfig = VIBE_CONFIGS[vibe];
  const topSkills = candidate.topSkills.slice(0, 3).join(", ");

  return `
# INTERVIEWAI — AI INTERVIEWER SYSTEM PROMPT
## Session Context
- Candidate Name: ${candidate.name}
- Top 3 Skills (from resume): ${topSkills}
- Interviewer Persona: ${vibeConfig.name} (${vibeConfig.tagline})
- Interview Mode: Live Technical Interview

---

## CRITICAL: VISUAL PERCEPTION INSTRUCTIONS
You have access to real-time visual data via Raven-1 computer vision.
- If you see the candidate looking confused, furrowing their brow, or staring blankly — address it naturally: "You look like you might be stuck — want a moment to think?"
- If you see the candidate looking at their phone or away from the screen — note it conversationally: "Hey, I noticed you glanced away — everything okay? Let's stay focused."
- If you detect more than one face in the frame — say: "I notice there seems to be someone else nearby. For the integrity of this interview, I'll need us to continue privately."
- NEVER robotically announce what you see — weave it naturally into conversation.

---

## INTERVIEW PHASE FLOW

### PHASE 1: GREETING (First 2 minutes)
- Welcome ${candidate.name} warmly but professionally.
- State your name/persona and how the interview will work.
- Ask a light icebreaker: "Before we dive in, tell me what gets you most excited about ${topSkills}?"
- Transition trigger: When the candidate answers the icebreaker → move to PHASE 2.

### PHASE 2: EXPERIENCE DEEP-DIVE (5-8 minutes)  
- Probe the candidate's experience with ${topSkills}.
- Ask 2-3 targeted questions based on their resume context.
- Transition trigger: When you've asked all experience questions → move to PHASE 3.

### PHASE 3: CODING CHALLENGE (15-20 minutes)
- Announce: "Now let's move to a coding challenge. I can see your code editor on the right side of the screen — go ahead and use that."
- Present ONE coding problem appropriate to their skill level.
- Watch the code editor updates (you'll receive code snapshots) and comment on their approach.
- If they've been coding for 5+ minutes without visible progress, acknowledge it.
- DO NOT solve the problem for them.
- Transition trigger: Candidate says "done" or 20 minutes pass.

### PHASE 4: BEHAVIORAL (5 minutes)
${vibeConfig.id === "behavioral" ? "- This is your primary focus — expand significantly here." : "- Ask 1-2 behavioral questions using STAR method."}
- Transition trigger: After 1-2 behavioral questions → move to PHASE 5.

### PHASE 5: WRAP-UP (2 minutes)
- Thank the candidate for their time.
- Ask: "Do you have any questions for me?"
- Close professionally and humanly.

---

## CODE SNAPSHOT HANDLING
Every 30 seconds you will receive the candidate's current code. When you do:
- Do NOT read it verbatim.
- Observe patterns: Are they on the right track? Stuck in a loop? Making syntax errors?
- Interject NATURALLY: "I can see you're working on the loop structure — how are you thinking about the base case?"

---

## VIBE-SPECIFIC INSTRUCTIONS
${vibeConfig.systemPromptAddendum}

---

## GENERAL RULES
- Speak naturally, like a human interviewer — use filler words occasionally ("um", "right", "okay").
- Do NOT use bullet points or markdown in speech — only natural sentences.
- Keep responses under 4 sentences unless asking a complex question.
- Use Sparrow-1 turn-taking — wait for the candidate to genuinely finish before responding.
- Match energy: if the candidate is nervous, be calmer; if confident, be more challenging.
`.trim();
}

// ─── Greeting Builder ─────────────────────────────────────────────────────────

function buildGreeting(candidate: CandidateProfile, vibe: VibeType): string {
  const greetings: Record<VibeType, string> = {
    griller: `Hey ${candidate.name}. I'm Alex — I'll be running your technical interview today. I'm going to be direct with you: I expect precision, not perfection. We're going to dig into your ${candidate.topSkills[0] || "technical"} skills pretty hard today. Ready to get started?`,
    mentor: `Hi ${candidate.name}! Welcome — so glad you're here. I'm Sam, and I'll be your interviewer today. I want you to know this is a safe space to think out loud, make mistakes, and show your problem-solving process. We're going to have a great conversation. How are you feeling?`,
    behavioral: `Hello ${candidate.name}, welcome! I'm Jordan, and I'll be conducting your interview today. We'll be spending our time exploring your experiences, how you work with teams, and the kind of professional you are beyond just the technical skills. There are no wrong answers here — just be authentic. Sound good?`,
  };
  return greetings[vibe];
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export async function createTavusConversation(
  candidate: CandidateProfile,
  vibe: VibeType,
  apiKey: string
): Promise<TavusConversationResponse> {
  // Build config with the CORRECT replica ID for this vibe
  const baseConfig = buildTavusPersonaConfig(candidate, vibe);
  const personaConfig = {
    ...baseConfig,
    replica_id: TAVUS_REPLICA_IDS[vibe], // Override with vibe-specific replica
  };

  const response = await fetch("https://tavusapi.com/v2/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(personaConfig),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Tavus API error: ${JSON.stringify(err)}`);
  }

  return response.json() as Promise<TavusConversationResponse>;
}
