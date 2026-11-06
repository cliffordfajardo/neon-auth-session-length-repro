// Shows that a Managed Neon Auth session always lasts 7 days, and that
// nothing a client sends can make it longer.
//
// Usage: NEON_AUTH_URL=https://<endpoint>.neonauth.<region>.aws.neon.tech/neondb/auth node repro.mjs

const AUTH_URL = process.env.NEON_AUTH_URL;
if (!AUTH_URL) throw new Error("Set NEON_AUTH_URL (Neon Console → Auth → Configuration)");

const ORIGIN = "http://localhost:3000"; // Neon Auth accepts localhost by default
const DAY = 24 * 60 * 60;
const email = `session-repro+${Date.now()}@example.com`;
const password = crypto.randomUUID();

async function call(path, body, cookie) {
  const res = await fetch(`${AUTH_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      origin: ORIGIN,
      "content-type": "application/json",
      ...(cookie && { cookie }),
    },
    body: body && JSON.stringify(body),
  });
  const cookies = res.headers.getSetCookie();
  const setCookie = cookies.find((c) => c.includes("session_token="));
  return {
    status: res.status,
    json: await res.json().catch(() => null),
    cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    maxAge: Number(setCookie?.match(/Max-Age=(\d+)/i)?.[1]),
  };
}

async function sessionDays(cookie) {
  // disableRefresh: read the stored expiry without sliding it forward
  const { json } = await call("/get-session?disableRefresh=true", undefined, cookie);
  return ((new Date(json.session.expiresAt) - Date.now()) / 1000 / DAY).toFixed(2);
}

console.log("1. Sign up a throwaway user");
const signUp = await call("/sign-up/email", { email, password, name: "Session repro" });
console.log("   status:", signUp.status);
console.log("   session_token cookie Max-Age:", signUp.maxAge, `(${signUp.maxAge / DAY} days)`);
console.log("   session expires in:", await sessionDays(signUp.cookie), "days");

console.log("\n2. Sign in and ask for 30 days (Better Auth has no such request field, so it is ignored)");
const asked = await call("/sign-in/email", { email, password, rememberMe: true, expiresIn: 30 * DAY });
console.log("   session_token cookie Max-Age:", asked.maxAge, `(${asked.maxAge / DAY} days)`);
console.log("   session expires in:", await sessionDays(asked.cookie), "days");

console.log("\n3. Try to push expiresAt out with /update-session (core fields are not accepted)");
const later = new Date(Date.now() + 30 * DAY * 1000).toISOString();
const update = await call("/update-session", { expiresAt: later }, asked.cookie);
console.log("   status:", update.status, JSON.stringify(update.json));
console.log("   session expires in:", await sessionDays(asked.cookie), "days");

console.log("\n4. rememberMe: false is the only lever, and it only makes sessions shorter");
const short = await call("/sign-in/email", { email, password, rememberMe: false });
console.log("   session expires in:", await sessionDays(short.cookie), "days");

console.log("\nResult: sessions are capped at 7 days. Neon exposes no session.expiresIn setting");
console.log("(API, CLI, Console or MCP), so an app cannot keep users signed in longer.");
