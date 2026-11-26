# Numerical validation and engineering contracts

## Regression levels

**Level 1, implemented:** analytically checkable elementary stress, elastic extension, thermal expansion, fit clearances, RSS, Cpk, PID output bounds, linear-powertrain kinematics, and zero-input equilibrium. The undamped quarter car is integrated with fixed-step RK4 and checked for bounded energy drift over 10,000 steps. A 2D linear-elastic horizontal truss reference and two-/three-variable correlated variances are also tested. Tests live in `tests/` and CI runs them with a pinned Flow compiler revision.

**Level 2, partial:** `tests/ode_platform.flow` measures observed convergence order for forward Euler (~1) and RK4 (~4) on `y'=-y` via dt refinement, checks undamped harmonic energy and analytic phase, semi-implicit Euler bounded energy drift, zero-crossing event time against `π/(2ω)`, and multirate/trace bookkeeping. `tests/verification_matrix.flow` loads versioned scenario CSVs, exports absolute/relative/RMS error budgets and observed orders, and enforces readiness-label discipline (`experimental` / `validated_for_domain` / `realtime_qualified_for_target`; never `safety_assessed` from CI). Still open: stiff-system rejection, independent high-precision reference integrations, randomized/property tests, sensitivity/Jacobian comparisons, sustained million-step profiling, memory/stack auditing and target WCET.

**Level 3, not yet implemented:** validated vehicle/rig datasets, test-bench/HIL comparison, measurement uncertainty, traceable material data, fault injection, production-target WCET measurement and release qualification.

## Core equations

Quarter car uses positive upward displacement and measured-from-static-equilibrium coordinates:

```text
Fs = ks (zs - zu) + cs (vs - vu)
Ft = kt (zu - zr) + ct (vu - vr)
ms z̈s = -Fs
mu z̈u = Fs - Ft
E = ½ ms vs² + ½ mu vu² + ½ ks (zs - zu)² + ½ kt (zu - zr)²
```

For nonzero damping or a changing road, energy is not conserved. The energy test therefore disables damping and holds the road stationary.

Planar bicycle uses linear lateral tire forces:

```text
alpha_f = delta - (vy + lf r) / vx
alpha_r = -(vy - lr r) / vx
Fyf = Cf alpha_f
Fyr = Cr alpha_r
v̇y = (Fyf + Fyr) / m - vx r
ṙ = (lf Fyf - lr Fyr) / Iz
```

The equations are **not valid at vx = 0**, at large slip angles, or beyond tire-force saturation.

Worst-case dimension arithmetic treats each input dimension as an independent allowable interval. For `clearance = hole - shaft`, the minimum is `hole_min - shaft_max` and maximum is `hole_max - shaft_min`. RSS standard deviation presumes uncorrelated input variation; real manufacturing correlations invalidate that approximation. Cp and Cpk formulas presume a measured stable process; they do not certify it.

## Safety boundaries

Flow is not an ISO 26262-qualified toolchain merely because it emits native code. Herbie has no ASIL claim, FEA correlation evidence, metrology accreditation or production quality-system certification. Physical validation, uncertainty budgeting, calibration, diagnostics, monitoring, and independently assessed safety evidence are required for regulated use.

## Reproducibility

Run `flow run tests/engineering_smoke.flow` and `flow run tests/vehicle_energy.flow` from the package root. Record the exact Flow compiler revision, OS, hardware, compilation flags, numerical results and timing histograms for any future claimed benchmark. No throughput or WCET figures are claimed by this release.

## New reference tests

