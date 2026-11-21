import type { JblSeasonJson } from "../../sim/jblJsonTypes"
import type { PlayoffsJson } from "./playoffs"

// News is generated from data we already publish (season.json schedule and
// playoffs.json) — no per-game files are loaded, so it stays cheap. Everything
// here is deterministic: the same data always produces the same stories.

export type NewsCategory = "offseason" | "season" | "playoffs" | "standings" | "streaks" | "milestones" | "games"

export type NewsItem = {
  id: string
  date: string
  category: NewsCategory
  /** 3 = top story, 2 = notable, 1 = routine */
  importance: 1 | 2 | 3
  headline: string
  body: string
  teams: string[]
  gameId?: string
}

export const NEWS_CATEGORY_LABELS: Record<NewsCategory | "all", string> = {
  all: "All",
  offseason: "Offseason",
  season: "Season",
  playoffs: "Playoffs",
  standings: "Standings",
  streaks: "Streaks",
  milestones: "Milestones",
  games: "Game Highlights",
}

type Schedule = JblSeasonJson["schedule"]
type Game = Schedule[number] & { finalScore: { away: number; home: number } }

const GAMES_PER_TEAM = 162
const WIN_STREAKS = [8, 10, 12, 15]
const LOSS_STREAKS = [8, 10, 12]
const PITCHER_WINS = [20, 25]
const PITCHER_SAVES = [30]
const BLOWOUT_MARGIN = 12
const SHUTOUT_BLOWOUT_MARGIN = 8
const SLUGFEST_RUNS = 25

function hash(text: string) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function pick<T>(id: string, options: T[]): T {
  return options[hash(id) % options.length]
}

const nick = (team: string) => team.split(" ").slice(-1)[0]

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

type TeamState = { w: number; l: number; streak: number; rs: number; ra: number }

