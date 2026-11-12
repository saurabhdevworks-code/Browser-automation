import React, { useEffect, useId, useState } from "react";
import { Globe2 } from "lucide-react";

interface ConnectorLogoProps {
  name: string;
  websiteUrl?: string;
  connectorId?: string;
  size?: number;
}

interface BrandSpec {
  key: string;
  patterns: RegExp[];
  fallbackDomain?: string;
  bg: string;
  fg: string;
  renderSvg: (size: number, gradId: string) => React.ReactNode;
}

function getSquircleRadius(size: number): number {
  return Math.max(5, Math.round(size * 0.28));
}

function LogoFrame({
  size,
  background,
  padding = 0,
  children
}: {
  size: number;
  background?: string;
  padding?: number;
  children: React.ReactNode;
}) {
  const radius = getSquircleRadius(size);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxSizing: "border-box",
        padding,
        background: background || "transparent",
        boxShadow: "inset 0 0 0 1px rgba(148, 163, 184, 0.24)"
      }}
    >
      {children}
    </span>
  );
}

const BRAND_SPECS: BrandSpec[] = [
  {
    key: "canva",
    patterns: [/canva/i],
    fallbackDomain: "canva.com",
    bg: "linear-gradient(135deg, #00c4cc, #7d2ae8)",
    fg: "#ffffff",
    renderSvg: (size, gradId) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00C4CC" />
            <stop offset="55%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#7D2AE8" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" fill={`url(#${gradId})`} />
        <path
          d="M15.6 14.9c-.8 1.2-2.1 2-3.7 2-2.6 0-4.4-2-4.4-4.8 0-3 2-5.2 4.8-5.2 1.8 0 3.1.8 3.6 2.1.2.5-.1 1-.6 1.1-.5.1-.9-.1-1.1-.6-.3-.6-.9-1-1.9-1-1.8 0-3 1.5-3 3.6 0 1.9 1.1 3.2 2.8 3.2 1 0 1.8-.5 2.3-1.2.3-.4.9-.5 1.3-.2.3.3.3.7-.1 1z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    key: "whatsapp",
    patterns: [/whatsapp/i],
    fallbackDomain: "whatsapp.com",
    bg: "#25D366",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#25D366" />
        <path
          d="M12 5.2a6.7 6.7 0 00-5.8 10.1L5.4 18.8l3.6-.9A6.7 6.7 0 1012 5.2z"
          stroke="#FFFFFF"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M15.4 13.7c-.2-.1-1.1-.6-1.3-.6-.2-.1-.3-.1-.4.1-.1.2-.5.6-.6.7-.1.1-.2.2-.4.1-.2-.1-.8-.3-1.5-1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4l.3-.3.2-.3c.1-.1 0-.2 0-.4 0-.1-.4-1-.6-1.4-.2-.4-.3-.3-.4-.3h-.4c-.1 0-.4.1-.5.2-.2.2-.7.7-.7 1.6s.7 1.8.8 2c.1.1 1.4 2.1 3.4 3 .5.2.9.3 1.2.4.5.1.9.1 1.3.1.4-.1 1.1-.4 1.3-.9.2-.4.2-.8.1-.9 0-.1-.2-.2-.4-.3z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    key: "instagram",
    patterns: [/instagram/i],
    fallbackDomain: "instagram.com",
    bg: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)",
    fg: "#ffffff",
    renderSvg: (size, gradId) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F58529" />
            <stop offset="50%" stopColor="#DD2A7B" />
            <stop offset="100%" stopColor="#8134AF" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" fill={`url(#${gradId})`} />
        <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="#FFF" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.9" stroke="#FFF" strokeWidth="1.7" />
        <circle cx="15.8" cy="8.2" r="0.95" fill="#FFF" />
      </svg>
    )
  },
  {
    key: "linkedin",
    patterns: [/linkedin/i],
    fallbackDomain: "linkedin.com",
    bg: "#0A66C2",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#0A66C2" />
        <path
          d="M7.6 10.2v7.2M7.6 6.8v.15M11.2 17.4v-7.2m0 2.2c.5-1.3 1.6-2.2 3-2.2 1.9 0 3 1.2 3 3.4v3.8"
          stroke="#FFF"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  {
    key: "facebook",
    patterns: [/facebook/i, /\bfb\.com/i],
    fallbackDomain: "facebook.com",
    bg: "#1877F2",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#1877F2" />
        <path
          d="M13.5 22v-8.1h2.6l.4-3h-3V9c0-.9.2-1.5 1.5-1.5h1.6V4.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.6v3h2.6V22h3.3z"
          fill="#FFF"
        />
      </svg>
    )
  },
  {
    key: "slack",
    patterns: [/slack/i],
    fallbackDomain: "slack.com",
    bg: "#4A154B",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#4A154B" />
        <path d="M9.5 6v12M14.5 6v12M6 9.5h12M6 14.5h12" stroke="#36C5F0" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    )
  },
  {
    key: "gmail",
    patterns: [/gmail/i, /mail\.google/i],
    fallbackDomain: "mail.google.com",
    bg: "#ffffff",
    fg: "#EA4335",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#FFFFFF" />
        <path d="M5.5 17.5V8.3L12 13.1l6.5-4.8v9.2" stroke="#EA4335" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 8.3v9.2" stroke="#4285F4" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18.5 8.3v9.2" stroke="#34A853" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    key: "github",
    patterns: [/github/i],
    fallbackDomain: "github.com",
    bg: "#181717",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#181717" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 5.5a6.5 6.5 0 00-2.05 12.67c.32.06.44-.14.44-.31v-1.1c-1.81.39-2.19-.87-2.19-.87-.3-.75-.72-.95-.72-.95-.59-.4.04-.4.04-.4.65.05 1 .67 1 .67.58.99 1.52.7 1.89.54.06-.42.23-.7.41-.86-1.44-.16-2.96-.72-2.96-3.22 0-.71.25-1.29.67-1.75-.07-.16-.29-.83.06-1.72 0 0 .55-.18 1.79.67a6.2 6.2 0 013.26 0c1.24-.85 1.79-.67 1.79-.67.35.89.13 1.56.06 1.72.42.46.67 1.04.67 1.75 0 2.51-1.52 3.05-2.97 3.21.23.2.44.6.44 1.21v1.8c0 .17.12.37.45.31A6.5 6.5 0 0012 5.5z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    key: "figma",
    patterns: [/figma/i],
    fallbackDomain: "figma.com",
    bg: "#1E1E1E",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#1E1E1E" />
        <circle cx="14.5" cy="12" r="2.2" fill="#1ABCFE" />
        <path d="M9.5 5.4h3v4.4h-3a2.2 2.2 0 010-4.4z" fill="#F24E1E" />
        <path d="M12.5 5.4h2.3a2.2 2.2 0 010 4.4h-2.3V5.4z" fill="#FF7262" />
        <path d="M9.5 9.8h3v4.4h-3a2.2 2.2 0 010-4.4z" fill="#A259FF" />
        <path d="M9.5 14.2h3v2.2a2.2 2.2 0 01-3-2.2z" fill="#0ACF83" />
      </svg>
    )
  },
  {
    key: "notion",
    patterns: [/notion/i],
    fallbackDomain: "notion.so",
    bg: "#ffffff",
    fg: "#0F172A",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#FFFFFF" />
        <path d="M7.5 17.5v-11l9 11v-11" stroke="#0F172A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    key: "shopify",
    patterns: [/shopify/i],
    fallbackDomain: "shopify.com",
    bg: "#5E8E3E",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#5E8E3E" />
        <path d="M7.5 9h9l1 9.5h-11L7.5 9z" fill="#95BF47" />
        <path d="M9.8 9V7.5a2.2 2.2 0 014.4 0V9" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  {
    key: "youtube",
    patterns: [/youtube/i, /youtu\.be/i],
    fallbackDomain: "youtube.com",
    bg: "#FF0000",
    fg: "#ffffff",
    renderSvg: size => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" fill="#FF0000" />
        <path d="M9.2 7.8L16.6 12l-7.4 4.2V7.8z" fill="#FFFFFF" />
      </svg>
    )
  }
];

