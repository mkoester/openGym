# German exercise glossary

Preferred terms keep the instruction pack consistent with German gym usage. The counts are how
often the English term appears across the 7,710 instruction steps in `exercises-data.js`, so the
frequent rows are the ones worth being strict about.

Write instructions in the **`du` form**, never the polite `Sie`. This matches
`frontend/src/locales/de.js`, which uses `du`/`dein` throughout and the polite form nowhere.
`du`/`dein`/`dich`/`dir` are **lowercase** — the UI locale is lowercase mid-sentence in all 160
occurrences and capitalises none.

Use the **short imperative**, without the `-e`: `leg`, `heb`, `senk`, `streck`, `spann`, `beug`,
`halt`, `zieh`, `drück`, `kehr`, `wiederhol`, `greif`, `steh`, `führ`, `häng`. So *"Leg dich flach
auf den Rücken"*, not *"Lege dich …"*. Both are grammatical and the long form is the more frequent
one in writing, but the short form is what a coach actually says, and these are coaching cues.

The list is not exhaustive — it names the verbs the corpus leans on. **The rule is the short form
for every verb** that does not require the `-e` below, whether or not it appears here.

This deliberately differs from the UI strings in `locales/de.js`, which use the long form
(`Wähle`, `Tippe`, `Füge … hinzu`) — button and hint microcopy, a different register from an
exercise cue. Do not "fix" either to match the other.

**The `-e` stays where German requires it**, and dropping it there is an error, not a style choice:

- stem ending in consonant + `m`/`n`: `atme ein`, `atme aus`, `öffne`
- stem ending in `-d`/`-t`: `warte`, `bilde`
- verbs in `-eln`/`-ern`: `wechsle`, `hantiere`

**And a short closed list keeps the long form because it simply sounds better**, even though the
rule above would allow the short one. This is a judgement call, not grammar, so the list only grows
when MK adds to it — do not extend it by analogy:

- `befestige` (never *befestig*)

**Strong verbs are not a style choice either.** Here the short form is the only correct one:

- `e→i/ie` verbs change the stem: `nimm` (never *nehme*), `gib`, `tritt`, `lies`, `sieh`, `wirf`, `hilf`
- `a→ä` verbs do **not** umlaut in the imperative: `halt`, `fahr`, `lauf` — never *hält*, *fähr*, *läuf*

Use standard German **ß** (`Gesäß`, `Fuß`, `schließen`), not the Swiss `ss`.

| English | Use in de | Avoid |
|---|---|---|
| starting position | Ausgangsposition | Startposition |
| lower (verb) | senk … ab | runterlassen |
| press (verb) | drück | press, presse |
| pause (verb) | halt … inne, or warte where the step really means waiting | pausier |
| secure (a body part) | fixier | befestige (that is for equipment) |
| attach (equipment) | befestige | fixier |
| position (a body part) | the concrete verb: leg, bring, setz, stell | positioniere |
| adjust / set an angle | stell … ein | positionier |
| on all fours | Vierfüßlerstand | auf allen vieren |
| shoulder-width | schulterbreit | schulterweit |
| barbell | Langhantel | Stange (on its own) |
| dumbbell | Kurzhantel | Hantel (ambiguous — could be either) |
| bench | Bank / Flachbank | — |
| machine | Gerät | Maschine |
| engage your core | spann die Körpermitte an | aktiviere den Core, Core |
| cable | Kabelzug | Seilzug |
| Smith machine | Multipresse | Smith-Maschine |
| overhand grip | Obergriff | Ristgriff |
| underhand grip | Untergriff | Kammgriff |
| neutral grip | Neutralgriff | Hammergriff (that is a curl, not a grip) |
| resistance band / band | Widerstandsband | Band (on its own), Gummiband |
| kettlebell | Kettlebell (established loanword) | Kugelhantel |
| stability ball | Gymnastikball | Pezziball, Swiss Ball |
| medicine ball | Medizinball | — |
| pull-up bar | Klimmzugstange | — |
| glutes | Gesäßmuskulatur | Po, Glutes |
| hamstrings | Beinbeuger | Hamstrings |
| abs | Bauchmuskeln | Abs |
| abdomen | Bauch | Abdomen |
| calves | Waden | — |
| forearm | Unterarm | — |
| wrist | Handgelenk | — |
| hip | Hüfte | — |
| elbow | Ellenbogen | Ellbogen |
| shoulder blade | Schulterblatt | — |
| spine | Wirbelsäule | — |
| lats | Latissimus | breiter Rückenmuskel |
| quadriceps | Quadrizeps | — |
| set | Satz | Set |
| repetition / rep | Wiederholung | Rep |
| exhale / inhale | atme aus / atme ein | — |
| mat | Matte | — |

