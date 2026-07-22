/**
 * Auth token utility — stores the JWT in a cookie so it's
 * accessible to both JS and can be forwarded by the browser.
 * HttpOnly cookies set by the backend take priority; this is
 * for the client-side read and the OAuth redirect callback.
 */

const TOKEN_KEY = "auth_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export function setToken(token: string) {
  // Store in a JS-accessible cookie (same name as backend HttpOnly cookie
  // but readable on client for redirect purposes)
  const expires = new Date(Date.now() + 15 * 60 * 1000).toUTCString(); // Access token lives 15m
  document.cookie = `${TOKEN_KEY}=${token}; expires=${expires}; path=/; SameSite=Lax`;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? getCookieValue(TOKEN_KEY);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Wrapper around native fetch that automatically injects the access token
 * and handles 401s by attempting to refresh the token via the backend.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Ensure credentials are included so the HttpOnly refresh token cookie is sent
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  let response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    // Attempt to refresh
    try {
      const refreshResponse = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // this sends the refresh_token cookie
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        if (data.accessToken) {
          setToken(data.accessToken);
          // Retry original request with new token
          headers.set("Authorization", `Bearer ${data.accessToken}`);
          response = await fetch(url, { ...fetchOptions, headers });
        }
      } else {
        // Refresh failed (e.g. token expired/invalid/missing)
        clearToken();
      }
    } catch (err) {
      console.error("Token refresh failed", err);
      clearToken();
    }
  }

  return response;
}
