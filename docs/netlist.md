# Versioned SPICE-subset netlist

`herbie.netlist` is an optional SPICE-subset import/export front end (format version **1**) that builds element tables for the existing Herbie solvers. It is not a real-time kernel: session buffers use `calloc` / `fopen`.

## Format version 1

Decks should carry a version marker:

```spice
* herbie-netlist 1
```

or `.herbie 1`. Classic SPICE title lines are accepted and default to version 1. Unsupported versions fail parse.

### Elements

| Card | Syntax | Notes |
| --- | --- | --- |
| R | `Rname n+ n- value` | Engineering suffixes (`k`, `m`, `u`, `MEG`, …) |
| C | `Cname n+ n- value` | Farads |
| L | `Lname n+ n- value` | Henries |
| V | `Vname n+ n- [DC] value` | Ideal independent voltage |
| I | `Iname n+ n- [DC] value` | Current flows `n+` → `n-` |
| D | `Dname n+ n- [IS=…] [N=…]` | Shockley; `nVt = N * 0.025852` |
| S | `Sname n+ n- Ron Roff [CLOSED\|OPEN]` | Herbie resistive-switch extension |

Nodes `0`, `gnd`, and `ground` are reference. Other names allocate Herbie indices `0..nodeCount-1` in first-seen order (`netlistNode` returns `-1` for ground).

Dot cards accepted: `.op`, `.tran`, `.ac` (including `.ac omega=<rad/s>`), `.end`, `.print`, `.plot`, `.options`, `.title`, `.herbie`. Unsupported cards are counted by `netlistSkipped()`, not dropped silently. No `.subckt`, `.model` system, controlled sources, or waveform sources.

## API

1. `netlistLoadString` / `netlistLoadText` / `netlistLoadFile`
2. `netlistParse` → element table + node names
3. Stamp into a solver:
   - resistive DC → `netlistStampMna` → `herbie.mna`
   - linear AC R/C/L → `netlistStampAc` → `herbie.ac`
   - diodes / switches → `netlistStampNl` → `herbie.nl`
4. `netlistExport` / `netlistExportFile` rewrite a versioned deck for round-trip

## Validation

```sh
flow run tests/netlist.flow
flow run examples/netlist_demo.flow
```

| Check | Reference | Tolerance |
| --- | --- | --- |
| 12 V / 1 kΩ / 1 kΩ divider via parse→MNA | 12 V, 6 V, −6 mA | 1e-10 V / 1e-12 A |
| Export → reparse → restamp | Same voltages; element kinds/values preserved | 1e-12 |
| Series RC deck `.ac omega=1000` | `Vout = 0.5 − j0.5` | 1e-10 |
| Diode + open switch deck via NL | Shockley + load KVL | 1e-9 A |
| `10m` / `2.2k` / `4.7k` suffixes; skipped `.model` | 69 V / 47 V; `skipped ≥ 1` | 1e-9 V |
| `* herbie-netlist 99` | Parse rejected | — |

Example decks: `examples/netlists/*.cir`.

## Boundary

Optional I/O front end only. No SPICE waveform parity, no subcircuits, no `.model` library, no automatic analysis dispatch beyond stamp helpers. External ngspice waveform cross-validation is a separate increment under [#11](https://github.com/flooooooooooow/herbie/issues/11).
