# Zero-Ron ideal switch (MNA branch current)

`herbie.ideal_sw` adds dense DC modified nodal analysis with **ideal** switches. A closed switch is a 0 V constraint with an explicit branch-current unknown (same incidence pattern as an ideal voltage source). An open switch forces that branch current to zero with a unit diagonal and no nodal incidence, so the system size stays fixed.

This is not the finite Ron/Roff model in `herbie.nl`.

## Contract

1. `iswClear` then add `iswAddResistor` / `iswAddCurrentSource` / `iswAddVoltageSource` / `iswAddSwitch(index,a,b,closed)`.
2. `iswSolve` assembles and factors. Read `iswNodeVoltage`, `iswSwitchCurrent`, `iswVoltageSourceCurrent`.
3. `iswSwitchEvent(id, vControl, threshold)` closes when open and `vControl >= threshold`, opens when closed and `vControl < threshold`, and reports whether state flipped.
4. `iswSourcePower` / `iswResistorPower` / `iswMaxResidual` for power-balance and residual checks.

## Validation

```sh
flow run tests/ideal_switch.flow
```

| Fixture | Reference | Tolerance |
| --- | --- | --- |
| Closed SW in series divider | mid=out=6 V; `Isw=6 mA`; Vdrop=0 | 1e-12 |
| Open SW | mid=12 V, out=0, Isw=0 | 1e-12 |
| Threshold events | flip only on crossing; re-solve | boolean + 1e-12 |
| Source/load power (closed) | equal | 1e-12 W |
| Floating two-node R | solve rejected | — |

## Acceptance checklist (#11)

- [x] Ideal switch with explicit event semantics
- [x] Branch-current (zero-Ron) MNA formulation — not a tiny resistor
- [x] Power-balance check
- [x] Singular / ungrounded rejection

## Boundary

DC linear resistive networks only. No transient switching localisation, no AC, no diodes in this module.
