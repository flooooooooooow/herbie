# Herbie engineering ecosystem coverage

**Scope:** Replace MATLAB/Simulink-centred automotive, electrical, mechanical and internal-combustion modelling with reproducible, Flow-native engineering programs. This is a long-term programme. **Not a claim of MATLAB, Simulink or Simscape feature parity.** No source from proprietary toolboxes is used.

Every physical system should share an explicit state schema, dimensioned parameters, electrical/mechanical/thermal/fluid ports, a solver and clock contract, deterministic trace format, machine-readable provenance, acceptance tests and code-generation path. The domain libraries below are independent pieces on that foundation.

## Coverage map

| Engineering domain | Shipped Flow modules | Expansion target |
| --- | --- | --- |
| Numerical integration and modelling | Domain-specific Euler, RK4, closed-form steps | ODE/DAE, Newton/Krylov, sparse matrices, block graphs, units, zero-crossings, multirate scheduling |
| Vehicle chassis and handling | `vehicle`, `powertrain` | 3D 6-DOF chassis, 7-DOF ride, suspension kinematics, nonlinear tire, aero, braking, steering, stability, parameter identification |
| Electrical circuits | `electrical`, `circuits`, `mna`, `ac`, `sparse_mna`, `nl`, `transient` | Power converters, EMC, fill-reducing sparse LU, small-signal linearisation, SPICE cross-validation, transient switching |
| Machines and drives | `motors` | PMSM, BLDC, induction, synchronous generator, field-oriented control, PWM inverter, torque ripple, thermal/electromagnetic saturation |
| Batteries and charging | `battery` | Pack/cell networks, SOC/SOH estimators, RC model identification, OCV curves, electro-thermal models, BMS limits, charging and degradation |
| Internal combustion | `engine`, `maps` | Torque/fuel/air/exhaust/emissions 2D/3D maps, volumetric efficiency, airflow/manifolds, ignition and fuel injection, turbocharging, cylinder pressure, crank-angle simulation, diesel injection, knock, ECU |
| Mechanical dynamics and driveline | `mechanics`, `truss`, `structures` | Gearbox, clutch, differential, torsional shaft, belt, bearings, rigid-body joints/contact, elastomer, modal/FEA assemblies |
| Thermal and fluid systems | `thermal` | Heat networks, radiator, coolant pump, hydraulic and pneumatic networks, compressible fluid, thermal management, CFD coupling |
| Manufacturing and quality | `tolerances`, `uncertainty`, `stackups` | GD&T graph, tolerance chain and datum network, capability/SPC, geometry, stress-life and strain-life fatigue, probabilistic design, measurement uncertainty |
| Controls and safety | `control` | Discrete filters, state-space, Kalman observers, LQR, MPC, diagnosis, plausibility checks, fault injection, rate transitions, controller code generation |
| Calibration and optimization | `maps` | Data import, dyno fitting, map calibration, sensitivities, optimization, parameter sweeps, uncertainty and traceable comparison |
| Deployment and external systems | Flow native C backend | FMI/FMU, CAN/CAN FD, XCP, AUTOSAR-facing interfaces, model/HIL rigs, hardware adapters and timing audits |
| Model-building experience | Flow code and plain source | Block-diagram editor, typed domain ports, bidirectional graph/code representation, plotting, replay and model provenance |

## Architectural work packages

### Common solver and domain-port engine

A numerical platform must enforce the physical units of across variables (voltage, pressure, force, torque) and through variables (current, flow, velocity) and preserve power balance across coupled domains. Differential-algebraic systems need robust constraint handling, initialization, event handling, discontinuities and stiffness-aware integration. The solver and compiled scheduling plan must be separate from each physical component. This is the highest-leverage prerequisite for replacing full Simscape systems.

### Electrical and hybrid vehicles

Implement DC electrical networks and motor/battery models first, then switch-level converters and three-phase drives; an averaged-inverter model should be independently validated against a switch-resolved model. Couple motor mechanical load through gear, wheel and road correctly, including shaft inertia and torque feedback. Add thermal losses, cell-to-pack aggregation, charge/discharge limits and BMS diagnostics before asserting automotive fidelity.

### Spark-ignition, diesel and hybrid engines

Separate a **mapped torque/fuel/emission** model for real-time drive-cycle calibration from a **mean-value engine** for intake/manifold/turbo transient studies and a **crank-angle-resolved model** for cycle physics. Treat fuel chemistry, combustion and exhaust species as calibration-based or validated physical submodels; do not invent universal emissions coefficients. Validate map interpolation against independent dynamometer data. Closed-loop ECU, gear shifting, start-stop and aftertreatment must have testable safety/fault interfaces.

### Mechanical and manufacturing engineering

Start with elementary analytical stress and truss elements, then sparse global assembly and boundary conditions, eigenmodes, nonlinear materials, contact, thermal coupling, fatigue and measurement uncertainty. Dimensional tolerancing and GD&T belong to a separate geometry and inspection framework and should never be conflated with simple independent Gaussian RSS.

### Model editor and deployment

The eventual Flow front end should author multi-domain component graphs with explicit rates, units, solver contracts and deterministic generated code. Support scenario recording, interactive visualization, calibration, parameter sweeps, export/import and comparison against published reference data. Embedded targets require independently measured execution-time and memory budgets, no hidden allocation in timed paths, and safety processes that cannot be inferred from a passing unit test.

## Acceptance and scope integrity

Every newly advertised component must include an equation and assumptions, initial conditions and units, analytical or externally validated reference values, convergence criteria where applicable, positive/negative tests, numerical stability limits and a continuously executed native Flow build. No production safety, ISO 26262 or formal WCET claims are implied by this repository's CI.

MathWorks reference product categories: [Vehicle Dynamics Blockset](https://www.mathworks.com/products/vehicle-dynamics.html), [Simscape Electrical](https://www.mathworks.com/products/simscape-electrical.html), [Powertrain](https://www.mathworks.com/help/vdynblks/powertrain.html), and its [product catalog](https://www.mathworks.com/products.html). These references are only a scope inventory, not an endorsement or dependency.

## DC circuit solver implementation slice

The first connected-circuit solver supports passive resistor stamping and oriented current injection with reference ground, partial-pivoted dense elimination and KCL residuals. It is intentionally restricted to linear, steady-state resistive circuits; Ideal voltage-source DC MNA is implemented in `herbie.mna`. Linear RLC backward-Euler integration is covered by [the transient increment](circuit-transients.md). Dense AC phasor MNA for R/C/L is covered by [ac-phasor-mna.md](ac-phasor-mna.md). Device models, switched dynamics, sparse indefinite solvers and general DAE initialization remain tracked by [electrical circuit solver issue #11](https://github.com/flooooooooooow/herbie/issues/11). The matrix storage is caller-owned and O(n²); use small networks until sparse assembly and pivot strategy are implemented.
