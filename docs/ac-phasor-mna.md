# AC phasor MNA

`herbie.ac` assembles a dense modified-nodal-analysis system in the frequency domain for linear R/C/L networks with independent voltage and current sources. It is an analytical validation slice under [#11](https://github.com/flooooooooooow/herbie/issues/11), not sparse solving, switching, nonlinear devices or SPICE parity.

## Contract

Construct an `AcNetwork` with positive `omega` (rad/s), caller-owned row-major `matrix` of length `(2n)²` and `rhs` of length `2n`, where `n = nodeCount + voltageSourceCount`. Nodes are `0..nodeCount-1`; ground is `-1`.

1. `acClear(n)` zeroes the system and rejects non-positive `omega`.
2. Stamp elements: `acStampResistor`, `acStampCapacitor`, `acStampInductor`, `acStampCurrentSource(from,to,re,im)`, `acStampVoltageSource(index,plus,minus,re,im)`.
3. `acSolve(n, solution, scratchMatrix, scratchRhs, absolutePivotTolerance)` writes the real block solution without mutating the stamped matrix/RHS.
4. Inspect `acMaxResidual`, `acMagnitude`, `acPhase` and `acAveragePower`.

Solution layout for unknown count `n`:

```text
[x_re(0 .. n-1), x_im(0 .. n-1)]
```

Node voltages occupy indices `0 .. nodeCount-1` (real) and `n .. n+nodeCount-1` (imag). Voltage-source branch currents follow the node block and are positive from plus to minus. Peak phasors are used; average power is `0.5 * Re(V conj(I))`.

## Equations

Complex MNA is expanded to a real `2n` system:

```text
[ G  -B ] [x_re] = [b_re]
[ B   G ] [x_im]   [b_im]
```

with admittance `Y = G + j B`. Resistors contribute conductance `1/R` to `G`. Capacitors contribute susceptance `ωC` to `B`. Inductors contribute `-1/(ωL)` to `B`. Ideal voltage sources add incidence columns/rows exactly as in `herbie.mna`, duplicated for the imaginary block.

## Validation

```sh
flow run tests/ac_phasor_mna.flow
flow run examples/ac_phasor_demo.flow
```

Fixtures and absolute tolerances:

| Fixture | Analytic reference | Tolerance |
| --- | --- | --- |
| 12 V resistive divider at 1 krad/s | 12 V / 6 V / −6 mA, imag = 0; average source/load power 36 mW | 1e-10 V, 1e-12 A/W; residual ≤ 1e-12 |
| Series RC low-pass (`R=1 kΩ`, `C=1 µF`, `ω=1000`) | `|H|=1/√2`, `∠H=−π/4`; R and C branch currents match | 1e-10 on H; 1e-12 A |
| Series RL (`R=100 Ω`, `L=0.1 H`, `ω=1000`) | `|I|=1/(100√2)`, `∠I=−π/4` | 1e-12 A, 1e-10 rad |
| Series RLC at `ω₀=1/√(LC)` | Source current `−1/R`; `|Vc|=|I|/(ωC)`, `∠Vc=−π/2` | 1e-10 A, 1e-8 V/rad |
| Nodal R‖C driven by 1 mA | `V=0.5−j0.5` V | 1e-12 V |

Invalid stamps, `omega ≤ 0` and floating networks are rejected.

## Boundary

Dense O(n³) only; require `omega > 0`. No switches, diodes, controlled sources, adaptive frequency sweep API, sparse indefinite solvers, netlist I/O or external SPICE cross-checks in this increment. Transient RLC remains in `herbie.transient`; resistive DC voltage-source MNA remains in `herbie.mna`.
