# Architecture

Herbie targets an executable engineering stack in which model code, parameter provenance, simulation, optimization, and deployment share a common Flow representation. Rather than treating diagrams, numerical scripts, generated C, and embedded software as unrelated artifacts, models should be testable as library code and directly deployable where the platform and safety case permit.

## Current package boundaries

The first implementation is intentionally small:

```
src/
  vehicle.flow       Vertical quarter car and planar bicycle
  powertrain.flow    Longitudinal point-mass motion
  structures.flow    Elastic stress and introductory fatigue\n  truss.flow         Local 2D truss element stiffness and force\n  uncertainty.flow   First-order covariance propagation
  tolerances.flow    Interval clearance and statistical capability
  thermal.flow       Lumped temperature evolution
  control.flow       Bounded-output PID
tests/
  engineering_smoke.flow
  vehicle_energy.flow
examples/
  quarter_car_demo.flow
  manufacturing_demo.flow
```

Every step function takes an explicit current state, immutable model parameters, the environmental inputs, and `dt`, and returns the next state. Call sites decide scheduling, checkpointing, telemetry, fault detection and synchronization. All values currently use SI units and `f64`.

## Real-time execution contract

No hidden allocations or I/O are written in the hot-path model kernels. However, a real-time claim also requires measuring the emitted C and target machine code: WCET or measured tails under stress, stack and memory allocation checks, scheduling analysis, CPU affinity, deadline misses, and numerical stability under supported step sizes.

The caller must reject non-physical parameter sets and singular denominators. The bicycle model requires positive, nonzero speed and small tire slip. A production version should replace unchecked public APIs with explicit validation at construction or a typed `Result` boundary outside the hot path.

## Solver roadmap

The vertical model uses classical fixed-step RK4 on continuous-time ODEs. The bicycle, thermal and longitudinal models currently use explicit Euler/trapezoidal position integration. The roadmap is to separate `Model`, `Integrator`, `Schedule`, and `Observer` interfaces and support RK4, semi-implicit Euler, adaptive RK, implicit stiff ODE/DAE, event systems, sampled controllers and multirate co-simulation without duplicating plants.

A later spatial geometry and manufacturing layer can support meshes, element assembly, sparse iterative and direct solvers, nonlinear material laws, contact and thermal-mechanical coupling. Those are substantial projects, not features implied by the current elementary formulas.

## Industrial integration architecture

Interoperability should be layered: CSV/Parquet and unit-tagged datasets; parameter/config schemas; FMU/FMI import/export; CAN/CAN FD, XCP and automotive Ethernet adapters; test bench and sensor bindings; ROS 2/Middleware adapters where useful; and APIs for optimization and CAD/CAE geometry. None of these adapters is implemented in the first release.

A future block-graph front end could compile model graphs to Flow state evolution with statically checked rates, initialization order, algebraic loops and scheduling. The graph must have a canonical serialized form, reproducible compiler lowering and round-trip tests.
\n## Truss and statistical assumptions\n\nThe 2D truss element writes a 4x4 matrix in row-major order to a caller-provided 16-element buffer. It uses \`EA/L\` times the direction-cosine projection and returns failure for zero length or nonpositive area/modulus. It is an element kernel only, not a complete global FEA solver or structural certification system.\n\nThe correlated uncertainty module implements \`Var(aX+bY)=a²σx²+b²σy²+2abρσxσy\` and the corresponding three-variable covariance form. All inputs must specify valid standard deviations and a positive-semidefinite covariance matrix.\n