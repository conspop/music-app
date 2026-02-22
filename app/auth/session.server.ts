import { createCookieSessionStorage } from "react-router";

const USER_ID_KEY = "userId";
const STATE_KEY = "oauth_state";

export function createSessionStorage(secret: string) {
  const storage = createCookieSessionStorage({
    cookie: {
      name: "__session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [secret],
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });

  async function getSession(request: Request) {
    return storage.getSession(request.headers.get("Cookie"));
  }

  async function getUserId(request: Request): Promise<string | null> {
    const session = await getSession(request);
    const userId = session.get(USER_ID_KEY);
    return typeof userId === "string" ? userId : null;
  }

  async function setUserId(request: Request, userId: string) {
    const session = await getSession(request);
    session.set(USER_ID_KEY, userId);
    return storage.commitSession(session);
  }

  async function getOAuthState(request: Request): Promise<string | null> {
    const session = await getSession(request);
    const state = session.get(STATE_KEY);
    return typeof state === "string" ? state : null;
  }

  async function setOAuthState(request: Request, state: string) {
    const session = await getSession(request);
    session.set(STATE_KEY, state);
    return storage.commitSession(session);
  }

  async function destroy(request: Request) {
    const session = await getSession(request);
    return storage.destroySession(session);
  }

  return {
    getSession,
    getUserId,
    setUserId,
    getOAuthState,
    setOAuthState,
    destroy,
    commitSession: storage.commitSession.bind(storage),
  };
}
