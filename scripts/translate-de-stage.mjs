#!/usr/bin/env node
// Translates a stage of English exercise instructions into German, in schema-validated,
// checkpointed batches. Mirrors translate-pt-br-stage.mjs; see instruction-sources/README.md.
//
//   node scripts/translate-de-stage.mjs --body-part=waist [--limit=10] [--batch-size=10] [--apply]
//
// Without --apply nothing is written: the batches are translated and validated only, which is
// the cheap way to check a prompt or glossary change before committing to a stage.

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(root, 'scripts', 'instruction-sources', 'de.json')
const glossaryPath = join(root, 'scripts', 'instruction-sources', 'GLOSSARY.de.md')
const exercisesPath = join(root, 'frontend', 'src', 'lib', 'exercises-data.js')
const claude = process.env.CLAUDE_BIN || 'claude'
const codex = process.env.CODEX_BIN || 'codex'
const stageOrder = ['waist', 'chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'upper legs', 'lower legs', 'cardio', 'neck']

const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const bodyPart = option('body-part')
const provider = option('provider') || 'claude'
const limit = Number(option('limit') || 10)
const batchSize = Number(option('batch-size') || 10)
const apply = process.argv.includes('--apply')

if (!bodyPart) throw new Error('Usage: translate-de-stage.mjs --body-part=waist|all [--limit=10] [--batch-size=10] [--apply]')
if (!['claude', 'codex'].includes(provider)) throw new Error('provider must be claude or codex')
if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(batchSize) || batchSize < 1) {
  throw new Error('limit and batch-size must be positive integers')
}

const translations = JSON.parse(readFileSync(sourcePath, 'utf8'))
const glossary = readFileSync(glossaryPath, 'utf8')
const { EXDB } = await import(pathToFileURL(exercisesPath))
const requestedParts = bodyPart === 'all' ? stageOrder : [bodyPart]
const pending = requestedParts
  .flatMap(part => EXDB.filter(exercise => exercise.bp === part && !translations[exercise.id]))
  .slice(0, limit)

if (!pending.length) {
  console.log(`No untranslated ${bodyPart} exercises remain.`)
  process.exit(0)
}

const next = { ...translations }
for (let start = 0; start < pending.length; start += batchSize) {
  const batch = pending.slice(start, start + batchSize)
  const schema = {
    type: 'object',
    properties: {
      translations: {
        type: 'array', minItems: batch.length, maxItems: batch.length,
        items: {
          oneOf: batch.map(exercise => ({
            type: 'object',
            properties: {
              id: { const: exercise.id },
              steps: { type: 'array', minItems: exercise.st.length, maxItems: exercise.st.length, items: { type: 'string', minLength: 1 } }
            },
            required: ['id', 'steps'], additionalProperties: false
          }))
        }
      }
    },
    required: ['translations'], additionalProperties: false
  }
  const input = batch.map(({ id, n, st }) => ({ id, name: n, steps: st }))
  const prompt = `Translate every instruction step below from English into natural German for a fitness app.

Rules:
- Return only the structured JSON required by the schema, with every ID exactly once and in input order.
- Preserve the exact number, order, movement meaning and safety cues of the English steps.
- Address the reader with "du", lowercase, never the polite "Sie".
- Use the SHORT imperative without -e: "Leg dich flach auf den Rücken", not "Lege dich". Likewise heb, senk, streck, spann, beug, halt, zieh, drück, kehr, wiederhol, greif, steh, führ.
- Keep the -e only where German requires it: atme ein/aus, öffne, warte, wechsle.
- Follow the glossary. In particular, translate "engage your core/abs" as "spann die Körpermitte an", never "aktiviere den Core" and never "spann die Bauchmuskeln an".
- Strong verbs take their own imperative: nimm (never "nehme"), gib, tritt, lies, sieh, wirf, hilf. a→ä verbs do not umlaut: halt, fahr, lauf.
- Use standard German ß (Gesäß, Fuß), not the Swiss ss.
- Avoid unnecessary anglicisms: no Core, Glutes, Hamstrings, Reps or Sets. Established loanwords such as Kettlebell and Burpee are fine.
- Do not add explanations or repair source mechanics.
- Translate only instruction steps; IDs remain unchanged.

GLOSSARY:
${glossary}

INPUT:
${JSON.stringify(input)}`

  console.log(`Translating ${start + 1}-${start + batch.length} of ${pending.length} with ${provider} (${batch[0].id}…${batch.at(-1).id})`)
  let structured
  if (provider === 'claude') {
    const result = spawnSync(claude, [
      '-p', '--model', 'sonnet', '--effort', 'high', '--no-session-persistence',
      '--permission-mode', 'dontAsk', '--disallowedTools', 'Bash', 'Edit', 'Write', 'Read',
      '--output-format', 'json', '--max-budget-usd', '2', '--json-schema', JSON.stringify(schema)
    ], { input: prompt, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Claude exited ${result.status}`)
    const envelope = JSON.parse(result.stdout)
    if (envelope.is_error || !envelope.structured_output) throw new Error(envelope.result || 'Claude returned no structured output')
    structured = envelope.structured_output
  } else {
    const temp = mkdtempSync(join(tmpdir(), 'opengym-de-'))
    const schemaPath = join(temp, 'schema.json')
    const outputPath = join(temp, 'output.json')
    const codexSchema = {
      type: 'object',
      properties: {
        translations: {
          type: 'array', minItems: batch.length, maxItems: batch.length,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              steps: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'steps'], additionalProperties: false
          }
        }
      },
      required: ['translations'], additionalProperties: false
    }
    try {
      writeFileSync(schemaPath, JSON.stringify(codexSchema))
      const result = spawnSync(codex, [
        'exec', '--skip-git-repo-check', '--ephemeral', '--ignore-user-config',
        '--sandbox', 'read-only', '--output-schema', schemaPath,
        '--output-last-message', outputPath, '-'
      ], { input: prompt, encoding: 'utf8', cwd: temp, maxBuffer: 16 * 1024 * 1024 })
      if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Codex exited ${result.status}`)
      structured = JSON.parse(readFileSync(outputPath, 'utf8'))
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  }
  const rows = structured.translations
  const received = new Map(rows.map(row => [row.id, row.steps]))
  if (received.size !== batch.length) throw new Error(`${provider} returned duplicate or missing IDs`)
  for (const exercise of batch) {
    const steps = received.get(exercise.id)
    if (!steps || steps.length !== exercise.st.length) throw new Error(`${exercise.id}: invalid step count`)
    next[exercise.id] = steps
  }
  if (apply) {
    writeFileSync(sourcePath, JSON.stringify(next, null, 2) + '\n')
    console.log(`Checkpoint: ${Object.keys(next).length}/${EXDB.length} exercises`)
  }
}

if (!apply) {
  // A dry run exists to be read: a bare count leaves nothing to judge a new model or a changed
  // prompt by, which is the whole reason for running without --apply. Print English beside German
  // so the glossary and the meaning can both be checked in one pass.
  for (const exercise of pending) {
    console.log(`\n${exercise.id} — ${exercise.n}`)
    exercise.st.forEach((english, index) => {
      console.log(`  EN  ${english}`)
      console.log(`  DE  ${next[exercise.id][index]}`)
    })
  }
  console.log(`\nValidated ${pending.length} translations. Re-run with --apply to update ${sourcePath}.`)
  process.exit(0)
}

console.log(`Updated ${sourcePath}: ${Object.keys(next).length}/${EXDB.length} exercises`)
