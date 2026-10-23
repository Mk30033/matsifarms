export const AUTH_EMAIL_DOMAIN = "matsifarms.local";

/**
 * Usernames are the only credential shown to users. Each maps to a
 * deterministic synthetic auth email (these addresses cannot receive mail —
 * password resets are done by an admin from the Admin Dashboard).
 */
export function usernameToEmail(username: string): string {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${slug || "user"}@${AUTH_EMAIL_DOMAIN}`;
}