\`tests/truss_uncertainty.flow\` checks a 1 m horizontal bar with 200 GPa modulus and 100 mm² section, giving 20 MN/m axial stiffness, 20 kN force for 1 mm extension, and 10 J elastic strain energy. It checks the sign pattern of the row-major stiffness matrix and verifies that a degenerate zero-length bar is rejected. Correlated dimension variance is tested against uncorrelated and perfectly correlated analytical cases.

## Electromechanical and engine regression

`tests/electromechanics.flow` checks analytical single-time-constant RC/RL steps, ideal lossless series RLC energy conservation, undamped torsional-oscillator energy conservation, ideal gear power balance and an idealised electromechanical DC motor with matching SI torque and back-EMF constants. It deliberately tests energy preservation only for parameter sets without dissipative losses or external work. `tests/engine_battery.flow` checks exact bilinear mapping and clamped extrapolation, speed conversion, torque equilibrium, idealized fuel-energy arithmetic, battery coulomb count and exact first-order RC polarization. These tests do not validate engine combustion, battery electrochemistry, power electronics, component temperature or embedded real-time timing.

## Nodal analysis baseline

`tests/circuit_network.flow` builds a 2-node 1 kΩ resistor network with a 10 mA current source from ground. The analytically expected DC voltages are 6⅔ V and 3⅓ V. It confirms conductance assembly, sign conventions, KCL residual under 10^-12 A, balance of source power with resistor dissipation, unchanged inputs after solving, invalid stamp rejection and floating-network singularity detection. This does not constitute nonlinear circuit or stiff transient validation.

## Equation-first native Flow validation (7687fc936365 compiler)

`examples/equation_vehicle.flow` uses actual Flow `flow Name { ... }` declarations with coupled `evolves as` equations and `solver { dt 1 ms method rk4 }`. A four-second constant-force test checks speed = 4 m/s and distance = 8 m for a 1 m/s² analytic trajectory. A damped quarter-car model is independently integrated by the generated Flow RK4 and existing `herbie.vehicle.quarterCarStep` at the same 1 ms step; final state components must agree within 10⁻⁸ SI. An undamped reference checks relative mechanical energy drift below 0.001 after 5 seconds.

This establishes one model/solver/kernel agreement slice but **not** broad numerical convergence, numerical certification, hardware real-time qualification, DAE capability, exact Flow/JavaScript parity, or a full vehicle model. See [numerical platform issue #3](https://github.com/flooooooooooow/herbie/issues/3) and [verification issue #9](https://github.com/flooooooooooow/herbie/issues/9).

## Covariance-aware dimensional stack validation

`tests/linear_stackups.flow` verifies a 20.00 mm bore minus 19.90 mm shaft nominal and interval 0.030–0.170 mm. With σ = 30/20 μm, perfect positive correlation gives clearance σ = 10 μm, independence yields variance 1.3×10⁻⁹ m², and perfect negative correlation gives 50 μm. Asymmetric covariance, a non-positive-semidefinite matrix, and negative half-widths are rejected; a zero covariance matrix is admitted. The method uses a caller-owned Cholesky-like factor with semidefinite pivot treatment and a relative matrix tolerance; its treatment of nearly singular matrices depends on the supplied tolerance. All dimensions are in metres; a 3D datum hierarchy remains unimplemented.

## Block-graph scaffold (issue #8)

`tests/block_graph.flow` checks:

- Valid DAG schedules with continuous source before discrete sinks
- Algebraic loop (cycle) rejected with fault 2; discrete rate down-sampling only by integer multiples
- Canonical i32 serialize → deserialize preserves schedule order

Visual authoring UI, Flow module codegen, graph↔code round-trip text and native WASM execution remain open under [#8](https://github.com/flooooooooooow/herbie/issues/8).

## Calibration pipeline (issue #17)

`tests/calibration_pipeline.flow` checks:

- Explicit train/val split rejection when sizes exceed data; affine LS recovers exact plane
- Changing validation targets does not change coefficients (no leakage)
- MAD outlier gate removes planted spike; golden-section recovers slope=2
- CSV fixture `tests/scenarios/torque_surface.csv` recovers T=20+30x+80y after outlier reject

DOE planners, multi-map fitting with regularization catalogs, and full uncertainty-of-fit reporting remain open under [#17](https://github.com/flooooooooooow/herbie/issues/17).

## Thermo-fluid / cooling loop (issue #16)

`tests/thermo_fluid.flow` checks:

- Hagen–Poiseuille Δp, orifice √(2Δp/ρ) with sign, linear pump shutoff
- Analytic pump-pipe operating point (Q and Δp match)
- Hydraulic volume integration; balanced ε-NTU = NTU/(1+NTU); closed-loop T = Tamb + Q/UA
- Coolant node transient converges to the steady radiator balance

Compressible flow, cavitation, valve maps, hydraulic actuators and DAE fluid networks remain open under [#16](https://github.com/flooooooooooow/herbie/issues/16).

## Electric drives / FOC (issue #12)

`tests/electric_drive.flow` checks:

- Amplitude-invariant Clarke peak-A and Park round-trip
- PM and reluctance torque formulas; locked-rotor ohmic currents; steady vd/vq drop
- Averaged inverter |v_dq| clip at Vdc/√3; FOC tracks id/iq at matched rate and at 1 kHz / 10 kHz multirate

Switching PWM, BLDC six-step, induction machines, observers, device loss maps and thermal saturation remain open under [#12](https://github.com/flooooooooooow/herbie/issues/12).

## Battery pack / BMS / thermal (issue #14)

`tests/battery_pack.flow` checks:

- Ns×Np scaling of capacity, voltage and resistance; SOH multiplies capacity
- Strict OCV map mid-cell pack voltage; out-of-domain rejected
- Discharge current limit, ohmic heating raising temperature, over-temp contactor open
- Passive balance ΔSOC drains the higher-SOC cell; no invented ageing curves

Coolant network, pre-charge, Kalman SOC/SOH estimators, cycle degradation and chemistry identification remain open under [#14](https://github.com/flooooooooooow/herbie/issues/14).

## Mean-value mapped engine (issue #13)

`tests/meanvalue_engine.flow` checks:

- Strict bilinear rejects out-of-domain queries; in-domain mid-cell value 97.5 N·m
- Analytic throttle/engine air mass balance holds manifold pressure steady
- Grid-node replay of torque/fuel/VE/Texh maps; AFR = ṁ_air/ṁ_fuel; shaft work = TωΔt
- No emissions maps or invented emission factors

Turbo, crank-angle combustion and ECU faults remain open under [#13](https://github.com/flooooooooooow/herbie/issues/13).

## Driveline kernels (issue #15)

`tests/driveline.flow` checks:

- Undamped pendulum energy drift < 1e-6 and small-angle quarter-period within 1% of `2π√(L/g)`
- Lossless two-inertia shaft energy conservation; static `T = k θ`
- Open differential equal side torques and `P_in = P_out` identity
- Coulomb clutch ±capacity·engagement and NaN on invalid engagement

Quaternions, 6-DOF joints, torque converters and full multibody coupling remain open under [#15](https://github.com/flooooooooooow/herbie/issues/15).

## Native seven-DOF full-car ride (issue #4)

`herbie.fullcar` ports the browser seven-configuration-coordinate ride plant to native Flow with identical hardpoints and default parameters. `tests/fullcar_ride.flow` checks:

- Flat-road rest over 2 s (state ≤ 1e-12) and positive static normal loads
- Undamped energy relative drift < 0.001 over 1 s; state matches recorded `site/fullcar.js` samples to 1e-9
- One-step FL 30 mm road bump wheel state matches JS to 1e-12; sustained bump excites roll and pitch
- Damped energy falls below 2% of the initial value in 4 s; nonpositive `dt` rejected

Nonlinear tires, brakes/ABS, driveline, kinematic hardpoint validation and rig calibration remain open under [#4](https://github.com/flooooooooooow/herbie/issues/4).

## Valve-controlled hydraulic cylinder (issue #16)

`tests/hydraulic_cylinder.flow` checks `herbie.hydraulics`:

- Four-way spool metering edges equal the `herbie.fluids` orifice law for both spool directions, close at u = 0 and saturate beyond full spool travel
- A through-rod cylinder at half spool against 2 kN settles to the analytic speed Cd·a·√(2Δp_edge/ρ)/A with Δp_edge = (p_S − p_T − F/A)/2 (0.06293 m/s, within 10⁻⁴ relative), p_A − p_B = F/A and equal edge drops
- With the valve closed the trapped oil rings at 2π·√(m/k), k = β(A_A²/V_A + A_B²/V_B) (10.61 ms, within 0.2 %), and a 1 kN load deflects it by −F/k within 1 %
- End stops hold the piston at the stroke limit with zero velocity while chamber A rises to supply and B drains to tank; an overrunning 40 kN load starves chamber A, which is clamped at vapour pressure and flagged

Two-phase cavitation, temperature-dependent bulk modulus and entrained air, seal friction (Stribeck), proportional-valve dynamics and pressure-relief valves remain open.

## Global 2D truss FEM (issue #5)

`tests/fem_truss.flow` assembles pin-jointed meshes from `herbie.truss` elements:

- Single bar: tip `u = FL/AE = 10^{-4}` m, axial force 1000 N, support reaction −1000 N, free residual ≤ 1e-8
- Two equal bars in series: mid/tip displacements 0.2 mm / 0.4 mm
- Symmetric V-truss under vertical load: `uy = −F/(EA√2)`, `ux=0`; dense GE vs CSR CG agree to 1e-10; each support carries 500 N
- Degenerate self-loop elements rejected

Beams, plates, solids, plasticity and mesh-convergence suites remain open under [#5](https://github.com/flooooooooooow/herbie/issues/5).

## Seeded Monte Carlo and process indices (issue #6)

`tests/montecarlo_stack.flow` advances manufacturing tolerance acceptance with:

- Independent Gaussian MC clearance mean/σ matching analytic RSS (√1.3×10⁻⁹ m²) and empirical 2.5%/97.5% percentiles near ±1.96σ
- Correlated MC σ matching `stackEvaluate` for perfect positive correlation (10 μm)
- Uniform ±half-width samples staying inside the worst-case interval and replaying under a fixed seed
- Analytic Pp/Ppk for mean=10, σ=1, [7,13] and shifted mean=11
- X̄ chart 3σ limits for n=4 subgroups: UCL/LCL = 10 ± 1.5

This is **not** a GD&T datum solver, gauge R&R ANOVA package or certified SPC system. See [issue #6](https://github.com/flooooooooooow/herbie/issues/6).

## Modified nodal analysis validation (DC source stamping)

`tests/mna_voltage_sources.flow` independently verifies a 12 V source with two 1 kΩ resistors in series. Node voltage is 6 V at the divider, and the oriented voltage-source current is -6 mA. Two resistors dissipate 72 mW while the source delivers 72 mW (power equality tolerance 10⁻¹² W); the maximum KCL/KVL residual must stay below 10⁻¹² in the SI-form mixed rows. After a 1 mA current injection at the divider, its node rises to 6.5 V and the ideal source current becomes -5.5 mA. Invalid element stamps and floating networks are rejected. The solver is dense and cubic in unknown count, so it is not adequate for large sparse electrical networks, diode nonlinearities, AC admittance or index-1 transient DAE. Those remain in [issue #11](https://github.com/flooooooooooow/herbie/issues/11).

## Linear network transients

See [the transient contract and analytical gates](circuit-transients.md). `flow run tests/circuit_transient.flow` verifies fixed-step backward Euler using the shared Flow circuit backend. General DAE initialization, external SPICE comparison and real-time qualification remain open.

## Verification matrix (issue #9)

`herbie.verify` defines readiness labels and refuses to treat unit-test success as `safety_assessed`. Scenario files under `tests/scenarios/` are format-version-1 CSV with `#` metadata (id, model, compiler pin, SI provenance). `verifyParseCsvTable` loads numeric rows; `verifyErrorBudget` reports max absolute/relative and RMS errors against per-sample tolerances; `verifyObservedOrder` exports measured convergence order from two step sizes.

