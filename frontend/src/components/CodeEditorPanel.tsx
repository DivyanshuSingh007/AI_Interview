"use client";

import React, { useState, useRef } from "react";
import { Play, Loader2, ChevronDown } from "lucide-react";
import { CodeExecutionResult } from "@/types/interview";

const SUPPORTED_LANGUAGES = [
  { id: "javascript", label: "JavaScript", monacoId: "javascript", judge0Id: 63 },
  { id: "python",     label: "Python 3",   monacoId: "python",     judge0Id: 71 },
  { id: "typescript", label: "TypeScript",  monacoId: "typescript", judge0Id: 74 },
  { id: "java",       label: "Java",        monacoId: "java",       judge0Id: 62 },
  { id: "cpp",        label: "C++",         monacoId: "cpp",        judge0Id: 54 },
  { id: "go",         label: "Go",          monacoId: "go",         judge0Id: 60 },
];

const STARTER_CODE: Record<string, string> = {
  javascript: `// Two Sum - Return indices of two numbers that add to target
function twoSum(nums, target) {
  // Your solution here
  
}

// Test
console.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]
`,
  python: `# Two Sum - Return indices of two numbers that add to target
def two_sum(nums: list[int], target: int) -> list[int]:
    # Your solution here
    pass

# Test
print(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]
`,
  typescript: `// Two Sum - Return indices of two numbers that add to target
function twoSum(nums: number[], target: number): number[] {
  // Your solution here
  return [];
}

// Test
console.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]
`,
  java: `import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your solution here
        return new int[]{};
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(new Solution().twoSum(new int[]{2,7,11,15}, 9)));
    }
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;
vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}
int main() {
    vector<int> nums = {2, 7, 11, 15};
    auto res = twoSum(nums, 9);
    cout << res[0] << ", " << res[1] << endl;
}`,
  go: `package main
import "fmt"
func twoSum(nums []int, target int) []int {
    // Your solution here
    return nil
}
func main() {
    fmt.Println(twoSum([]int{2, 7, 11, 15}, 9))
}`,
};

interface CodeEditorPanelProps {
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: string) => void;
  onRun: (result: CodeExecutionResult) => void;
  question?: {
    title: string;
    description: string;
    starter_code: Record<string, string>;
    difficulty: string;
    category: string;
    examples?: Array<{ input: string; output: string; explanation?: string }>;
    constraints?: string[];
    test_cases?: Array<{ input: Record<string, any>; expected: any; description: string }>;
  };
}

// Monaco is loaded dynamically to avoid SSR issues
let MonacoEditor: any = null;

export function CodeEditorPanel({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onRun,
  question,
}: CodeEditorPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<CodeExecutionResult | null>(null);
  const [monacoLoaded, setMonacoLoaded] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const editorRef = useRef<any>(null);

  // Generate starter code with problem details as comments
  const generateStarterCode = (lang: string): string => {
    if (!question) {
      return STARTER_CODE[lang] || "";
    }

    const starterCode = question.starter_code?.[lang] || "";
    if (!starterCode) {
      return STARTER_CODE[lang] || "";
    }

    // Build problem description as comments
    let header = `// ═══════════════════════════════════════════════════════════════\n`;
    header += `// ${question.title} (${question.difficulty.toUpperCase()})\n`;
    header += `// Category: ${question.category}\n`;
    header += `// ═══════════════════════════════════════════════════════════════\n\n`;
    header += `// PROBLEM DESCRIPTION:\n`;
    header += `// ${question.description}\n\n`;

    // Add examples
    if (question.examples && question.examples.length > 0) {
      header += `// EXAMPLES:\n`;
      question.examples.forEach((ex, i) => {
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
    if (question.constraints && question.constraints.length > 0) {
      header += `// CONSTRAINTS:\n`;
      question.constraints.forEach((c) => {
        header += `// • ${c}\n`;
      });
      header += `\n`;
    }

    // Add test cases info
    if (question.test_cases && question.test_cases.length > 0) {
      header += `// TEST CASES:\n`;
      question.test_cases.forEach((tc, i) => {
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

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.id === language) || SUPPORTED_LANGUAGES[0];

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    if (!MonacoEditor) setMonacoLoaded(true);
  };

  const handleLanguageChange = (langId: string) => {
    onLanguageChange(langId);
    // Generate starter code with problem details
    onCodeChange(generateStarterCode(langId));
    setShowLangMenu(false);
    setOutput(null);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/run-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            language_id: currentLang.judge0Id,
            language: language,
          }),
        }
      );

      if (!res.ok) throw new Error("Execution failed");
      const result: CodeExecutionResult = await res.json();
      setOutput(result);
      onRun(result);
    } catch (err) {
      const fallback: CodeExecutionResult = {
        stdout: "",
        stderr: "Backend not reachable. Start FastAPI server first.",
        status: "error",
      };
      setOutput(fallback);
      onRun(fallback);
    } finally {
      setIsRunning(false);
    }
  };

  // Dynamic import of Monaco to avoid SSR
  const [Editor, setEditor] = React.useState<any>(null);
  React.useEffect(() => {
    import("@monaco-editor/react").then((mod) => {
      setEditor(() => mod.default);
    });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        {/* Language picker */}
        <div style={{ position: "relative" }}>
          <button
            id="lang-picker"
            onClick={() => setShowLangMenu(!showLangMenu)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8, padding: "6px 12px",
              color: "var(--text-primary)", fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {currentLang.label}
            <ChevronDown size={12} color="var(--text-muted)" />
          </button>

          {showLangMenu && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0,
                background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 160,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "9px 14px", background: "transparent", border: "none",
                    color: lang.id === language ? "var(--accent-primary)" : "var(--text-primary)",
                    fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: lang.id === language ? 600 : 400,
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Run button */}
        <button
          id="btn-run-code"
          onClick={runCode}
          disabled={isRunning}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: isRunning
              ? "rgba(67,217,138,0.1)"
              : "linear-gradient(135deg, #43d98a, #3bc17a)",
            border: "none", borderRadius: 8, padding: "8px 18px",
            color: isRunning ? "var(--accent-success)" : "white",
            fontSize: 13, fontWeight: 600, cursor: isRunning ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: isRunning ? "none" : "0 4px 16px rgba(67,217,138,0.3)",
          }}
        >
          {isRunning ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Play size={14} />
          )}
          {isRunning ? "Running..." : "Run Code"}
        </button>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {Editor ? (
          <Editor
            height="100%"
            language={currentLang.monacoId}
            value={code}
            onChange={(val: string | undefined) => onCodeChange(val ?? "")}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              lineNumbers: "on",
              renderLineHighlight: "line",
              cursorBlinking: "smooth",
              smoothScrolling: true,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        ) : (
          <div
            style={{
              height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1e1e1e",
            }}
          >
            <Loader2 size={24} color="var(--accent-primary)" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        )}
      </div>

      {/* Output panel */}
      {output && (
        <div
          style={{
            flexShrink: 0, maxHeight: 180, overflow: "auto",
            background: "#0d0d0d",
            borderTop: "1px solid var(--border-subtle)",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: output.stderr ? "var(--accent-danger)" : "var(--accent-success)",
              }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
              Output · {output.status} {output.time ? `· ${output.time}s` : ""}
            </span>
          </div>
          <pre
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, lineHeight: 1.6,
              color: output.stderr ? "#ff7b7b" : "#43d98a",
              whiteSpace: "pre-wrap", wordBreak: "break-all",
              margin: 0,
            }}
          >
            {output.stderr || output.stdout || "(no output)"}
          </pre>
        </div>
      )}
    </div>
  );
}
