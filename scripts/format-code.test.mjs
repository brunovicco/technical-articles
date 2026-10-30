import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCode} from './format-code.mjs';

test('marks inline identifiers without styling prose, headings, links or existing code',()=>{
  const input='<h3>Modules</h3><p>The Signature\'s contract uses <strong>dspy.Predict:</strong> and execution_id.</p><a href="https://dspy.ai/Signature">Signature</a><p><code>Signature</code> and text about signatures.</p>';
  const output=formatCode(input,{id:'dspy-notes'});
  assert.ok(output.includes('<h3>Modules</h3>'));
  assert.ok(output.includes("<code>Signature</code>'s"));
  assert.ok(output.includes('<strong><code>dspy.Predict</code>:</strong>'));
  assert.ok(output.includes('<code>execution_id</code>'));
  assert.ok(output.includes('<a href="https://dspy.ai/Signature">Signature</a>'));
  assert.ok(!output.includes('<code><code>'));
  assert.ok(output.includes('text about signatures.'));
  assert.equal(formatCode(output,{id:'dspy-notes'}),output);
});

test('keeps code block whitespace, entities and copyable contents intact',()=>{
  const input='<p>Use `request_id` with json.loads().</p><pre>if x &lt; 3:\n    run()\n</pre>';
  const output=formatCode(input);
  assert.ok(output.includes('<code>request_id</code>'));
  assert.ok(output.includes('<code>json.loads()</code>'));
  assert.ok(output.includes('<pre><code>if x &lt; 3:\n    run()\n</code></pre>'));
});

test('uses the screenshot example only for its matching article, without guessing other missing code',()=>{
  const id='dspy-o-framework-que-trata-prompts-como-codigo-compilavel-nao-como-strings';
  assert.equal(formatCode('<pre></pre><pre></pre>',{id}),'<pre><code>&quot;question → answer&quot;</code></pre>');
  assert.equal(formatCode('<pre></pre>',{id:'other-article'}),'');
  assert.equal(formatCode('<p>Signature</p>',{id:'unrelated-article'}),'<p>Signature</p>');
});
