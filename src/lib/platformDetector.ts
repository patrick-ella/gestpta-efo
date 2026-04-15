export interface PlatformConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  bgClass: string;
  domains: string[];
}

export const PLATFORMS: PlatformConfig[] = [
  { key: "facebook", label: "Facebook", icon: "📘", color: "hsl(214, 89%, 52%)", bgClass: "bg-blue-50 dark:bg-blue-950/30", domains: ["facebook.com", "fb.com", "fb.watch"] },
  { key: "instagram", label: "Instagram", icon: "📸", color: "hsl(340, 75%, 54%)", bgClass: "bg-pink-50 dark:bg-pink-950/30", domains: ["instagram.com", "instagr.am"] },
  { key: "tiktok", label: "TikTok", icon: "🎵", color: "hsl(0, 0%, 4%)", bgClass: "bg-gray-50 dark:bg-gray-800/30", domains: ["tiktok.com", "vm.tiktok.com"] },
  { key: "linkedin", label: "LinkedIn", icon: "💼", color: "hsl(210, 87%, 40%)", bgClass: "bg-blue-50 dark:bg-blue-950/30", domains: ["linkedin.com", "lnkd.in"] },
  { key: "youtube", label: "YouTube", icon: "▶️", color: "hsl(0, 100%, 50%)", bgClass: "bg-red-50 dark:bg-red-950/30", domains: ["youtube.com", "youtu.be", "m.youtube.com"] },
  { key: "twitter", label: "X (Twitter)", icon: "🐦", color: "hsl(0, 0%, 0%)", bgClass: "bg-gray-50 dark:bg-gray-800/30", domains: ["twitter.com", "x.com", "t.co"] },
  { key: "whatsapp", label: "WhatsApp", icon: "💬", color: "hsl(142, 70%, 49%)", bgClass: "bg-green-50 dark:bg-green-950/30", domains: ["whatsapp.com", "wa.me"] },
  { key: "web", label: "Site web", icon: "🌐", color: "hsl(var(--muted-foreground))", bgClass: "bg-muted/30", domains: [] },
];

const webFallback = PLATFORMS.find((p) => p.key === "web")!;

export function detectPlatform(url: string): PlatformConfig {
  if (!url) return webFallback;
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    for (const platform of PLATFORMS) {
      if (platform.domains.some((d) => hostname === d || hostname.endsWith("." + d))) {
        return platform;
      }
    }
  } catch {
    // invalid URL
  }
  return webFallback;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
}
