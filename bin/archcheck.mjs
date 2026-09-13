#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const [, , command, inputFile, ...rest] = process.argv;
const outputArgIndex = rest.indexOf('--output');
const outputFile = outputArgIndex !== -1 ? rest[outputArgIndex + 1] : undefined;

if (!command || !inputFile) {
  console.error('Usage: archcheck.mjs <validate|render> <input.json> [--output <output.svg>]');
  process.exit(1);
}

let manifest;
try {
  const raw = readFileSync(inputFile, 'utf8');
  manifest = JSON.parse(raw);
} catch (err) {
  console.error(`Error reading or parsing ${inputFile}: ${err.message}`);
  process.exit(1);
}

// Validate the manifest structure
if (!manifest || typeof manifest !== 'object' ||
    !Array.isArray(manifest.nodes) ||
    !Array.isArray(manifest.edges)) {
  console.error('Invalid manifest: expected { nodes: [], edges: [] }');
  process.exit(1);
}

if (manifest.nodes.length === 0) {
  console.error('Invalid manifest: at least one node is required');
  process.exit(1);
}

const safeId = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

// Check each node has an id
for (const node of manifest.nodes) {
  if (typeof node.id !== 'string') {
    console.error('Each node must have a string id');
    process.exit(1);
  }
  if (!safeId.test(node.id)) {
    console.error(`Invalid node id: ${node.id}. Use [A-Za-z0-9][A-Za-z0-9_.:-]*`);
    process.exit(1);
  }
}

// Check for duplicate node ids
const nodeIds = new Set();
for (const node of manifest.nodes) {
  if (nodeIds.has(node.id)) {
    console.error(`Duplicate node id: ${node.id}`);
    process.exit(1);
  }
  nodeIds.add(node.id);
}

// Check edges reference existing nodes
for (const edge of manifest.edges) {
  if (typeof edge.from !== 'string' || typeof edge.to !== 'string') {
    console.error('Each edge must have string from and to fields');
    process.exit(1);
  }
  if (!nodeIds.has(edge.from)) {
    console.error(`Edge references unknown node: ${edge.from}`);
    process.exit(1);
  }
  if (!nodeIds.has(edge.to)) {
    console.error(`Edge references unknown node: ${edge.to}`);
    process.exit(1);
  }
}

if (command === 'validate') {
  // Validation succeeded
  process.exit(0);
} else if (command === 'render') {
  if (!outputFile) {
    console.error('Missing --output flag for render command');
    process.exit(1);
  }

  const width = 800;
  const height = 600;
  const radius = 200;
  const cx = width / 2;
  const cy = height / 2;

  // Sort nodes by id for deterministic layout
  const sortedNodes = [...manifest.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const nodePositions = new Map();
  const angleStep = (2 * Math.PI) / sortedNodes.length;
  sortedNodes.forEach((node, index) => {
    const angle = index * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    nodePositions.set(node.id, { x, y });
  });

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  // Draw edges
  for (const edge of manifest.edges) {
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);
    svg += `  <line x1="${fromPos.x}" y1="${fromPos.y}" x2="${toPos.x}" y2="${toPos.y}" stroke="black" stroke-width="2"/>\n`;
  }
  // Draw nodes
  for (const node of sortedNodes) {
    const pos = nodePositions.get(node.id);
    svg += `  <circle cx="${pos.x}" cy="${pos.y}" r="12" fill="lightblue" stroke="black" stroke-width="1"/>\n`;
    svg += `  <text x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" font-family="Arial" font-size="10" fill="black">${node.id}</text>\n`;
  }
  svg += '</svg>\n';

  try {
    writeFileSync(outputFile, svg, 'utf8');
  } catch (err) {
    console.error(`Error writing ${outputFile}: ${err.message}`);
    process.exit(1);
  }
} else {
  console.error('Unknown command: use validate or render');
  process.exit(1);
}
