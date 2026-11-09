#!/usr/bin/env node
// Verifies the repository security invariants that the "Repository security invariants" CI check enforces.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function checkWorkflow(name, text) {
  const problems = [];
  const fail = message => problems.push(`${name}: ${message}`);
  if (/\bpull_request_target\b/.test(text)) fail('must not use the pull_request_target trigger');
  if (!/^permissions:\s*\n\s+contents:\s*read\s*$/m.test(text)) fail('top-level permissions must be exactly "contents: read"');
  for (const match of text.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
    const ref = match[1];
    if (ref.startsWith('./')) continue;
    const version = ref.split('@')[1];
    if (!version || /^(main|master|latest|HEAD)$/.test(version)) fail(`action "${ref}" must be pinned to a version or commit`);
  }
  const deployUses = [...text.matchAll(/actions\/deploy-pages@/g)].length;
  if (deployUses) {
    const deploy = text.match(/^ {2}deploy:\n([\s\S]*?)(?=^ {2}\S|(?![\s\S]))/m)?.[0] || '';
    if (!deploy.includes('actions/deploy-pages@')) fail('deploy-pages must only run inside the deploy job');
    const gate = deploy.match(/^\s+if:\s*(.+)$/m)?.[1] || '';
    for (const part of ["github.event_name == 'workflow_dispatch'", 'inputs.publish == true', "github.ref == 'refs/heads/main'"]) {
      if (!gate.includes(part)) fail(`the deploy job must be gated on ${part}`);
    }
    const outside = text.replace(deploy, '');
    if (/^\s+(pages|id-token):\s*write/m.test(outside)) fail('pages/id-token write permissions are only allowed in the deploy job');
  }
  return problems;
}

export function checkRepository(dir = root) {
  const workflows = path.join(dir, '.github', 'workflows');
  const files = fs.existsSync(workflows) ? fs.readdirSync(workflows).filter(f => /\.ya?ml$/.test(f)) : [];
  const problems = files.length ? [] : ['no workflows found'];
  for (const file of files) problems.push(...checkWorkflow(file, fs.readFileSync(path.join(workflows, file), 'utf8')));
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkRepository();
  if (problems.length) {
    console.error(problems.map(p => `- ${p}`).join('\n'));
    process.exit(1);
  }
  console.log('Repository security invariants hold.');
}
