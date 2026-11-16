# Numerical validation and engineering contracts

## Regression levels

**Level 1, implemented:** analytically checkable elementary stress, elastic extension, thermal expansion, fit clearances, RSS, Cpk, PID output bounds, linear-powertrain kinematics, and zero-input equilibrium. The undamped quarter car is integrated with fixed-step RK4 and checked for bounded energy drift over 10,000 steps. Tests live in `tests/` and CI runs them with a pinned Flow compiler revision.

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
