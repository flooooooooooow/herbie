# Architecture

Herbie targets an executable engineering stack in which model code, parameter provenance, simulation, optimization, and deployment share a common Flow representation. Rather than treating diagrams, numerical scripts, generated C, and embedded software as unrelated artifacts, models should be testable as library code and directly deployable where the platform and safety case permit.

## Current package boundaries

The first implementation is intentionally small:

```
src/
  ode.flow           Shared fixed-step Euler/semi-implicit/RK4, events, multirate
  verify.flow        Scenario CSV, error budgets, readiness labels, order export
  circuits.flow      Nodal circuit assembly and dense pivoted DC solve
  mna.flow           Dense DC MNA with ideal voltage-source branch unknowns
  ac.flow            Dense AC phasor MNA for linear R/C/L networks
  sparse_mna.flow    COO→CSR DC MNA assembly with dense expand solve
  nl.flow            Dense DC NR MNA with diodes and resistive switches
  netlist.flow       Versioned SPICE-subset import/export (optional I/O)
  dae.flow           Dense index-1 DAE MNA transient (BE/TRAP companions)
  ideal_sw.flow      Dense DC MNA with zero-Ron ideal switches
  transient.flow     Shared Flow-backend linear RLC transient facade
  electrical.flow    Lumped passive RC/RL/RLC
  mechanics.flow     Single-axis rotation and ideal gear
  driveline.flow     Pendulum, torsional shaft, differential, clutch
  motors.flow        Coupled armature/rotor DC motor
  battery.flow       Thevenin RC battery and SOC
  maps.flow          Clamped bilinear lookup for calibrated models
  engine.flow        Torque-map crank dynamics and fuel flow
  meanvalue.flow     Multi-map mean-value engine + intake manifold
  vehicle.flow       Vertical quarter car and planar bicycle
  fullcar.flow       Seven-DOF heave/pitch/roll + four-wheel ride
  powertrain.flow    Longitudinal point-mass motion
  structures.flow    Elastic stress and introductory fatigue
  truss.flow         Local 2D truss element stiffness and force
  fem.flow           Global 2D truss FEM assembly, dense/CG solves
  uncertainty.flow   First-order covariance propagation
  tolerances.flow    Interval clearance and statistical capability
  stackups.flow      PSD-validated affine correlated dimension stacks
  montecarlo.flow    Seeded MC stacks, percentiles, Pp/Ppk, X̄ limits
  thermal.flow       Lumped temperature evolution
  control.flow       Bounded-output PID
tests/
  engineering_smoke.flow
  vehicle_energy.flow
  ode_platform.flow
  ac_phasor_mna.flow
  sparse_mna.flow
  nl_devices.flow
  netlist.flow
  ngspice_crossval.flow
  dae_mna.flow
  ideal_switch.flow
  ngspice_fixtures.flow
  sparse_bench.flow
  ngspice_refs/        Stored ngspice-42 prints + provenance
examples/
  quarter_car_demo.flow
  manufacturing_demo.flow
  ode_platform_demo.flow
  ac_phasor_demo.flow
  sparse_mna_demo.flow
  nl_devices_demo.flow
  netlist_demo.flow
  netlists/*.cir
```

Every step function takes an explicit current state, immutable model parameters, the environmental inputs, and `dt`, and returns the next state. Call sites decide scheduling, checkpointing, telemetry, fault detection and synchronization. All values currently use SI units and `f64`.

## Real-time execution contract

No hidden allocations or I/O are written in the hot-path model kernels. However, a real-time claim also requires measuring the emitted C and target machine code: WCET or measured tails under stress, stack and memory allocation checks, scheduling analysis, CPU affinity, deadline misses, and numerical stability under supported step sizes.

The caller must reject non-physical parameter sets and singular denominators. The bicycle model requires positive, nonzero speed and small tire slip. A production version should replace unchecked public APIs with explicit validation at construction or a typed `Result` boundary outside the hot path.

## Solver roadmap

`herbie.ode` provides the shared fixed-step contract: validated `OdeConfig`, forward Euler, semi-implicit Euler for second-order mechanical state, classical RK4, zero-crossing event interpolation, multirate fast/slow counters and caller-owned step traces. Built-in analytic plants (scalar exponential decay and undamped harmonic oscillator) gate convergence order and energy. The vertical vehicle model still embeds its own RK4; the bicycle, thermal and longitudinal models currently use explicit Euler/trapezoidal position integration. Implicit stiff ODE/DAE, adaptive stepping and general plant callbacks remain open.

A later spatial geometry and manufacturing layer can support meshes, element assembly, sparse iterative and direct solvers, nonlinear material laws, contact and thermal-mechanical coupling. Those are substantial projects, not features implied by the current elementary formulas.

## Industrial integration architecture

Interoperability should be layered: CSV/Parquet and unit-tagged datasets; parameter/config schemas; FMU/FMI import/export; CAN/CAN FD, XCP and automotive Ethernet adapters; test bench and sensor bindings; ROS 2/Middleware adapters where useful; and APIs for optimization and CAD/CAE geometry. None of these adapters is implemented in the first release.

A future block-graph front end could compile model graphs to Flow state evolution with statically checked rates, initialization order, algebraic loops and scheduling. The graph must have a canonical serialized form, reproducible compiler lowering and round-trip tests.

## Truss and statistical assumptions

The 2D truss element writes a 4x4 matrix in row-major order to a caller-provided 16-element buffer. It uses \`EA/L\` times the direction-cosine projection and returns failure for zero length or nonpositive area/modulus. It is an element kernel only, not a complete global FEA solver or structural certification system.

The correlated uncertainty module implements \`Var(aX+bY)=a²σx²+b²σy²+2abρσxσy\` and the corresponding three-variable covariance form. All inputs must specify valid standard deviations and a positive-semidefinite covariance matrix.

## Multiphysics implementation boundary

The initial new modules use explicit typed state and physically named SI parameters. The RC/RL and battery RC equations use exact constant-input exponentials; the motor, series RLC and torsional oscillator use fixed-step RK4; the engine uses sample-time Euler with clamped nonnegative speed. The engine requires monotone, validated lookup grids. Each model has no hidden I/O/heap allocation and accepts a caller-chosen dt, but a complete multidomain solution will require shared algebraic constraints, consistent energy flows and implicit DAE integration. The electric drive example uses sequentially coupled motor and battery steps and is illustrative, not a verified energy-conserving electromechanical co-simulation nor a full EV drivetrain.

## Initial DC nodal network

`herbie.circuits` stamps conductances and oriented current sources into a caller-owned row-major matrix and current vector using ground node -1. The solve uses partial-pivoted Gaussian elimination, caller-owned scratch matrix and RHS, KCL residual measurement, and a caller-chosen absolute conductance pivot threshold. Source data remains unchanged. The dense solve is O(n³), has no dynamic allocations in Flow source, and must be bounded/configured for any timed target. This is **not** a full modified-nodal-analysis solver: independent voltage sources, switched elements, inductors/capacitors and nonlinear devices require additional unknowns, constitutive rules and robust DAE solvers. Singular/ungrounded networks return failure rather than silently producing voltages.
