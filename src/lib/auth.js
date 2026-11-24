import {
  api,
  clearSession,
  getRefreshToken,
  getStoredUser,
  onSessionChange,
  request,
  saveSession,
  updateStoredUser,
} from "./api";

/** Creates a business and its owner account, then signs in. */
export async function signUp({ fullName, businessName, email, password }) {
  const session = await request(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName,
        business_name: businessName,
        email,
        password,
      }),
    },
    { auth: false }
  );

  saveSession(session);
  return session.user;
}

export async function signIn(email, password) {
  const session = await request(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    { auth: false }
  );

  saveSession(session);
  return session.user;
}

export async function signOut() {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await request(
        "/auth/logout",
        { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
        { auth: false }
      );
    }
  } catch {
    // Even if the server is unreachable, sign out on this device
  } finally {
    clearSession();
  }
}

/** The signed-in user saved on this device, or null. */
export function getCurrentUser() {
  return getStoredUser();
}

/**
 * Called once when the app opens. Confirms the saved login is still valid.
 * Returns the user, or null if they need to log in. If the server cannot be
 * reached, the saved user is kept so a reload does not log anyone out.
 */
export async function restoreSession() {
  const stored = getStoredUser();
  if (!stored) return null;

  try {
    const user = await api.get("/auth/me");
    updateStoredUser(user);
    return user;
  } catch (error) {
    if (error.status === 401) return null;
    return stored;
  }
}

export { onSessionChange as onAuthChange };
