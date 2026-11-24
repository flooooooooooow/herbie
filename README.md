# Herbie

**Herbie is a Flow-native automotive engineering library.** The goal is to replace MATLAB/Simulink-centric handoffs with traceable, executable models spanning vehicle simulation, manufacturing stress, tolerance analysis, controller design, optimization, and eventual HIL deployment.

**Maturity: 0.3.1 foundation, research/engineering evaluation only. NOT safety qualified.** The initial library contains small, reviewable deterministic numerical kernels; it is not yet a MATLAB, Simulink, Simscape, or industrial FEA replacement.

## Implemented

| Module | Models and numerical methods | Validity boundary |
| --- | --- | --- |
| `herbie.ode` | Fixed-step forward Euler, semi-implicit Euler and RK4; zero-crossing events; multirate schedule; caller-owned step traces; analytic decay/oscillator plants | Explicit ODE only; no implicit stiff DAE, adaptive step or general plant callbacks |
| `herbie.verify` | Readiness labels, versioned scenario CSV tables, absolute/relative error budgets, observed convergence-order export | Offline/test harness; never assigns `safety_assessed` from unit tests; no WCET claim |
| `herbie.transient` | Shared Flow circuit backend, fixed-step backward Euler RLC networks, physical residual checks | One circuit per process; DC initialization only; small, well-scaled networks |
| `herbie.mna` | Dense DC modified nodal analysis for resistors, oriented current sources and ideal voltage sources, KCL/KVL residual, pivoted solve | Small resistive DC circuits only; no nonlinear, transient, AC or sparse solver |
| `herbie.ac` | Dense AC phasor MNA for R/C/L with independent V/I sources, real 2n block solve, residual and average-power helpers | Small linear AC networks at fixed ω>0; no switches, diodes, sparse or SPICE parity |
| `herbie.sparse_mna` | COO→CSR DC MNA assembly for R/I/V, CSR SpMV residual, dense expand + pivoted solve with dense-reference checks | Sparse assembly only; factorisation still dense; no AC/nonlinear/fill-reducing LU |
| `herbie.nl` | Dense DC NR MNA with Shockley diodes (pnjlim), resistive switches and explicit threshold events | DC operating points only; finite Ron/Roff; no transient diode C or BJT |
| `herbie.netlist` | Versioned SPICE-subset import/export (R/C/L/V/I/D/S) with stamps into MNA/AC/NL | Format v1 subset; no subcircuits, `.model` library or waveform sources |
| `herbie.dae` | Dense index-1 DAE MNA transient with BE/TRAP C/L companions and consistent DC/UIC init | Linear R/C/L only; dense O(n³); no nonlinear/switch in this module |
| `herbie.ideal_sw` | Dense DC MNA with zero-Ron ideal switches (branch-current shorts) and threshold events | DC linear only; not the Ron/Roff model in `herbie.nl` |
| ngspice refs | Stored ngspice-42 divider / RC AC / diode OPs with provenance + tolerance tests | Three fixtures only; not general SPICE parity |
| sparse bench | 40-node ladder timed sparse vs dense rebuild/solve with recorded host sample | Not WCET; factorisation still dense after CSR expand |
| `herbie.circuits` | Sparse-API-shaped dense DC nodal assembly, resistors, current sources, Gaussian elimination with partial pivoting and KCL residual | Small linear resistive DC circuits only; no voltage-source MNA or nonlinear/transient components |
| `herbie.electrical` | Closed-form RC/RL transients; series RLC RK4 and stored energy | Ideal lumped/passive networks only, no circuit graph, switching devices or circuit DAE |
| `herbie.mechanics` | Single-axis rotational inertia, torsional stiffness/damping RK4 and ideal fixed-ratio gear power balance | No joints, bearing dynamics, contact, clutch or multibody assembly |
| `herbie.driveline` | Simple pendulum, two-inertia torsional shaft, open differential power split, Coulomb clutch limit | Not 6-DOF multibody, torque converters, backlash maps or tire/suspension ports |
| `herbie.motors` | Brushed permanent-magnet DC motor, coupled armature/rotor RK4, energy and torque | Lumped brushed DC only; three-phase drives live in `herbie.drive` |
| `herbie.drive` | Amplitude-invariant Clarke/Park, salient PMSM dq, averaged DC-link inverter clip, FOC current PI with decoupling | No switching PWM, BLDC six-step, induction, observers or device loss maps |
| `herbie.battery` | First-order Thevenin OCV + ohmic + polarization RC, coulomb-count SOC | Cell-level only; pack/BMS live in `herbie.pack` |
| `herbie.pack` | Ns×Np scale, OCV map, current/voltage/temp limits, contactor, ohmic+polarization heat, lumped thermal, balance ΔSOC; SOH as capacity input | No ageing curves, coolant network, pre-charge, Kalman SOC or chemistry ID |
| `herbie.maps` | Validated monotone two-axis grids, clamped bilinear lookup and strict in-domain bilinear (no extrapolation) | Row-major, linear interpolation only, caller-owned data |
| `herbie.engine` | Mapped engine torque vs RPM/throttle, crank acceleration and idealized fuel accounting | Dyno-map scaffold only, not transient combustion, emissions, idle, or certification |
| `herbie.meanvalue` | Multi-map torque/fuel/VE/Texh with strict no-extrapolation, intake manifold filling-emptying, 4-stroke air flow | No emissions factors, turbo lag, crank-angle combustion or ECU faults |
| `herbie.vehicle` | Two-degree-of-freedom vertical quarter car, fixed-step RK4, energy; planar linear-tire bicycle, fixed-step Euler | Small motions; no bump stops, contact loss, saturation, or low-speed bicycle handling |
| `herbie.fullcar` | Native seven-DOF ride (heave/pitch/roll + four wheels), antiroll, unilateral tire loads, RK4; JS parity gates | Linear springs; not multibody joints, nonlinear tires, brakes/ABS or calibrated rig data |
| `herbie.powertrain` | Point-mass longitudinal force balance with rolling resistance, drag, road gradient | No driveline dynamics, tire slip, regeneration, or reverse |
| `herbie.structures` | Axial, bending, torsional, plane-stress von Mises, Euler buckling, fully constrained thermal stress, Goodman and Miner rules | Linear elastic and elementary analytical assumptions; no general FEM |
| `herbie.truss` | Linear 2D truss axial element, 4x4 stiffness matrix, displacement-to-axial-force and strain energy | Small displacement, pin-jointed bar; no global FEM assembly or contact |
| `herbie.fem` | 2D truss mesh, DOF map, dense assembly, free-DOF reduction, dense GE and CSR CG, reactions/residuals | Small linear truss only; no beams/plates/solids, nonlinear material or contact |
| `herbie.uncertainty` | First-order correlated covariance propagation and Gaussian intervals | Input covariance must be physically valid; not non-Gaussian metrology |
| `herbie.tolerances` | Worst-case interval stacks, clearances, independent RSS standard deviations, Cp/Cpk, thermal length | Statistical normal/independent approximation for RSS; no full GD&T solver |
| `herbie.stackups` | N-dimensional affine worst-case stacks and covariance-aware variance with PSD checks and sensitivity rank | First-order linear dimensional chains; all SI lengths, no 3D GD&T geometry, SPC, or measured-process qualification |
| `herbie.montecarlo` | Seeded xorshift Monte Carlo for independent/correlated Gaussian and uniform stacks; empirical percentiles; Pp/Ppk; X̄ chart limits | Affine SI stacks only; not 3D GD&T, gauge R&R ANOVA or nonnormal process qualification |
| `herbie.control` | PID with derivative on measurement, output/integral clamps and conditional anti-windup | Caller must provide valid dt and output limits |
| `herbie.thermal` | Lumped-capacitance heat balance, fixed-step Euler, thermal time constant | Uniform temperature, constant coefficients |

