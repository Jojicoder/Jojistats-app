import type { CSSProperties } from "react"
import { jblTeamSlug } from "../../api/jbl"

export type TeamColors = { primary: string; secondary: string; accent: string }

const NAVY_DARK = "#0f172a"
const NAVY_SLATE = "#1e293b"
const NAVY_MIDNIGHT = "#0f111a"
const NAVY_ROYAL = "#1e3a8a"

const TEAM_HOME_COLORS: Record<string, TeamColors> = {
  // North Division — New York
  "Brooklyn Hammers":       { primary: "#3b82f6", secondary: "#1e3a8a", accent: "#fbbf24" },
  "Bronx Wolves":           { primary: "#ef4444", secondary: "#1f2937", accent: "#94a3b8" },
  "Queens Titans":          { primary: "#10b981", secondary: "#065f46", accent: "#ffffff" },
  "Harlem Eagles":          { primary: "#f97316", secondary: "#1c1917", accent: "#fef3c7" },
  "Staten Island Foxes":    { primary: "#eab308", secondary: "#1e3a8a", accent: "#ffffff" },
  "Newark Knights":         { primary: "#8b5cf6", secondary: "#1e1b4b", accent: "#c4b5fd" },
  // Mid Division — Philadelphia
  "Fishtown Ferals":        { primary: "#14b8a6", secondary: "#0f172a", accent: "#a3e635" },
  "Kensington Iron":        { primary: "#f59e0b", secondary: "#374151", accent: "#ffffff" },
  "Germantown Colonials":   { primary: "#a855f7", secondary: "#1e1b4b", accent: "#fbbf24" },
  "Manayunk Runners":       { primary: "#22c55e", secondary: "#14532d", accent: "#ffffff" },
  "Fairmount Rams":         { primary: "#ec4899", secondary: "#1f2937", accent: "#ffffff" },
  "South Philly Stallions": { primary: "#64748b", secondary: "#1f2937", accent: "#fbbf24" },
  // South Division — DC / MD / VA
  "Georgetown Ravens":      { primary: "#06b6d4", secondary: "#0c4a6e", accent: "#ffffff" },
  "Capitol Hill Senators":  { primary: "#be123c", secondary: "#1e3a8a", accent: "#ffffff" },
  "Anacostia Kings":        { primary: "#84cc16", secondary: "#1f2937", accent: "#fbbf24" },
  "Alexandria Cannons":     { primary: "#6366f1", secondary: "#1e1b4b", accent: "#c7d2fe" },
  "Bethesda Blaze":         { primary: "#f43f5e", secondary: "#1f2937", accent: "#fb923c" },
  "Silver Spring Ghosts":   { primary: "#94a3b8", secondary: "#1e293b", accent: "#ffffff" },
}

const TEAM_AWAY_COLORS: Record<string, TeamColors> = {
  // North Division — New York
  "Brooklyn Hammers":       { primary: "#4b4b43", secondary: "#ef4444", accent: "#ffffff" },
  "Bronx Wolves":           { primary: "#ffffff", secondary: NAVY_ROYAL,  accent: "#fbbf24" },
  "Queens Titans":          { primary: "#27303f", secondary: "#f97316", accent: "#facc15" },
  "Harlem Eagles":          { primary: NAVY_ROYAL,  secondary: "#6366f1", accent: "#ffffff" },
  "Staten Island Foxes":    { primary: "#1c1917", secondary: "#f97316", accent: "#fef3c7" },
  "Newark Knights":         { primary: "#f59e0b", secondary: "#451a03", accent: "#ffffff" },
  // Mid Division — Philadelphia
  "Fishtown Ferals":        { primary: "#b45309", secondary: NAVY_SLATE, accent: "#a3e635" },
  "Kensington Iron":        { primary: "#e2e8f0", secondary: "#374151", accent: "#1c1917" },
  "Germantown Colonials":   { primary: "#e6dfd3", secondary: "#b91c1c", accent: NAVY_DARK },
  "Manayunk Runners":       { primary: "#64748b", secondary: "#db2777", accent: "#fdf2f8" },
  "Fairmount Rams":         { primary: "#0284c7", secondary: NAVY_MIDNIGHT, accent: "#facc15" },
  "South Philly Stallions": { primary: "#78350f", secondary: "#1c1917", accent: "#ffffff" },
  // South Division — DC / MD / VA
  "Georgetown Ravens":      { primary: "#191026", secondary: "#be123c", accent: "#fbbf24" },
  "Capitol Hill Senators":  { primary: "#0d9488", secondary: NAVY_SLATE, accent: "#ffffff" },
  "Anacostia Kings":        { primary: "#4c1d95", secondary: "#312e81", accent: "#ffffff" },
  "Alexandria Cannons":     { primary: "#ea580c", secondary: "#27272a", accent: "#fef3c7" },
  "Bethesda Blaze":         { primary: "#06b6d4", secondary: NAVY_ROYAL,  accent: "#ffffff" },
  "Silver Spring Ghosts":   { primary: "#cbd5e1", secondary: "#4c1d95", accent: "#10b981" },
}

