# Vehicle Lab: GitHub Pages simulation

**Status:** engineering prototype, not qualified for physical design decisions.

The static site in [site/](../site/) is deployed by [Pages Actions](../.github/workflows/pages.yml). Its intended address is https://flooooooooooow.github.io/herbie/ after **Settings → Pages → Build and deployment → Source: GitHub Actions** is selected and the workflow on main completes successfully. The URL is not evidence of an actual deployment.

## What runs

The browser executes a deterministic JavaScript reference implementation in [site/model.js](../site/model.js), **not Flow/WASM**. The Flow-native model is [src/assembly.flow](../src/assembly.flow), composing longitudinal powertrain, representative front/rear quarter-car suspension, gear torque, thermal and elementary stress kernels. Its native example is [examples/full_car_demo.flow](../examples/full_car_demo.flow). There is no claim of byte-identical numerical parity between Flow and the browser port.

The browser model extends that core scaffold with an approximate linear bicycle (lateral/yaw) state, friction-circle clamping and automatic shift logic. It is a controlled demonstration rather than a high-fidelity full-car model.

## Core reduced-order equations

Longitudinal tyre force, clamped by a simplified road-grip envelope:

~~~text
F_drive = engine_torque * gear_ratio * final_drive * driveline_efficiency / wheel_radius
F_x = clamp(F_drive - F_brake, -mu * mass * g * cos(grade), +mu * mass * g * cos(grade))
F_drag = 0.5 * rho * Cd * frontal_area * speed^2
a_x = (F_x - F_drag - Crr * mass * g * cos(grade) - mass * g * sin(grade)) / mass
~~~

Rolling resistance is suppressed at rest unless tractive force exceeds its static threshold. Speed is clamped to nonnegative values. Reversing, parking on slopes, clutch slip, gearshift torque interruptions, rotating wheels and differential dynamics are excluded.

The engine torque comes from a **synthetic** piecewise-linear RPM table with a simple temperature derate, and fixed illustrative thermal efficiency. Fuel power is computed from nonnegative shaft power; no idle fuel consumption, combustion dynamics, validated dyno data, emissions or ECU physics is modelled.

At speeds above 2 m/s, lateral forces use Herbie's small-slip bicycle equations with a friction-circle envelope; at lower speed the simulator uses a kinematic yaw relation. This does not capture nonlinear tyres, load transfer or high-slip handling.

Front and rear suspension each use an independent quarter-car with fourth-order Runge-Kutta and sinusoidal road input. There is no shared sprung-body pitch/roll or actual four-corner force equilibrium. Thermal calculations use lumped heat capacity with speed-dependent cooling and approximate dissipated brake power. The displayed chassis stress is an illustrative absolute-force / area calculation, **not** structural FEA or a design safety factor.

## Manufacturing tolerances

The fit lab applies worst-case dimensional interval arithmetic to a nominal 20.00 ± 0.05 mm bore and 19.90 ± 0.02 mm shaft. With default settings the extreme assembly clearance is **0.030–0.170 mm**. The selected multiplier scales allowable half-widths. Differential expansion (bore 12 × 10⁻⁶ / K; shaft 23 × 10⁻⁶ / K) shifts the nominal clearance under a user-selected uniform temperature difference.

A seeded local PRNG generates 1,500 independent Gaussian samples. For sampling, the selected half-width is interpreted as 3σ. It reports empirical pass fraction for a 0–0.15 mm clearance specification and an estimated Cpk. These are modelled synthetic distributions, not actual stable-process measurements. The distribution ignores correlations, nonnormal errors, measurement uncertainty, thermal gradients and complete GD&T.

## Local checks

~~~sh
node --check site/model.js
node --check site/app.js
node --test tests/vehicle_lab.test.mjs
flow run tests/full_car.flow
flow run examples/full_car_demo.flow
~~~

GitHub Actions uses the pinned Flow compiler from the existing CI workflow. Node tests check rest, acceleration, braking, grade, representative suspension energy and road response, range arithmetic and deterministic sampling. Flow tests check assembly, suspension, thermal and manufacturing regression. The Pages workflow runs the Node suite before deployment; the main CI workflow runs both systems on pull requests.

## Work still required

Before replacing the browser runtime with real Flow/WASM, define and verify a stable Flow browser ABI, build a WASM target with the Flow toolchain, and add common test vectors to prove cross-runtime parity. The broader engineering program still requires calibrated engine data, multibody coupling, tyre slip and friction identification, validated gear/clutch dynamics, cooling-network integration, measured stress and tolerance distributions, and target-specific timing/safety qualification.

**No safety, production readiness, FEM validation or MATLAB/Simulink feature parity is asserted.**
