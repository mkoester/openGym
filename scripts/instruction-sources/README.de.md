# German exercise instructions — how to translate a stage

> ⚠ **This file and the `--provider=ollama` branch of `translate-de-stage.mjs` live only on
> `local/de-workflow` and must not reach a merge request.** The upstream branch is
> `i18n/de-instructions`; it carries the glossary, the builder, the translator (claude/codex
> only, mirroring the pt-BR script), the sampler, the test and the curated source. Rebase this
> branch onto that one; never merge this direction.

`de.json` is the editable source for the German exercise instructions, and
`GLOSSARY.de.md` is the terminology it must follow. Read the glossary before running
anything: it carries the decisions (address form, imperative, fixed terms) that every
batch inherits, and changing one after the fact means retranslating everything.

German is curated rather than generated. `scripts/build-instructions.mjs` builds packs
from the upstream dataset (hasaneyldrm/exercises-dataset), and that dataset ships
`instruction_steps` for `en, es, fr, hi, it, ko, pl, ru, tr, zh` — verified across all
1,324 entries, there is no `de` field to build from.

## Starting from nothing, on another machine

```sh
git clone git@gitlab.com:MirkoMachine/opengym.git
cd opengym
git remote add upstream https://gitlab.com/DuarteSantos8/opengym.git
git checkout local/de-workflow
```

`local/de-workflow` is the branch to work on: it is `i18n/de-instructions` plus this file
and the ollama provider. Everything below assumes you are on it.

**First batch: one exercise, to prove the plumbing** before spending anything on a stage:

```sh
node scripts/translate-de-stage.mjs --provider=ollama --model=gemma4:12b-it-q8_0 \
  --body-part=waist --limit=1 --batch-size=1
```

Without `--apply` this writes nothing. A healthy run prints `N tokens in Ns` with **no**
"chars of thinking", then German. One exercise should land near 200 tokens; thousands means
the model is reasoning instead of answering (see the correction loop, below).

⚠ **This translates the next *untranslated* exercise, not one you already have.** `pending`
filters on `!translations[id]`, so a dry run can never re-translate what `de.json` holds.
To compare a model against the curated entries, give it a `de.json` that does not contain
them — a throwaway `git worktree` with `de.json` emptied is the safe way, since emptying the
real file leaves it mangled if the run is interrupted. Do not reach for `git checkout` to
repair that; it discards whatever else is uncommitted.

## Where the output goes, and how it gets back

Translations accumulate in `scripts/instruction-sources/de.json`. Commit them **on
`local/de-workflow`** as you go — one commit per stage, so a bad stage can be dropped
without losing the others.

They belong upstream, though, and this branch must never be merged there. Port them over
by taking the file, not the commit:

```sh
git checkout i18n/de-instructions
git checkout local/de-workflow -- scripts/instruction-sources/de.json
node scripts/build-de-instructions.mjs        # regenerate the pack from it
cd frontend && npm test                        # gates must pass here too
git add scripts/instruction-sources/de.json frontend/src/instr/de.js
git commit -m "i18n(de): <stage name> — <n> exercises"
```

`de.json` is the only file that needs to travel; `frontend/src/instr/de.js` is generated
from it and must be rebuilt on the target branch rather than copied, or the two can drift
apart without anything failing.

## Prerequisites

```sh
node --version          # must be 22.x — see the warning below
cd frontend && npm ci   # the test gates need the dev dependencies
```

⚠ **Use Node 22, the version `.gitlab-ci.yml` pins as `node:22-alpine`.** On Node 24 and
newer the frontend suite reports **86 failures that have nothing to do with your
changes**: those Node versions define a `globalThis.localStorage` which is `undefined`
unless `--localstorage-file` is passed, and because the key exists, vitest's happy-dom
environment does not install the real one over it. Every test touching storage then sees
`undefined`. Nothing is broken; the runtime is simply too new.

```sh
fnm install 22 && fnm use 22    # or nvm, or whatever manages node versions there
```

Node 22 is needed for **vitest only**. `translate-de-stage.mjs` imports nothing but node
builtins, so it runs happily on whatever node the machine has.

Two things that bit on a fresh checkout, both of which look like broken tooling:

- **`npm ci` may fail building `sharp`** with `ENOENT … mkdir '/home/mk/.cache/node-gyp'`.
  sharp finds a globally-installed libvips and tries a source build; the cache directory
  it wants does not exist and `$HOME` is not writable from a sandbox. `mkdir ~/.cache/node-gyp`
  once fixes it permanently, or `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci` sidesteps the source
  build entirely — which is what CI does anyway, `node:22-alpine` having no global libvips.
- **`~/.npm` may not exist**, and an allowed-but-absent path behaves exactly like a denied
  one: `npm ci` dies with `ENOENT … mkdir '/home/mk/.npm'`. `mkdir ~/.npm` once, or pass
  `npm ci --cache <writable-dir>`.

