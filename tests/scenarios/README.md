# Verification scenarios

Versioned CSV fixtures for `herbie.verify`. Format version **1**.

- Lines starting with `#` are metadata comments (id, model, readiness, compiler pin, provenance, SI tags).
- One header row of column names, then numeric rows: `col0,col1,...`
- Readiness labels: `experimental`, `validated_for_domain`, `realtime_qualified_for_target`. Never `safety_assessed` from unit tests alone.

Loaded by `tests/verification_matrix.flow` and `tests/calibration_pipeline.flow` relative to the package root.

Calibration CSVs (`torque_surface.csv`) use the same `#` metadata style with SI unit tags and an explicit train/validation split note; fitted coefficients must cite that split.
