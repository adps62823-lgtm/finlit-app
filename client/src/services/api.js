import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const BACKEND_BASE = API_URL.replace(/\/api$/, "");

async function resolveToken(token) {
  if (token) return token;
  const currentUser = auth.currentUser;
  if (!currentUser) {
    const error = new Error("Session expired");
    error.code = "AUTH_EXPIRED";
    throw error;
  }
  return currentUser.getIdToken();
}

function abortableFetch(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

export async function apiRequest(path, token, options = {}) {
  const makeAttempt = (authToken) =>
    abortableFetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        },
      },
      20000 // 20-second hard timeout per request
    );

  let authToken = await resolveToken(token);
  let response;

  try {
    response = await makeAttempt(authToken);
  } catch {
    // One retry after a short delay (catches backends that finish cold-starting
    // mid-request — health check passed, but the first real call still timed out)
    await new Promise((r) => setTimeout(r, 3000));
    try {
      response = await makeAttempt(authToken);
    } catch {
      const networkError = new Error(
        "Server is unavailable. It may still be starting up — please wait a moment and try again."
      );
      networkError.code = "NETWORK_ERROR";
      throw networkError;
    }
  }

  if (response.status === 401 && auth.currentUser) {
    authToken = await auth.currentUser.getIdToken(true);
    response = await makeAttempt(authToken);
  }

  if (response.status === 401) {
    const error = new Error("Session expired");
    error.code = "AUTH_EXPIRED";
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || errorBody.message || "Request failed");
  }

  return response.json();
}

/**
 * Ping /health once. Returns true if the backend is reachable, false otherwise.
 * Used by wakeUpBackend() in App.jsx to poll until the Render instance is warm.
 */
export async function pingBackend() {
  try {
    const res = await abortableFetch(`${BACKEND_BASE}/health`, {}, 8000);
    return res.ok;
  } catch {
    return false;
  }
}

export { API_URL };