## The corpus

1,324 exercises, 7,710 steps. Stages follow the dataset's `body_part`, same split the
Brazilian Portuguese effort used:

| Stage | `--body-part=` | Exercises |
|---:|---|---:|
| 1 | `waist` | 169 |
| 2 | `chest` | 163 |
| 3 | `back` | 203 |
| 4 | `shoulders` | 143 |
| 5 | `upper arms` | 292 |
| 6 | `lower arms` | 37 |
| 7 | `upper legs` | 227 |
| 8 | `lower legs` | 59 |
| 9 | `cardio` | 29 |
| 10 | `neck` | 2 |

## Running a stage

```sh
# 1. translate — writes nothing without --apply, so this is the safe way to try a
#    prompt or glossary change first
node scripts/translate-de-stage.mjs --body-part=waist --limit=20 --batch-size=5

# 2. same command with --apply once the output looks right; it checkpoints after every
#    validated batch, so an interrupted stage resumes where it stopped
node scripts/translate-de-stage.mjs --body-part=waist --limit=20 --batch-size=5 --apply

# 3. regenerate the runtime pack from the curated source
node scripts/build-de-instructions.mjs

# 4. gates
cd frontend && npm test
```

### The correction loop

Each batch is checked against the language rules in `scripts/de-rules.mjs` — the same file
`de-instructions.test.js` enforces — *before* it is written. A batch that breaks a rule is
sent back to the model quoting only the offending steps and the specific fix, up to
`--max-retries` times (default 2). A batch that still fails is never written; the stage
stops and names the steps and rules.

That is worth understanding before tuning anything, because it changes what makes a model
good here: not "makes fewer mistakes" but **"can fix a mistake when told exactly what is
wrong"**. Measured on 8 exercises, 5 batches needed exactly one correction and all five
stuck, leaving 43 steps with zero violations.

The corrections are only as good as their wording. A generic *"use the short imperative"*
was ignored three times running by a model that had written `Setze dich`; naming the word
— *write "setz", not "setze"* — fixed it first try. When you add a rule, write its `fix`
as an instruction that quotes the offending text.

### With a local model

```sh
OLLAMA_HOST=http://your-gpu-box:11434 \
  node scripts/translate-de-stage.mjs --provider=ollama --model=gemma4:12b-it-q8_0 \
  --body-part=waist --limit=20 --batch-size=5 --apply
```

`OLLAMA_HOST` is ollama's own variable and defaults to `http://127.0.0.1:11434`, so a
local daemon needs no configuration. Requests run at `temperature: 0` — the same batch
retranslated should give the same text.

**`gemma4:12b-it-q8_0` is the current choice** (on a 16 GB RX 6800). It was compared
head-to-head with `gemma4:12b-it-qat`, which is roughly 1.5× faster and 5 GB smaller: qat
lost because it could not always *act* on a correction — it failed to remove an
untranslated English `Lie` in three attempts where q8 removed it in one. Speed does not
help when an uncorrectable batch stops the stage. The `--model` default in the script
(`qwen3:14b`) is a leftover from the pt-BR script and is not installed here; always pass
`--model` explicitly.

Five things worth knowing before the first run:

- **Thinking must be off, and the script sends `think: false`.** Left on, gemma4 puts its
  answer in `message.thinking` and leaves `message.content` empty — 11,234 tokens over
  8½ minutes, then a failure that reads as if the model returned nothing. If a model
  ignores the flag, the error now says so and quotes the thinking.
- **Requests are streamed even though one complete answer is wanted.** With `stream: false`
  ollama sends no response headers until generation finishes, and node's fetch gives up
  after 300 s — so any batch slower than five minutes died as `UND_ERR_HEADERS_TIMEOUT`
  with nothing to show. Streaming makes the headers arrive immediately.
- **The model must support structured outputs.** Ollama compiles the JSON schema into a
  grammar; a model that cannot follow it returns prose and the script fails with
  `Ollama returned unparseable JSON`, quoting the first 400 characters.
- **The ollama path deliberately uses a flatter schema** than the Claude path — a plain
  array of `{id, steps}` rather than a union of per-ID constants, because small models
  handle it far more reliably. Nothing is lost: every returned ID and step count is
  validated afterwards regardless of provider.
- **Use a smaller `--batch-size` than with a hosted model.** 5 is a reasonable start;
  raise it only if the batches come back clean. A batch that fails validation is retried
  as a whole, so large batches waste more work.
- **`num_ctx` is set to 16384** because the glossary travels in every prompt. A model
  with a smaller context will silently truncate it — and a truncated glossary produces
  translations that look fine and quietly ignore the terminology.

## Checking the result

### What the automated gates catch

