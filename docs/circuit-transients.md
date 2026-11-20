# Linear circuit transient increment

Herbie reuses `stdlib/circuit.flow` from the existing pinned Flow revision rather than duplicating its solver. The facade is `herbie.transient`. This is an analytical validation slice under #11, #3 and #9, not general DAE, SPICE or real-time qualification.

## Contract

Call `transientReset(nodeCount, dt, elements, capacity)` with a caller-owned `TransientElement` buffer that outlives the entire session. Nodes are contiguous 0..nodeCount-1; ground is -1. The adapter translates to upstream numbering by adding one. Element constructors are `transientResistor(a,b,ohms)`, `transientCapacitor(a,b,farads)`, `transientInductor(a,b,henries)`, `transientVoltageSource(plus,minus,volts)` and `transientCurrentSource(from,to,amperes)`. They return a nonnegative handle or -1 without accepting an invalid stamp.

Call `transientInitialize()` to solve the DC operating point. Capacitors begin at that operating-point voltage and inductors at its current. `transientSetSource(handle,value)` changes an independent source at a step boundary; `transientStep()` advances exactly the timestep supplied to reset. Read `transientVoltage(node)`, `transientCurrent(handle)` and `transientTime()`. All currents are positive from the first terminal to the second, including voltage-source current.

Only one session may exist per process. Do not interleave raw `circ_*` calls with the facade. Reset replaces the session. The buffer is borrowed and must not be modified by the caller during use. Upstream allocates its fixed workspace on first reset; stepping reuses it. Limits are 80 non-ground nodes, 80 voltage-source/inductor branch unknowns, and 256 elements. This is not a reentrant caller-owned solver context.

All nodes must have a DC path to ground through R/L/V elements. V/L cycles are rejected, including redundant ideal-source constraints. Capacitor-only DC paths, arbitrary initial conditions, switching, nonlinear devices, adaptive integration and trapezoidal stepping are outside this facade. The backend supports additional methods/devices, but their existence does not qualify them here.

## Equations and checks

The linear descriptor equation is `E x' + K x = b`, with node voltages and voltage-source/inductor currents in x. Backward Euler solves `(K + E/h) x[n] = b[n] + E x[n-1]/h`.

Capacitors obey `i[n] = C (v[n]-v[n-1])/h`; inductors obey `v[n] = L (i[n]-i[n-1])/h`. Each accepted step independently checks these laws, resistor Ohm's law, source constraints and node KCL. Current residual tolerance is 1e-12 A; voltage residual tolerance is 1e-12 V. These absolute thresholds deliberately restrict this increment to small, well-scaled SI fixtures. No condition-number or general scale-robustness claim is made. Default upstream gmin is disabled so leakage cannot disguise a floating circuit.

`transientStatus()` reports 0 for a valid session, 1 for invalid reset parameters, 2 for upstream allocation/capacity/factorization failure, 3 for nonfinite output or physical-residual failure, and 4 for unsupported DC topology. Construction/source edits return failure directly for bad arguments without changing accepted elements. On solve/residual failure the session is invalidated and requires reset. Public accepted time does not advance on failure; backend observations may contain the failed trial and must be discarded. This is invalidation, not rollback. Backend factorization errors remain grouped; a more detailed diagnostic record is future work.

## Validation

Run from the Herbie root with the pinned compiler on PATH:

```sh
flow run tests/circuit_network.flow
flow run tests/mna_voltage_sources.flow
flow run tests/electromechanics.flow
flow run tests/circuit_transient.flow
```

The transient test covers DC source orientation, RC/RL discrete backward-Euler recurrence and continuous closed forms, passive decay, a damped series RLC closed form, KCL/component residuals on every step, and source energy = resistor dissipation + stored-energy change + backward-Euler numerical dissipation. RC is 1 kohm/1 uF; RL is 100 ohm/0.1 H; RLC is 100 ohm/0.1 H/1 uF, each with a 1 V step after a zero-source operating point.

RC/RL refinement uses 10/5/2.5 us over 5 ms; RLC uses 1/0.5/0.25 us over 5 ms. Consecutive maximum-error ratios must fall between 1.87 and 2.14 (approximately order 0.9..1.1), and finest normalized trace error must be below 1e-3. Tests also reject zero timestep, negative/nonfinite components, invalid nodes, capacity exhaustion, floating networks and conflicting ideal sources.

## Subsequent boundaries

First obtain green native CI and retain the DC regressions. Next extract reentrant workspace and solver/timebase/diagnostic contracts upstream under #3, with allocation auditing and explicit initialization semantics. AC analysis can then add phasor stamping and analytical RC/RL/RLC impedance references. Sparse assembly must arrive with an appropriate indefinite sparse solver and dense-reference comparisons; assembly alone is not a scalable solver. Independent external SPICE comparisons and larger-network measurements remain open under #9/#11. None of these acceptance items is closed by the present PR.