export function teamColors(name: string, side: "home" | "away" = "home"): TeamColors {
  const table = side === "away" ? TEAM_AWAY_COLORS : TEAM_HOME_COLORS
  return table[name] ?? { primary: "#6b7280", secondary: "#374151", accent: "#ffffff" }
}

function readableTextColor(hex: string) {
  const value = hex.replace("#", "")
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 155 ? "#111827" : "#ffffff"
}

export function jblThemeStyle(teamName: string): CSSProperties {
  const colors = teamColors(teamName)
  const seed = teamName.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const accentX = 18 + (seed * 17) % 64
  const accentY = 4 + (seed * 11) % 38
  const patternAngle = 118 + (seed * 13) % 44

  return {
    "--mlb-primary": colors.primary,
    "--mlb-secondary": colors.secondary,
    "--mlb-background": colors.primary,
    "--mlb-on-primary": readableTextColor(colors.primary),
    "--mlb-accent": colors.accent,
    "--mlb-accent-x": `${accentX}%`,
    "--mlb-accent-y": `${accentY}%`,
    "--mlb-pattern-angle": `${patternAngle}deg`,
  } as CSSProperties
}

export function teamLogoUrl(name: string): string {
  return `/jbl/logos/${jblTeamSlug(name)}.png`
}

// Recalibrated for the 2026-07 monogram-logo redesign (interlocking letter
// marks instead of crest badges) — auto-cropped to each PNG's opaque-pixel
// bounding box, then scale is set from actual rendered ink-pixel area so
// dense letterforms (e.g. Kensington Iron's riveted block letters) and
// sparse ones (e.g. Queens Titans') read as the same visual size.
const TEAM_LOGO_SCALE: Record<string, number> = {
  "Bronx Wolves": 0.89,
  "Brooklyn Hammers": 1.06,
  "Staten Island Foxes": 1.02,
  "Fishtown Ferals": 1.05,
  "Manayunk Runners": 1.1,
  "Germantown Colonials": 1.01,
  "Capitol Hill Senators": 0.97,
  "Anacostia Kings": 1.04,
  "Kensington Iron": 0.81,

  // The teams below were reverted to their old crest-style logos (not the
  // monogram redesign) — these are each team's calibrated scale from that
  // earlier era, not the ink-area measurement used for the monogram set above.
  "Alexandria Cannons": 1.06,
  "Newark Knights": 0.94,
  "Queens Titans": 1.13,
  "Harlem Eagles": 1.47,
  "Fairmount Rams": 1.04,
  "Bethesda Blaze": 1.1,
  "Georgetown Ravens": 1.0,
  "Silver Spring Ghosts": 1.0,
  "South Philly Stallions": 0.92,
}

type TeamBadgeSize = "md" | "lg" | "xl" | "2xl" | "3xl"

const TEAM_BADGE_SIZE_CLASS: Record<TeamBadgeSize, { frame: string; image: string }> = {
  md: { frame: "h-11 w-11", image: "h-[38px] w-[38px]" },
  lg: { frame: "h-14 w-14", image: "h-[48px] w-[48px]" },
  xl: { frame: "h-20 w-20", image: "h-[70px] w-[70px]" },
  "2xl": { frame: "h-28 w-28", image: "h-[96px] w-[96px]" },
  "3xl": { frame: "h-36 w-36", image: "h-[124px] w-[124px]" },
}

export function teamBadge(name: string, size: TeamBadgeSize = "md") {
  const scale = TEAM_LOGO_SCALE[name] ?? 1
  const sizeClass = TEAM_BADGE_SIZE_CLASS[size]
  return (
    <span className={`inline-flex ${sizeClass.frame} shrink-0 items-center justify-center`}>
      <img
        src={teamLogoUrl(name)}
        alt={name}
        className={`block ${sizeClass.image} object-contain`}
        style={{ transform: `scale(${scale})` }}
        loading="lazy"
      />
    </span>
  )
}
