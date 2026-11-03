// Let the TLS transport derive Host/:authority and connection framing itself.
const hopByHop = new Set(['host', 'connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'te', 'proxy-authorization']);
export function cleanHeaders(headers) {
  return headers.filter(([name]) => !hopByHop.has(name.toLowerCase()) && !name.startsWith(':'));
}
export function prepareTransport(transport) {
  const request = transport.request.bind(transport);
  transport.request = (url, method, body, headers, signal) => request(url, method, body, cleanHeaders(headers), signal);
  return transport;
}
