# FMI 2.0 FMU archives (issue #7)

`herbie.zip` reads and writes ZIP archives and `herbie.fmu` checks and packs FMI 2.0 FMUs against section 2.3 of the FMI 2.0.4 specification ("FMU Distribution"). Both are plain Flow with caller-owned buffers and no allocation.

## ZIP (`herbie.zip`)

- `zipOpen` finds the end-of-central-directory record, reads every central-directory entry and cross-checks each local header (signature, method, name length). ZIP64 archives and archives that span several disks are reported as faults and left unread.
- `zipExtract` decodes stored (method 0) and deflated (method 8) entries and checks the uncompressed size and CRC-32. `zipInflate` is a complete RFC 1951 decoder (stored, fixed-Huffman and dynamic-Huffman blocks) with distinct fault codes for truncated input, output overflow, a reserved block type, a stored-length mismatch, invalid code lengths, an invalid symbol and a back-reference before the start of the output.
- `ZipWriter` writes stored entries only, with a fixed DOS timestamp, so the same inputs always produce the same bytes.

## FMU checks (`fmuCheck`)

| Code | Fault |
| --- | --- |
| 1 `FMU_ERR_ZIP` | Not a readable ZIP archive |
| 2 `FMU_ERR_SPLIT` | Archive spans several disks |
| 3 `FMU_ERR_METHOD` | Entry method other than 0 (stored) or 8 (deflate) |
| 4 `FMU_ERR_ENCRYPTED` | Encrypted entry |
| 5 `FMU_ERR_VERSION` | "Version needed to extract" above 2.0, or ZIP64 |
| 6 `FMU_ERR_DATA_DESCRIPTOR` | General-purpose bit 3 on a stored entry (allowed only with deflate) |
| 7 `FMU_ERR_LINK` | Unix symbolic link entry |
| 8 `FMU_ERR_PATH` | Empty or absolute name, backslash, NUL, `..` or empty path segment |
| 9 `FMU_ERR_DUPLICATE` | Two entries with the same name |
| 10 `FMU_ERR_ENTRY_DATA` | Entry fails to extract (bad deflate data, size or CRC-32) |
| 11 `FMU_ERR_NO_MODEL_DESCRIPTION` | No `modelDescription.xml` at the root |
| 12 `FMU_ERR_MODEL_DESCRIPTION` | `modelDescription.xml` fails `xmlParse` or `fmi2Validate` |
| 13 `FMU_ERR_NO_IMPLEMENTATION` | A declared interface has neither a binary nor sources |
| 14 `FMU_ERR_SOURCE_MISSING` | No binary, and a file listed in `SourceFiles` is missing under `sources/` |
| 15 `FMU_ERR_CAPACITY` | A caller buffer is too small |

Every entry is extracted and CRC-checked. For each declared interface (`ModelExchange`, `CoSimulation`) the FMU must hold either a binary `binaries/<platform>/<modelIdentifier>.dll`, `.so` or `.dylib`, or every file listed in that interface's `SourceFiles` under `sources/`. The report counts entries, matching binaries, and listed and present source files, and carries the ZIP, XML and FMI codes behind a fault.

## Packing (`fmuPack`)

`fmuPack` writes `modelDescription.xml` followed by the given files as a stored archive, then runs `fmuCheck` on the result. A Herbie model description has no `SourceFiles`, and Herbie does not generate `fmi2*` C sources or binaries yet, so packing a Herbie model is refused with `FMU_ERR_NO_IMPLEMENTATION`. The packer is exercised by repacking a Reference FMU.

## Conformance tests

`tests/fmu_archive.flow` runs in CI and checks:

- CRC-32 of the standard check string `123456789` (`0xCBF43926`), the empty string and the "quick brown fox" pangram;
- inflate of stored and fixed-Huffman vectors produced by Python's `zlib` for the same text, and one vector per inflate fault. The back-reference vector is one `zlib` itself rejects as "invalid distance too far back";
- `BouncingBall.fmu` and `Dahlquist.fmu` from the Reference FMUs release: 28 entries each, all extracted with matching CRC-32 (17 dynamic-Huffman entries and 1 fixed-Huffman entry per archive), 10 binaries (5 platforms for each of the two interfaces), `all.c` listed and present for both interfaces, and a valid description;
- a stored repack of `BouncingBall.fmu` (18 files; the 10 directory entries are dropped) that passes `fmuCheck`, matches every original name, size and CRC-32, and is byte-identical when packed twice;
- one failing case for every FMU fault code, built with `ZipWriter` and byte patches to the central directory, local headers and end record;
- the refused Herbie model packaging and a writer capacity fault.

The repack is written to `/tmp/herbie-fmu-BouncingBall.fmu`. The next CI steps test it with `unzip -tq` and Python's `zipfile -t`, and `scripts/check_fmu_repack.py` compares its contents with the original file by file.

## Vendored files

`tests/fmi2/fmu/BouncingBall.fmu` and `tests/fmi2/fmu/Dahlquist.fmu` are the FMI 2.0 FMUs of the [modelica/Reference-FMUs](https://github.com/modelica/Reference-FMUs) release `v0.0.42` (asset `Reference-FMUs.zip`, folder `2.0/`), unchanged. SHA-256 prefixes: `BouncingBall.fmu` `1c7a40ab239c03e4`, `Dahlquist.fmu` `8f716dddc2fadef2`. BSD 2-Clause, see `tests/fmi2/fmu/LICENSE.txt`.

## Not covered

Writing deflated entries, ZIP64, generating `fmi2*` C sources or binaries from a Flow model, and loading or running an FMU.
