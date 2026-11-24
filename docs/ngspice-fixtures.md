# Broader ngspice-42 fixtures

Additional stored ngspice-42 cross-checks beyond the initial divider / RC AC / diode OP set.

| Circuit | Analysis | Herbie | Tolerance |
| --- | --- | --- | --- |
| Unbalanced resistive bridge (10 V) | `.op` | `herbie.mna` | 1e-6 V / 1e-8 A |
| Four-diode bridge rectifier (+5 V, 1 kΩ) | `.op` | `herbie.nl` | 5e-3 V (fixed nVt vs TEMP=27) |
| Series RLC step (100 Ω / 0.1 H / 1 µF) | `.tran` UIC | `herbie.dae` TRAP | 2e-2 V at 1/2/5 ms |

## Provenance

Decks, raw logs, curated `.print` extracts and `values.tsv` rows live under `tests/ngspice_refs/`. Commands and host stamp: [PROVENANCE.md](../tests/ngspice_refs/PROVENANCE.md).

```sh
flow run tests/ngspice_fixtures.flow
```

CI does not install ngspice.

## Acceptance checklist (#11)

- [x] Diode rectifier fixture (multi-diode bridge) vs external SPICE
- [x] Additional network (bridge) and RLC transient waveform points
- [x] Provenance recorded (version + command)

## Boundary

Hand-chosen fixtures only. Not a claim of general SPICE/Simscape parity or AC/transient sweep libraries.
