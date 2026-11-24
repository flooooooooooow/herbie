# Sparse DC MNA assembly

`herbie.sparse_mna` accumulates modified-nodal-analysis stamps as COO triplets, compresses them to CSR, and solves by expanding the CSR matrix into a caller-owned dense scratch for partial-pivoted Gaussian elimination. It is a sparse-*assembly* increment under [#11](https://github.com/flooooooooooow/herbie/issues/11) with dense-reference checks against `herbie.mna`. It is not a fill-reducing sparse LU.

## Contract

Provide `SparseMna` with positive `capacity`, caller-owned mutable cells `cooCount` / `csrNnz` / `ready` (`ptr<i32>`), COO (`cooRow`, `cooCol`, `cooVal`), CSR (`rowPtr` of length `n+1`, `colIdx`, `values`) and `rhs` of length `n`, where `n = nodeCount + voltageSourceCount`.

1. `sparseMnaClear` resets COO/CSR state and RHS.
2. Stamp with `sparseMnaStampResistor`, `sparseMnaStampCurrentSource`, `sparseMnaStampVoltageSource` before finalize. Stamps fail once `ready != 0` or capacity is exhausted.
3. `sparseMnaFinalize` sorts COO by `(row,col)`, merges duplicates into CSR and sets `ready = 1`.
4. `sparseMnaSolve` expands CSR to `denseScratch`, factors a copy in `factorScratch`, and writes the solution. `sparseMnaMaxResidual` uses CSR SpMV. `sparseMnaExpandDense` exposes the assembled matrix for comparison.

Ground is `-1`. Voltage-source currents are positive plus → minus.

## Validation

```sh
flow run tests/sparse_mna.flow
```

| Check | Reference | Tolerance |
| --- | --- | --- |
| 12 V / 1 kΩ / 1 kΩ divider | 12 V, 6 V, −6 mA; COO nnz = 7, CSR nnz = 6 after merge | 1e-10 V, 1e-12 A; residual ≤ 1e-12 |
| Same network + 1 mA injection vs `herbie.mna` | Solution and expanded matrix match dense stamps | 1e-12 solution; 1e-15 matrix |
| Capacity-2 buffer | Four-entry resistor stamp rejected | — |
| Floating two-node resistor | Solve returns false | — |

## Boundary

Factorisation remains dense O(n³) after CSR expansion. No AC/transient sparse path, no fill-in control, no nonlinear devices. Those remain open under #11.
