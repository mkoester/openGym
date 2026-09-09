// The German language rules, in one place.
//
// They are enforced twice, and both callers must agree or the pipeline lies: de-instructions.test.js
// fails the build on a violation, and translate-de-stage.mjs feeds violations back to the model as a
// correction before a batch is ever written. A second copy of a regex is a rule that silently drifts.
//
// Each rule carries the `fix` line the model is shown. Write it as an instruction, not a complaint —
// it is prompt text, and "use X, not Y" corrects where "invalid step" does not.
//
// `fix` may be a function of the offending step, and for the rules that match a word it should be:
// a generic "use the short imperative" was ignored three times running by a 12B model that had
// written "Setze dich", because the examples given were beug/halt/häng and it did not generalise.
// Naming the actual word — write "setz", not "setze" — is the difference between a correction the
// model can apply and one it can only agree with.

// Long forms of verbs whose imperative drops the -e. Captured so the fix can quote the word.
const LONG_IMPERATIVE = /(?:^|[,;]\s+|\bund\s+|\bdann\s+)(lege|hebe|senke|strecke|spanne|beuge|halte|ziehe|drücke|kehre|wiederhole|greife|stehe|führe|stelle|setze|bringe|drehe|neige|schiebe|hänge)(?=$|[^\p{L}])/iu
// Strong verbs, where the correct imperative is irregular rather than "drop the -e".
const STRONG_VERB = /(?:^|[,;]\s+|\bund\s+|\bdann\s+)(nehme|gebe|trete|lese|sehe|werfe|helfe|hälst|hält|fähr|läuf)(?=$|[^\p{L}])/iu
const STRONG_FORMS = {
  nehme: 'nimm', gebe: 'gib', trete: 'tritt', lese: 'lies', sehe: 'sieh', werfe: 'wirf',
  helfe: 'hilf', hälst: 'halt', hält: 'halt', fähr: 'fahr', läuf: 'lauf'
}
const ENGLISH_LEAK = /(?:^|[^\p{L}])(the|your|with|from|towards?|repeat|desired|starting|slowly|hold|while|then|straight|ground|feet|hands|body|legs|arms|knees|shoulders|lie|place|lower|raise|keep|grasp|squeeze|engage|extend|exhale|inhale|continue|return|sit|push|pull|bend|twist|reach|kneel|lift|lean|attach|adjust|hang|rotate)(?=$|[^\p{L}])/iu

// The instruction shown to the model for one broken rule.
export const fixFor = (rule, german) => (typeof rule.fix === 'function' ? rule.fix(german) : rule.fix)

// Rules that look only at the German.
export const stepRules = [
  {
    name: 'english-leak',
    fix: german => {
      const word = german.match(ENGLISH_LEAK)?.[1]
      return word
        ? `The English word "${word}" is still there. Translate it into German.`
        : 'This step still contains English words. Translate every word into German.'
    },
    // Deliberately conservative: only English words with no German homograph. "stand", "start",
    // "position", "pause" and "press" are excluded because each is also an ordinary German word.
    test: german => ENGLISH_LEAK.test(german)
  },
  {
    name: 'anglicism',
    fix: 'Replace the anglicism with the German term from the glossary (Körpermitte, Gesäßmuskeln, Beinbeuger, Wiederholungen, Sätze).',
    test: german => /(?:^|[^\p{L}])(?:Core|Glutes|Hamstrings|Reps|Sets|Workout)(?=$|[^\p{L}])/u.test(german)
  },
  {
    name: 'swiss-ss',
    fix: 'Use standard German ß, not the Swiss ss: Füße, Gesäß, schließ, außen.',
    test: german => /(?:Füsse|Gesäss|schliess|aussen|draussen|grösser)/u.test(german)
  },
  {
    name: 'polite-form',
    fix: 'Address the reader with lowercase "du"/"dein", never the polite "Sie"/"Ihre".',
    test: german => /(?:^|[^\p{L}])(?:Ihre|Ihren|Ihrem|Ihrer|Ihnen)(?=$|[^\p{L}])/u.test(german) || /\p{Ll}\s+Sie(?=$|[^\p{L}])/u.test(german)
  },
  {
    name: 'long-imperative',
    fix: german => {
      const wrong = german.match(LONG_IMPERATIVE)?.[1]
      return wrong
        ? `Write "${wrong.slice(0, -1)}", not "${wrong}" — the imperative drops the -e.`
        : 'Use the short imperative without -e: "beug", not "beuge".'
    },
    test: german => LONG_IMPERATIVE.test(german)
  },
  {
    name: 'strong-verb',
    fix: german => {
      const wrong = german.match(STRONG_VERB)?.[1]
      const base = wrong && STRONG_FORMS[wrong.toLowerCase()]
      // Match the case of what the model wrote, so the suggestion is a drop-in replacement.
      const right = base && (wrong[0] === wrong[0].toUpperCase() ? base[0].toUpperCase() + base.slice(1) : base)
      return right
        ? `Write "${right}", not "${wrong}" — this verb has an irregular imperative.`
        : 'Strong verbs take their own imperative: nimm, gib, tritt, lies, sieh, wirf, hilf.'
    },
    test: german => STRONG_VERB.test(german)
  },
  {
    name: 'positionieren',
    fix: 'Do not use "positionieren": for a body part use the concrete verb (leg, bring, setz, stell), for a machine setting or angle use "stell … ein".',
    // Verb forms only. The noun "Position" ("in die Ausgangsposition") is correct and untouched.
    test: german => /positionier/iu.test(german)
  },
  {
    name: 'ellbogen',
    fix: 'Write "Ellenbogen", never "Ellbogen".',
    test: german => /(?:^|[^\p{L}])Ellbogen/u.test(german)
  },
  {
    name: 'literal-desired',
    fix: 'Do not render "for the desired number" literally as "weiter für die gewünschte Anzahl".',
    test: german => /weiter für die gewünschte Anzahl/u.test(german)
  }
]

