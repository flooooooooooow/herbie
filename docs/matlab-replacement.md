# MATLAB/Simulink ecosystem replacement strategy

Herbie is an engineering platform project, not a claim of MATLAB feature parity.

| Existing workflow | Herbie path | Current state |
| --- | --- | --- |
| MATLAB numerical scripting | Typed Flow numeric models + array/linalg ecosystem | Only domain scalar kernels here |
| Simulink block diagrams | Typed signal graph, rate propagation, scheduler, model lowering | Planned |
| Simscape physical systems | Multidomain ports, units, constraints, DAE solvers | Planned |
| Vehicle Dynamics Blockset | Quarter car, linear-tire bicycle, longitudinal point mass | Initial kernels |
| Control System Toolbox | Discrete PID, later state space, LQR, MPC, observers | PID only |
| Simulink Real-Time / HIL | Scheduled native target runtime, deterministic I/O | Not implemented |
| Symbolic Math / Optimization | Automatic differentiation, constrained optimization, sensitivity | Flow ecosystem integration planned |
| PDE / FEA / stress | Linear-elastic formulas and truss local stiffness, later sparse mesh/FEM/constitutive models | Elementary formulas and local truss only |
| Statistics/quality/tolerance | Interval stackups, RSS, Cp/Cpk, correlated covariance, then GD&T and process distributions | Initial deterministic kernels |
| Code generation / embedded | Flow's C backend, target validation and qualified builds | General compiler available; no target qualification |

## Ordered delivery gates

**Gate A: numerical trust.** Pin the compiler, verify all exports and examples, analytically validate the existing models, add convergence/step-size bounds, parameter validation and units. Establish reproducible numerical and runtime-performance baselines.

**Gate B: system modelling.** Build reusable solver abstractions, a block graph, scheduling, units and quantities, automatic differentiation/sensitivity and deterministic tracing; add common mechanical/hydraulic/electrical ports.

**Gate C: vehicle fidelity.** Full-car seven-degree-of-freedom ride, nonlinear tires, suspension geometry, driveline, brakes, steering, battery/thermal systems, contact and friction, road profiles, and standardized drive cycles with physical-data correlation.

**Gate D: manufacturing and structural design.** Sparse FEM (beams/shells/solids), materials including plasticity and fatigue, thermal-structural coupling, tolerance distributions, GD&T datums and feature controls, Monte Carlo with seeded reproducibility, robust optimization and process capability measurement.

**Gate E: industrial ecosystem.** FMI/FMU co-simulation, CAN/CAN FD, XCP, CAD/CAE formats, ROS 2 where relevant, reproducible model exchange, visualization and a trustworthy engineering UI. Add HIL, plant/controller packaging and explicit safety qualification boundaries.

Each gate requires reference problems, numerical acceptance thresholds, compatibility tests, documentation, real target benchmarks and independently reviewable validation evidence. Avoid nonfunctional demos and unsupported parity claims.

## Scope principles

Prioritize vertical workflows where Herbie can replace the **entire model-to-deployment handoff**, rather than copying hundreds of MATLAB APIs without traceable semantics. Expose equations as Flow source, preserve executable assumptions, use a stable package API, and keep CI proving what actually runs.
