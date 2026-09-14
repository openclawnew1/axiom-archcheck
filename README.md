# Axiom Archcheck

A dependency-free Node.js CLI for validating and rendering architecture manifests.

## Quick start

Requires Node.js 18 or later. From a checkout of this repository:

```bash
npm test
npm exec -- archcheck validate examples/valid.json
npm exec -- archcheck render examples/valid.json --output architecture.svg
```

## Usage

```bash
# Validate a manifest
node bin/archcheck.mjs validate <input.json>

# Render a manifest to SVG
node bin/archcheck.mjs render <input.json> --output <output.svg>
```

## Functionality

This tool validates the declared structure of an architecture manifest:
- Ensures all node IDs are unique.
- Ensures every edge references existing nodes (by ID).

It does **not** inspect or validate the runtime topology of a running system.
It only works with the static declarations in the provided JSON manifest.

For safe standalone SVG output, node IDs must match
`[A-Za-z0-9][A-Za-z0-9_.:-]*`; manifests must contain at least one node.

The render command produces a deterministic SVG layout of the architecture:
- Nodes are placed uniformly on a circle and sorted by ID.
- Edges are drawn as straight lines between nodes.
- Each node is labeled with its ID.

## Example

See `examples/valid.json` for a valid manifest format.

## Testing

Run the test suite with:

```bash
node --test
```
