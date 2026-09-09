#!/usr/bin/env node
// Prints a sample of translated German instructions next to their English source, for the
// human review step that no automated gate can replace (meaning fidelity, angle reference
// points, register). See instruction-sources/README.de.md.
//
//   node scripts/de-review-sample.mjs [--count=15] [--body-part=waist] [--seed=1] [--id=0001]
//
// The sample is seeded, so quoting "sample --seed=7" in a review is reproducible.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(root, 'scripts', 'instruction-sources', 'de.json')
const exercisesPath = join(root, 'frontend', 'src', 'lib', 'exercises-data.js')

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const count = Number(option('count') || 15)
const bodyPart = option('body-part')
const wantedId = option('id')
const seed = Number(option('seed') || 1)

const translations = JSON.parse(readFileSync(sourcePath, 'utf8'))
const { EXDB } = await import(pathToFileURL(exercisesPath))
const exercises = new Map(EXDB.map(exercise => [exercise.id, exercise]))

let ids = Object.keys(translations).filter(id => exercises.has(id))
if (bodyPart) ids = ids.filter(id => exercises.get(id).bp === bodyPart)
if (wantedId) ids = ids.filter(id => id === wantedId)

if (!ids.length) {
  console.error(bodyPart || wantedId ? 'Nothing translated matches that filter yet.' : 'Nothing translated yet.')
  process.exit(1)
}

// Deterministic shuffle (mulberry32) so a review can name the sample it looked at.
let state = seed >>> 0
const random = () => {
  state = (state + 0x6D2B79F5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
for (let i = ids.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [ids[i], ids[j]] = [ids[j], ids[i]]
}

const picked = ids.slice(0, count)
console.log(`${picked.length} of ${Object.keys(translations).length} translated exercises (seed ${seed}${bodyPart ? `, ${bodyPart}` : ''})\n`)
for (const id of picked) {
  const exercise = exercises.get(id)
  console.log(`── ${exercise.n}  [${id}, ${exercise.bp}]`)
  translations[id].forEach((german, index) => {
    console.log(`   EN  ${exercise.st[index]}`)
    console.log(`   DE  ${german}`)
  })
  console.log()
}
