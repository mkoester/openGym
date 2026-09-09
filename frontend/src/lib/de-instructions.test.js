import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import de from '../instr/de.js'
import { EXDB } from './exercises-data.js'
import { INSTR_LANGS } from './i18n-core.js'
import { stepRules, termRules } from '../../../scripts/de-rules.mjs'

// German instructions are curated (the upstream dataset has no de field), so this pack grows
// stage by stage. The coverage assertion below is deliberately conditional rather than a fixed
// 1324: an incomplete pack is a legitimate intermediate state, as long as `de` stays out of
// INSTR_LANGS and the app keeps showing the honest English-instructions notice.
describe('German exercise instructions', () => {
  const exercises = new Map(EXDB.map(exercise => [exercise.id, exercise]))
  const source = JSON.parse(readFileSync(new URL('../../../scripts/instruction-sources/de.json', import.meta.url), 'utf8'))

  test('matches the curated source', () => {
    expect(de).toEqual(source)
  })

  test('only enables de instructions when the pack is complete', () => {
    expect(INSTR_LANGS.includes('de')).toBe(Object.keys(de).length === EXDB.length)
  })

  test('contains only known exercises with complete, non-empty step lists', () => {
    for (const [id, steps] of Object.entries(de)) {
      const exercise = exercises.get(id)
      expect(exercise, `unknown exercise ${id}`).toBeDefined()
      expect(steps, id).toHaveLength(exercise.st.length)
      steps.forEach((step, index) => {
        expect(step.trim(), `${id} step ${index + 1}`).not.toBe('')
        expect(step, `${id} step ${index + 1}`).not.toBe(exercise.st[index])
        // The rules themselves live in scripts/de-rules.mjs, because translate-de-stage.mjs also
        // enforces them — it feeds violations back to the model before a batch is written. Two
        // copies of a regex is one rule that drifts, and the drift is invisible from either side.
        for (const rule of stepRules) {
          expect(rule.test(step), `${id} step ${index + 1}: ${rule.name} — ${step}`).toBe(false)
        }
      })
    }
  })

  test('follows the glossary for the terms that carry the most weight', () => {
    for (const [id, steps] of Object.entries(de)) {
      const exercise = exercises.get(id)
      exercise.st.forEach((english, index) => {
        const german = steps[index]
        // Each rule names the English it fires on — "engage your core" and "engage your abs" alike,
        // since English uses both for the same cue, while plain "your abs" elsewhere stays free to
        // be Bauchmuskeln. Definitions in scripts/de-rules.mjs, shared with the translator.
        for (const rule of termRules.filter(candidate => candidate.appliesTo(english))) {
          expect(rule.test(german), `${id} step ${index + 1}: ${rule.name} — ${german}`).toBe(false)
        }
      })
    }
  })
})
