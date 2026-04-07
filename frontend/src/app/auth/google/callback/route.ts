import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    // Exchange code for tokens via backend
    const tokenResponse = await fetch(`${API_URL}/auth/google/callback?code=${code}`, {
      method: "GET",
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
    }

    // The backend will handle the OAuth flow and return a redirect with the token
    // Since we're calling the backend callback, we need to get the token from the response
    const data = await tokenResponse.json();
    
    if (data.access_token) {
      // Redirect to frontend with token
      return NextResponse.redirect(new URL(`/?token=${data.access_token}`, request.url));
    } else if (data.url) {
      // Backend returns a redirect URL
      return NextResponse.redirect(data.url);
    } else {
      return NextResponse.redirect(new URL("/?error=no_token", request.url));
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=callback_failed", request.url));
  }
}