export function buildNews(
  season: JblSeasonJson,
  playoffs: PlayoffsJson | null,
  divisions: Record<string, string[]>,
  divisionNames: Record<string, string>,
): NewsItem[] {
  const items: NewsItem[] = []
  const add = (item: NewsItem) => items.push(item)

  const games = season.schedule
    .filter((g): g is Game => g.status === "final" && Boolean(g.finalScore))
    .sort((a, b) => (a.date === b.date ? a.gameId.localeCompare(b.gameId) : a.date.localeCompare(b.date)))
  if (games.length === 0) return items

  const year = season.season
  const teamNames = Object.values(divisions).flat()
  const divisionOf = new Map<string, string>()
  for (const [key, members] of Object.entries(divisions)) for (const t of members) divisionOf.set(t, key)

  const state = new Map<string, TeamState>(teamNames.map((t) => [t, { w: 0, l: 0, streak: 0, rs: 0, ra: 0 }]))
  const pitcherWins = new Map<string, number>()
  const pitcherSaves = new Map<string, number>()
  const clinched = new Set<string>()
  const leaderOf = new Map<string, string | null>()
  const lastDate = games[games.length - 1].date

  const lastDayOfMonth = new Map<string, string>()
  for (const g of games) lastDayOfMonth.set(g.date.slice(0, 7), g.date)
  const monthRecord = new Map<string, Map<string, { w: number; l: number }>>()

  const byDate = new Map<string, Game[]>()
  for (const g of games) {
    const list = byDate.get(g.date) ?? []
    list.push(g)
    byDate.set(g.date, list)
  }

  for (const [date, dayGames] of byDate) {
    for (const g of dayGames) {
      const { away, home } = g.finalScore
      const winner = away > home ? g.away : g.home
      const loser = away > home ? g.home : g.away
      const wScore = Math.max(away, home)
      const lScore = Math.min(away, home)
      const margin = wScore - lScore
      const ws = state.get(winner)
      const ls = state.get(loser)
      if (!ws || !ls) continue

      ws.w += 1
      ls.l += 1
      ws.streak = ws.streak > 0 ? ws.streak + 1 : 1
      ls.streak = ls.streak < 0 ? ls.streak - 1 : -1
      for (const [team, r, a] of [[g.away, away, home], [g.home, home, away]] as const) {
        const s = state.get(team)
        if (s) {
          s.rs += r
          s.ra += a
        }
      }

      const month = date.slice(0, 7)
      const mr = monthRecord.get(month) ?? new Map()
      for (const [team, won] of [[winner, true], [loser, false]] as const) {
        const rec = mr.get(team) ?? { w: 0, l: 0 }
        if (won) rec.w += 1
        else rec.l += 1
        mr.set(team, rec)
      }
      monthRecord.set(month, mr)

      // Streaks
      if (WIN_STREAKS.includes(ws.streak)) {
        const id = `streak-w-${winner}-${date}-${ws.streak}`
        add({
          id, date, gameId: g.gameId, category: "streaks", teams: [winner],
          importance: ws.streak >= 12 ? 3 : 2,
          headline: pick(id, [
            `${nick(winner)} win ${ws.streak} straight`,
            `${winner} extend winning streak to ${ws.streak}`,
            `${ws.streak} in a row for the ${nick(winner)}`,
          ]),
          body: `${winner} beat ${loser} ${wScore}-${lScore} for their ${ordinal(ws.streak)} consecutive win and improved to ${ws.w}-${ws.l}.`,
        })
      }
      if (LOSS_STREAKS.includes(-ls.streak)) {
        const n = -ls.streak
        const id = `streak-l-${loser}-${date}-${n}`
        add({
          id, date, gameId: g.gameId, category: "streaks", teams: [loser],
          importance: n >= 12 ? 3 : 2,
          headline: pick(id, [
            `${nick(loser)} drop ${n} straight`,
            `${loser} slide continues: ${n} losses in a row`,
            `Skid reaches ${n} for the ${nick(loser)}`,
          ]),
          body: `${loser} fell to ${winner} ${lScore}-${wScore}, their ${ordinal(n)} straight loss, and dropped to ${ls.w}-${ls.l}.`,
        })
      }

      // Team milestones
      if (ws.w === 100) {
        const id = `wins100-${winner}`
        add({
          id, date, gameId: g.gameId, category: "milestones", teams: [winner], importance: 3,
          headline: `${winner} reach 100 wins`,
          body: `${winner} beat ${loser} ${wScore}-${lScore} for their 100th win of ${year}, going ${ws.w}-${ws.l} on the season.`,
        })
      }
      if (ls.l === 100) {
        const id = `losses100-${loser}`
        add({
          id, date, gameId: g.gameId, category: "milestones", teams: [loser], importance: 2,
          headline: `${loser} lose their 100th game`,
          body: `${loser} fell ${lScore}-${wScore} to ${winner} and are ${ls.w}-${ls.l}.`,
        })
      }

      // Pitcher milestones
      if (g.winPitcher) {
        const key = `${g.winPitcher}|${winner}`
        const n = (pitcherWins.get(key) ?? 0) + 1
        pitcherWins.set(key, n)
        if (PITCHER_WINS.includes(n)) {
          const id = `pw-${key}-${n}`
          add({
            id, date, gameId: g.gameId, category: "milestones", teams: [winner],
            importance: n >= 20 ? 3 : 2,
            headline: `${g.winPitcher} wins No. ${n}`,
            body: `${g.winPitcher} (${nick(winner)}) picked up the ${ordinal(n)} win of the season in a ${wScore}-${lScore} victory over ${loser}.`,
          })
        }
      }
      // A pitcher cannot both win and save the same game; the engine occasionally
      // credits both, so the save is ignored in that case.
      if (g.savePitcher && g.savePitcher !== g.winPitcher) {
        const key = `${g.savePitcher}|${winner}`
        const n = (pitcherSaves.get(key) ?? 0) + 1
        pitcherSaves.set(key, n)
        if (PITCHER_SAVES.includes(n)) {
          const id = `ps-${key}-${n}`
          add({
            id, date, gameId: g.gameId, category: "milestones", teams: [winner],
            importance: 3,
            headline: `${g.savePitcher} notches save No. ${n}`,
            body: `${g.savePitcher} closed out the ${nick(winner)} ${wScore}-${lScore} win over ${loser} for the ${ordinal(n)} save of the season.`,
          })
        }
      }

      // Game highlights
      const total = wScore + lScore
      if (margin >= BLOWOUT_MARGIN || (lScore === 0 && margin >= SHUTOUT_BLOWOUT_MARGIN)) {
        const id = `rout-${g.gameId}`
        add({
          id, date, gameId: g.gameId, category: "games", teams: [winner, loser],
          importance: margin >= 15 ? 2 : 1,
          headline: lScore === 0
            ? pick(id, [`${nick(winner)} shut out ${nick(loser)}, ${wScore}-0`, `${winner} blank ${loser} ${wScore}-0`])
            : pick(id, [`${nick(winner)} rout ${nick(loser)}, ${wScore}-${lScore}`, `${winner} cruise past ${loser} ${wScore}-${lScore}`]),
          body: `${winner} won by ${margin} runs at ${g.home === winner ? "home" : "away"} (${g.venue}).${g.winPitcher ? ` ${g.winPitcher} got the win.` : ""}`,
        })
      } else if (total >= SLUGFEST_RUNS) {
        const id = `slug-${g.gameId}`
        add({
          id, date, gameId: g.gameId, category: "games", teams: [winner, loser], importance: 1,
          headline: `Slugfest: ${nick(winner)} outlast ${nick(loser)}, ${wScore}-${lScore}`,
          body: `${total} runs crossed the plate at ${g.venue} as ${winner} held off ${loser}.`,
        })
      }
    }

    // ── End-of-day standings stories ────────────────────────────────────────
    for (const [key, members] of Object.entries(divisions)) {
      if (clinched.has(key)) continue
      const rows = members
        .map((t) => ({ t, s: state.get(t) as TeamState }))
        .sort((a, b) => b.s.w - a.s.w || a.s.l - b.s.l)
      const [first, second] = rows
      const gp = first.s.w + first.s.l
      const name = divisionNames[key] ?? key

      if (first.s.w > second.s.w) {
        const prev = leaderOf.get(key)
        if (prev !== undefined && prev !== null && prev !== first.t && gp >= 30) {
          const id = `lead-${key}-${date}`
          add({
            id, date, category: "standings", teams: [first.t, prev], importance: gp >= 100 ? 2 : 1,
            headline: pick(id, [
              `${nick(first.t)} take over first in the ${name}`,
              `New leader in the ${name}: ${first.t}`,
            ]),
            body: `${first.t} (${first.s.w}-${first.s.l}) moved ahead of ${prev} (${state.get(prev)?.w}-${state.get(prev)?.l}) in the ${name} race.`,
          })
        }
        leaderOf.set(key, first.t)
      }

      // Clinch: nobody else can catch the leader even by winning out.
      const bestChaser = rows
        .slice(1)
        .reduce((best, r) => Math.max(best, r.s.w + (GAMES_PER_TEAM - r.s.w - r.s.l)), 0)
      if (first.s.w > bestChaser) {
        clinched.add(key)
        const id = `clinch-${key}`
        add({
          id, date, category: "standings", teams: [first.t], importance: 3,
          headline: pick(id, [`${first.t} clinch the ${name}`, `${nick(first.t)} are ${name} champions`]),
          body: `${first.t} (${first.s.w}-${first.s.l}) secured the ${name} title ${GAMES_PER_TEAM - gp > 0 ? `with ${GAMES_PER_TEAM - gp} game${GAMES_PER_TEAM - gp === 1 ? "" : "s"} still to play` : "on the final day of the season"}.`,
        })
      }
    }

    // ── End-of-month recap ──────────────────────────────────────────────────
    const month = date.slice(0, 7)
    if (lastDayOfMonth.get(month) === date) {
      const mr = monthRecord.get(month)
      if (mr) {
        const ranked = [...mr.entries()]
          .map(([team, r]) => ({ team, ...r, pct: r.w / (r.w + r.l) }))
          .filter((r) => r.w + r.l >= 10)
          .sort((a, b) => b.pct - a.pct || b.w - a.w)
        const best = ranked[0]
        const worst = ranked[ranked.length - 1]
        const monthName = MONTHS[Number(month.slice(5, 7)) - 1]
        if (best) {
          const id = `month-best-${month}`
          add({
            id, date, category: "season", teams: [best.team], importance: 2,
            headline: `${best.team}: ${monthName}'s best team`,
            body: `${best.team} went ${best.w}-${best.l} in ${monthName}${ranked[1] ? `, ahead of ${ranked[1].team} (${ranked[1].w}-${ranked[1].l})` : ""}.${worst && worst.team !== best.team ? ` The toughest month belonged to ${worst.team} at ${worst.w}-${worst.l}.` : ""}`,
          })
        }
      }
    }
  }

  // ── Regular-season wrap-up ──────────────────────────────────────────────────
  const finalTable = teamNames
    .map((t) => ({ t, ...(state.get(t) as TeamState) }))
    .sort((a, b) => b.w - a.w || b.rs - b.ra - (a.rs - a.ra))
  const top = finalTable[0]
  if (top) {
    const id = "season-best-record"
    add({
      id, date: lastDate, category: "season", teams: [top.t], importance: 3,
      headline: `${top.t} finish with the best record in the JBL`,
      body: `${top.t} ended the ${year} regular season ${top.w}-${top.l}, ahead of ${finalTable[1].t} (${finalTable[1].w}-${finalTable[1].l}) and ${finalTable[2].t} (${finalTable[2].w}-${finalTable[2].l}).`,
    })
    const rsLeader = [...finalTable].sort((a, b) => b.rs - a.rs)[0]
    const raLeader = [...finalTable].sort((a, b) => a.ra - b.ra)[0]
    add({
      id: "season-run-leaders", date: lastDate, category: "season", teams: [rsLeader.t, raLeader.t], importance: 2,
      headline: "Best offense and best pitching of 2026",
      body: `${rsLeader.t} scored the most runs (${rsLeader.rs}); ${raLeader.t} allowed the fewest (${raLeader.ra}).`,
    })
  }
  // Divisions nobody clinched outright (tied record): the engine decides on a tiebreaker.
  if (playoffs?.seeds) {
    for (const [key, members] of Object.entries(divisions)) {
      if (clinched.has(key)) continue
      const winnerSeed = playoffs.seeds.find((s) => s.divisionWinner && divisionOf.get(s.team) === key)
      if (!winnerSeed) continue
      const rival = members
        .filter((t) => t !== winnerSeed.team)
        .map((t) => ({ t, ...(state.get(t) as TeamState) }))
        .sort((a, b) => b.w - a.w)[0]
      const name = divisionNames[key] ?? key
      const tied = rival && rival.w === winnerSeed.wins
      add({
        id: `div-final-${key}`, date: lastDate, category: "standings", importance: 3,
        teams: rival ? [winnerSeed.team, rival.t] : [winnerSeed.team],
        headline: tied
          ? `${winnerSeed.team} win the ${name} on a tiebreaker`
          : `${winnerSeed.team} win the ${name}`,
        body: tied
          ? `${winnerSeed.team} and ${rival.t} both finished ${winnerSeed.wins}-${winnerSeed.losses}; ${winnerSeed.team} take the division title on the tiebreaker, and ${rival.t} go to the postseason as a wild card.`
          : `${winnerSeed.team} (${winnerSeed.wins}-${winnerSeed.losses}) finished first in the ${name}.`,
      })
    }
  }

  const topEntry = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]
  const winsLeader = topEntry(pitcherWins)
  const savesLeader = topEntry(pitcherSaves)
  if (winsLeader || savesLeader) {
    const [wName, wTeam] = winsLeader ? winsLeader[0].split("|") : ["", ""]
    const [sName, sTeam] = savesLeader ? savesLeader[0].split("|") : ["", ""]
    add({
      id: "season-pitching-leaders", date: lastDate, category: "season",
      teams: [wTeam, sTeam].filter(Boolean), importance: 2,
      headline: "Pitching leaders: wins and saves",
      body: `${winsLeader ? `${wName} (${nick(wTeam)}) led the league with ${winsLeader[1]} wins. ` : ""}${savesLeader ? `${sName} (${nick(sTeam)}) topped all closers with ${savesLeader[1]} saves.` : ""}`.trim(),
    })
  }

  // ── Postseason ──────────────────────────────────────────────────────────────
  if (playoffs?.seeds && playoffs.series.length > 0) {
    const seedOf = new Map(playoffs.seeds.map((s) => [s.team, s.seed]))
    const field = [...playoffs.seeds].sort((a, b) => a.seed - b.seed)
    add({
      id: "po-field", date: addDays(lastDate, 1), category: "playoffs", importance: 3,
      teams: field.map((s) => s.team),
      headline: "The postseason field is set",
      body: `Division winners: ${field.filter((s) => s.divisionWinner).map((s) => `${s.team} (#${s.seed})`).join(", ")}. Wild cards: ${field.filter((s) => !s.divisionWinner).map((s) => `${s.team} (#${s.seed})`).join(", ")}. Seeds 1 and 2 get a first-round bye.`,
    })

    const gameById = new Map((playoffs.games ?? []).map((g) => [g.gameId, g]))
    const seriesInfo = playoffs.series as Array<PlayoffsJson["series"][number] & {
      round?: string
      bestOf?: number
      top?: { team: string; seed: number }
      bottom?: { team: string; seed: number }
    }>
    for (const s of seriesInfo) {
      if (!s.winner || !s.top || !s.bottom || !s.wins) continue
      const loser = s.winner === s.top.team ? s.bottom.team : s.top.team
      const w = s.wins[s.winner] ?? 0
      const l = s.wins[loser] ?? 0
      const wSeed = seedOf.get(s.winner) ?? 0
      const lSeed = seedOf.get(loser) ?? 0
      const upset = wSeed > lSeed
      const sweep = l === 0
      const lastGame = s.games?.length ? gameById.get(s.games[s.games.length - 1]) : undefined
      const date = lastGame?.date ?? lastDate
      const round = s.round ?? "Series"
      const isFinal = s.id === "final"

      const gameLines = (s.games ?? [])
        .map((gid, i) => {
          const g = gameById.get(gid)
          if (!g) return ""
          const winnerIsAway = g.finalScore.away > g.finalScore.home
          return `G${i + 1}: ${nick(winnerIsAway ? g.away : g.home)} ${Math.max(g.finalScore.away, g.finalScore.home)}-${Math.min(g.finalScore.away, g.finalScore.home)}`
        })
        .filter(Boolean)
        .join(", ")

      const id = `po-${s.id}`
      if (isFinal) {
        const regular = state.get(s.winner)
        add({
          id: `${id}-champion`, date, gameId: lastGame?.gameId, category: "playoffs", importance: 3,
          teams: [s.winner, loser],
          headline: pick(id, [`${s.winner} are ${year} JBL champions`, `${nick(s.winner)} win the ${year} JBL title`]),
          body: `${s.winner} (#${wSeed}) beat ${loser} (#${lSeed}) ${w}-${l} in the ${round}${regular ? ` after a ${regular.w}-${regular.l} regular season` : ""}. ${gameLines}.`,
        })
      } else {
        add({
          id, date, gameId: lastGame?.gameId, category: "playoffs", importance: upset ? 3 : 2,
          teams: [s.winner, loser],
          headline: upset
            ? pick(id, [`${nick(s.winner)} stun ${nick(loser)} in the ${round}`, `Upset! #${wSeed} ${nick(s.winner)} beat #${lSeed} ${nick(loser)}`])
            : sweep
              ? `${nick(s.winner)} sweep ${nick(loser)} in the ${round}`
              : `${nick(s.winner)} edge ${nick(loser)} in the ${round}`,
          body: `${s.winner} (#${wSeed}) beat ${loser} (#${lSeed}) ${w}-${l} and advance. ${gameLines}.`,
        })
      }
    }
  }

  return items.sort((a, b) =>
    a.date !== b.date ? b.date.localeCompare(a.date) : b.importance - a.importance || a.id.localeCompare(b.id),
  )
}