Except for `herbie.transient`, which uses the upstream single-session circuit workspace, dynamic kernels are explicit functions of state, parameters, inputs and `dt`; they contain no I/O or dynamic allocation in the source and can be called by a real-time host. This alone does **not** demonstrate worst-case execution time or determinism of a target build.

## Live Vehicle Lab

The [interactive Vehicle Lab](https://flooooooooooow.github.io/herbie/) now offers a self-hosted, interactive Three.js full-car assembly showing wheels, suspension linkages, coilover springs, driveline, engine packaging, heave, pitch, roll, four wheel travel/contact loads, driver scenarios, telemetry and manufacturing clearance analysis. The Pages deployment is contingent on enabling **GitHub Actions** as the repository's Pages source and a successful main-branch workflow. The browser runs an illustrative **JavaScript coupled seven-coordinate ride model** plus a reduced-order powertrain, yaw and thermal model. The procedural links are visual approximations, not solved multibody joints; this is **not Flow/WASM**. [Numerical assumptions and limitations](docs/vehicle-lab.md).

The native `herbie.assembly` scaffold composes longitudinal, quarter-car, thermal, gearing, and illustrative stress kernels. It is not yet a multi-body or combustion simulation.

## Quickstart

Install the pinned compiler once, then use `flow` directly:

```sh
git clone https://github.com/flooooooooooow/flow.git ../flow
git -C ../flow checkout --detach 7687fc936365e17bc6286415585c55fcc6ea64c3
(cd ../flow && ./flow install)
export PATH="$HOME/.local/bin:$PATH"
flow version
```

Keep `~/.local/bin` on your shell PATH. CI adds its pinned checkout to PATH automatically.
See [linear circuit transients](docs/circuit-transients.md) for the API, equations and verification boundary.

```sh
flow run tests/engineering_smoke.flow
flow run tests/vehicle_energy.flow
flow run tests/truss_uncertainty.flow
flow run tests/electromechanics.flow
flow run tests/engine_battery.flow
flow run tests/circuit_network.flow
flow run examples/quarter_car_demo.flow
flow run examples/manufacturing_demo.flow
flow run examples/electric_drive_demo.flow
flow run examples/engine_dyno_demo.flow
flow run tests/full_car.flow
flow run examples/full_car_demo.flow
flow run examples/equation_vehicle.flow
flow run tests/linear_stackups.flow
flow run examples/linear_stackups_demo.flow
flow run examples/suspension_units.flow
flow run tests/circuit_transient.flow
flow run tests/mna_voltage_sources.flow
flow run examples/mna_voltage_sources_demo.flow
flow run tests/ode_platform.flow
flow run examples/ode_platform_demo.flow
flow run tests/verification_matrix.flow
flow run examples/verification_matrix_demo.flow
flow run tests/montecarlo_stack.flow
flow run examples/montecarlo_stack_demo.flow
flow run tests/fem_truss.flow
flow run examples/fem_truss_demo.flow
flow run tests/fullcar_ride.flow
flow run examples/fullcar_ride_demo.flow
flow run tests/driveline.flow
flow run examples/driveline_demo.flow
flow run tests/meanvalue_engine.flow
flow run examples/meanvalue_engine_demo.flow
flow run tests/battery_pack.flow
flow run examples/battery_pack_demo.flow
flow run tests/electric_drive.flow
flow run examples/pmsm_foc_demo.flow
flow run tests/ac_phasor_mna.flow
flow run examples/ac_phasor_demo.flow
flow run tests/sparse_mna.flow
flow run examples/sparse_mna_demo.flow
flow run tests/sparse_bench.flow
flow run examples/sparse_bench_demo.flow
flow run tests/nl_devices.flow
flow run examples/nl_devices_demo.flow
flow run tests/netlist.flow
flow run examples/netlist_demo.flow
flow run tests/ngspice_crossval.flow
flow run tests/ngspice_fixtures.flow
flow run tests/dae_mna.flow
flow run examples/dae_mna_demo.flow
flow run tests/ideal_switch.flow
flow run examples/ideal_switch_demo.flow
```

The exact Flow compiler revision used by CI is pinned in [the CI workflow](.github/workflows/ci.yml). To consume a module from another Flow package, use a path dependency on this repository and import, for example, `herbie.vehicle { QuarterCarParameters, QuarterCarState, quarterCarStep }`.

## Equation-first models

[The equation-first vehicle example](examples/equation_vehicle.flow) uses Flow's native `flow` declaration, `state`/`input`/`param`, `evolves as`, and an RK4 solver to describe longitudinal acceleration and the coupled sprung/unsprung vertical dynamics directly. It checks a closed-form constant-acceleration trajectory, cross-checks the generated quarter-car RK4 against `herbie.vehicle` and tests conservative energy. [Model scope and validation matrix](docs/validation.md).

[The correlated tolerance-stack module](src/stackups.flow) evaluates affine dimension chains with independent worst-case intervals and positive-semidefinite-validated covariance, and rejects inconsistent statistics. It is not a 3D GD&T engine. See [manufacturing acceptance issue #6](https://github.com/flooooooooooow/herbie/issues/6).

## DC circuit network with voltage sources

[The new MNA kernel](src/mna.flow) assembles an augmented conductance matrix for linear resistors, oriented current injections, and independent ideal voltage sources. Its caller-owned dense pivoted solver reports both node voltages and source currents, and measures all KCL/KVL residuals. [The executable reference circuit](tests/mna_voltage_sources.flow) checks a 12 V two-resistor divider, source/load power balance, a superimposed current source, invalid stamps, and floating-network rejection. This advances [electrical issue #11](https://github.com/flooooooooooow/herbie/issues/11) without claiming transient/SPICE parity.

## AC phasor circuit solve

[`herbie.ac`](src/ac.flow) stamps R/C/L and independent sources into a real block expansion of complex MNA at a caller-chosen `omega > 0`. Analytical fixtures cover a resistive divider, series RC/RL responses, series RLC resonance and a nodal R‖C current drive, with stated tolerances in [docs/ac-phasor-mna.md](docs/ac-phasor-mna.md). Netlist import is in `herbie.netlist`; external SPICE waveform cross-validation remains under #11.

## Sparse DC MNA assembly

[`herbie.sparse_mna`](src/sparse_mna.flow) accumulates stamps as COO triplets, compresses to CSR, checks residuals with SpMV, and solves by expanding to a dense scratch for pivoted elimination. Tests compare against analytic divider voltages and bit-close dense `herbie.mna` matrices. See [docs/sparse-mna.md](docs/sparse-mna.md). A 40-node ladder timing sample (honest: dense GE still dominates) is in [docs/sparse-runtime.md](docs/sparse-runtime.md). Fill-reducing sparse LU remains future work.

## Nonlinear diodes and switches

[`herbie.nl`](src/nl.flow) runs Newton–Raphson DC MNA with Shockley diodes (pnjlim damping) and resistive Ron/Roff switches. Switch open/close is an explicit threshold event. Analytical fixtures and a DC half-wave check are in [docs/nl-devices.md](docs/nl-devices.md).

## Versioned netlist import/export

[`herbie.netlist`](src/netlist.flow) reads and writes format-version-1 SPICE-subset decks (`R/C/L/V/I/D` plus Herbie resistive `S` switches) and stamps them into `herbie.mna`, `herbie.ac` or `herbie.nl`. Round-trip and solver fixtures live in [docs/netlist.md](docs/netlist.md). Example decks are under `examples/netlists/`.

## ngspice cross-validation

Stored ngspice-42 references for a DC divider, series RC AC phasor (`ω=1000`) and Shockley diode OP live under `tests/ngspice_refs/` with command provenance. `flow run tests/ngspice_crossval.flow` compares Herbie solvers within documented tolerances ([docs/ngspice-crossval.md](docs/ngspice-crossval.md)). Additional bridge, multi-diode rectifier and RLC transient fixtures: `flow run tests/ngspice_fixtures.flow` ([docs/ngspice-fixtures.md](docs/ngspice-fixtures.md)). CI does not require ngspice.

## Index-1 DAE MNA transient

[`herbie.dae`](src/dae.flow) advances linear R/C/L networks with backward-Euler or trapezoidal companion models, consistent DC initialization or UIC, and a deterministic `maxSteps` cap. Analytic RC/RL/RLC, LC oscillator energy and ngspice RC transient checks are in [docs/dae-mna.md](docs/dae-mna.md).

## Zero-Ron ideal switches

[`herbie.ideal_sw`](src/ideal_sw.flow) treats a closed switch as a 0 V MNA branch (exact short) and an open switch as a forced-zero branch current. Explicit threshold events flip state. See [docs/ideal-switch.md](docs/ideal-switch.md). Resistive Ron/Roff switches remain in `herbie.nl`.

The standalone browser has no third-party runtime CDN requirement: official Three.js r187 is vendored under `site/vendor/` with its MIT licence. The repository-root `index.html` redirects to `site/` when Pages is configured to publish from a branch; the Actions workflow publishes `site/` at the Pages root. A Chromium regression asserts CSS loads and the WebGL canvas actually renders.

## Design rules

Physics stays in Flow, not a concealed Python/MATLAB backend. SI units are used throughout the initial API. Callers validate masses, geometry, material properties, positive `dt`, and solver stability limits before entering the real-time loop. State is explicit and updates are bounded by fixed arithmetic work; no file or network operations are performed within step functions. Model assumptions, analytical baselines and test results must be versioned together.

Herbie does **not** certify any model, component, controller, vehicle or manufacturing process. Do not use these kernels to approve a physical design or drive safety-critical hardware without independently validated models, target-specific timing qualification, fault handling, and the applicable engineering safety process.

## Development

[Architecture](docs/architecture.md) · [Validation and numerical contracts](docs/validation.md) · [MATLAB ecosystem replacement plan](docs/matlab-replacement.md) · [complete domain coverage map](docs/engineering-ecosystem.md)

MIT licensed. See [LICENSE](LICENSE).
