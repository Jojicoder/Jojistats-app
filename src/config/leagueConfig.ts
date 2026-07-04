export type LeagueKey = keyof typeof LEAGUE_CONFIGS
export type PitchingRoleKey = "starter" | "reliever" | "closer"

export type StatThreshold = {
  hi: number
  lo: number
  lowerBetter?: boolean
}

export type StatConfig = Record<string, StatThreshold>

export type LineupScoreWeights = {
  avg?: number
  obp?: number
  ops?: number
  contact?: number
  hrRate?: number
  rbiRate?: number
  hitRate?: number
}

export type LeagueConfig = {
  label: string
  stats: {
    base: StatConfig
    pitchingRoles: Record<PitchingRoleKey, StatConfig>
  }
  manager: {
    minimumRatePa: number
    lineupSlots: LineupScoreWeights[]
    lineupStyleBoosts: Record<"balanced" | "obp" | "power" | "contact", LineupScoreWeights>
  }
}

const MLB_BASE_STATS: StatConfig = {
  AVG:    { hi: 0.300, lo: 0.240 },
  OBP:    { hi: 0.370, lo: 0.300 },
  SLG:    { hi: 0.500, lo: 0.380 },
  OPS:    { hi: 0.850, lo: 0.650 },
  "BB/K": { hi: 0.50,  lo: 0.25 },
  ISO:    { hi: 0.200, lo: 0.100 },
  ERA:    { hi: 3.00,  lo: 4.50,  lowerBetter: true },
  WHIP:   { hi: 1.10,  lo: 1.35,  lowerBetter: true },
  "K/9":  { hi: 10.0,  lo: 7.0 },
  "BB/9": { hi: 2.50,  lo: 4.00,  lowerBetter: true },
  "K/BB": { hi: 3.00,  lo: 1.50 },
  "HR/9": { hi: 0.90,  lo: 1.50,  lowerBetter: true },
  SB:      { hi: 20,    lo: 5 },
  "SB%":   { hi: 0.750, lo: 0.600 },
}

const JAA_BASE_STATS: StatConfig = {
  AVG:    { hi: 0.380, lo: 0.220 },
  OBP:    { hi: 0.450, lo: 0.300 },
  SLG:    { hi: 0.600, lo: 0.380 },
  OPS:    { hi: 0.950, lo: 0.680 },
  "BB/K": { hi: 0.70,  lo: 0.25 },
  ISO:    { hi: 0.250, lo: 0.120 },
  HR:     { hi: 3,     lo: -1 },
  SB:     { hi: 5,     lo: 0 },
  "SB%":  { hi: 0.750, lo: 0.600 },
  ERA:    { hi: 4.00,  lo: 7.00,  lowerBetter: true },
  WHIP:   { hi: 1.30,  lo: 1.80,  lowerBetter: true },
  "K/9":  { hi: 9.0,   lo: 5.0 },
  "BB/9": { hi: 3.00,  lo: 5.00,  lowerBetter: true },
  "K/BB": { hi: 2.50,  lo: 1.20 },
  "HR/9": { hi: 1.00,  lo: 2.00,  lowerBetter: true },
}

const DEFAULT_LINEUP_SLOTS: LineupScoreWeights[] = [
  { obp: 0.45, contact: 0.25, avg: 0.2, ops: 0.1 },
  { obp: 0.35, ops: 0.3, avg: 0.2, contact: 0.15 },
  { ops: 0.4, avg: 0.25, obp: 0.25, hrRate: 2 },
  { ops: 0.48, hrRate: 4, rbiRate: 0.8, avg: 0.1 },
  { ops: 0.4, hrRate: 3, rbiRate: 0.9, obp: 0.15 },
  { ops: 0.35, avg: 0.25, obp: 0.2, rbiRate: 0.5 },
  { avg: 0.3, ops: 0.25, obp: 0.25, contact: 0.2 },
  { obp: 0.35, contact: 0.25, avg: 0.2, ops: 0.2 },
  { obp: 0.4, contact: 0.3, avg: 0.2, ops: 0.1 },
]

const DEFAULT_LINEUP_STYLE_BOOSTS = {
  balanced: { obp: 0.15, ops: 0.15 },
  obp: { obp: 0.4 },
  power: { ops: 0.25, hrRate: 3, rbiRate: 0.6 },
  contact: { avg: 0.25, contact: 0.35, hitRate: 0.6 },
}

