// Add presentation semantics without rewriting the imported article bodies.
const dspyTerms = [
  'BootstrapFewShotWithRandomSearch', 'BootstrapFewShot', 'BootstrapFinetune',
  'ChainOfThought', 'RouterOutput', 'Signatures', 'Signature', 'Modules', 'Module',
  'MIPROv2', 'COPRO',
];
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const literalCodeExample = 'dspy-o-framework-que-trata-prompts-como-codigo-compilavel-nao-como-strings';

export function formatCode(html, { id = '', terms = [] } = {}) {
  const vocabulary = [...new Set([...terms, ...(id.includes('dspy') ? dspyTerms : [])])]
    .sort((a, b) => b.length - a.length).map(escapePattern);
  const identifier = String.raw`(?:dspy|redis|mcp|asyncio|json|os|sys|np|pd)\.[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*(?:\(\))?|[A-Za-z]\w*(?:_[A-Za-z0-9]+)+(?:\(\))?|[A-Za-z_]\w*\(\)`;
  const pattern = new RegExp(String.raw`(?<![\p{L}\p{N}_./:@-])(?:${identifier}${vocabulary.length ? '|' + vocabulary.join('|') : ''})(?![\p{L}\p{N}_])`, 'gu');
  const protectedTags = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'script', 'style']);
  const stack = [];
  // Tokenize only the sanitized article fragment, preserving markup and attributes verbatim.
  let content = html.split(/(<[^>]+>)/g).map(token => {
    if (token.startsWith('<')) {
      const closing = token.match(/^<\/([a-z0-9]+)/i);
      const opening = token.match(/^<([a-z0-9]+)/i);
      if (closing) {
        const index = stack.lastIndexOf(closing[1].toLowerCase());
        if (index !== -1) stack.splice(index);
      } else if (opening && !/\/>$/.test(token) && !['img','br','hr'].includes(opening[1].toLowerCase())) {
        stack.push(opening[1].toLowerCase());
      }
      return token;
    }
    if (stack.some(tag => protectedTags.has(tag))) return token;
    // Explicit backticks are authoritative; do not interpret prose inside them a second time.
    return token.split(/(`[^`\n]+`)/g).map(part => {
      if (part.startsWith('`') && part.endsWith('`')) return `<code>${part.slice(1, -1)}</code>`;
      return part.replace(pattern, value => `<code>${value}</code>`);
    }).join('');
  }).join('');

  // This exact snippet is supplied in the author's screenshot, not inferred from missing code.
  if (id === literalCodeExample) {
    content = content.replace(/<pre>\s*<\/pre>/, '<pre><code>&quot;question → answer&quot;</code></pre>');
  }
  // Empty export placeholders are not useful code or copy targets. Keep sources intact on disk.
  content = content.replace(/<pre(?:\s[^>]*)?>\s*(?:<code>\s*<\/code>)?\s*<\/pre>/g, '');
  return content.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (match, attributes, body) =>
    /^\s*<code[\s>]/.test(body) ? match : `<pre${attributes}><code>${body}</code></pre>`);
}
