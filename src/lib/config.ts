export function isGitHubEnabled(): boolean {
  return Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
}

export function isDemoEnabled(): boolean {
  return process.env.DEMO_MODE_ENABLED !== "false";
}
