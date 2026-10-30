const escape=text=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export const profileSources={
  en:{file:'README.md',heading:'About'},
  'pt-br':{file:'README.pt-BR.md',heading:'Sobre mim'},
};

export function extractAbout(markdown,locale){
  const source=profileSources[locale];
  if(!source)throw new Error('Unsupported profile language');
  const lines=markdown.replace(/\r\n/g,'\n').split('\n');
  const start=lines.findIndex(line=>line.trim()===`## ${source.heading}`);
  if(start<0)throw new Error('Profile About section is missing');
  const remaining=lines.slice(start+1);
  const end=remaining.findIndex(line=>/^##\s|^\s*(?:---+|\*\*\*+)\s*$/.test(line));
  const section=(end<0?remaining:remaining.slice(0,end)).join('\n').trim();
  if(!section || section.length>30000)throw new Error('Profile About section is empty or too large');
  return section;
}

function inline(markdown,locale){
  const pattern=/\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*([^*]+)\*/g;
  let html='',offset=0;
  for(const match of markdown.matchAll(pattern)){
    html+=escape(markdown.slice(offset,match.index));
    if(match[1])html+=`<strong>${escape(match[1])}</strong>`;
    else if(match[2])html+=`<code>${escape(match[2])}</code>`;
    else if(match[3]){
      const link=new URL(match[4],`https://github.com/brunovicco/brunovicco/blob/main/${profileSources[locale].file}`);
      html+=link.protocol==='https:'&&!link.username&&!link.password?`<a href="${escape(link.href)}" rel="noopener noreferrer">${escape(match[3])}</a>`:escape(match[3]);
    }else html+=`<em>${escape(match[5])}</em>`;
    offset=match.index+match[0].length;
  }
  return html+escape(markdown.slice(offset));
}

// Only a small Markdown subset is rendered; remote HTML is always escaped.
export function renderProfile(markdown,locale){
  return markdown.trim().split(/\n\s*\n/).map(block=>{
    const lines=block.split('\n');
    if(lines.every(line=>/^>\s?/.test(line)))return `<blockquote><p>${inline(lines.map(line=>line.replace(/^>\s?/, '')).join(' '),locale)}</p></blockquote>`;
    if(lines.every(line=>/^[-*] /.test(line)))return `<ul>${lines.map(line=>`<li>${inline(line.slice(2),locale)}</li>`).join('')}</ul>`;
    return `<p>${inline(lines.join(' '),locale)}</p>`;
  }).join('');
}
