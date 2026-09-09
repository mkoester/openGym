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

**First batch: translate the four exercises that already exist**, rather than a fresh
stage:

```sh
node scripts/translate-de-stage.mjs --provider=ollama --model=<yours> \
  --body-part=waist --limit=4 --batch-size=4
```

Without `--apply` this writes nothing, so the existing four stay put and you can compare
the local model's output against them — they were produced by a hosted model and pass
every gate. That is a direct quality read on your model before it touches 1,320 more.
If it cannot hold the glossary on four exercises, a bigger `--limit` will not help.

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

### With a local model

```sh
OLLAMA_HOST=http://your-gpu-box:11434 \
  node scripts/translate-de-stage.mjs --provider=ollama --model=qwen3:14b \
  --body-part=waist --limit=20 --batch-size=5 --apply
```

`OLLAMA_HOST` is ollama's own variable and defaults to `http://127.0.0.1:11434`, so a
local daemon needs no configuration. Requests run at `temperature: 0` — the same batch
retranslated should give the same text.

Four things worth knowing before the first run:

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

`frontend/src/lib/de-instructions.test.js` and `build-de-instructions.mjs` between them
reject:

- unknown exercise IDs, empty steps, and any step count that differs from the English
- a step left in English, or containing English function words
- the polite `Sie` form, and `Ihre`/`Ihren`/`Ihrem`/`Ihrer`/`Ihnen`
- long-form imperatives (`Lege`, `Halte`, `Hebe` …) where the short form belongs
- wrong strong-verb forms (`nehme`, `gebe`, `trete`, `hält` …)
- anglicisms the glossary replaces: `Core`, `Glutes`, `Hamstrings`, `Reps`, `Sets`
- Swiss orthography (`Füsse`, `Gesäss`, `aussen` …)
- `Ellbogen` instead of `Ellenbogen`
- glossary drift on the terms that carry the most weight: `Körpermitte`, `Langhantel`,
  `Kurzhantel`, `Kettlebell`, `Multipresse`
- the closing phrase: any step whose English says "desired number of repetitions" must
  say `die gewünschte Anzahl an Wiederholungen`

### What no test can catch — and therefore needs a person

- **Meaning fidelity.** A grammatical German sentence that says something different from
  the English passes every rule above.
- **Angles.** 116 steps give an angle and the English usually names no reference point.
  The glossary says to add one only where the exercise makes it unambiguous; whether that
  judgement was made correctly is only visible to a reader.
- **Register.** Whether the German reads like a coach or like a manual.

So each stage needs a sample read by a German speaker:

```sh
node scripts/de-review-sample.mjs --count=15          # random sample, English vs German
node scripts/de-review-sample.mjs --body-part=waist   # restricted to one stage
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