function extractHostname(websiteUrl?: string): string | null {
  if (!websiteUrl) return null;
  try {
    const parsed = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    return parsed.hostname;
  } catch {
    return null;
  }
}

function matchBrand(name: string, websiteUrl?: string, connectorId?: string): BrandSpec | undefined {
  const haystack = `${connectorId || ""} ${name} ${websiteUrl || ""}`;
  return BRAND_SPECS.find(spec => spec.patterns.some(rx => rx.test(haystack)));
}

export function ConnectorLogo({ name, websiteUrl, connectorId, size = 18 }: ConnectorLogoProps) {
  const gradId = useId();
  const brand = matchBrand(name, websiteUrl, connectorId);
  const hostname = extractHostname(websiteUrl) || brand?.fallbackDomain || null;
  const faviconUrl = hostname
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
    : null;

  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [faviconUrl]);

  // Render every brand vector icon, fetched favicon, monogram, and fallback inside one uniform squircle tile.
  if (brand) {
    return (
      <LogoFrame size={size}>
        {brand.renderSvg(size, gradId)}
      </LogoFrame>
    );
  }

  if (faviconUrl && !imgFailed) {
    const innerPad = Math.max(2, Math.round(size * 0.12));
    const innerRadius = Math.max(2, getSquircleRadius(size) - innerPad);
    return (
      <LogoFrame size={size} background="#ffffff" padding={innerPad}>
        <img
          src={faviconUrl}
          alt=""
          width={size - innerPad * 2}
          height={size - innerPad * 2}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: innerRadius,
            objectFit: "contain",
            display: "block"
          }}
          onError={() => setImgFailed(true)}
          onLoad={e => {
            if (e.currentTarget.naturalWidth === 0) {
              setImgFailed(true);
            }
          }}
        />
      </LogoFrame>
    );
  }

  const initial = (name || hostname || "").replace(/^www\./i, "").trim().charAt(0).toUpperCase();
  if (initial) {
    return (
      <LogoFrame size={size} background="linear-gradient(135deg, #3b82f6, #6366f1)">
        <span
          style={{
            color: "#ffffff",
            fontSize: Math.max(10, Math.round(size * 0.56)),
            fontWeight: 700,
            lineHeight: 1
          }}
        >
          {initial}
        </span>
      </LogoFrame>
    );
  }

  return (
    <LogoFrame size={size} background="linear-gradient(135deg, #475569, #334155)">
      <Globe2 size={Math.max(11, Math.round(size * 0.58))} color="#ffffff" />
    </LogoFrame>
  );
}
