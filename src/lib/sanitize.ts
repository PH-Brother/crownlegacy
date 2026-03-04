const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const ALLOWED_MIMES = Object.keys(MIME_TO_EXT);

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIMES.includes(mime);
}

export function safeStoragePath(userId: string, mime: string): string {
  const ext = MIME_TO_EXT[mime] || "bin";
  const uuid = crypto.randomUUID();
  return `${userId}/${Date.now()}-${uuid}.${ext}`;
}