export const LEAGUE_CONFIGS = {
  mlb: {
    label: "MLB",
    stats: {
      base: MLB_BASE_STATS,
      pitchingRoles: {
        starter: {
          ...MLB_BASE_STATS,
          ERA:  { hi: 3.00, lo: 4.50, lowerBetter: true },
          WHIP: { hi: 1.10, lo: 1.35, lowerBetter: true },
          IP:   { hi: 180,  lo: 120 },
          W:    { hi: 15,   lo: 8 },
        },
        reliever: {
          ...MLB_BASE_STATS,
          ERA:  { hi: 2.50, lo: 4.00, lowerBetter: true },
          WHIP: { hi: 1.00, lo: 1.30, lowerBetter: true },
          HLD:  { hi: 20,   lo: 8 },
          "K/9": { hi: 11.0, lo: 7.5 },
        },
        closer: {
          ...MLB_BASE_STATS,
          ERA:  { hi: 2.00, lo: 3.50, lowerBetter: true },
          WHIP: { hi: 0.95, lo: 1.25, lowerBetter: true },
          SV:   { hi: 30,   lo: 15 },
          BS:   { hi: -1,   lo: 5,   lowerBetter: true },
          "K/9": { hi: 11.0, lo: 8.0 },
        },
      },
    },
    manager: {
      minimumRatePa: 8,
      lineupSlots: DEFAULT_LINEUP_SLOTS,
      lineupStyleBoosts: DEFAULT_LINEUP_STYLE_BOOSTS,
    },
  },
  // JBL is a simulated pro league on the same statistical scale as MLB, so it
  // reuses the MLB thresholds rather than inventing a new band.
  jbl: {
    label: "JBL",
    stats: {
      base: MLB_BASE_STATS,
      pitchingRoles: {
        starter: {
          ...MLB_BASE_STATS,
          ERA:  { hi: 3.00, lo: 4.50, lowerBetter: true },
          WHIP: { hi: 1.10, lo: 1.35, lowerBetter: true },
          IP:   { hi: 180,  lo: 120 },
          W:    { hi: 15,   lo: 8 },
        },
        reliever: {
          ...MLB_BASE_STATS,
          ERA:  { hi: 2.50, lo: 4.00, lowerBetter: true },
          WHIP: { hi: 1.00, lo: 1.30, lowerBetter: true },
          HLD:  { hi: 20,   lo: 8 },
          "K/9": { hi: 11.0, lo: 7.5 },
        },
        closer: {
          ...MLB_BASE_STATS,
          ERA:  { hi: 2.00, lo: 3.50, lowerBetter: true },
          WHIP: { hi: 0.95, lo: 1.25, lowerBetter: true },
          SV:   { hi: 30,   lo: 15 },
          BS:   { hi: -1,   lo: 5,   lowerBetter: true },
          "K/9": { hi: 11.0, lo: 8.0 },
        },
      },
    },
    manager: {
      minimumRatePa: 8,
      lineupSlots: DEFAULT_LINEUP_SLOTS,
      lineupStyleBoosts: DEFAULT_LINEUP_STYLE_BOOSTS,
    },
  },
  jaa: {
    label: "JAA",
    stats: {
      base: JAA_BASE_STATS,
      pitchingRoles: {
        starter: {
          ...JAA_BASE_STATS,
          ERA:  { hi: 4.00, lo: 7.00, lowerBetter: true },
          WHIP: { hi: 1.40, lo: 2.00, lowerBetter: true },
        },
        reliever: {
          ...JAA_BASE_STATS,
          ERA:  { hi: 3.00, lo: 6.00, lowerBetter: true },
          WHIP: { hi: 1.20, lo: 1.70, lowerBetter: true },
        },
        closer: {
          ...JAA_BASE_STATS,
          ERA:  { hi: 2.50, lo: 5.00, lowerBetter: true },
          WHIP: { hi: 1.10, lo: 1.60, lowerBetter: true },
        },
      },
    },
    manager: {
      minimumRatePa: 8,
      lineupSlots: DEFAULT_LINEUP_SLOTS,
      lineupStyleBoosts: DEFAULT_LINEUP_STYLE_BOOSTS,
    },
  },
} satisfies Record<string, LeagueConfig>

export function getLeagueConfig(league: LeagueKey | null | undefined) {
  return LEAGUE_CONFIGS[league ?? "jaa"] ?? LEAGUE_CONFIGS.jaa
}

export function getLeagueStatConfig(
  league: LeagueKey | null | undefined,
  pitchingRole?: PitchingRoleKey | null
): StatConfig {
  const config = getLeagueConfig(league)
  return pitchingRole ? config.stats.pitchingRoles[pitchingRole] : config.stats.base
}