// ── Offseason: the draft ─────────────────────────────────────────────────────

type DraftFiles = { season: number; draft: unknown; prospects: unknown; changes: unknown }

/** News items for the draft (no date in the draft files: they are filed on Dec 1 before the season). */
export function buildDraftNews(files: DraftFiles): NewsItem[] {
  const draft = files.draft as { season: number; rounds: number; picks: { round: number; overall: number; team: string; prospectId: number }[] }
  const prospects = new Map(
    (files.prospects as { prospects: { id: number; name: string; age: number; position: string; overall: number; potential: number }[] }).prospects.map((p) => [p.id, p]),
  )
  const changes = (files.changes as { changes: { team: string; type: string; player: string; slot: string | null; replaced: string | null }[] }).changes
  const date = `${files.season - 1}-12-01`
  const items: NewsItem[] = []

  const first = draft.picks.find((pick) => pick.overall === 1)
  const firstPlayer = first && prospects.get(first.prospectId)
  if (first && firstPlayer) {
    items.push({
      id: `draft-${files.season}-first`,
      date,
      category: "offseason",
      importance: 3,
      headline: `${first.team} take ${firstPlayer.name} first overall`,
      body: `The ${first.team} opened the ${files.season} draft with ${firstPlayer.name}, a ${firstPlayer.age}-year-old ${firstPlayer.position} rated ${firstPlayer.overall} with a ceiling of ${firstPlayer.potential}.`,
      teams: [first.team],
    })
  }

  const promoted = changes.filter((c) => c.type === "promoted")
  items.push({
    id: `draft-${files.season}-recap`,
    date,
    category: "offseason",
    importance: 2,
    headline: `${files.season} draft: ${draft.picks.length} picks, ${promoted.length} rookies make a roster`,
    body: `${draft.rounds} rounds are done. Rookies only take a bench or bullpen spot when they clearly beat the player ahead of them; the rest start in the minors.`,
    teams: [],
  })

  for (const team of [...new Set(promoted.map((c) => c.team))]) {
    const moves = promoted.filter((c) => c.team === team)
    const names = moves.map((m) => `${m.player} (for ${m.replaced})`).join(", ")
    items.push({
      id: `draft-${files.season}-${team}`,
      date,
      category: "offseason",
      importance: moves.length >= 3 ? 2 : 1,
      headline: `${team} add ${moves.length} rookie${moves.length === 1 ? "" : "s"} to the roster`,
      body: `${names}.`,
      teams: [team],
    })
  }

  const topPicks = draft.picks.filter((pick) => pick.overall >= 2 && pick.overall <= 3)
  for (const pick of topPicks) {
    const player = prospects.get(pick.prospectId)
    if (!player) continue
    items.push({
      id: `draft-${files.season}-pick-${pick.overall}`,
      date,
      category: "offseason",
      importance: 2,
      headline: `${pick.team} select ${player.name} with the ${ordinal(pick.overall)} pick`,
      body: `${player.age}-year-old ${player.position}, rated ${player.overall} (ceiling ${player.potential}).`,
      teams: [pick.team],
    })
  }
  return items
}
