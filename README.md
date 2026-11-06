# Managed Neon Auth: session length is fixed at 7 days

My app's users often go weeks without opening it, so they need to stay signed in longer than 7 days. Managed Neon Auth sessions always expire after 7 days without use, and there is no way to change that. **Ask:** let us set the session length (Better Auth's `session.expiresIn`), for example to 30 days.

## Run it

One file, no dependencies, Node 22+.

```sh
NEON_AUTH_URL=https://<endpoint>.neonauth.<region>.aws.neon.tech/neondb/auth node repro.mjs
```

Use a throwaway branch: the script signs up a test user. `NEON_AUTH_URL` is the Auth URL in Neon Console → Auth → Configuration.

## What it shows

Real output against Managed Neon Auth (Better Auth 1.7.16), also in [`output.txt`](output.txt):

```text
1. Sign up a throwaway user
   status: 200
   session_token cookie Max-Age: 604800 (7 days)
   session expires in: 7.00 days

2. Sign in and ask for 30 days (Better Auth has no such request field, so it is ignored)
   session_token cookie Max-Age: 604800 (7 days)
   session expires in: 7.00 days

3. Try to push expiresAt out with /update-session (core fields are not accepted)
   status: 400 {"message":"No fields to update"}
   session expires in: 7.00 days

4. rememberMe: false is the only lever, and it only makes sessions shorter
   session expires in: 1.00 days
```

The Neon API, CLI, Console and MCP tools have no session setting either. The auth config update only accepts `name` ([`types.gen.ts`](https://github.com/neondatabase/neon-pkgs/blob/8e45ff1e6548964308010e0218257141c53e0d47/packages/sdk/src/client/types.gen.ts#L3909-L3914)). In Better Auth the length comes only from server config ([`internal-adapter.ts#L66`](https://github.com/better-auth/better-auth/blob/93edae16ebae910f57df360d0f43c2dcfa9f8c20/packages/better-auth/src/db/internal-adapter.ts#L66)).

## Proposed API

See [`ideal-api.ts`](ideal-api.ts). In short:

```text
PATCH /projects/{project_id}/branches/{branch_id}/auth/session
{ "expires_in": 2592000, "update_age": 86400 }

neon neon-auth config session update --expires-in 30d --update-age 1d
```

Neon already exposes similar settings, such as `magic_link.expires_in` and `phone_number.otp_expires_in`.

## Why it matters

A race-planning app: runners plan a race, don't open the app for a few weeks, then open it on race day with poor signal and have to sign in again at the start line. Background refresh doesn't help, because iOS rarely runs background tasks for apps people seldom open.
