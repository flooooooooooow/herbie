# FMI 2.0 model description (issue #7)

`herbie.fmi2` reads, checks and writes FMI 2.0 `modelDescription.xml` files. It sits on `herbie.xml`, a strict XML 1.0 subset reader and canonical writer. Both are allocation-free: the caller owns the element table, attribute table and byte pool, and capacity overflow is a reported fault.

This is the first interoperability piece of #7. It covers the model description only. There is no FMU archive (zip), no compiled binaries, no `fmi2*` C API, no Model Exchange or Co-Simulation runtime and no master algorithm, so it cannot run an FMU yet.

## Reader (`herbie.xml`)

Accepted: an optional UTF-8 byte-order mark, the XML declaration (version 1.0, encoding UTF-8 when given), comments, processing instructions (skipped), elements with single- or double-quoted attributes, the five predefined entities, and decimal and hex character references in attribute values. Literal tab, LF and CR in attribute values become a space, as the XML spec requires for CDATA attributes; character references keep their character.

Refused, each with its own code: DOCTYPE/DTD, CDATA sections, non-whitespace character data, duplicate attributes, mismatched or missing end tags, unknown entities and character references outside the XML `Char` range, invalid UTF-8 or NUL bytes, a misplaced or non-1.0 declaration, zero or several root elements, nesting deeper than 64 and table or pool overflow. Namespaces are not resolved. FMI 2.0 descriptions carry no character data, so text content is outside this subset; vendor annotations that rely on text would be refused rather than silently dropped.

`xmlWrite` emits one canonical form: the declaration, two-space indentation, one element per line, attributes in document order and `/>` for empty elements, with `&`, `<`, `>`, `"`, tab, LF and CR escaped in values.

## FMI 2.0 rules (`fmi2Validate`)

The official XSD checks element and attribute grammar. `fmi2Validate` checks the rules of FMI 2.0.4 section 2.2 that the XSD cannot express, plus the structural ones it needs:

| Code | Rule |
| --- | --- |
| 1 to 5 | Root is `fmiModelDescription`; `fmiVersion="2.0"`; `modelName` and `guid` present; at least one of `ModelExchange` and `CoSimulation`, each with `modelIdentifier`; top-level elements in XSD order, each at most once, with `ModelVariables` and `ModelStructure` present |
| 6 | More variables than the caller's table holds |
| 7 to 10 | One type element per `ScalarVariable` (optionally followed by `Annotations`); unique names; unsigned 32-bit `valueReference`; known `causality`, `variability` and `initial` literals |
| 11 | Causality and variability pair allowed by the section 2.2.7 table; `continuous` only for `Real` |
| 12 | `initial` allowed for the pair: class A exact only, class B approx or calculated, class C any, none for inputs and the independent variable |
| 13 | `start` required for exact, approx and inputs; forbidden for calculated and the independent variable |
| 14 | At most one `independent` variable, of type `Real` |
| 15 | `derivative` is a 1-based index of a `Real` variable |
| 16 | `declaredType` names a `SimpleType` with the same base type; `Enumeration` variables have one |
| 17 | `unit` names a `Unit` and `displayUnit` one of its `DisplayUnit`s, for variables and `SimpleType`s |
| 18 | `Outputs` lists exactly the `causality="output"` variables in index order |
| 19 | Each `Derivatives` entry is a `Real` with `derivative`, listed once; this marks the states |
| 20 | `InitialUnknowns` is exactly the section 2.2.8 set (outputs and states or derivatives with approx or calculated `initial`, plus every `calculatedParameter`) in index order |
| 21 | `dependencies` are in range and strictly ascending, and `dependenciesKind` has one valid kind per dependency |

The XSD alone accepts files that break these rules. For example, `xmllint` validates a description with a `continuous` parameter, two variables of the same name and an `Outputs` index pointing past the last variable. `fmi2Validate` rejects all three.

Not checked yet: `valueReference` uniqueness per base type (aliases make it legal to repeat), `min ≤ start ≤ max`, the meaning of each dependency (which knowns are legal per mode), `canHandleMultipleSetPerTimeInstant`, and the structured-name grammar.

## Export (`fmi2BuildRealModel`)

`fmi2BuildRealModel` builds a description for a `Real`-valued Herbie model interface from a list of variables: header, `ModelExchange` and/or `CoSimulation`, `UnitDefinitions` in first-use order (names only, no SI base-unit exponents), `DefaultExperiment`, `ModelVariables`, and a `ModelStructure` derived with the same rules `fmi2Validate` checks. Every variable with `derivative` becomes a `Derivatives` entry. Outputs and derivatives are written without `dependencies`, which FMI reads as "depends on all knowns". The built document is validated before it is returned.

## Conformance tests

`tests/fmi2_model_description.flow` runs in CI and checks:

- the six FMI 2.0 Reference FMU descriptions (`BouncingBall`, `Dahlquist`, `Feedthrough`, `Resource`, `Stair`, `VanDerPol`) parse and pass every rule. Variable, base-type, output, derivative and initial-unknown counts match counts taken independently with Python's `xml.etree`;
- each one is written canonically, parsed back to an equal tree (names, attribute order and values, child order) and re-written byte for byte;
- `BouncingBall` facts: variable indices, the `der(h)` to `h` state link, class A default `initial` for `v_min`, and `g`'s start value;
- the 30 cells of the causality and variability table;
- every XML and FMI fault code, with at least one case each;
- reference decoding, attribute-value normalisation and writer escaping;
- export of the `herbie.vehicle` quarter-car interface (18 variables, 4 states, 3 outputs, 5 initial unknowns), its round trip, a rejected continuous parameter and a capacity fault.

The canonical rewrites and the quarter-car export are written to `/tmp/herbie-fmi2-*.xml`. The next CI step validates all seven against the official FMI 2.0.4 schema with `xmllint --schema tests/fmi2/schema/fmi2ModelDescription.xsd`.

## Vendored files

- `tests/fmi2/schema/*.xsd`: the FMI 2.0.4 XML schema from [modelica/fmi-standard](https://github.com/modelica/fmi-standard) tag `v2.0.4` (commit `714d206b`), unchanged. Each file carries its BSD 2-Clause notice.
- `tests/fmi2/reference/*/modelDescription.xml`: the `FMI2.xml` files of [modelica/Reference-FMUs](https://github.com/modelica/Reference-FMUs) at commit `e101bb59`, renamed, otherwise unchanged. BSD 2-Clause, see `tests/fmi2/reference/LICENSE.txt`.

## Next for #7

Packaging an FMU (zip layout, `binaries/`, `sources/`), the `fmi2*` C entry points generated from a Flow model, a Co-Simulation step loop checked against these Reference FMUs, FMI 3.0, explicit unit and timestep compatibility, and the CAN/XCP, replay and SIL items of the issue.