// Rules that fire only for particular English source steps.
export const termRules = [
  {
    name: 'core',
    fix: 'Translate "engage your core/abs" as "spann die Körpermitte an".',
    appliesTo: english => /engag\p{L}*\s+your\s+(?:core|abs)/iu.test(english),
    test: german => !/Körpermitte/u.test(german)
  },
  { name: 'kettlebell', fix: 'Use "Kettlebell".', appliesTo: e => /kettlebells?/iu.test(e), test: g => !/Kettlebell/u.test(g) },
  { name: 'smith-machine', fix: 'Translate "Smith machine" as "Multipresse".', appliesTo: e => /smith machine/iu.test(e), test: g => !/Multipresse/u.test(g) },
  { name: 'barbell', fix: 'Translate "barbell" as "Langhantel".', appliesTo: e => /barbell/iu.test(e), test: g => !/Langhantel/u.test(g) },
  { name: 'dumbbell', fix: 'Translate "dumbbell" as "Kurzhantel".', appliesTo: e => /dumbbells?/iu.test(e), test: g => !/Kurzhantel/u.test(g) },
  { name: 'elbow', fix: 'Translate "elbow" as "Ellenbogen".', appliesTo: e => /\belbows?\b/iu.test(e), test: g => !/Ellenbogen/u.test(g) },
  {
    name: 'press',
    fix: 'Translate the verb "press" as "drück".',
    // Step-initial only: "Beinpresse" is the right noun for the machine and must survive.
    appliesTo: english => /^press\b/iu.test(english),
    test: german => !/drück/iu.test(german)
  },
  {
    name: 'secure',
    fix: 'Translate "secure" (a body part) as "fixier", not "befestige" — befestigen is for equipment.',
    // Keyed on the object, because "ensuring a secure fit" is the adjective and must not be caught.
    appliesTo: english => /\bsecure\s+(?:your|it|them|the)\b/iu.test(english),
    test: german => !/fixier/iu.test(german)
  },
  {
    name: 'all-fours',
    fix: 'Translate "on all fours" as "Vierfüßlerstand" — e.g. "geh in den Vierfüßlerstand".',
    appliesTo: english => /\ball fours\b/iu.test(english),
    test: german => !/Vierfüßlerstand/u.test(german)
  },
  {
    name: 'closing-phrase',
    fix: 'End with the pinned phrase "die gewünschte Anzahl an Wiederholungen".',
    appliesTo: english => /desired number of repetitions/iu.test(english),
    test: german => !/gewünschte(?:n)? Anzahl an Wiederholungen/u.test(german)
  }
]

// Every rule broken by one German step. Returns [] when the step is clean.
export const checkStep = (german, english) => [
  ...stepRules.filter(rule => rule.test(german)),
  ...termRules.filter(rule => rule.appliesTo(english) && rule.test(german))
]
