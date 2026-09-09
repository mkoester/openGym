import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import de from '../instr/de.js'
import { EXDB } from './exercises-data.js'
import { INSTR_LANGS } from './i18n-core.js'

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
        // English left in place. These words have no German homograph, so a hit is real leakage.
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:^|[^\p{L}])(?:the|your|with|from|towards?|repeat|desired|starting|slowly|hold|while|then|straight|ground|feet|hands|body|legs|arms|knees|shoulders)(?=$|[^\p{L}])/iu)
        // Anglicisms the glossary replaces with ordinary German terms.
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:^|[^\p{L}])(?:Core|Glutes|Hamstrings|Reps|Sets|Workout)(?=$|[^\p{L}])/u)
        // Swiss orthography — the pack uses standard German ß. Only unambiguous spellings are
        // listed: a general "ss where ß belongs" rule would flag Fussball, Massage and friends.
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:Füsse|Gesäss|schliess|aussen|draussen|grösser)/u)
        // Polite address. The pack is du-form throughout, matching locales/de.js. "Sie" is only
        // rejected mid-sentence, where it can only be the polite form — sentence-initial "Sie"
        // is a legitimate feminine pronoun ("Sie sollte parallel zum Boden bleiben").
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:^|[^\p{L}])(?:Ihre|Ihren|Ihrem|Ihrer|Ihnen)(?=$|[^\p{L}])/u)
        expect(step, `${id} step ${index + 1}`).not.toMatch(/\p{Ll}\s+Sie(?=$|[^\p{L}])/u)
        // Short imperative: "Leg dich hin", not "Lege dich hin". Anchored to the positions an
        // imperative actually occupies — start of a step, or after a comma/"und"/"dann" — so the
        // nouns that share these forms (die Strecke, die Senke, die Spanne) cannot trip it.
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:^|[,;]\s+|\bund\s+|\bdann\s+)(?:lege|hebe|senke|strecke|spanne|beuge|halte|ziehe|drücke|kehre|wiederhole|greife|stehe|führe|stelle|setze|bringe|drehe|neige|schiebe)(?=$|[^\p{L}])/iu)
        // Strong verbs: these long forms are not a style preference, they are wrong German.
        // e→i/ie verbs change the stem; a→ä verbs do not umlaut in the imperative.
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:^|[,;]\s+|\bund\s+|\bdann\s+)(?:nehme|gebe|trete|lese|sehe|werfe|helfe|hälst|hält|fähr|läuf)(?=$|[^\p{L}])/iu)
        // "Ellenbogen", never the equally-standard "Ellbogen" — one spelling across 605 steps.
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:^|[^\p{L}])Ellbogen/u)
        // Literal rendering of English "for the desired number", which reads wrong in German.
        expect(step, `${id} step ${index + 1}`).not.toMatch(/weiter für die gewünschte Anzahl/u)
      })
    }
  })

  test('follows the glossary for the terms that carry the most weight', () => {
    for (const [id, steps] of Object.entries(de)) {
      const exercise = exercises.get(id)
      exercise.st.forEach((english, index) => {
        const german = steps[index]
        // The glossary pins the whole phrase, "engage your core" and "engage your abs" alike —
        // English uses both for the same cue. Plain "your abs" elsewhere stays free to be
        // Bauchmuskeln, which is why this keys on the verb rather than on the noun.
        if (/engag\p{L}*\s+your\s+(?:core|abs)/iu.test(english)) expect(german, `${id} step ${index + 1}: core`).toMatch(/Körpermitte/u)
        if (/kettlebells?/iu.test(english)) expect(german, `${id} step ${index + 1}: kettlebell`).toMatch(/Kettlebell/u)
        if (/smith machine/iu.test(english)) expect(german, `${id} step ${index + 1}: Smith`).toMatch(/Multipresse/u)
        if (/barbell/iu.test(english)) expect(german, `${id} step ${index + 1}: barbell`).toMatch(/Langhantel/u)
        if (/dumbbells?/iu.test(english)) expect(german, `${id} step ${index + 1}: dumbbell`).toMatch(/Kurzhantel/u)
        if (/\belbows?\b/iu.test(english)) expect(german, `${id} step ${index + 1}: elbow`).toMatch(/Ellenbogen/u)
        // 1,235 steps end on this phrase. The sentence frame is free; the phrase is not.
        if (/desired number of repetitions/iu.test(english)) {
          expect(german, `${id} step ${index + 1}: closing phrase`).toMatch(/gewünschte(?:n)? Anzahl an Wiederholungen/u)
        }
      })
    }
  })
})
