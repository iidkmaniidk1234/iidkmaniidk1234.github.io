// YouTube's SPA keyboard submit can lose its navigation under URL rewriting.
// Keep native typing, but use an ordinary proxied navigation for an explicit
// Enter in its search field. This never handles passwords or other site inputs.
export function installSiteFixes(frame, navigate) {
  globalThis.$scramjet.Tap.tap(frame.hooks.init.post, ({client, window: win, isTopLevel}) => {
    if (!isTopLevel || !/(^|\.)youtube\.com$/i.test(client.url.hostname)) return;
    win.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      const input = event.target;
      if (input?.getAttribute?.('name') !== 'search_query' || !input.value?.trim()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      navigate('https://www.youtube.com/results?search_query=' + encodeURIComponent(input.value.trim()));
    }, true);
  });
}
