// Talks to the GEOVANT backend. Frontend-only code: no database access here.

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/$/,
  ""
);

const KEYS = {
  access: "geovantAccessToken",
  refresh: "geovantRefreshToken",
  user: "geovantUser",
};

const SESSION_EXPIRED = "Your session has expired. Please log in again.";

// ---------- Session storage ----------

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode or full): the session lasts until reload
  }
}

const listeners = new Set();

function notify() {
  const user = getStoredUser();
  listeners.forEach((callback) => callback(user));
}

export function getStoredUser() {
  try {
    return JSON.parse(read(KEYS.user));
  } catch {
    return null;
  }
}

export function getRefreshToken() {
  return read(KEYS.refresh);
}

export function updateStoredUser(user) {
  write(KEYS.user, JSON.stringify(user));
}

export function saveSession({ user, access_token, refresh_token }) {
  write(KEYS.access, access_token);
  write(KEYS.refresh, refresh_token);
  write(KEYS.user, JSON.stringify(user));
  notify();
}

export function clearSession() {
  write(KEYS.access, null);
  write(KEYS.refresh, null);
  write(KEYS.user, null);
  notify();
}

/** Calls callback(user | null) whenever the user signs in or out. Returns an unsubscribe function. */
export function onSessionChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ---------- Token refresh ----------

let refreshing = null;

// Resolves to "ok", "invalid" (log in again) or "network" (try again later)
function refreshTokens() {
  const refreshToken = read(KEYS.refresh);
  if (!refreshToken) return Promise.resolve("invalid");

  if (!refreshing) {
    refreshing = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) return response.status >= 500 ? "network" : "invalid";

        const session = await response.json();
        write(KEYS.access, session.access_token);
        write(KEYS.refresh, session.refresh_token);
        write(KEYS.user, JSON.stringify(session.user));
        return "ok";
      } catch {
        return "network";
      } finally {
        refreshing = null;
      }
    })();
  }

  return refreshing;
}

// ---------- Requests ----------

async function send(path, options, auth) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (auth) {
    const token = read(KEYS.access);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    return await fetch(`${API_URL}/api${path}`, { ...options, headers });
  } catch {
    throw new Error(
      "Cannot reach the server. Check your internet connection and try again."
    );
  }
}

export async function request(path, options = {}, { auth = true } = {}) {
  let response = await send(path, options, auth);

  // Access token expired: get a new one and retry once
  if (response.status === 401 && auth) {
    const result = await refreshTokens();

    if (result === "ok") {
      response = await send(path, options, auth);
    } else if (result === "network") {
      throw new Error(
        "Cannot reach the server. Check your internet connection and try again."
      );
    }

    if (result === "invalid" || response.status === 401) {
      clearSession();
      const error = new Error(SESSION_EXPIRED);
      error.status = 401;
      throw error;
    }
  }

  const body =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.error || `Request failed (${response.status})`);
    error.code = body?.code;
    error.status = response.status;
    throw error;
  }

  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: "DELETE" }),
};
