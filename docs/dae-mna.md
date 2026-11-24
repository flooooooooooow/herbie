# Index-1 DAE MNA transient

`herbie.dae` is a dense, caller-owned modified-nodal-analysis transient solver for linear R/C/L networks. Capacitors and inductors use companion models for **backward Euler** (`DAE_BE`) and **trapezoidal** (`DAE_TRAP`). Unknowns are node voltages, ideal voltage-source currents, then inductor branch currents. Ground is `-1`.

## Contract

1. `daeClear` then add elements: `daeAddResistor`, `daeAddCapacitor`, `daeAddInductor`, `daeAddVoltageSource`, `daeAddCurrentSource`.
2. Consistent initialization: `daeInitDc` (capacitors open, inductors short) seeds C/L history from the DC operating point; or set ICs with `daeSetCapVoltage` / `daeSetInductorCurrent` and call `daeInitUic`.
3. `daeStep` / `daeRun` advance under a deterministic `maxSteps` cap; each step reassembles companions and factors the dense MNA system.
4. Read `daeNodeVoltage`, `daeBranchCurrent`, `daeSourcePower`, `daeResistorPower`, `daeStoredEnergy`, `daeMaxResidual`.

Companion models (step `h`):

| Element | BE | TRAP |
| --- | --- | --- |
| C | `Geq=C/h`, `Ieq=Geq·v_prev` | `Geq=2C/h`, `Ieq=Geq·v_prev+i_prev` |
| L | `v=(L/h)(i−i_prev)` | `v=(2L/h)(i−i_prev)−v_prev` |

## Validation

```sh
flow run tests/dae_mna.flow
```

| Fixture | Reference | Tolerance |
| --- | --- | --- |
| RC BE step (1 kΩ, 1 µF) | `1−e^{−t/τ}` | max err ≤ 5e-3 over 5 ms at h=10 µs |
| RL BE step (100 Ω, 0.1 H) | `(1/R)(1−e^{−t/τ})` | max err ≤ 5e-5 A |
| Series RLC BE | Analytic underdamped step | max err ≤ 2e-2 over 5 ms at h=1 µs |
| LC oscillator TRAP UIC | Energy drift ≤ 0.1% over ~2 periods | relative |
| RC TRAP vs ngspice-42 | Stored 1/2/5 ms meas | 5e-4 V |
| Floating R network | `daeInitDc` rejected | — |
| `maxSteps` | Further `daeStep` rejected | — |

Ngspice provenance: `tests/ngspice_refs/rc_tran.*` and `PROVENANCE.md`.

## Acceptance checklist (issue #11)

- [x] Index-1 DAE handling (companion MNA)
- [x] Consistent initialization (`daeInitDc` / UIC)
- [x] RC, RL, RLC step fixtures; LC oscillator
- [x] Power helpers (`daeSourcePower` / `daeResistorPower` / `daeStoredEnergy`)
- [x] Singular / ungrounded rejection; deterministic `maxSteps`
- [x] External ngspice transient point check (RC)

## Boundary

Linear R/C/L only. No diodes/switches in this module, no sparse DAE path, no adaptive `h`, no WCET/real-time qualification.
