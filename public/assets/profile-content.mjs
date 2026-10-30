const escape=text=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export const profileSources={
  en:{file:'README.md',heading:'About',projectsHeading:'Flagship projects'},
  'pt-br':{file:'README.pt-BR.md',heading:'Sobre mim',projectsHeading:'Principais projetos'},
};

export function extractAbout(markdown,locale){
  return extractSection(markdown,locale,'heading');
}

export function extractProjects(markdown,locale){
  return extractSection(markdown,locale,'projectsHeading');
}

function extractSection(markdown,locale,headingKey){
  const source=profileSources[locale];
  if(!source)throw new Error('Unsupported profile language');
  const lines=markdown.replace(/\r\n/g,'\n').split('\n');
  const start=lines.findIndex(line=>line.trim()===`## ${source[headingKey]}`);
  if(start<0)throw new Error('Profile section is missing');
  const remaining=lines.slice(start+1);
  const end=remaining.findIndex(line=>/^##\s|^\s*(?:---+|\*\*\*+)\s*$/.test(line));
  const section=(end<0?remaining:remaining.slice(0,end)).join('\n').trim();
  if(!section || section.length>30000)throw new Error('Profile section is empty or too large');
  return section;
}

function inline(markdown,locale){
  const pattern=/\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let html='',offset=0;
  for(const match of markdown.matchAll(pattern)){
    html+=escape(markdown.slice(offset,match.index));
    if(match[1]){
      const link=new URL(match[2],`https://github.com/brunovicco/brunovicco/blob/main/${profileSources[locale].file}`);
      const label=inline(match[1],locale);
      html+=link.protocol==='https:'&&!link.username&&!link.password?`<a href="${escape(link.href)}" rel="noopener noreferrer">${label}</a>`:label;
    }else if(match[3])html+=`<strong>${escape(match[3])}</strong>`;
    else if(match[4])html+=`<code>${escape(match[4])}</code>`;
    else html+=`<em>${escape(match[5])}</em>`;
    offset=match.index+match[0].length;
  }
  return html+escape(markdown.slice(offset));
}

// The profile's two-column project table becomes a readable list on all screens.
export function renderProjects(markdown,locale){
  return markdown.trim().split(/\n\s*\n/).map(block=>{
    const lines=block.split('\n');
    if(lines.length>=3 && /^\|/.test(lines[0]) && /^\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*$/.test(lines[1])){
      const rows=lines.slice(2).map(line=>line.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(cell=>cell.trim().replace(/\\\|/g,'|')));
      if(rows.some(row=>row.length!==2 || !row[0] || !row[1]))throw new Error('Invalid project table');
      return `<ul class="profile-project-list">${rows.map(([name,description])=>`<li><h3>${inline(name,locale)}</h3><p>${inline(description,locale)}</p></li>`).join('')}</ul>`;
    }
    return renderProfile(block,locale);
  }).join('');
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
