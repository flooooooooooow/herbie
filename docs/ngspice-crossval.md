# ngspice cross-validation

Herbie circuit solvers are checked against **stored** ngspice-42 operating-point and AC results for three small circuits. CI does not install or run ngspice; reference numbers are pinned under `tests/ngspice_refs/` with command provenance.

## Fixtures

| Circuit | Analysis | Herbie path | ngspice absolute tolerance |
| --- | --- | --- | --- |
| 12 V / 1 kΩ / 1 kΩ divider | `.op` | `herbie.mna` (+ netlist stamp) | 1e-12 V / A |
| Series R=1 kΩ, C=1 µF | `.ac` at `ω=1000` rad/s | `herbie.ac` (+ netlist stamp) | 1e-9 V (mag 1e-7) |
| 5 V → diode → 1 kΩ | `.op`, `IS=1e-14 N=1` | `herbie.nl` (+ netlist stamp) | 1e-3 V |

Diode tolerance is looser because Herbie uses a fixed `nVt = 0.025852` while ngspice evaluates thermal voltage from `TEMP=27`.

## Provenance

See [tests/ngspice_refs/PROVENANCE.md](../tests/ngspice_refs/PROVENANCE.md) for ngspice version, host, UTC stamp and exact `ngspice -b …` commands. Curated prints: `*.print`. Tabulated SI values: `values.tsv`. Full batch logs: `*.raw`.

Regenerate on a machine with ngspice:

```sh
./scripts/regen_ngspice_refs.sh
```

Then refresh `PROVENANCE.md` / `values.tsv` if any printed value changes, and update the constants in `tests/ngspice_crossval.flow`.

## Validation

```sh
flow run tests/ngspice_crossval.flow
```

## Boundary

Three hand-chosen circuits only. Not a claim of general SPICE parity, transient waveform libraries, device-model libraries, or large-netlist performance.