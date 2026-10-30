import {profileSources,extractAbout,renderProfile} from './profile-content.mjs';

export async function refreshProfile(element,locale,fetchImpl=fetch){
  const source=profileSources[locale];
  if(!source)return false;
  try{
    const response=await fetchImpl(`https://raw.githubusercontent.com/brunovicco/brunovicco/main/${source.file}`,{
      cache:'no-cache',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000),
    });
    if(!response.ok)throw new Error('Profile unavailable');
    const markdown=extractAbout(await response.text(),locale);
    const html=renderProfile(markdown,locale);
    if(element.innerHTML!==html)element.innerHTML=html;
    element.dataset.profileState='live';
    return true;
  }catch{
    // Keep the built-in snapshot when offline or when the source section changes.
    element.dataset.profileState='snapshot';
    return false;
  }
}

if(typeof document!=='undefined'){
  const element=document.querySelector('[data-profile-about]');
  if(element)void refreshProfile(element,document.body.dataset.locale);
}
