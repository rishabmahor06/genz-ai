// Builds the HTML document that is loaded in the sandboxed preview iframe.
// Everything runs client-side inside <iframe sandbox="allow-scripts"> (no access to this app's cookies/storage).

const LANG_ALIASES = {
  html: "html", htm: "html", svg: "html",
  js: "js", javascript: "js", mjs: "js", node: "js",
  py: "python", python: "python", python3: "python",
};

export const normalizeLang = (lang = "") => LANG_ALIASES[lang.toLowerCase()] || null;
export const isRunnable = (lang, code) => {
  const l = normalizeLang(lang);
  if (l) return true;
  // untagged block that looks like a web page
  return !lang && /<\s*(!doctype|html|body|div|script)\b/i.test(code || "");
};

// Safe to embed inside an inline <script>.
const embed = (code) => JSON.stringify(code).replace(/</g, "\\u003c");

const OUTPUT_SHELL = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:14px;background:#0b0b0c;color:#e5e7eb;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace}
.l{white-space:pre-wrap;word-break:break-word}.e{color:#f87171}.w{color:#fbbf24}.m{color:#6b7280}</style></head>
<body><div id="out"></div><script>
const out=document.getElementById('out');
function add(t,c){const d=document.createElement('div');d.className='l '+(c||'');d.textContent=t;out.appendChild(d);return d}
const fmt=a=>a.map(x=>typeof x==='string'?x:(()=>{try{return JSON.stringify(x,null,2)}catch(e){return String(x)}})()).join(' ');
${body}
</script></body></html>`;

export function buildSrcDoc(lang, code) {
  const l = normalizeLang(lang) || (isRunnable(lang, code) ? "html" : null);

  if (l === "html") {
    return /<\s*html[\s>]/i.test(code)
      ? code
      : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${code}</body></html>`;
  }

  if (l === "js") {
    return OUTPUT_SHELL(`
console.log=(...a)=>add(fmt(a));
console.info=console.log;
console.warn=(...a)=>add(fmt(a),'w');
console.error=(...a)=>add(fmt(a),'e');
window.onerror=(m)=>{add('Error: '+m,'e')};
window.addEventListener('unhandledrejection',e=>add('Error: '+((e.reason&&e.reason.message)||e.reason),'e'));
(async()=>{
  try{
    const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
    await new AsyncFunction(${embed(code)})();
    add('\\n✓ Finished','m');
  }catch(e){add('Error: '+e.message,'e')}
})();`);
  }

  if (l === "python") {
    return OUTPUT_SHELL(`
const loading=add('Loading Python runtime (first run takes a few seconds)...','m');
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
s.onerror=()=>{loading.remove();add('Could not load the Python runtime (check your internet connection).','e')};
s.onload=async()=>{
  try{
    const py=await loadPyodide({stdout:t=>add(t),stderr:t=>add(t,'e')});
    loading.remove();
    await py.loadPackagesFromImports(${embed(code)});
    await py.runPythonAsync(${embed(code)});
    add('\\n✓ Finished','m');
  }catch(e){loading.remove();add(String(e.message||e),'e')}
};
document.head.appendChild(s);`);
  }

  return null;
}
