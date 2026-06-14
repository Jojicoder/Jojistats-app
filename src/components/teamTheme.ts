import type { CSSProperties } from "react"

export const DEFAULT_APP_THEME_STYLE = {
  "--mlb-primary": "#14532D",
  "--mlb-secondary": "#86EFAC",
  "--mlb-background": "#14532D",
  "--mlb-on-primary": "#FFFFFF",
  "--mlb-accent": "#86EFAC",
  "--mlb-accent-x": "82%",
  "--mlb-accent-y": "8%",
  "--mlb-pattern-angle": "135deg",
} as CSSProperties

export const JUNKS_THEME_STYLE = {
  "--mlb-primary": "#14532D",
  "--mlb-secondary": "#F5B800",
  "--mlb-background": "#14532D",
  "--mlb-on-primary": "#FFFFFF",
  "--mlb-accent": "#F12A2A",
  "--mlb-accent-x": "78%",
  "--mlb-accent-y": "10%",
  "--mlb-pattern-angle": "138deg",
} as CSSProperties

export function isJunksTeam(teamName?: string | null) {
  return teamName?.trim().toLowerCase() === "junks"
}

export function applyGlobalTheme(style: CSSProperties) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(style)) {
    root.style.setProperty(key, String(value))
  }
}

export function resetGlobalTheme() {
  applyGlobalTheme(DEFAULT_APP_THEME_STYLE)
}