The rules live in **`scripts/de-rules.mjs`**, and both the translator and
`de-instructions.test.js` import them — the translator to correct a batch as it runs, the
test to fail the build. Add a rule there and it takes effect in both places at once; that
is the whole reason the file exists, since two copies of a regex is one rule that drifts.
`build-de-instructions.mjs` additionally rejects unknown IDs, empty steps and step counts
that differ from the English. Between them they reject:

- a step left in English, or containing an English word with no German homograph
- the polite `Sie` form, and `Ihre`/`Ihren`/`Ihrem`/`Ihrer`/`Ihnen`
- long-form imperatives (`Lege`, `Halte`, `Hänge` …) where the short form belongs
- wrong strong-verb forms (`nehme`, `gebe`, `trete`, `hält` …)
- anglicisms the glossary replaces: `Core`, `Glutes`, `Hamstrings`, `Reps`, `Sets`
- Swiss orthography (`Füsse`, `Gesäss`, `aussen` …)
- `Ellbogen` instead of `Ellenbogen`, and `positionieren` in any form
- glossary drift on the terms that carry the most weight: `Körpermitte`, `Langhantel`,
  `Kurzhantel`, `Kettlebell`, `Multipresse`, `Ellenbogen`
- verb choices the glossary pins: `press` → `drück`, `secure` → `fixier` (never
  `befestige`, which is for `attach`)
- the closing phrase: any step whose English says "desired number of repetitions" must
  say `die gewünschte Anzahl an Wiederholungen`

**A rule list only catches what someone already thought of.** Three separate enumerations
in this pipeline were found incomplete by reading a sample — the imperative list missed
`hänge`, the English-leak list missed `lie` (15% of sampled steps opened with an
untranslated "Lie", and both the builder and the test passed them), and the verb-choice
rules had no entry for `secure`. Assume the current list is likewise incomplete.

### What no test can catch — and therefore needs a person

- **Meaning fidelity.** A grammatical German sentence that says something different from
  the English passes every rule above.
- **Angles.** 116 steps give an angle and the English usually names no reference point.
  The glossary says to add one only where the exercise makes it unambiguous; whether that
  judgement was made correctly is only visible to a reader.
- **Register.** Whether the German reads like a coach or like a manual.
- **Agreement and case.** Both models tested wrote *„zum rechten Fersen"* for *to your right
  heel*; `Ferse` is feminine, so it is *„zur rechten Ferse"*. Nothing flags it.

Real examples of each, from one 8-exercise sample that passed every gate: `Schulterblätter`
written where the English said `shoulders`; the clause *"curling forward"* silently dropped;
and the case error above. Rule-clean is not the same as correct.

So each stage needs a sample read by a German speaker:

```sh
node scripts/de-review-sample.mjs --count=15          # random sample, English vs German
node scripts/de-review-sample.mjs --body-part=waist   # restricted to one stage
```

## The working loop

Translating the whole corpus in one pass would bake in every unnoticed habit 7,710 times.
Work in **micro-batches instead, and convert each manual correction into a rule**:

1. Translate 8–10 exercises with `--batch-size=1` and no `--apply`.
2. Read the output against `GLOSSARY.de.md`.
3. Encode whatever you had to correct as a rule in `de-rules.mjs` — plus its glossary entry
   and, if it is a term choice, a line in the prompt.
4. Repeat.

Each round's rules then apply to all 1,324 exercises for free, and the correction loop
enforces them without a human in the way. One 8-exercise round produced five new rules
(`häng`, `press`→`drück`, `secure`→`fixier`, no `positionieren`, and the English-leak
expansion). Early rounds have high yield; it tapers as the vocabulary is covered.

**Vary the body part between rounds.** The equipment vocabulary differs sharply — `chest`
and `back` bring bench angles, cable attachments and grip variants that `waist` never
exercises, and the glossary is thinnest exactly where it has not been tested.

`--ids` samples a particular English verb in context, which selecting by body part cannot:

```sh
node scripts/translate-de-stage.mjs --provider=ollama --model=gemma4:12b-it-q8_0 \
  --ids=1512,0007,2355,0009,1431,1314,0970,1408 --batch-size=1
```

## Finishing

Do **not** add `de` to `INSTR_LANGS` in `frontend/src/lib/i18n-core.js` until all 1,324
IDs are translated. The test asserts exactly that:

```js
expect(INSTR_LANGS.includes('de')).toBe(Object.keys(de).length === EXDB.length)
```

Until then the app keeps showing the honest "instructions stay in English" notice, which
is better than mixing German and English silently. That one-line change is the last
commit of the series, not the first.

## Provenance

These translations are produced from the English instructions in
`frontend/src/lib/exercises-data.js` with language-model assistance. They are original
translations, not copied from another German exercise dataset. They must **not** be
described as reviewed by a native speaker unless a named human reviewer has actually
completed that review; a sampled review should say it was sampled, and say how large the
sample was.