`tests/verification_matrix.flow` gates:

- Decay RK4 samples at t=0/0.5/1 s against analytic `e^{-t}` via `decay_rk4.csv`
- Euler (~1) and RK4 (~4) observed orders on the same plant
- 12 V MNA divider unknowns against `mna_divider.csv`
- Undamped quarter-car energy invariant within the published 0.001 relative drift
- Rejection of malformed CSV and of test-assigned `safety_assessed`

This does **not** claim WCET, stack audits, real vehicle datasets or ISO 26262. See [verification issue #9](https://github.com/flooooooooooow/herbie/issues/9).

## Shared ODE platform (issue #3)

`herbie.ode` is an explicit fixed-step integrator surface with validated configuration, caller-owned buffers and no hot-path allocation. `tests/ode_platform.flow` checks:

- Rejected nonpositive `dt` and zero dimension
- Forward Euler and RK4 accuracy on `y'=-y` against `e^{-t}`
- Observed orders ≈1 (Euler) and ≈4 (RK4) under dt halving
- Undamped harmonic oscillator RK4 vs closed form and relative energy drift < 10⁻⁸ over 5 s
- Semi-implicit Euler bounded energy oscillation for the same plant
- Linear zero-crossing time for `cos(ωt)` within one millisecond of `π/(2ω)`
- Multirate 4:1 slow ticks and reproducible step traces

This does **not** deliver implicit stiff DAE, adaptive steppers, general function-pointer plants, WCET measurement or unit-typed state vectors inside the integrator. See [numerical platform issue #3](https://github.com/flooooooooooow/herbie/issues/3).

## AC phasor MNA validation

`tests/ac_phasor_mna.flow` solves linear R/C/L networks in the frequency domain. A 12 V resistive divider at 1 krad/s reproduces the DC voltages and −6 mA source current with zero imaginary parts (1e-10 V / 1e-12 A) and 36 mW average source/load power balance. Series RC (`R=1 kΩ`, `C=1 µF`, `ω=1000`) matches `|H|=1/√2` and `∠H=−π/4` within 1e-10. Series RL (`R=100 Ω`, `L=0.1 H`) matches `|I|=1/(100√2)` and `∠I=−π/4`. Series RLC at `ω₀=1/√(LC)` yields source current `−1/R` and capacitor voltage magnitude `|I|/(ωC)` with phase `−π/2`. A nodal R‖C driven by 1 mA gives `V=0.5−j0.5` V. Floating networks and invalid stamps are rejected. See [ac-phasor-mna.md](ac-phasor-mna.md). Switches, diodes and SPICE comparisons were completed under [#11](https://github.com/flooooooooooow/herbie/issues/11).

## Sparse DC MNA assembly validation

`tests/sparse_mna.flow` stamps the 12 V / 1 kΩ / 1 kΩ divider into COO (7 triplets → CSR nnz 6 after merge), and recovers 12 V / 6 V / −6 mA with residual ≤ 1e-12. After a 1 mA injection the sparse solution and expanded matrix match `herbie.mna` within 1e-12 / 1e-15. Capacity overflow and floating networks are rejected. See [sparse-mna.md](sparse-mna.md). Factorisation remains dense after CSR expansion.

`tests/sparse_bench.flow` builds a 40-node ladder, checks sparse≡dense within 1e-9, and prints CPU-tick timings for rebuild+solve. Recorded host sample and interpretation: [sparse-runtime.md](sparse-runtime.md). Not a WCET claim.

## Nonlinear diode and switch validation

`tests/nl_devices.flow` checks Shockley currents for a voltage-pinned diode (relative ≤ 1e-9), series 1 kΩ+diode against independent bisection (≤ 1e-9 V), forward decade slope at 10 µA/100 µA within 1e-6 V of `n Vt ln 10`, open/closed resistive-switch dividers, explicit threshold events, ±5 V DC half-wave rectifier KVL/Shockley, and `maxIter=1` non-convergence. See [nl-devices.md](nl-devices.md).

## Versioned netlist validation

`tests/netlist.flow` parses format-version-1 decks, stamps them into `herbie.mna` / `herbie.ac` / `herbie.nl`, and round-trips through `netlistExport`. The 12 V divider recovers 6 V / −6 mA; series RC at `ω=1000` matches `0.5−j0.5` V; a diode+switch deck satisfies Shockley+KVL within 1e-9 A; engineering suffixes and skipped `.model` cards are checked; unsupported format versions are rejected. See [netlist.md](netlist.md).

## ngspice cross-validation

`tests/ngspice_crossval.flow` compares Herbie MNA/AC/NL (and netlist stamps) against stored ngspice-42 prints for a DC divider (1e-12), series RC AC at `ω=1000` (1e-9 V), and a 5 V diode OP (1e-3 V, fixed-`nVt` vs `TEMP=27`). Provenance and decks: `tests/ngspice_refs/`. See [ngspice-crossval.md](ngspice-crossval.md).

`tests/ngspice_fixtures.flow` adds an unbalanced resistive bridge (1e-6 V), a four-diode bridge rectifier (5e-3 V), and series RLC transient points at 1/2/5 ms (2e-2 V) against stored ngspice-42 refs. See [ngspice-fixtures.md](ngspice-fixtures.md).

## Index-1 DAE MNA transient validation

`tests/dae_mna.flow` exercises `herbie.dae` companion models: RC/RL/RLC analytic steps (BE), LC oscillator energy under trapezoidal UIC, floating-network rejection, `maxSteps` enforcement, and RC points vs stored ngspice-42 `rc_tran` measurements (5e-4 V). See [dae-mna.md](dae-mna.md).

## Zero-Ron ideal switch validation

`tests/ideal_switch.flow` checks closed-switch series dividers (exact 6 V, 6 mA branch current, zero voltage drop), open-switch isolation, threshold events with re-solve, source/load power balance, and floating-network rejection. See [ideal-switch.md](ideal-switch.md).

