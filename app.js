// Servidor de ejemplo: `node app.js` y abre http://localhost:3000
const http = require('http');
const { issueToken, tokenToQRDataURL, tokenLookupHash } = require('./mnemonic-token');

const sessions = new Set();                      // en producción: tu BD (guarda solo el hash)

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (url.pathname === '/') {
    const { token, hash } = issueToken();
    sessions.add(hash);
    const qr = await tokenToQRDataURL(token);    // 'data:image/png;base64,...'
    return res.end(`<img src="${qr}" alt="Código de acceso"><p>${token}</p>
      <form action="/verify"><input name="t" size="80" placeholder="Frase o contenido del QR">
      <button>Verificar</button></form>`);
  }

  // Al escanear el QR o escribir la frase:
  if (url.pathname === '/verify') {
    const h = tokenLookupHash(url.searchParams.get('t') || '');   // null si es inválido
    const msg = h === null ? 'Frase inválida' : sessions.has(h) ? 'Token válido' : 'Token desconocido';
    return res.end(`<p>${msg}</p><a href="/">Volver</a>`);
  }

  res.statusCode = 404;
  res.end('No encontrado');
});

server.listen(3000, () => console.log('Escuchando en http://localhost:3000'));
