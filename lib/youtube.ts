/**
 * Extract the 11-char video ID from any common YouTube URL shape.
 * Returns null if the input isn't a recognizable YouTube URL.
 *
 * Handles:
 *   https://www.youtube.com/watch?v=XXXXXXXXXXX
 *   https://youtu.be/XXXXXXXXXXX
 *   https://www.youtube.com/embed/XXXXXXXXXXX
 *   https://m.youtube.com/watch?v=XXXXXXXXXXX
 *   https://www.youtube.com/shorts/XXXXXXXXXXX
 *   https://www.youtube.com/live/XXXXXXXXXXX
 *   Bare 11-char ID
 */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

/** Privacy-enhanced embed URL (won't set cookies until the user actually plays). */
export function youtubeEmbedSrc(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0`;
}

/** Lightweight thumbnail URL for cards (mqdefault is universally available). */
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
