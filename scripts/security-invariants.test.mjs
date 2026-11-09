import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRepository, checkWorkflow } from './security-invariants.mjs';

test('the repository workflows satisfy the security invariants', () => {
  assert.deepEqual(checkRepository(), []);
});

const good = `permissions:
  contents: read
jobs:
  build:
    steps:
      - uses: actions/checkout@v6
  deploy:
    if: github.event_name == 'workflow_dispatch' && inputs.publish == true && github.ref == 'refs/heads/main'
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/deploy-pages@v4
`;

test('a compliant workflow passes', () => assert.deepEqual(checkWorkflow('w.yml', good), []));

test('violations are reported', () => {
  assert.equal(checkWorkflow('w.yml', good.replace('contents: read', 'contents: write')).length, 1);
  assert.equal(checkWorkflow('w.yml', `on:\n  pull_request_target:\n${good}`).length, 1);
  assert.equal(checkWorkflow('w.yml', good.replace('checkout@v6', 'checkout@main')).length, 1);
  assert.equal(checkWorkflow('w.yml', good.replace(" && inputs.publish == true", '')).length, 1);
  assert.equal(checkWorkflow('w.yml', good.replace('  build:', '  build:\n    permissions:\n      pages: write')).length, 1);
});
