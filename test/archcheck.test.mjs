import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bin = './bin/archcheck.mjs';
const validExample = './examples/valid.json';

function runArchcheck(args) {
  try {
    return execSync(`node ${bin} ${args}`, { encoding: 'utf8' });
  } catch (err) {
    // Return the error object to check exit code and stderr
    return { error: err, stdout: err.stdout, stderr: err.stderr, status: err.status };
  }
}

describe('archcheck CLI', () => {
  it('should validate a valid manifest', () => {
    const result = runArchcheck(`validate ${validExample}`);
    assert.strictEqual(result, '', 'Expected no output on success');
  });

  it('should render a valid manifest to SVG', () => {
    const outputFile = join(tmpdir(), 'test-archcheck.svg');
    // Clean up if exists
    if (existsSync(outputFile)) {
      unlinkSync(outputFile);
    }
    const result = runArchcheck(`render ${validExample} --output ${outputFile}`);
    assert.strictEqual(result, '', 'Expected no output on success');
    assert.ok(existsSync(outputFile), 'SVG file should be created');
    const svgContent = readFileSync(outputFile, 'utf8');
    assert.ok(svgContent.startsWith('<svg'), 'Output should be an SVG');
    assert.ok(svgContent.includes('</svg>'), 'SVG should be complete');
    // Clean up
    unlinkSync(outputFile);
  });

  it('should produce identical SVG output on two renders', () => {
    const outputFile1 = join(tmpdir(), 'test-archcheck1.svg');
    const outputFile2 = join(tmpdir(), 'test-archcheck2.svg');
    // Clean up
    if (existsSync(outputFile1)) unlinkSync(outputFile1);
    if (existsSync(outputFile2)) unlinkSync(outputFile2);
    // First render
    runArchcheck(`render ${validExample} --output ${outputFile1}`);
    // Second render
    runArchcheck(`render ${validExample} --output ${outputFile2}`);
    const content1 = readFileSync(outputFile1, 'utf8');
    const content2 = readFileSync(outputFile2, 'utf8');
    assert.strictEqual(content1, content2, 'Two renders should produce identical SVG');
    // Clean up
    unlinkSync(outputFile1);
    unlinkSync(outputFile2);
  });

  it('should exit with non-zero on duplicate node id', () => {
    const invalidManifest = join(tmpdir(), 'duplicate-id.json');
    const content = JSON.stringify({
      nodes: [
        { id: 'A' },
        { id: 'A' } // duplicate
      ],
      edges: []
    });
    writeFileSync(invalidManifest, content, 'utf8');
    const result = runArchcheck(`validate ${invalidManifest}`);
    assert.ok(result.error, 'Expected an error (non-zero exit)');
    assert.strictEqual(result.status, 1, 'Expected exit code 1');
    unlinkSync(invalidManifest);
  });

  it('should exit with non-zero on edge to unknown node', () => {
    const invalidManifest = join(tmpdir(), 'unknown-node.json');
    const content = JSON.stringify({
      nodes: [
        { id: 'A' }
      ],
      edges: [
        { from: 'A', to: 'B' } // B does not exist
      ]
    });
    writeFileSync(invalidManifest, content, 'utf8');
    const result = runArchcheck(`validate ${invalidManifest}`);
    assert.ok(result.error, 'Expected an error (non-zero exit)');
    assert.strictEqual(result.status, 1, 'Expected exit code 1');
    unlinkSync(invalidManifest);
  });

  it('should not create output file on invalid input for render', () => {
    const invalidManifest = join(tmpdir(), 'invalid-for-render.json');
    const content = JSON.stringify({
      nodes: [
        { id: 'A' },
        { id: 'A' } // duplicate
      ],
      edges: []
    });
    writeFileSync(invalidManifest, content, 'utf8');
    const outputFile = join(tmpdir(), 'should-not-exist.svg');
    // Clean up if exists
    if (existsSync(outputFile)) {
      unlinkSync(outputFile);
    }
    const result = runArchcheck(`render ${invalidManifest} --output ${outputFile}`);
    assert.ok(result.error, 'Expected an error (non-zero exit)');
    assert.strictEqual(result.status, 1, 'Expected exit code 1');
    assert.ok(!existsSync(outputFile), 'Output file should not be created');
    unlinkSync(invalidManifest);
  });

  it('should reject unsafe SVG-like node IDs without overwriting output', () => {
    const invalidManifest = join(tmpdir(), 'unsafe-id.json');
    const outputFile = join(tmpdir(), 'unsafe-id-output.svg');
    const content = JSON.stringify({
      nodes: [{ id: '<script>alert("x")</script>&' }],
      edges: []
    });
    writeFileSync(invalidManifest, content, 'utf8');
    writeFileSync(outputFile, 'preserve-this-output\n', 'utf8');
    const result = runArchcheck(`render ${invalidManifest} --output ${outputFile}`);
    assert.ok(result.error, 'Expected unsafe ID to fail validation');
    assert.strictEqual(result.status, 1, 'Expected exit code 1');
    assert.strictEqual(readFileSync(outputFile, 'utf8'), 'preserve-this-output\n');
    unlinkSync(invalidManifest);
    unlinkSync(outputFile);
  });

  it('should reject an empty manifest clearly', () => {
    const invalidManifest = join(tmpdir(), 'empty-manifest.json');
    writeFileSync(invalidManifest, JSON.stringify({ nodes: [], edges: [] }), 'utf8');
    const result = runArchcheck(`validate ${invalidManifest}`);
    assert.ok(result.error, 'Expected empty manifest to fail validation');
    assert.strictEqual(result.status, 1, 'Expected exit code 1');
    assert.match(result.stderr, /at least one node is required/);
    unlinkSync(invalidManifest);
  });
});