Avoid unnecessary anglicisms generally: German gym usage does borrow some terms (`Kettlebell`,
`Burpee`), but `Core`, `Glutes`, `Hamstrings`, `Reps` and `Sets` all have ordinary German
equivalents above and should use them.

## Recurring closing sentences

1,235 of the 7,710 steps end with a variant of "the desired number of repetitions" — 900 of them
with the identical sentence. Consistency there is worth more than variety, so these are fixed:

| English | German |
|---|---|
| Repeat for the desired number of repetitions. | Wiederhol die Bewegung für die gewünschte Anzahl an Wiederholungen. |
| Continue alternating sides for the desired number of repetitions. | Wechsle die Seiten ab, bis du die gewünschte Anzahl an Wiederholungen erreicht hast. |
| …, then switch sides / arms / legs. | …, wechsle dann die Seite / den Arm / das Bein. |

Note the second one: English says "**for** the desired number", and translating that literally
gives *"Wechsle die Seiten weiter für die gewünschte Anzahl"*, which is faithful and reads wrong.
German wants `bis du … erreicht hast`. Whatever the frame, the phrase itself is always
**`die gewünschte Anzahl an Wiederholungen`**.

## Register

Write full sentences, not telegraphic ones. `Wiederhol die Bewegung auf der anderen Seite`, not
`Wiederhol auf der anderen Seite`. The short imperative shortens the verb, not the sentence.

## Angles

116 steps give an angle and the English usually names no reference point (*"until your torso is at
a 45-degree angle"*). Add one **only where the exercise makes it unambiguous** — for a sit-up the
angle is to the floor, so `einen 45-Grad-Winkel zum Boden`. Where it is genuinely unclear, leave it
open rather than inventing a reference.

⚠ **This is the one rule in this file that no test can check.** Everything else here is enforced by
`frontend/src/lib/de-instructions.test.js`; angles are caught only by a human reading the sample.

## Two phrasings to avoid outright

- **Never the dative-reflexive passive** *„lass dir die Fußgelenke fixieren"*. Name the agent and
  keep it active: *„Lass einen Partner die Fußgelenke fixieren"*, *„fixier die Fußgelenke mit einem
  Widerstandsband"*. The reflexive reads suggestively rather than instructionally.
- **`positionieren` is stiff, for body parts and equipment alike.** English "position your hands
  behind your head" is *„leg die Hände hinter den Kopf"* — the concrete verb the movement actually
  uses. For a machine setting or an angle, German says `einstellen`: *„stell bei der Bank einen
  45-Grad-Winkel ein"*, never *„positionier die Bank in 45 Grad"*. This matches how `adjust` is
  already rendered — *„stell das Gerät auf deine gewünschte Höhe ein"*.

## Policy

The translation policy is meaning-faithful rather than word-for-word: preserve the number and
order of steps, retain the intended movement and safety cues, and clarify which limb is meant only
where the English would otherwise be ambiguous in German. Do not silently repair questionable
exercise mechanics from the source dataset; record those separately for upstream correction.
