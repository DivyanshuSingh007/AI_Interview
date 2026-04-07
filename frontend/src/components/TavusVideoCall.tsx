"use client";

import React, {
  useEffect, useRef, useState, useCallback,
} from "react";
import DailyIframe from "@daily-co/daily-js";
import type { DailyCall } from "@daily-co/daily-js";
import {
  Mic, MicOff, VideoOff, Video, PhoneOff,
  Wifi, WifiOff, Eye, EyeOff, Camera,
} from "lucide-react";
import { PerceptionUpdate } from "@/types/interview";

interface TavusVideoCallProps {
  conversationUrl:    string;
  onPerceptionUpdate: (update: PerceptionUpdate) => void;
  onCallEnded:        () => void;
  isDistracted?:      boolean;
  multipleFaces?:     boolean;
  isVideoEnabled?:    boolean;
  onVideoDisabled?:   () => void;
}

interface VideoDevice { deviceId: string; label: string; }

// Attach (or replace) a track on a <video> element without flickering
function attachTrack(el: HTMLVideoElement | null, track: MediaStreamTrack) {
  if (!el || !track) return;
  if (!el.srcObject) {
    el.srcObject = new MediaStream([track]);
  } else {
    const ms = el.srcObject as MediaStream;
    ms.getTracks().filter(t => t.kind === track.kind).forEach(t => ms.removeTrack(t));
    ms.addTrack(track);
  }
  el.play().catch(() => {});
}

