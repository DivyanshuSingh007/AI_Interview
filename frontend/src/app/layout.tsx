import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "InterviewAI — AI-Powered Technical Interview Simulator",
  description:
    "Practice technical interviews with an AI that sees you in real-time, reads your code, and adapts to your performance. Powered by Tavus Raven-1, Gemini AI, and Monaco Editor.",
  keywords: ["AI interview", "technical interview", "coding interview", "Tavus", "Next.js"],
  openGraph: {
    title: "InterviewAI — The Most Realistic AI Interview Experience",
    description:
      "An AI interviewer that sees you, reads your code, and gives you real-time performance scores.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
