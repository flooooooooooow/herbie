# Nonlinear diodes and resistive switches

`herbie.nl` solves dense DC modified nodal analysis with Newton–Raphson for Shockley diodes and resistive switches. Junction voltages are damped with SPICE-style `pnjlim`. Switch state changes are explicit events driven by a control voltage and threshold.

## Contract

Caller-owned `NlNetwork` buffers: element table, dense matrix/RHS/solution/previous/scratch, and mutable `elementCount` / `iterations` cells.

1. `nlClear` then add elements: `nlAddResistor`, `nlAddCurrentSource`, `nlAddVoltageSource`, `nlAddDiode(anode,cathode,Is,nVt)`, `nlAddSwitch(a,b,Ron,Roff,closed)`.
2. `nlSolve` runs up to `maxIter` Newton steps with relative/absolute tolerances; returns false on non-convergence or singular linearised systems.
3. `nlSwitchEvent(id, vControl, threshold)` closes when open and `vControl >= threshold`, opens when closed and `vControl < threshold`, and returns whether the discrete state flipped.
4. Read `nlNodeVoltage`, `nlDiodeVoltage`, `nlDiodeCurrent`, `nlSwitchIsClosed`.

Diode model: `Id = Is (exp(Vd/(n Vt)) - 1)`. Default test constants match Flow's circuit examples: `Is = 1e-14 A`, `n Vt = 25.852 mV`. Switches use finite `Ron`/`Roff` (resistive idealisation).

## Validation

```sh
flow run tests/nl_devices.flow
```

| Fixture | Reference | Tolerance |
| --- | --- | --- |
| Pinned diode Vd sweep (−0.4…1.0 V) | Shockley current | relative ≤ 1e-9 |
| Series 1 kΩ + diode Vsrc sweep | Independent bisection on `Vd + R Id = V` | absolute ≤ 1e-9 V |
| Forward decade slope at 10 µA / 100 µA | `n Vt ln(10)` ≈ 59.526 mV | 1e-6 V |
| Open/closed switch divider | Analytic resistive divider with Roff/Ron | 1e-9 V |
| Switch events | Flip only on threshold crossing | boolean |
| Half-wave DC (±5 V) | KVL and Shockley on load; reverse load ≈ 0 | 1e-9 / 1e-6 V |
| `maxIter = 1` | Non-convergence | rejected |

## Boundary

DC operating points only. No transient diode capacitance, no ideal zero-Ron MNA branch switch, no BJT, no automatic event localisation in continuous time. Transient switching and SPICE waveform comparisons remain open under the electrical circuit solver roadmap.