export function TavusVideoCall({
  conversationUrl,
  onPerceptionUpdate,
  onCallEnded,
  isDistracted  = false,
  multipleFaces = false,
  isVideoEnabled = true,
  onVideoDisabled,
}: TavusVideoCallProps) {

  // ── refs ──────────────────────────────────────────────────────────────
  const callRef      = useRef<DailyCall | null>(null);
  const aiVideoRef   = useRef<HTMLVideoElement>(null);
  const selfVideoRef = useRef<HTMLVideoElement>(null);
  const aiAudioRef   = useRef<HTMLAudioElement>(null);

  // ── state ─────────────────────────────────────────────────────────────
  const [callState, setCallState] = useState<"connecting" | "connected" | "error">("connecting");
  const [isMuted,   setIsMuted]   = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [networkQuality, setNetworkQuality]     = useState<"good"|"poor"|"unknown">("unknown");
  const [participantCount, setParticipantCount] = useState(0);

  // camera picker
  const [videoDevices,     setVideoDevices]     = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [camPermission,    setCamPermission]    = useState<"pending"|"granted"|"denied">("pending");

  // ── Effect: Sync initial video state with parent prop ──
  useEffect(() => {
    // If parent says video is disabled, sync our local state
    if (!isVideoEnabled && isVideoOn && callRef.current) {
      callRef.current.setLocalVideo(false);
      setIsVideoOn(false);
    }
  }, []); // Run once on mount

  // ── Effect: Actually disable video when isVideoEnabled prop becomes false ──
  // This ensures Tavus/Daily.co stops charging for video minutes
  useEffect(() => {
    if (!callRef.current) return;
    
    // When video limit is reached, actually disable the video track
    if (!isVideoEnabled && isVideoOn) {
      callRef.current.setLocalVideo(false);
      setIsVideoOn(false);
      // Notify parent that video was disabled
      if (onVideoDisabled) {
        onVideoDisabled();
      }
    }
  }, [isVideoEnabled, isVideoOn, onVideoDisabled]);

  // ── 1. Request native camera permission ───────────────────────────────
  // We call getUserMedia ONLY to trigger the OS permission dialog and
  // enumerate device labels. We stop the tracks immediately afterwards
  // so Daily.js can claim the camera exclusively.
  const requestCameraAccess = useCallback(async (): Promise<string> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      const grantedId  = stream.getVideoTracks()[0]?.getSettings()?.deviceId ?? "";
      stream.getTracks().forEach(t => t.stop());   // release immediately
      setCamPermission("granted");

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras: VideoDevice[] = devices
        .filter(d => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));

      setVideoDevices(cameras);
      const defaultId = grantedId || cameras[0]?.deviceId || "";
      setSelectedDeviceId(defaultId);
      return defaultId;
    } catch {
      setCamPermission("denied");
      return "";
    }
  }, []);

  // ── 2. Init Daily call object (NOT an iframe) ─────────────────────────
  const initCall = useCallback(async (deviceId?: string) => {
    if (callRef.current) return;     // already initialised

    try {
      // createCallObject gives us raw MediaStream tracks — full control
      const call = DailyIframe.createCallObject({
        videoSource: deviceId || true,   // use our chosen camera
        audioSource: true,
      });
      callRef.current = call;

      // ── track-started: wire raw tracks to <video>/<audio> elements ───
      call.on("track-started", (event: any) => {
        const { track, participant } = event;
        if (!track || !participant) return;

        if (participant.local) {
          // Your own camera → self PiP
          if (track.kind === "video") attachTrack(selfVideoRef.current, track);
        } else {
          // AI / remote participant
          if (track.kind === "video") attachTrack(aiVideoRef.current, track);
          if (track.kind === "audio" && aiAudioRef.current) {
            if (!aiAudioRef.current.srcObject) {
              aiAudioRef.current.srcObject = new MediaStream([track]);
            } else {
              const ms = aiAudioRef.current.srcObject as MediaStream;
              ms.getAudioTracks().forEach(t => ms.removeTrack(t));
              ms.addTrack(track);
            }
            aiAudioRef.current.play().catch(() => {});
          }
        }
      });

      // Also handle participant-updated (sometimes tracks arrive here)
      call.on("participant-updated", (event: any) => {
        const p = event?.participant;
        if (!p) return;
        const vt = p.tracks?.video?.persistentTrack;
        const at = p.tracks?.audio?.persistentTrack;
        if (p.local) {
          if (vt) attachTrack(selfVideoRef.current, vt);
        } else {
          if (vt) attachTrack(aiVideoRef.current, vt);
          if (at && aiAudioRef.current) {
            if (!aiAudioRef.current.srcObject) {
              aiAudioRef.current.srcObject = new MediaStream([at]);
            }
            aiAudioRef.current.play().catch(() => {});
          }
        }
      });

      call.on("joined-meeting", () => {
        setCallState("connected");
        const parts = call.participants();
        setParticipantCount(Object.keys(parts).length);

        // Attach local video immediately on join
        const local = parts.local;
        const vt = local?.tracks?.video?.persistentTrack;
        if (vt) attachTrack(selfVideoRef.current, vt);
      });

      call.on("participant-joined",  () => setParticipantCount(Object.keys(call.participants()).length));
      call.on("participant-left",    () => setParticipantCount(Object.keys(call.participants()).length));

      call.on("left-meeting", () => { setCallState("connecting"); onCallEnded(); });
      call.on("error",        () => setCallState("error"));

      call.on("network-quality-change" as any, (ev: any) =>
        setNetworkQuality(ev?.quality === "good" ? "good" : "poor")
      );

      call.on("app-message" as any, (ev: any) => {
        if (ev?.data?.type === "perception_update")
          onPerceptionUpdate(ev.data.payload as PerceptionUpdate);
      });

      await call.join({ url: conversationUrl });

    } catch (err) {
      console.error("[Tavus] initCall failed:", err);
      setCallState("error");
    }
  }, [conversationUrl, onCallEnded, onPerceptionUpdate]);

  // ── Boot sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const deviceId = await requestCameraAccess();
      if (!cancelled) await initCall(deviceId);
    })();
    return () => {
      cancelled = true;
      callRef.current?.destroy();
      callRef.current = null;
    };
  }, [requestCameraAccess, initCall]);

  // ── Camera switch (mid-call) ──────────────────────────────────────────
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setShowDevicePicker(false);
    try { await callRef.current?.setInputDevicesAsync({ videoDeviceId: deviceId }); }
    catch (e) { console.warn("[Camera] switch failed:", e); }
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────
  const toggleMute  = () => {
    if (!callRef.current) return;
    callRef.current.setLocalAudio(isMuted);       // isMuted==true → re-enable
    setIsMuted(m => !m);
  };
  const toggleVideo = () => {
    // Don't allow turning on video if parent disabled it (limit reached)
    if (!isVideoEnabled) return;
    if (!callRef.current) return;
    callRef.current.setLocalVideo(!isVideoOn);
    setIsVideoOn(v => !v);
  };
  const endCall  = () => callRef.current?.leave();
  const retryCall = () => {
    callRef.current?.destroy();
    callRef.current = null;
    setCallState("connecting");
    initCall(selectedDeviceId);
  };

  const hasAlert = isDistracted || multipleFaces;

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative",
      borderRadius: 16, overflow: "hidden",
      background: "#000",
      border: `1px solid ${hasAlert ? "rgba(255,75,110,0.6)" : "var(--border-subtle)"}`,
      transition: "border-color 0.3s ease",
      boxShadow: hasAlert ? "0 0 30px rgba(255,75,110,0.2)" : "none",
    }}>

      {/* ── AI / remote video (full size) ───────────────────────────── */}
      <video
        ref={aiVideoRef}
        autoPlay
        playsInline
        style={{
          width: "100%", height: "100%",
          objectFit: "cover",
          display: callState === "connected" && isVideoEnabled ? "block" : "none",
        }}
      />

      {/* ── Fallback when video is disabled ───────────────────────────── */}
      {!isVideoEnabled && callState === "connected" && (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "var(--bg-secondary)",
          gap: 16,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
          }}>🤖</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 15 }}>
            AI Interviewer
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 280, textAlign: "center", lineHeight: 1.6 }}>
            Video minutes exhausted. Continuing with audio-only mode.
          </p>
        </div>
      )}

      {/* ── Hidden audio element for AI voice ───────────────────────── */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={aiAudioRef} autoPlay style={{ display: "none" }} />

      {/* ── Self PiP (your webcam) ───────────────────────────────────── */}
      <video
        ref={selfVideoRef}
        autoPlay
        playsInline
        muted                     // mute self to prevent echo
        style={{
          position: "absolute",
          bottom: 64, right: 12,
          width: 140, height: 90,
          borderRadius: 10,
          objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.25)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          display: callState === "connected" && isVideoEnabled ? "block" : "none",
          transform: "scaleX(-1)",   // mirror effect for selfie feel
        }}
      />
      {/* "YOU" label on PiP */}
      {callState === "connected" && (
        <div style={{
          position: "absolute", bottom: 64 + 90 - 20, right: 12,
          background: "rgba(0,0,0,0.55)", borderRadius: "0 0 0 6px",
          padding: "2px 6px",
          width: 140,
          textAlign: "center",
        }}>
          <span style={{ color: "white", fontSize: 9, fontWeight: 700, letterSpacing: "0.8px" }}>YOU</span>
        </div>
      )}

      {/* ── Connecting overlay ───────────────────────────────────────── */}
      {callState === "connecting" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "var(--bg-secondary)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 20, zIndex: 10,
        }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "glow-pulse 2s ease-in-out infinite", fontSize: 36,
            }}>🤖</div>
            {[1, 2].map(i => (
              <div key={i} style={{
                position: "absolute", inset: -i * 16, borderRadius: "50%",
                border: "2px solid rgba(108,99,255,0.3)",
                animation: `pulse-ring ${1 + i * 0.4}s ease-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 16 }}>
              {camPermission === "pending"
                ? "Requesting camera access…"
                : "Connecting to your AI interviewer…"}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 6 }}>
              {camPermission === "granted"
                ? `📷 ${videoDevices.length} camera${videoDevices.length !== 1 ? "s" : ""} detected · Tavus CVI`
                : "Please allow camera & microphone access in your browser"}
            </p>
          </div>
        </div>
      )}

      {/* ── Error overlay ────────────────────────────────────────────── */}
      {callState === "error" && (
        <div style={{
          position: "absolute", inset: 0, background: "var(--bg-secondary)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 16, padding: 24, zIndex: 10,
        }}>
          <WifiOff size={44} color="var(--accent-danger)" />
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 15 }}>
            Connection failed
          </p>
          {camPermission === "denied" && (
            <p style={{ color: "var(--accent-warning)", fontSize: 12, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
              Camera access was denied. Click the 🔒 icon in your browser address bar to allow it, then retry.
            </p>
          )}
          <button onClick={retryCall} className="btn-ghost" style={{ fontSize: 13 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Proctoring banner ────────────────────────────────────────── */}
      {hasAlert && callState === "connected" && (
        <div style={{
          position: "absolute", top: 12, left: 12, right: 12,
          background: multipleFaces ? "rgba(255,75,110,0.9)" : "rgba(247,201,72,0.9)",
          backdropFilter: "blur(8px)", borderRadius: 10,
          padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8, zIndex: 20,
        }}>
          {multipleFaces ? <EyeOff size={14} color="white" /> : <Eye size={14} color="white" />}
          <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>
            {multipleFaces
              ? "Multiple faces detected — please continue privately"
              : "Gaze distraction detected — please focus on the screen"}
          </span>
        </div>
      )}

      {/* ── Bottom control bar ───────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "10px 14px",
        background: "linear-gradient(to top, rgba(10,11,15,0.97) 60%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, zIndex: 15,
      }}>
        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: callState === "connected" ? "var(--accent-success)" : "var(--accent-warning)",
            boxShadow: callState === "connected"
              ? "0 0 6px var(--accent-success)" : "0 0 6px var(--accent-warning)",
          }} />
          <span style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}>
            {callState === "connected" ? "LIVE" : "CONNECTING"}
          </span>
          {networkQuality === "good"
            ? <Wifi size={12} color="var(--accent-success)" />
            : <WifiOff size={12} color="var(--text-muted)" />}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Mute */}
          <button id="btn-mute" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"} style={{
            width: 38, height: 38, borderRadius: "50%",
            background: isMuted ? "rgba(255,75,110,0.25)" : "rgba(255,255,255,0.1)",
            border:  `1px solid ${isMuted ? "rgba(255,75,110,0.5)" : "rgba(255,255,255,0.15)"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
          }}>
            {isMuted ? <MicOff size={15} color="var(--accent-danger)" /> : <Mic size={15} color="white" />}
          </button>

          {/* Video */}
          <button 
            id="btn-video" 
            onClick={toggleVideo} 
            disabled={!isVideoEnabled}
            title={!isVideoEnabled ? "Video limit reached - upgrade to continue" : (isVideoOn ? "Turn off camera" : "Turn on camera")} 
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: !isVideoEnabled ? "rgba(128,128,128,0.3)" : (!isVideoOn ? "rgba(255,75,110,0.25)" : "rgba(255,255,255,0.1)"),
              border: `1px solid ${!isVideoEnabled ? "rgba(128,128,128,0.5)" : (!isVideoOn ? "rgba(255,75,110,0.5)" : "rgba(255,255,255,0.15)")}`,
              cursor: !isVideoEnabled ? "not-allowed" : "pointer", 
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
              opacity: !isVideoEnabled ? 0.5 : 1,
            }}
          >
            {!isVideoEnabled ? <VideoOff size={15} color="gray" /> : (isVideoOn ? <Video size={15} color="white" /> : <VideoOff size={15} color="var(--accent-danger)" />)}
          </button>

          {/* Camera switcher */}
          {videoDevices.length > 1 && (
            <div style={{ position: "relative" }}>
              <button id="btn-camera-switch" onClick={() => setShowDevicePicker(v => !v)} title="Switch camera" style={{
                width: 38, height: 38, borderRadius: "50%",
                background: showDevicePicker ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.1)",
                border: `1px solid ${showDevicePicker ? "rgba(108,99,255,0.6)" : "rgba(255,255,255,0.15)"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s ease",
              }}>
                <Camera size={15} color={showDevicePicker ? "var(--accent-primary)" : "white"} />
              </button>
              {showDevicePicker && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-accent)",
                  borderRadius: 12, padding: "6px", minWidth: 230,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)", zIndex: 50,
                  animation: "slide-up 0.15s ease-out",
                }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", padding: "6px 8px 4px" }}>
                    Select Camera
                  </p>
                  {videoDevices.map(device => {
                    const active = selectedDeviceId === device.deviceId;
                    return (
                      <button key={device.deviceId} onClick={() => switchCamera(device.deviceId)} style={{
                        width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, marginBottom: 2,
                        background: active ? "rgba(108,99,255,0.15)" : "transparent",
                        border: `1px solid ${active ? "rgba(108,99,255,0.35)" : "transparent"}`,
                        color: active ? "var(--accent-primary)" : "var(--text-secondary)",
                        fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        transition: "all 0.15s ease",
                      }}>
                        <Camera size={11} />
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {device.label}
                        </span>
                        {active && <span style={{ fontSize: 10, color: "var(--accent-success)", fontWeight: 700 }}>● Active</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* End call */}
          <button id="btn-end-call" onClick={endCall} title="End call" style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "var(--accent-danger)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(255,75,110,0.45)",
            transition: "all 0.2s ease",
          }}>
            <PhoneOff size={17} color="white" />
          </button>
        </div>

        {/* Right: cam + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {camPermission === "granted" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-success)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600 }}>CAM</span>
            </div>
          )}
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
