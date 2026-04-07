"use client";

import React, { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle, Loader2, X } from "lucide-react";

interface ResumeUploaderProps {
  onUpload: (file: File, text: string) => void;
  isLoading?: boolean;
}

export function ResumeUploader({ onUpload, isLoading = false }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
        setError("Only PDF or TXT files are supported.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be under 5 MB.");
        return;
      }

      setUploadedFile(file);

      // Read as text for .txt, send to backend for .pdf
      if (file.name.endsWith(".txt")) {
        const text = await file.text();
        onUpload(file, text);
      } else {
        // For PDF, send to FastAPI backend for extraction
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/parse-resume`,
            { method: "POST", body: formData }
          );
          if (!res.ok) throw new Error("Backend parse failed");
          const data = await res.json();
          onUpload(file, data.text ?? "");
        } catch {
          // Fallback: use file as-is, backend will handle
          onUpload(file, "");
        }
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full">
      <label
        htmlFor="resume-upload"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          display: "block",
          border: `2px dashed ${isDragging ? "var(--accent-primary)" : uploadedFile ? "var(--accent-success)" : "var(--border-subtle)"}`,
          borderRadius: "16px",
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          background: isDragging
            ? "rgba(108,99,255,0.06)"
            : uploadedFile
            ? "rgba(67,217,138,0.04)"
            : "var(--bg-elevated)",
          position: "relative",
        }}
      >
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.txt"
          onChange={onInputChange}
          style={{ display: "none" }}
          disabled={isLoading}
        />

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Loader2 size={40} color="var(--accent-primary)" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Parsing resume with Gemini AI...</p>
          </div>
        ) : uploadedFile ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <CheckCircle size={44} color="var(--accent-success)" />
            <div>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 15 }}>{uploadedFile.name}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
                {(uploadedFile.size / 1024).toFixed(1)} KB · Click to change
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setUploadedFile(null); }}
              style={{
                position: "absolute", top: 12, right: 12,
                background: "rgba(255,75,110,0.1)", border: "none", borderRadius: "50%",
                width: 28, height: 28, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={14} color="var(--accent-danger)" />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(108,99,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isDragging ? (
                <FileText size={28} color="var(--accent-primary)" />
              ) : (
                <Upload size={28} color="var(--accent-primary)" />
              )}
            </div>
            <div>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 15 }}>
                {isDragging ? "Drop your resume here" : "Upload your resume"}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
                Drag & drop or click · PDF or TXT · Max 5 MB
              </p>
            </div>
          </div>
        )}
      </label>

      {error && (
        <p style={{ color: "var(--accent-danger)", fontSize: 13, marginTop: 8, textAlign: "center" }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
