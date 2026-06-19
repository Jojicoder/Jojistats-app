import type { DraftGameMeta } from "../types"

export function validateScore(gameMeta: DraftGameMeta, entries: { RBI: number }[]): boolean {
  if (gameMeta.teamScore == null) return true
  const totalRbi = entries.reduce((sum, e) => sum + e.RBI, 0)
  const errorRuns = gameMeta.errorRuns ?? 0
  const expected = totalRbi + errorRuns
  if (gameMeta.teamScore !== expected) {
    window.alert(
      `Score mismatch!\n\nTeam Score entered: ${gameMeta.teamScore}\nTotal RBI: ${totalRbi}${errorRuns > 0 ? ` + Error Runs: ${errorRuns}` : ""} = ${expected}\n\nPlease fix the score, RBI totals, or Error Runs before saving.`
    )
    return false
  }
  return true
}
