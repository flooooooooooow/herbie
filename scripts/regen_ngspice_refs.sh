#!/usr/bin/env bash
# Regenerate tests/ngspice_refs outputs. Requires ngspice on PATH.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="$ROOT/tests/ngspice_refs"
cd "$ROOT"
command -v ngspice >/dev/null || { echo "ngspice not found" >&2; exit 1; }

ngspice -b "$REF/divider.cir" | tee "$REF/divider.raw" >/dev/null
ngspice -b "$REF/rc_ac.cir"   | tee "$REF/rc_ac.raw" >/dev/null
ngspice -b "$REF/diode.cir"   | tee "$REF/diode.raw" >/dev/null

extract() {
  local raw="$1" out="$2"
  {
    echo "# ngspice batch print results"
    grep -E '^[a-zA-Z].*= ' "$raw" | grep -v '^Circuit\|^Doing\|^No\.\|^Using\|^Note\|^ngspice'
  } > "$out"
}

extract "$REF/divider.raw" "$REF/divider.out"
extract "$REF/rc_ac.raw" "$REF/rc_ac.out"
extract "$REF/diode.raw" "$REF/diode.out"

echo "Refreshed raw/out under $REF — update PROVENANCE.md timestamp and values.tsv by hand if numbers change."
ngspice --version | head -3
