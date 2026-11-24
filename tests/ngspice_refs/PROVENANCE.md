# ngspice reference provenance

Generated on the Herbie Cloud Agent VM for issue #11 cross-validation.

| Field | Value |
| --- | --- |
| Tool | ngspice 42 (`ngspice` package `42+ds-3build1` on Ubuntu noble) |
| Reported banner | `ngspice-42 : Circuit level simulation program` / Compiled with KLU Direct Linear Solver |
| Host | `Linux 6.12.113+ x86_64` |
| UTC timestamp | `2026-11-24T21:13:20Z` |
| Working directory | repository root (decks under `tests/ngspice_refs/`) |

## Commands

```sh
ngspice --version
ngspice -b tests/ngspice_refs/divider.cir | tee tests/ngspice_refs/divider.raw
ngspice -b tests/ngspice_refs/rc_ac.cir   | tee tests/ngspice_refs/rc_ac.raw
ngspice -b tests/ngspice_refs/diode.cir   | tee tests/ngspice_refs/diode.raw
```

Curated print lines are copied into `*.print`; tabulated SI values are in `values.tsv`.

## Circuits

1. **divider** — 12 V / 1 kΩ / 1 kΩ DC operating point (`.op`).
2. **rc_ac** — series R=1 kΩ, C=1 µF, AC magnitude 1 V at `f = 1000/(2π)` Hz so `ω = 1000` rad/s (`.ac lin 1 …`).
3. **diode** — 5 V → diode (`IS=1e-14 N=1`) → 1 kΩ to ground at `TEMP=27` (`.op`).

## Regeneration

`scripts/regen_ngspice_refs.sh` re-runs the three batch decks and refreshes `*.raw` / `*.print` / `values.tsv` / this provenance stamp. CI does **not** require ngspice: `tests/ngspice_crossval.flow` compares Herbie solvers against the stored reference numbers.
