import {profileSources,extractAbout,extractProjects,renderProfile,renderProjects} from './profile-content.mjs';

export async function refreshProfile(element,locale,fetchImpl=fetch,projectsElement=null){
  const source=profileSources[locale];
  if(!source)return false;
  try{
    const response=await fetchImpl(`https://raw.githubusercontent.com/brunovicco/brunovicco/main/${source.file}`,{
      cache:'no-cache',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000),
    });
    if(!response.ok)throw new Error('Profile unavailable');
    const markdown=await response.text();
    let success=true;
    for(const [target,extract,render] of [[element,extractAbout,renderProfile],[projectsElement,extractProjects,renderProjects]]){
      if(!target)continue;
      try{
        const html=render(extract(markdown,locale),locale);
        if(target.innerHTML!==html)target.innerHTML=html;
        target.dataset.profileState='live';
      }catch{
        target.dataset.profileState='snapshot';
        success=false;
      }
    }
    return success;
  }catch{
    // Keep the built-in snapshot when offline or when the source section changes.
    element.dataset.profileState='snapshot';
    if(projectsElement)projectsElement.dataset.profileState='snapshot';
    return false;
  }
}

if(typeof document!=='undefined'){
  const element=document.querySelector('[data-profile-about]');
  if(element)void refreshProfile(element,document.body.dataset.locale,fetch,document.querySelector('[data-profile-projects]'));
}
