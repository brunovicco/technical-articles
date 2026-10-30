// Optional GoatCounter page-view counting. Disabled unless a site code is configured.
const CODE=/^[a-z0-9][a-z0-9-]{1,62}$/;

export function goatcounterCode(value){
  const code=String(value ?? '').trim().toLowerCase();
  if(!code)return '';
  if(!CODE.test(code))throw new Error(`Invalid GoatCounter site code: ${code}`);
  return code;
}

// The counter script is served from this site, so pages never load third-party scripts.
export function goatcounterTag(code,scriptUrl){
  return code?`<script data-goatcounter="https://${code}.goatcounter.com/count" async src="${scriptUrl}"></script>`:'';
}
