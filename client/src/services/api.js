import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

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

export async function apiRequest(path, token, options = {}) {
  const attempt = async (authToken) => fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let authToken = await resolveToken(token);
  let response = await attempt(authToken);

  if (response.status === 401 && auth.currentUser) {
    authToken = await auth.currentUser.getIdToken(true);
    response = await attempt(authToken);
  }

  if (response.status === 401) {
    const error = new Error("Session expired");
    error.code = "AUTH_EXPIRED";
    throw error;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || error.message || "Request failed");
  }

  return response.json();
}

export { API_URL };
