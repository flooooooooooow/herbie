# Sparse-path larger-network runtime assessment

Target runtime assessment for issue #11 on the **sparse assembly** path (`herbie.sparse_mna`). Factorisation remains dense GE after CSR expansion — this measurement records that honestly.

## Workload

40-node resistive ladder: ideal 12 V source at node 0, 100 Ω series links between consecutive nodes, 1 kΩ shunt to ground at every node. Unknowns = 41. Sparse COO capacity 512; observed `coo_count=197`, `csr_nnz=120` after merge.

Each timed trial **rebuilds** the network (clear → stamp → finalize/solve) so stamp+assemble cost is included. `REPEATS=40`.

Harness: `tests/sparse_bench.flow` / `examples/sparse_bench_demo.flow` (calloc for buffers; kernels remain allocation-free).

## Recorded measurement (Cloud Agent VM)

| Field | Value |
| --- | --- |
| UTC | 2026-11-24T21:34:36Z |
| Host | Linux 6.12.113+ x86_64, 4× Intel Xeon (reported) |
| Flow | pinned CI revision `7687fc936365e17bc6286415585c55fcc6ea64c3` |
| Timer | `clock()` ticks; assume `CLOCKS_PER_SEC=1e6` → µs ≈ ticks |
| Sparse rebuild+solve | **12.1 µs/trial** (483 ticks / 40) |
| Dense `herbie.mna` rebuild+solve | **7.9 µs/trial** (316 ticks / 40) |
| Correctness | sparse ≡ dense within 1e-9; residual ≤ 1e-9; V0=12 V |

```sh
flow run tests/sparse_bench.flow
flow run examples/sparse_bench_demo.flow
```

## Interpretation (honest)

At n≈40 the dense expand + O(n³) GE dominates. Sparse COO→CSR assembly does **not** beat dense stamping here; the sparse path adds finalize/expand overhead. A fill-reducing sparse LU would be required before claiming large-n speedups. These numbers are **not** WCET, p99.99, or a real-time qualification — they are a single-host CPU-tick sample for a fixed-size ladder.

## Acceptance checklist (#11)

- [x] Larger-network exercise of the sparse path (40-node ladder)
- [x] Target runtime assessment recorded with host/provenance
- [x] Correctness vs dense reference
- [ ] Real-time / WCET qualification — **out of scope** (needs target binary, scheduling, stack/heap audit, deadline miss analysis)

## Boundary

Single fixture size; timer resolution and host noise apply. Do not treat µs/trial as a portability or safety claim.
