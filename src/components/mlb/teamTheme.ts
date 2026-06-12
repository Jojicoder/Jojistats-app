import type { CSSProperties } from "react"

type TeamTheme = {
  primary: string
  secondary: string
}

const DEFAULT_THEME: TeamTheme = {
  primary: "#14532d",
  secondary: "#86efac",
}

const MLB_TEAM_THEMES: Record<number, TeamTheme> = {
  108: { primary: "#BA0021", secondary: "#003263" }, // Angels
  109: { primary: "#A71930", secondary: "#E3D4AD" }, // Diamondbacks
  110: { primary: "#DF4601", secondary: "#000000" }, // Orioles
  111: { primary: "#BD3039", secondary: "#0C2340" }, // Red Sox
  112: { primary: "#0E3386", secondary: "#CC3433" }, // Cubs
  113: { primary: "#C6011F", secondary: "#000000" }, // Reds
  114: { primary: "#00385D", secondary: "#E50022" }, // Guardians
  115: { primary: "#33006F", secondary: "#C4CED4" }, // Rockies
  116: { primary: "#0C2340", secondary: "#FA4616" }, // Tigers
  117: { primary: "#002D62", secondary: "#EB6E1F" }, // Astros
  118: { primary: "#004687", secondary: "#BD9B60" }, // Royals
  119: { primary: "#005A9C", secondary: "#EF3E42" }, // Dodgers
  120: { primary: "#AB0003", secondary: "#14225A" }, // Nationals
  121: { primary: "#002D72", secondary: "#FF5910" }, // Mets
  133: { primary: "#003831", secondary: "#EFB21E" }, // Athletics
  134: { primary: "#27251F", secondary: "#FDB827" }, // Pirates
  135: { primary: "#2F241D", secondary: "#FFC425" }, // Padres
  136: { primary: "#0C2C56", secondary: "#005C5C" }, // Mariners
  137: { primary: "#FD5A1E", secondary: "#27251F" }, // Giants
  138: { primary: "#C41E3A", secondary: "#0C2340" }, // Cardinals
  139: { primary: "#092C5C", secondary: "#8FBCE6" }, // Rays
  140: { primary: "#003278", secondary: "#C0111F" }, // Rangers
  141: { primary: "#134A8E", secondary: "#E8291C" }, // Blue Jays
  142: { primary: "#002B5C", secondary: "#D31145" }, // Twins
  143: { primary: "#E81828", secondary: "#002D72" }, // Phillies
  144: { primary: "#CE1141", secondary: "#13274F" }, // Braves
  145: { primary: "#27251F", secondary: "#C4CED4" }, // White Sox
  146: { primary: "#00A3E0", secondary: "#EF3340" }, // Marlins
  147: { primary: "#0C2340", secondary: "#C4CED4" }, // Yankees
  158: { primary: "#12284B", secondary: "#FFC52F" }, // Brewers
}

function readableTextColor(hex: string) {
  const value = hex.replace("#", "")
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 155 ? "#111827" : "#ffffff"
}

export function getTeamTheme(teamId: number | null | undefined) {
  return teamId ? MLB_TEAM_THEMES[teamId] ?? DEFAULT_THEME : DEFAULT_THEME
}

export function getTeamThemeStyle(teamId: number | null | undefined): CSSProperties {
  const theme = getTeamTheme(teamId)
  return {
    "--mlb-primary": theme.primary,
    "--mlb-secondary": theme.secondary,
    "--mlb-on-primary": readableTextColor(theme.primary),
  } as CSSProperties
}
