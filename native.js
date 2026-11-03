import {prepareTransport} from './transport.js';
import {installSiteFixes} from './site-fixes.js';
const $ = id => document.getElementById(id);
let controller, frame, bootTask, current = '', navigating = 0, toastTimer, loadingTimer, siteFailed = false;
function status(message, error = false) { $('status').textContent = message; $('status-dot').classList.toggle('error', error); }
function loading(value) { $('loading-line').classList.toggle('active', value); clearTimeout(loadingTimer); if (value) loadingTimer = setTimeout(() => { $('loading-line').classList.remove('active'); status('Website is still loading…'); }, 25000); }
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6000); }
function address(raw) {
  raw = raw.trim(); if (!raw) throw new Error('Enter a website address.');
  if (!/^https?:\/\//i.test(raw)) { if (/^[a-z][\w+.-]*:/i.test(raw)) throw new Error('Use an http:// or https:// address.'); raw = 'https://' + raw; }
  const u = new URL(raw);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('Use a public website address.');
  return u.href;
}
function loadScript(src) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('A browser component could not load. Try again.')); document.head.appendChild(s); }); }
function watchedURL(raw) {
  let url; try { url = address(String(raw)); } catch { return; }
  current = url;
  if ($('remote').hidden) return;
  if (document.activeElement !== $('address')) $('address').value = url;
  $('original').href = url; $('original').hidden = false;
  document.title = new URL(url).hostname + ' · CarBrowser';
  status(new URL(url).hostname); $('back').disabled = false; $('forward').disabled = false;
}
async function boot() {
  if (frame) return;
  if (bootTask) return bootTask;
  bootTask = (async () => {
    if (!navigator.serviceWorker) throw new Error('This browser needs HTTPS and service-worker support. Try a current Chrome, Edge, Firefox or Safari.');
    status('Starting on-device browser…');
    const registration = await navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'});
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true}));
    for (const src of ['/scram/scramjet.js', '/controller/controller.api.js', '/utils/scramjet-utils.js']) await loadScript(src);
    const {default: LibcurlClient} = await import('/libcurl/index.mjs');
    const transport = new LibcurlClient({wisp: "wss://logos-generations-watson-duncan.trycloudflare.com/wisp/"});
    await transport.init();
    prepareTransport(transport);
    controller = new window.$scramjetController.Controller({
      serviceworker: navigator.serviceWorker.controller || registration.active, transport,
      config: {prefix: '/browse/', scramjetPath: '/scram/scramjet.js', wasmPath: '/scram/scramjet.wasm', injectPath: '/controller/controller.inject.js'},
      scramjetConfig: {flags: {syncxhr: false, rewriterLogs: false}},
    });
    await controller.wait();
    const utils = window.$scramjetUtils;
    frame = controller.createFrame($('web-page'), {plugins: [
      new utils.HttpCachePlugin(),
      new utils.UrlWatcherPlugin(watchedURL),
      new utils.CatchEscapedLinksPlugin(url => new URL('/?url=' + encodeURIComponent(String(url)), location.origin)),
    ]});
    installSiteFixes(frame, navigate);
    window.$scramjet.Tap.tap(frame.hooks.error.request, ({rawrequest}, props) => {
      if (!['document', 'iframe'].includes(rawrequest.destination)) return;
      props.setResponse = {status:200, statusText:'OK', headers:[['Content-Type','text/html; charset=utf-8']], body:'<!doctype html><meta name="viewport" content="width=device-width"><style>body{font:16px system-ui;padding:32px;color:#514769;line-height:1.6}</style><h2>This website could not load through CarBrowser.</h2><p>Try another address, reload, or use Open original in the bottom bar. Some sites do not work through a proxy.</p>'};
      try {
        const failed = decodeURIComponent(new URL(rawrequest.rawUrl).pathname.slice(frame.prefix.length));
        if (new URL(failed).href.split('#')[0] === current.split('#')[0]) { siteFailed = true; loading(false); status('Website unavailable through proxy', true); }
      } catch {}
    });
    $('web-page').addEventListener('load', () => { loading(false); if (current && !$('remote').hidden && !siteFailed) status(new URL(current).hostname); });
    document.documentElement.dataset.engine = 'device-rendered';
  })();
  try { await bootTask; } catch (error) { bootTask = null; throw error; }
}
async function navigate(raw) {
  let url; try { url = address(raw); } catch (error) { toast(error.message); return; }
  const operation = ++navigating;
  siteFailed = false; loading(true); $('page-notice').hidden = true;
  try {
    await boot();
    if (operation !== navigating) return;
    $('start').hidden = true; $('remote').hidden = false; watchedURL(url);
    status('Loading ' + new URL(url).hostname + '…'); frame.go(url);
  } catch (error) { loading(false); status('Could not start browser', true); $('page-notice').textContent = error.message; $('page-notice').hidden = false; }
}
for (const form of ['address-form', 'start-form']) $(form).onsubmit = event => { event.preventDefault(); const input = $(form === 'start-form' ? 'start-input' : 'address'); input.blur(); navigate(input.value); };
$('address').onfocus = () => $('address').select();
$('back').onclick = () => { if (frame && current && !$('start').hidden) { $('start').hidden = true; $('remote').hidden = false; watchedURL(current); } else frame?.back(); }; $('forward').onclick = () => frame?.forward();
$('reload').onclick = () => { if (frame && !$('remote').hidden) { loading(true); frame.reload(); } };
$('home').onclick = () => { ++navigating; $('start').hidden = false; $('remote').hidden = true; $('address').value = ''; $('original').hidden = true; $('page-notice').hidden = true; document.title = 'CarBrowser'; loading(false); status('Ready to browse'); try { const doc = $('web-page').contentDocument; doc?.querySelectorAll('video,audio').forEach(v => v.pause()); } catch {} };
const help = $('help-dialog'); $('help').onclick = $('limits').onclick = () => help.showModal(); $('close-help').onclick = $('got-it').onclick = () => help.close();
$('reset-session').onclick = async () => {
  if (controller) {
    controller.cookieJar.clear(); await controller.persistCookies();
    await controller.propagateCookieSync([], {clear: true});
  }
  $('web-page').src = 'about:blank';
  current = ''; $('start-input').value = ''; $('address').value = '';
  $('original').removeAttribute('href'); $('back').disabled = true; $('forward').disabled = true;
  // Anonymous, browser-local website state only; no server-side viewer profiles.
  localStorage.clear(); sessionStorage.clear();
  for (const name of await caches.keys()) await caches.delete(name);
  if (indexedDB.databases) {
    for (const {name} of await indexedDB.databases()) if (name && name !== '__scramjet_controller') indexedDB.deleteDatabase(name);
  }
  $('home').click(); help.close(); toast('Website cookies and cached browsing data cleared.');
};
// Display-only Bash context: this public relay has no viewer accounts or private API.
if (window.bash) window.bash.ready.then(() => {
  const url = window.bash.space?.publicUrl;
  if (url) { const p = $('share-address'); p.hidden = false; const a = document.createElement('a'); a.href = url; a.textContent = url; a.target = '_blank'; a.rel = 'noopener'; p.append('Public Bash.tv page: ', a); }
}).catch(() => {});
const linkedURL = new URLSearchParams(location.search).get('url');
if (linkedURL) navigate(linkedURL);
