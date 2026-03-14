export function useAppUrl() {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  return {
    baseUrl,
    shareUrl: (path: string) => `${baseUrl}${path}`,
    referralUrl: (code: string) => `${baseUrl}/wealth-score?ref=${code}`,
    inviteUrl: (code: string) => `${baseUrl}/join-family?code=${code}`,
  };
}

/** Non-hook version for use outside components */
export function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin;
}
