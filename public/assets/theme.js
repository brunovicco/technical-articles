(()=>{
  try {
    const stored=localStorage.getItem('bv-theme');
    const theme=stored==='light'||stored==='dark'?stored:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    document.documentElement.dataset.theme=theme;
  }catch{}
})();
