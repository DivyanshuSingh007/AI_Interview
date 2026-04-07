// ─── Interviewer Vibe / Persona ───────────────────────────────────────────────

export type VibeType = "griller" | "mentor" | "behavioral";

export interface VibeConfig {
  id: VibeType;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  accentColor: string;
  borderColor: string;
  traits: string[];
  description: string;
  systemPromptAddendum: string;
}

// ─── Resume & Candidate ───────────────────────────────────────────────────────

export interface CandidateProfile {
  name: string;
  email?: string;
  topSkills: string[];
  experience?: string;
  education?: string;
  rawText?: string;
  suggestedVibe?: VibeType;    // AI-recommended interviewer vibe
  vibeReason?: string;         // Short explanation from Gemini
}

// ─── Tavus / CVI ──────────────────────────────────────────────────────────────

export interface TavusPersonaConfig {
  persona_id?: string;
  replica_id: string;
  conversation_name: string;
  conversational_context: string;
  custom_greeting: string;
  properties: {
    max_call_duration: number;
    enable_recording: boolean;
    apply_greenscreen: boolean;
    language: string;
    enable_closed_captions: boolean;
  };
}

export interface TavusConversationResponse {
  conversation_id: string;
  conversation_url: string;
  status: string;
}

export interface PerceptionUpdate {
  gaze?: "focused" | "distracted" | "looking_away";
  face_count?: number;
  emotion?: string;
  confidence?: number;
}

// ─── Interview Session ────────────────────────────────────────────────────────

export type InterviewPhase =
  | "landing"
  | "setup"
  | "connecting"
  | "greeting"
  | "technical"
  | "behavioral"
  | "coding"
  | "wrap_up"
  | "report";

export interface ProctoringEvent {
  timestamp: number;
  type: "gaze_away" | "multiple_faces" | "resumed_focus" | "tab_switch" | "audio_anomaly";
  duration?: number;
}

export interface InterviewScore {
  technical: number;       // 0–100
  softSkills: number;
  problemSolving: number;
  integrity: number;       // Based on proctoring
  overall: number;
  feedback?: string;      // Optional feedback notes
}

export interface InterviewSession {
  id: string;
  candidate: CandidateProfile;
  vibe: VibeType;
  difficulty: string;  // "easy", "medium", "hard"
  phase: InterviewPhase;
  startTime: number;
  endTime?: number;
  conversationId?: string;
  proctoringEvents: ProctoringEvent[];
  codeSnapshots: CodeSnapshot[];
  scores?: InterviewScore;
  feedbackNotes: string[];
}

// ─── Code Editor ──────────────────────────────────────────────────────────────

export interface CodeSnapshot {
  timestamp: number;
  code: string;
  language: string;
  phase: InterviewPhase;
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  status: string;
  time?: string;
  memory?: string;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface RadarDataPoint {
  subject: string;
  score: number;
  fullMark: number;
}
