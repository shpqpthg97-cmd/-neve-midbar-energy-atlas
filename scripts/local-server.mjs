import http from 'node:http';

// Bind a loopback address and reject cross-site browser requests and DNS rebinding.
// The trusted request origin is constructed from the listening port, never Host input.
export function serveLocal(worker, env, port, onReady) {
  const server = http.createServer(async (req, res) => {
    try {
      const host = '127.0.0.1:' + server.address().port;
      const origin = 'http://' + host;
      if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== origin) ||
          req.headers['sec-fetch-site'] === 'cross-site' || !/^\/(?!\/)/.test(req.url)) {
        res.writeHead(403).end();
        return;
      }
      const body = ['GET', 'HEAD'].includes(req.method) ? {} : { body: req, duplex: 'half' };
      const request = new Request(origin + req.url, { method: req.method, headers: req.headers, ...body });
      const result = await worker.fetch(request, { ...env, ATLAS_ORIGIN: origin });
      res.writeHead(result.status, Object.fromEntries(result.headers)).end(Buffer.from(await result.arrayBuffer()));
    } catch {
      res.writeHead(503, { 'Cache-Control': 'no-store' }).end('Service unavailable');
    }
  });
  return server.listen(port, '127.0.0.1', () => onReady?.('http://127.0.0.1:' + server.address().port));
}
