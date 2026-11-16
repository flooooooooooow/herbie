# Numerical validation and engineering contracts

## Regression levels

**Level 1, implemented:** analytically checkable elementary stress, elastic extension, thermal expansion, fit clearances, RSS, Cpk, PID output bounds, linear-powertrain kinematics, and zero-input equilibrium. The undamped quarter car is integrated with fixed-step RK4 and checked for bounded energy drift over 10,000 steps. A 2D linear-elastic horizontal truss reference and two-/three-variable correlated variances are also tested. Tests live in `tests/` and CI runs them with a pinned Flow compiler revision.

**Level 2, not yet implemented:** convergence order tests with dt refinement, stiff-system rejection, independent high-precision reference integrations, randomized/property tests, sensitivity/Jacobian comparisons, and sustained million-step profiling.

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

`tests/linear_stackups.flow` verifies a 20.00 mm bore minus 19.90 mm shaft nominal and interval 0.030–0.170 mm. With σ = 30/20 μm, perfect positive correlation gives clearance σ = 10 μm, independence yields variance 1.3×10⁻⁹ m², and perfect negative correlation gives 50 μm. Asymmetric covariance, a non-positive-semidefinite matrix, and negative half-widths are rejected; a zero covariance matrix is admitted. The method uses a caller-owned Cholesky-like factor with semidefinite pivot treatment and a relative matrix tolerance; its treatment of nearly singular matrices depends on the supplied tolerance. All dimensions are in metres; a 3D datum hierarchy and production process statistics remain unimplemented.

## Modified nodal analysis validation (DC source stamping)

`tests/mna_voltage_sources.flow` independently verifies a 12 V source with two 1 kΩ resistors in series. Node voltage is 6 V at the divider, and the oriented voltage-source current is -6 mA. Two resistors dissipate 72 mW while the source delivers 72 mW (power equality tolerance 10⁻¹² W); the maximum KCL/KVL residual must stay below 10⁻¹² in the SI-form mixed rows. After a 1 mA current injection at the divider, its node rises to 6.5 V and the ideal source current becomes -5.5 mA. Invalid element stamps and floating networks are rejected. The solver is dense and cubic in unknown count, so it is not adequate for large sparse electrical networks, diode nonlinearities, AC admittance or index-1 transient DAE. Those remain in [issue #11](https://github.com/flooooooooooow/herbie/issues/11).
