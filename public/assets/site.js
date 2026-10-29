(()=>{
  'use strict';
  const lang=document.body.dataset.locale;
  const pt=lang==='pt-br';
  if(matchMedia('(max-width: 900px)').matches)document.querySelector('.toc details')?.removeAttribute('open');
  document.querySelector('.theme-toggle')?.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    try{localStorage.setItem('bv-theme',next);}catch{}
  });
  const input=document.querySelector('#search');
  if(input){
    const rows=[...document.querySelectorAll('.article-list .article-row')];
    const list=document.querySelector('.article-list');
    const year=document.querySelector('#year'),sort=document.querySelector('#sort');
    const buttons=[...document.querySelectorAll('[data-topic]')];
    const reset=document.querySelector('#reset-filters');
    const params=new URLSearchParams(location.search);
    let topic='all';let searchText=new Map();
    const normalize=text=>text.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
    const filter=()=>{
      const terms=normalize(input.value.trim()).split(/\s+/).filter(Boolean);let found=0;
      for(const row of rows){
        const searchable=searchText.get(row.dataset.id)||row.dataset.search;
        const visible=terms.every(term=>searchable.includes(term))&&(year.value==='all'||row.dataset.year===year.value)&&(topic==='all'||row.dataset.tags.split(' ').includes(topic));
        row.hidden=!visible;if(visible)found++;
      }
      const ordered=[...rows].sort((a,b)=>(sort.value==='oldest'?1:-1)*a.dataset.date.localeCompare(b.dataset.date)||a.dataset.id.localeCompare(b.dataset.id));
      for(const row of ordered)list.append(row);
      document.querySelector('#results').textContent=`${found} ${pt?'artigos encontrados':'articles found'}`;
      document.querySelector('.empty-state').hidden=found!==0;
      reset.hidden=!input.value&&year.value==='all'&&topic==='all'&&sort.value==='newest';
      document.querySelector('#clear-search').hidden=!input.value;
      const query=new URLSearchParams();
      if(input.value)query.set('q',input.value);
      if(topic!=='all')query.set('topic',topic);
      if(year.value!=='all')query.set('year',year.value);
      if(sort.value!=='newest')query.set('sort',sort.value);
      const next=location.pathname+(query.size?'?'+query:'')+location.hash;
      history.replaceState(null,'',next);
    };
    input.value=params.get('q')||'';
    if([...year.options].some(option=>option.value===params.get('year')))year.value=params.get('year');
    if(params.get('sort')==='oldest')sort.value='oldest';
    const selectTopic=value=>{topic=value;for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.topic===topic));};
    if(buttons.some(button=>button.dataset.topic===params.get('topic')))selectTopic(params.get('topic'));
    for(const button of buttons)button.addEventListener('click',()=>{selectTopic(button.dataset.topic);filter();});
    input.addEventListener('input',filter);year.addEventListener('change',filter);sort.addEventListener('change',filter);
    document.querySelector('#clear-search').addEventListener('click',()=>{input.value='';filter();input.focus();});
    reset.addEventListener('click',()=>{input.value='';year.value='all';sort.value='newest';selectTopic('all');filter();});
    filter();
    fetch(`${document.body.dataset.base}/${lang}/search-index.json`).then(response=>{if(!response.ok)throw new Error('Search index unavailable');return response.json();}).then(entries=>{searchText=new Map(entries.map(entry=>[entry.id,entry.text]));filter();}).catch(()=>{});
  }
  const prose=document.querySelector('.prose');
  if(prose){
    for(const pre of prose.querySelectorAll('pre')){
      const text=pre.textContent;
      const button=document.createElement('button');button.type='button';button.className='copy-code';button.textContent=prose.dataset.copy;
      button.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(text);button.textContent=prose.dataset.copied;setTimeout(()=>button.textContent=prose.dataset.copy,1800);}
        catch{button.textContent=pt?'Selecione para copiar':'Select to copy';const range=document.createRange();range.selectNodeContents(pre);getSelection().removeAllRanges();getSelection().addRange(range);}
      });pre.prepend(button);
    }
    const tocLinks=[...document.querySelectorAll('.toc nav a')];
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries){if(entry.isIntersecting){for(const link of tocLinks){if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');}}}
      },{rootMargin:'-10% 0px -65% 0px',threshold:0});
      for(const heading of prose.querySelectorAll('h2[id],h3[id],h4[id]'))observer.observe(heading);
    }
    const updateProgress=()=>{
      const box=prose.getBoundingClientRect();const total=Math.max(1,prose.offsetHeight-innerHeight*.65);
      const progress=Math.max(0,Math.min(1,(innerHeight*.2-box.top)/total));
      document.querySelector('.reading-progress').style.transform=`scaleX(${progress})`;
    };
    addEventListener('scroll',updateProgress,{passive:true});addEventListener('resize',updateProgress);updateProgress();
    // Remote export media may be unavailable. Keep the caption and source link readable.
    for(const image of prose.querySelectorAll('img'))image.addEventListener('error',()=>{image.hidden=true;const link=document.createElement('a');link.className='image-fallback';link.textContent=pt?'↗ Ver figura na publicação original':'↗ View figure in the original publication';link.href=document.querySelector('.toc-source a').href;image.after(link);},{once:true});
  }
})();
