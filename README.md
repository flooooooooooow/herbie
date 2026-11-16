# Herbie

**Herbie is a Flow-native automotive engineering library.** The goal is to replace MATLAB/Simulink-centric handoffs with traceable, executable models spanning vehicle simulation, manufacturing stress, tolerance analysis, controller design, optimization, and eventual HIL deployment.

**Maturity: 0.3.0 foundation, research/engineering evaluation only. NOT safety qualified.** The initial library contains small, reviewable deterministic numerical kernels; it is not yet a MATLAB, Simulink, Simscape, or industrial FEA replacement.

## Implemented

| Module | Models and numerical methods | Validity boundary |
| --- | --- | --- |
| `herbie.electrical` | Closed-form RC/RL transients; series RLC RK4 and stored energy | Ideal lumped/passive networks only, no circuit graph, switching devices or circuit DAE |
| `herbie.mechanics` | Single-axis rotational inertia, torsional stiffness/damping RK4 and ideal fixed-ratio gear power balance | No joints, bearing dynamics, contact, clutch or multibody assembly |
| `herbie.motors` | Brushed permanent-magnet DC motor, coupled armature/rotor RK4, energy and torque | Lumped motor only; no inverter, commutation, saturation or thermal losses |
| `herbie.battery` | First-order Thevenin OCV + ohmic + polarization RC, coulomb-count SOC | No BMS, electrochemistry, heat, SoH, degradation or charge limits |
| `herbie.maps` | Validated monotone two-axis grids and clamped bilinear map lookup | Row-major, linear interpolation only, caller-owned data |
| `herbie.engine` | Mapped engine torque vs RPM/throttle, crank acceleration and idealized fuel accounting | Dyno-map scaffold only, not transient combustion, emissions, idle, or certification |
| `herbie.vehicle` | Two-degree-of-freedom vertical quarter car, fixed-step RK4, energy; planar linear-tire bicycle, fixed-step Euler | Small motions; no bump stops, contact loss, saturation, or low-speed bicycle handling |
| `herbie.powertrain` | Point-mass longitudinal force balance with rolling resistance, drag, road gradient | No driveline dynamics, tire slip, regeneration, or reverse |
| `herbie.structures` | Axial, bending, torsional, plane-stress von Mises, Euler buckling, fully constrained thermal stress, Goodman and Miner rules | Linear elastic and elementary analytical assumptions; no general FEM |
| `herbie.truss` | Linear 2D truss axial element, 4x4 stiffness matrix, displacement-to-axial-force and strain energy | Small displacement, pin-jointed bar; no global FEM assembly or contact |
| `herbie.uncertainty` | First-order correlated covariance propagation and Gaussian intervals | Input covariance must be physically valid; not non-Gaussian metrology |
| `herbie.tolerances` | Worst-case interval stacks, clearances, independent RSS standard deviations, Cp/Cpk, thermal length | Statistical normal/independent approximation for RSS; no full GD&T solver |
| `herbie.control` | PID with derivative on measurement, output/integral clamps and conditional anti-windup | Caller must provide valid dt and output limits |
| `herbie.thermal` | Lumped-capacitance heat balance, fixed-step Euler, thermal time constant | Uniform temperature, constant coefficients |

All dynamic kernels are explicit functions of state, parameters, inputs and `dt`; they contain no I/O or dynamic allocation in the source and can be called by a real-time host. This alone does **not** demonstrate worst-case execution time or determinism of a target build.

## Quickstart

Use the compiler in [flooooooooooow/flow](https://github.com/flooooooooooow/flow).

```sh
flow run tests/engineering_smoke.flow
flow run tests/vehicle_energy.flow
flow run tests/truss_uncertainty.flow
flow run tests/electromechanics.flow
flow run tests/engine_battery.flow
flow run examples/quarter_car_demo.flow
flow run examples/manufacturing_demo.flow
flow run examples/electric_drive_demo.flow
flow run examples/engine_dyno_demo.flow
```

The exact Flow compiler revision used by CI is pinned in [the CI workflow](.github/workflows/ci.yml). To consume a module from another Flow package, use a path dependency on this repository and import, for example, `herbie.vehicle { QuarterCarParameters, QuarterCarState, quarterCarStep }`.

## Design rules

Physics stays in Flow, not a concealed Python/MATLAB backend. SI units are used throughout the initial API. Callers validate masses, geometry, material properties, positive `dt`, and solver stability limits before entering the real-time loop. State is explicit and updates are bounded by fixed arithmetic work; no file or network operations are performed within step functions. Model assumptions, analytical baselines and test results must be versioned together.

Herbie does **not** certify any model, component, controller, vehicle or manufacturing process. Do not use these kernels to approve a physical design or drive safety-critical hardware without independently validated models, target-specific timing qualification, fault handling, and the applicable engineering safety process.

## Development

[Architecture](docs/architecture.md) · [Validation and numerical contracts](docs/validation.md) · [MATLAB ecosystem replacement plan](docs/matlab-replacement.md) · [complete domain coverage map](docs/engineering-ecosystem.md)

MIT licensed. See [LICENSE](LICENSE).
