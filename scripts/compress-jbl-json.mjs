// Gzip the per-game JSON files of a JBL season to keep the repo and deploys small.
//
//   node scripts/compress-jbl-json.mjs [season] [--keep]
//
// Compresses games/<id>.json and playoffs/games/<id>.json to <name>.json.gz.
// games/index.json, season.json and playoffs.json stay plain (the app and the
// validator read them directly). Before a plain file is removed, the .gz is
// decompressed and compared byte-for-byte with it; any mismatch aborts without
// deleting anything. Already-compressed files are skipped, so it is safe to
// run after every export. --keep leaves the plain files in place.
//
// Output is deterministic (Node writes a zero mtime in the gzip header), so
// re-running never produces a diff.

import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"

const args = process.argv.slice(2)
const keep = args.includes("--keep")
const season = args.find((arg) => !arg.startsWith("--")) ?? "2026"
const root = process.env.JBL_JSON_ROOT ?? path.join("public", "jbl", "seasons", season)

function gameDirs() {
  return [path.join(root, "games"), path.join(root, "playoffs", "games")].filter((dir) => fs.existsSync(dir))
}

let compressed = 0
let skipped = 0
let plainBytes = 0
let gzBytes = 0

for (const dir of gameDirs()) {
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json") || name === "index.json") continue
    const plainPath = path.join(dir, name)
    const gzPath = `${plainPath}.gz`
    if (fs.existsSync(gzPath)) {
      // Both exist (e.g. an interrupted run): only drop the plain copy if the .gz is a faithful copy.
      const same = Buffer.compare(zlib.gunzipSync(fs.readFileSync(gzPath)), fs.readFileSync(plainPath)) === 0
      if (!same) throw new Error(`${gzPath} does not match ${plainPath}; refusing to continue`)
      if (!keep) fs.unlinkSync(plainPath)
      skipped += 1
      continue
    }

    const original = fs.readFileSync(plainPath)
    const gz = zlib.gzipSync(original, { level: 9 })
    if (Buffer.compare(zlib.gunzipSync(gz), original) !== 0) {
      throw new Error(`Round-trip check failed for ${plainPath}`)
    }
    fs.writeFileSync(gzPath, gz)
    if (!keep) fs.unlinkSync(plainPath)
    compressed += 1
    plainBytes += original.length
    gzBytes += gz.length
  }
}

const mb = (bytes) => (bytes / 1e6).toFixed(1)
console.log(
  `JBL ${season}: compressed ${compressed} game file(s) (${mb(plainBytes)} MB -> ${mb(gzBytes)} MB), ` +
    `${skipped} already compressed${keep ? ", plain files kept" : ""}.`,
)
