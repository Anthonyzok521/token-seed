// Tokens de sesión con formato BIP39 (frase de palabras + checksum).
// Sin dependencias: solo usa el módulo `crypto` de Node.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WORDLIST = fs.readFileSync(path.join(__dirname, 'english.txt'), 'utf8')
  .split(/\r?\n/).map(w => w.trim()).filter(Boolean);
if (WORDLIST.length !== 2048) throw new Error('La lista debe tener 2048 palabras');
const INDEX = new Map(WORDLIST.map((w, i) => [w, i]));

const sha256 = buf => crypto.createHash('sha256').update(buf).digest();
const toBits = buf => [...buf].map(b => b.toString(2).padStart(8, '0')).join('');

// Entropía (128..256 bits, múltiplo de 32) -> frase.
function entropyToMnemonic(entropy) {
  const ENT = entropy.length * 8;
  if (ENT < 128 || ENT > 256 || ENT % 32) throw new Error('Entropía inválida');
  const CS = ENT / 32;                                // bits de checksum
  const bits = toBits(entropy) + toBits(sha256(entropy)).slice(0, CS);
  const words = [];
  for (let i = 0; i < bits.length; i += 11) {         // 11 bits = 1 palabra (2^11 = 2048)
    words.push(WORDLIST[parseInt(bits.slice(i, i + 11), 2)]);
  }
  return words.join(' ');
}

// Frase -> entropía. Lanza error si una palabra no existe o el checksum no cuadra.
function mnemonicToEntropy(mnemonic) {
  const words = mnemonic.normalize('NFKD').trim().toLowerCase().split(/\s+/);
  if (![12, 15, 18, 21, 24].includes(words.length)) throw new Error('Número de palabras inválido');
  const bits = words.map(w => {
    const i = INDEX.get(w);
    if (i === undefined) throw new Error(`Palabra desconocida: ${w}`);
    return i.toString(2).padStart(11, '0');
  }).join('');
  const CS = bits.length / 33;
  const entBits = bits.slice(0, bits.length - CS);
  const entropy = Buffer.from(entBits.match(/.{8}/g).map(b => parseInt(b, 2)));
  if (toBits(sha256(entropy)).slice(0, CS) !== bits.slice(-CS)) throw new Error('Checksum inválido');
  return entropy;
}

// --- API para sesiones -------------------------------------------------------

// Genera un token nuevo. Devuelve la frase (se entrega al cliente UNA vez)
// y el hash (lo único que guardas en la base de datos).
function issueToken(bits = 256) {
  const entropy = crypto.randomBytes(bits / 8);       // CSPRNG del sistema operativo
  return { token: entropyToMnemonic(entropy), hash: hashToken(entropy) };
}

// Hash que se guarda/busca en la BD. Se calcula sobre la entropía, así que
// mayúsculas o espacios extra en la frase no cambian el resultado.
function hashToken(entropy) {
  return sha256(entropy).toString('hex');
}

// Valida formato + checksum (sin tocar la BD) y devuelve el hash a buscar,
// o null si la frase está mal escrita. Acepta la frase o su forma numérica (QR).
function tokenLookupHash(input) {
  try {
    const mnemonic = /^\d+$/.test(input.trim()) ? numericToMnemonic(input.trim()) : input;
    return hashToken(mnemonicToEntropy(mnemonic));
  } catch { return null; }
}

// --- QR ------------------------------------------------------------------------

// Forma numérica compacta (como SeedQR): cada palabra = su índice en 4 dígitos.
// El QR en modo numérico ocupa mucho menos que el texto de las palabras.
function mnemonicToNumeric(mnemonic) {
  return mnemonic.trim().toLowerCase().split(/\s+/).map(w => {
    const i = INDEX.get(w);
    if (i === undefined) throw new Error(`Palabra desconocida: ${w}`);
    return String(i).padStart(4, '0');
  }).join('');
}

function numericToMnemonic(digits) {
  if (digits.length % 4) throw new Error('Longitud numérica inválida');
  return digits.match(/.{4}/g).map(d => {
    const w = WORDLIST[Number(d)];
    if (!w) throw new Error(`Índice fuera de rango: ${d}`);
    return w;
  }).join(' ');
}

// Contenido que va dentro del QR. 'words' (por defecto) = la frase tal cual;
// 'numeric' = índices compactos como SeedQR.
function qrPayload(token, format = 'words') {
  mnemonicToEntropy(token);                            // no generar QR de frases inválidas
  return format === 'words' ? token : mnemonicToNumeric(token);
}

const qrOpts = { errorCorrectionLevel: 'M', margin: 2 };

// PNG como data URL (para <img src>), sin escribir nada a disco.
function tokenToQRDataURL(token, { format, width = 300 } = {}) {
  return require('qrcode').toDataURL(qrPayload(token, format), { ...qrOpts, width });
}

// SVG como string.
function tokenToQRSVG(token, { format } = {}) {
  return require('qrcode').toString(qrPayload(token, format), { ...qrOpts, type: 'svg' });
}

// QR dibujado en la terminal.
function tokenToQRTerminal(token, { format } = {}) {
  return require('qrcode').toString(qrPayload(token, format), { ...qrOpts, type: 'terminal', small: true });
}

module.exports = {
  entropyToMnemonic, mnemonicToEntropy, issueToken, tokenLookupHash,
  mnemonicToNumeric, numericToMnemonic, tokenToQRDataURL, tokenToQRSVG, tokenToQRTerminal,
};

// Demo: `node mnemonic-token.js`
if (require.main === module) {
  // Vector de prueba oficial de BIP39 (entropía todo ceros).
  const v = entropyToMnemonic(Buffer.alloc(16));
  console.assert(v === 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', v);

  const { token, hash } = issueToken(128);
  console.log('Token (12 palabras):', token);
  console.log('Hash para la BD:    ', hash);
  console.log('Lookup coincide:    ', tokenLookupHash(token) === hash);
  const typo = token.split(' '); [typo[0], typo[1]] = [typo[1], typo[0]];
  console.log('Con palabras cambiadas de orden ->', tokenLookupHash(typo.join(' ')));

  // QR del token: numérico compacto, escaneado de vuelta -> mismo hash.
  const numeric = mnemonicToNumeric(token);
  console.log('Contenido del QR:   ', numeric);
  console.log('Lookup desde QR:    ', tokenLookupHash(numeric) === hash);
  tokenToQRTerminal(token).then(console.log);
  tokenToQRSVG(token).then(svg => {
    fs.writeFileSync(path.join(__dirname, 'token-qr.svg'), svg);
    console.log('QR guardado en token-qr.svg (solo demo: en producción no lo guardes en disco)');
  });
}
