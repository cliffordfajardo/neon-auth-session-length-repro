// PROPOSED API (pseudocode). None of this exists today.
//
// Better Auth already supports these two server options:
//   session.expiresIn  how long a session lasts (default 7 days)
//   session.updateAge  how often use pushes the expiry forward (default 1 day)
// Managed Neon Auth just needs to let us set them, per branch,
// the same way it already exposes magic_link.expires_in and phone_number.otp_expires_in.

// 1. Neon API
//    PATCH /projects/{project_id}/branches/{branch_id}/auth/session
//    { "expires_in": 2592000, "update_age": 86400 }   // 30 days, refresh daily

// 2. Neon CLI
//    neon neon-auth config session update --expires-in 30d --update-age 1d

// 3. Neon SDK (@neon/sdk)
await neon.updateNeonAuthSessionConfig({
  projectId,
  branchId,
  expires_in: 30 * 24 * 60 * 60,
  update_age: 24 * 60 * 60,
});

// 4. Console
//    Auth → Configuration → Sessions → "Session length: 30 days"

// What Neon would pass to Better Auth on its side:
betterAuth({
  session: {
    expiresIn: config.expires_in, // 30 days
    updateAge: config.update_age, // 1 day
  },
});

// After the change, repro.mjs step 1 would print:
//   session_token cookie Max-Age: 2592000 (30 days)
//   session expires in: 30.00 days
