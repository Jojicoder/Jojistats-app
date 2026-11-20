import fs from "node:fs/promises"
import path from "node:path"

const season = process.argv[2] ?? "2026"
const ref = process.argv[3] ?? "main"
const repo = "Jojicoder/Jojistats-app"
const baseUrl = `https://raw.githubusercontent.com/${repo}/${ref}/public/jbl/seasons/${season}`
const outRoot = path.join("public", "jbl", "seasons", season)

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`)
  return response.text()
}

async function download(relativePath) {
  const text = await fetchText(`${baseUrl}/${relativePath}`)
  const outPath = path.join(outRoot, relativePath)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, text)
}

await download("season.json")
await download("games/index.json")

const indexText = await fs.readFile(path.join(outRoot, "games", "index.json"), "utf8")
const gameFiles = JSON.parse(indexText)

async function downloadGame(fileName) {
  // Game files are published gzip-compressed (<name>.json.gz) for newer seasons.
  const relativePath = `games/${fileName}`
  const gz = await fetch(`${baseUrl}/${relativePath}.gz`)
  if (gz.ok) {
    const outPath = path.join(outRoot, `${relativePath}.gz`)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, Buffer.from(await gz.arrayBuffer()))
    return
  }
  await download(relativePath)
}

for (const fileName of gameFiles) {
  await downloadGame(fileName)
}

console.log(`Synced JBL ${season} JSON from ${repo}@${ref}: ${gameFiles.length} games.`)

