'use strict';

/* ============================================================================
   TASAS GLOBAL · script.js
   ----------------------------------------------------------------------------
   Página: referencias oficiales del dólar y el euro.
   Datos: Google Apps Script + feeds directos de autoridades monetarias.

   👉 CONFIGURA AQUÍ TU WEB APP DE APPS SCRIPT:
   ========================================================================== */

const CONFIG = {
  // URL de implementación del Web App de Apps Script (termina en /exec)
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxPjQ06f6JkIggVWiA0f9Q7I2H_agdvAcPOm0HE3hQY77KIv06GZBugAmZO_YkjWEcA/exec',

  providerUrl: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/',
  refreshMs: 120000,  // refresco automático (2 min, igual que la caché del backend)
  timeoutMs: 20000,   // tiempo máximo de espera por respuesta
  cacheMaxAge: 24 * 60 * 60 * 1000,

  storageKeys: {
    theme: 'tasas-theme',
    favorites: 'tasas-favorites-v1',
    cache: 'tasas-cache-official-v1',
    previous: 'tasas-previous-official-v1'
  }
};

/* ============================================================================
   1. METADATOS DE MONEDAS
   Formato: [código, país, iso2 de la bandera, región]
   Ninguna moneda tiene prioridad: todas las tarjetas se muestran iguales.
   Las monedas que no están en la lista se generan automáticamente.
   ========================================================================== */

const CURRENCY_TABLE = [
  /* --- Latinoamérica --- */
  ['VES', 'Venezuela', 've', 'latam'],
  ['ARS', 'Argentina', 'ar', 'latam'],
  ['BOB', 'Bolivia', 'bo', 'latam'],
  ['BRL', 'Brasil', 'br', 'latam'],
  ['CLP', 'Chile', 'cl', 'latam'],
  ['COP', 'Colombia', 'co', 'latam'],
  ['CRC', 'Costa Rica', 'cr', 'latam'],
  ['CUP', 'Cuba', 'cu', 'latam'],
  ['DOP', 'República Dominicana', 'do', 'latam'],
  ['GTQ', 'Guatemala', 'gt', 'latam'],
  ['HNL', 'Honduras', 'hn', 'latam'],
  ['HTG', 'Haití', 'ht', 'latam'],
  ['MXN', 'México', 'mx', 'latam'],
  ['NIO', 'Nicaragua', 'ni', 'latam'],
  ['PAB', 'Panamá', 'pa', 'latam'],
  ['PEN', 'Perú', 'pe', 'latam'],
  ['PYG', 'Paraguay', 'py', 'latam'],
  ['SRD', 'Surinam', 'sr', 'latam'],
  ['UYU', 'Uruguay', 'uy', 'latam'],
  ['BZD', 'Belice', 'bz', 'latam'],
  ['BSD', 'Bahamas', 'bs', 'latam'],
  ['BBD', 'Barbados', 'bb', 'latam'],
  ['JMD', 'Jamaica', 'jm', 'latam'],
  ['TTD', 'Trinidad y Tobago', 'tt', 'latam'],
  ['XCD', 'Caribe Oriental', 'un', 'latam'],
  ['FKP', 'Islas Malvinas', 'fk', 'latam'],
  ['GYD', 'Guyana', 'gy', 'latam'],
  ['KYD', 'Islas Caimán', 'ky', 'latam'],
  ['AWG', 'Aruba', 'aw', 'latam'],
  ['ANG', 'Curazao', 'cw', 'latam'],
  ['BMD', 'Bermudas', 'bm', 'latam'],

  /* --- Norteamérica --- */
  ['USD', 'Estados Unidos', 'us', 'norteamerica'],
  ['CAD', 'Canadá', 'ca', 'norteamerica'],

  /* --- Europa --- */
  ['EUR', 'Eurozona', 'eu', 'europa'],
  ['GBP', 'Reino Unido', 'gb', 'europa'],
  ['CHF', 'Suiza', 'ch', 'europa'],
  ['NOK', 'Noruega', 'no', 'europa'],
  ['SEK', 'Suecia', 'se', 'europa'],
  ['DKK', 'Dinamarca', 'dk', 'europa'],
  ['PLN', 'Polonia', 'pl', 'europa'],
  ['CZK', 'Chequia', 'cz', 'europa'],
  ['HUF', 'Hungría', 'hu', 'europa'],
  ['RON', 'Rumania', 'ro', 'europa'],
  ['RSD', 'Serbia', 'rs', 'europa'],
  ['UAH', 'Ucrania', 'ua', 'europa'],
  ['RUB', 'Rusia', 'ru', 'europa'],
  ['ISK', 'Islandia', 'is', 'europa'],
  ['MDL', 'Moldavia', 'md', 'europa'],
  ['ALL', 'Albania', 'al', 'europa'],
  ['MKD', 'Macedonia del Norte', 'mk', 'europa'],
  ['BAM', 'Bosnia y Herzegovina', 'ba', 'europa'],
  ['BYN', 'Bielorrusia', 'by', 'europa'],
  ['GEL', 'Georgia', 'ge', 'europa'],
  ['GIP', 'Gibraltar', 'gi', 'europa'],
  ['TRY', 'Turquía', 'tr', 'europa'],

  /* --- Asia y Medio Oriente --- */
  ['CNY', 'China', 'cn', 'asia'],
  ['JPY', 'Japón', 'jp', 'asia'],
  ['INR', 'India', 'in', 'asia'],
  ['KRW', 'Corea del Sur', 'kr', 'asia'],
  ['IDR', 'Indonesia', 'id', 'asia'],
  ['MYR', 'Malasia', 'my', 'asia'],
  ['PHP', 'Filipinas', 'ph', 'asia'],
  ['SGD', 'Singapur', 'sg', 'asia'],
  ['THB', 'Tailandia', 'th', 'asia'],
  ['MVR', 'Maldivas', 'mv', 'asia'],
  ['VND', 'Vietnam', 'vn', 'asia'],
  ['PKR', 'Pakistán', 'pk', 'asia'],
  ['BDT', 'Bangladés', 'bd', 'asia'],
  ['LKR', 'Sri Lanka', 'lk', 'asia'],
  ['NPR', 'Nepal', 'np', 'asia'],
  ['TWD', 'Taiwán', 'tw', 'asia'],
  ['HKD', 'Hong Kong', 'hk', 'asia'],
  ['MOP', 'Macao', 'mo', 'asia'],
  ['KHR', 'Camboya', 'kh', 'asia'],
  ['MMK', 'Birmania', 'mm', 'asia'],
  ['LAK', 'Laos', 'la', 'asia'],
  ['MNT', 'Mongolia', 'mn', 'asia'],
  ['KZT', 'Kazajistán', 'kz', 'asia'],
  ['UZS', 'Uzbekistán', 'uz', 'asia'],
  ['ILS', 'Israel', 'il', 'asia'],
  ['AED', 'Emiratos Árabes Unidos', 'ae', 'asia'],
  ['SAR', 'Arabia Saudita', 'sa', 'asia'],
  ['QAR', 'Catar', 'qa', 'asia'],
  ['KWD', 'Kuwait', 'kw', 'asia'],
  ['BHD', 'Baréin', 'bh', 'asia'],
  ['OMR', 'Omán', 'om', 'asia'],
  ['JOD', 'Jordania', 'jo', 'asia'],
  ['IQD', 'Irak', 'iq', 'asia'],
  ['IRR', 'Irán', 'ir', 'asia'],
  ['LBP', 'Líbano', 'lb', 'asia'],
  ['YER', 'Yemen', 'ye', 'asia'],
  ['SYP', 'Siria', 'sy', 'asia'],
  ['AFN', 'Afganistán', 'af', 'asia'],
  ['BTN', 'Bután', 'bt', 'asia'],
  ['BND', 'Brunéi', 'bn', 'asia'],
  ['KGS', 'Kirguistán', 'kg', 'asia'],
  ['TJS', 'Tayikistán', 'tj', 'asia'],
  ['TMT', 'Turkmenistán', 'tm', 'asia'],
  ['AZN', 'Azerbaiyán', 'az', 'asia'],
  ['AMD', 'Armenia', 'am', 'asia'],

  /* --- África --- */
  ['ZAR', 'Sudáfrica', 'za', 'africa'],
  ['EGP', 'Egipto', 'eg', 'africa'],
  ['NGN', 'Nigeria', 'ng', 'africa'],
  ['KES', 'Kenia', 'ke', 'africa'],
  ['GHS', 'Ghana', 'gh', 'africa'],
  ['MAD', 'Marruecos', 'ma', 'africa'],
  ['LYD', 'Libia', 'ly', 'africa'],
  ['KMF', 'Comoras', 'km', 'africa'],
  ['SHP', 'Santa Elena', 'sh', 'africa'],
  ['TND', 'Túnez', 'tn', 'africa'],
  ['DZD', 'Argelia', 'dz', 'africa'],
  ['ETB', 'Etiopía', 'et', 'africa'],
  ['TZS', 'Tanzania', 'tz', 'africa'],
  ['UGX', 'Uganda', 'ug', 'africa'],
  ['XOF', 'África Occidental', 'un', 'africa'],
  ['XAF', 'África Central', 'un', 'africa'],
  ['MZN', 'Mozambique', 'mz', 'africa'],
  ['AOA', 'Angola', 'ao', 'africa'],
  ['ZMW', 'Zambia', 'zm', 'africa'],
  ['BWP', 'Botsuana', 'bw', 'africa'],
  ['MUR', 'Mauricio', 'mu', 'africa'],
  ['NAD', 'Namibia', 'na', 'africa'],
  ['MWK', 'Malaui', 'mw', 'africa'],
  ['RWF', 'Ruanda', 'rw', 'africa'],
  ['MGA', 'Madagascar', 'mg', 'africa'],
  ['SCR', 'Seychelles', 'sc', 'africa'],
  ['CVE', 'Cabo Verde', 'cv', 'africa'],
  ['GMD', 'Gambia', 'gm', 'africa'],
  ['GNF', 'Guinea', 'gn', 'africa'],
  ['SLE', 'Sierra Leona', 'sl', 'africa'],
  ['LRD', 'Liberia', 'lr', 'africa'],
  ['SDG', 'Sudán', 'sd', 'africa'],
  ['SSP', 'Sudán del Sur', 'ss', 'africa'],
  ['SOS', 'Somalia', 'so', 'africa'],
  ['DJF', 'Yibuti', 'dj', 'africa'],
  ['ERN', 'Eritrea', 'er', 'africa'],
  ['BIF', 'Burundi', 'bi', 'africa'],
  ['CDF', 'R. D. del Congo', 'cd', 'africa'],
  ['SZL', 'Esuatini', 'sz', 'africa'],
  ['LSL', 'Lesoto', 'ls', 'africa'],

  /* --- Oceanía --- */
  ['AUD', 'Australia', 'au', 'oceania'],
  ['NZD', 'Nueva Zelanda', 'nz', 'oceania'],
  ['FJD', 'Fiyi', 'fj', 'oceania'],
  ['PGK', 'Papúa Nueva Guinea', 'pg', 'oceania'],
  ['WST', 'Samoa', 'ws', 'oceania'],
  ['TOP', 'Tonga', 'to', 'oceania'],
  ['VUV', 'Vanuatu', 'vu', 'oceania'],
  ['SBD', 'Islas Salomón', 'sb', 'oceania'],
  ['XPF', 'Polinesia Francesa', 'un', 'oceania']
];

const CURRENCIES = {};
CURRENCY_TABLE.forEach(function (item) {
  CURRENCIES[item[0]] = {
    country: item[1],
    iso: item[2],
    region: item[3],
    known: true
  };
});

const FALLBACK_NAMES = {
  USD: 'Dólar estadounidense',
  EUR: 'Euro',
  VES: 'Bolívar venezolano',
  ARS: 'Peso argentino',
  BOB: 'Boliviano',
  BRL: 'Real brasileño',
  CLP: 'Peso chileno',
  COP: 'Peso colombiano',
  PEN: 'Sol peruano',
  PYG: 'Guaraní paraguayo',
  UYU: 'Peso uruguayo',
  MXN: 'Peso mexicano',
  GBP: 'Libra esterlina',
  JPY: 'Yen japonés',
  CNY: 'Yuan chino',
  INR: 'Rupia india',
  RUB: 'Rublo ruso',
  TRY: 'Lira turca',
  CAD: 'Dólar canadiense',
  AUD: 'Dólar australiano'
};

const REGIONS = [
  { id: 'todos', label: 'Todas' },
  { id: 'favoritos', label: '★ Favoritos' },
  { id: 'oficial', label: 'Fuente oficial' },
  { id: 'latam', label: 'Latinoamérica' },
  { id: 'norteamerica', label: 'Norteamérica' },
  { id: 'europa', label: 'Europa' },
  { id: 'asia', label: 'Asia' },
  { id: 'africa', label: 'África' },
  { id: 'oceania', label: 'Oceanía' },
  { id: 'otros', label: 'Otras' }
];

const REGION_RANK = {
  latam: 0,
  norteamerica: 1,
  europa: 2,
  asia: 3,
  africa: 4,
  oceania: 5,
  otros: 6
};

/* ============================================================================
   2. ESTADO
   ========================================================================== */

const state = {
  data: null,
  rows: [],
  deltas: {},
  region: 'todos',
  sort: 'az',
  query: '',
  favorites: new Set(),
  loading: false,
  connection: 'loading',
  mode: 'sheets',
  lastFetch: 0,
  chart: {
    code: null,
    days: 30,
    points: [],
    emptyMessage: '',
    loading: false
  }
};

const historyCache = new Map();

/* ============================================================================
   3. UTILIDADES
   ========================================================================== */

const $ = function (selector, root) {
  return (root || document).querySelector(selector);
};

const $$ = function (selector, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(selector));
};

const store = {
  get: function (key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  },
  set: function (key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  },
  remove: function (key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }
};

function readJSON(key) {
  const raw = store.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function writeJSON(key, value) {
  try { store.set(key, JSON.stringify(value)); } catch (_) {}
}

function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function normalizeText(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function capitalize(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

let displayNames = null;
try {
  if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
    displayNames = new Intl.DisplayNames(['es'], { type: 'currency' });
  }
} catch (_) { displayNames = null; }

const currencyNames = {};

function currencyName(code) {
  if (currencyNames[code]) return currencyNames[code];

  let name = '';
  try {
    if (displayNames) name = displayNames.of(code);
  } catch (_) { name = ''; }

  if (!name || name === code) name = FALLBACK_NAMES[code] || code;
  name = capitalize(name);
  currencyNames[code] = name;
  return name;
}

function fmtRate(value) {
  const number = Number(value);
  if (!isFinite(number)) return '—';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 12 }).format(number);
}

function fmtSourceQuote(value) {
  const match = String(value == null ? '' : value).trim().match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) return fmtRate(value);
  const integer = match[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return match[1] + integer + (match[3] ? ',' + match[3] : '');
}

function fmtPct(value) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(Number(value) || 0));
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value) {
  const iso = parseDateValue(value);
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}

function formatDateShort(value) {
  const iso = parseDateValue(value);
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(iso));
}

function formatSourceDate(value) {
  const iso = parseDateValue(value);
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(iso));
}

function parseAmount(text) {
  let clean = String(text == null ? '' : text).replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!clean) return 0;

  if (clean.indexOf(',') !== -1 && clean.indexOf('.') !== -1) {
    clean = clean.lastIndexOf(',') > clean.lastIndexOf('.')
      ? clean.replace(/\./g, '').replace(',', '.')
      : clean.replace(/,/g, '');
  } else if (clean.indexOf(',') !== -1) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  }

  const number = Number(clean);
  return isFinite(number) ? number : 0;
}

/* ============================================================================
   4. CONEXIÓN CON LOS DATOS
   ========================================================================== */

async function fetchJSON(url, timeoutMs) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(function () {
    if (controller) controller.abort();
  }, timeoutMs || CONFIG.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller ? controller.signal : undefined,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) throw new Error('HTTP ' + response.status);

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error('La respuesta no es JSON válido.');
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Pide tasas verificadas en fuentes oficiales directas al backend. */
async function getRates(force) {
  if (!CONFIG.appsScriptUrl) {
    throw new Error('Configura el Web App de Apps Script para consultar las fuentes oficiales.');
  }

  const url = CONFIG.appsScriptUrl +
    (CONFIG.appsScriptUrl.indexOf('?') === -1 ? '?' : '&') +
    'action=rates' + (force ? '&force=1&_=' + Date.now() : '');
  const payload = await fetchJSON(url);

  if (!payload || payload.ok === false) {
    throw new Error((payload && (payload.message || payload.error)) || 'El backend no devolvió tasas oficiales.');
  }
  if (!payload.quotes || !payload.sources) {
    throw new Error('El Web App está desactualizado. Publica una nueva versión de Code.gs y Sheets.gs.');
  }

  return { payload: payload, mode: 'sheets' };
}

function normalizeExtras(raw) {
  const extras = {};
  if (!raw || typeof raw !== 'object') return extras;

  Object.keys(raw).forEach(function (key) {
    const code = key;
    const list = Array.isArray(raw[key]) ? raw[key] : [];

    list.forEach(function (item) {
      if (!item || !isFinite(Number(item.valor)) || Number(item.valor) <= 0) return;
      if (!extras[code]) extras[code] = [];
      extras[code].push({
        id: String(item.id || item.nombre || '').toLowerCase(),
        nombre: capitalize(item.nombre || item.id || ''),
        valor: Number(item.valor),
        fecha: parseDateValue(item.fecha),
        fuente: item.fuente || ''
      });
    });
  });

  return extras;
}

/** Valida y completa la respuesta del backend. */
function normalize(payload, mode) {
  const rates = {};
  const quotes = payload.quotes && typeof payload.quotes === 'object' ? payload.quotes : {};
  const sources = payload.sources && typeof payload.sources === 'object' ? payload.sources : {};
  Object.keys(payload.rates || {}).forEach(function (code) {
    const value = Number(payload.rates[code]);
    const quote = quotes[code];
    const source = sources[code];
    if (isFinite(value) && value > 0 &&
        quote && (quote.base === 'USD' || quote.base === 'EUR') &&
        Number(quote.value) > 0 && parseDateValue(quote.date) &&
        source && source.name && source.url) {
      rates[code] = value;
    }
  });

  if (!rates.EUR) throw new Error('La respuesta no incluye la tasa del euro (EUR).');
  if (rates.USD !== 1) throw new Error('La respuesta no incluye USD como base oficial.');

  return {
    ok: true,
    base: 'USD',
    rates: rates,
    extras: normalizeExtras(payload.extras),
    quotes: quotes,
    sources: sources,
    local: Array.isArray(payload.local)
      ? payload.local.map(function (code) { return String(code).toUpperCase(); })
      : [],
    overrides: [],
    provider: payload.provider || 'Bancos centrales y fuentes oficiales',
    providerUrl: payload.providerUrl || CONFIG.providerUrl,
    upstreamUpdatedAt: parseDateValue(payload.upstreamUpdatedAt),
    nextUpdateAt: parseDateValue(payload.nextUpdateAt),
    updatedAt: parseDateValue(payload.updatedAt) || new Date().toISOString(),
    origin: payload.origin || (mode === 'sheets' ? 'sheet' : 'direct'),
    mode: mode === 'cache' ? (payload.mode || 'sheets') : mode,
    fromCache: mode === 'cache',
    degraded: !!payload.degraded,
    warning: payload.warning || '',
    sheetWarning: payload.sheetWarning || ''
  };
}

function computeDeltas(previous, rates) {
  const deltas = {};
  if (!previous || !previous.rates) return deltas;

  Object.keys(rates).forEach(function (code) {
    const oldValue = Number(previous.rates[code]);
    const newValue = Number(rates[code]);
    if (oldValue > 0 && newValue > 0) {
      const pct = (newValue / oldValue - 1) * 100;
      if (Math.abs(pct) >= 0.005) deltas[code] = pct;
    }
  });

  return deltas;
}

/** Aplica un paquete de datos ya normalizado a toda la interfaz. */
function applyPayload(data, mode) {
  const previous = readJSON(CONFIG.storageKeys.previous);
  state.deltas = computeDeltas(previous, data.rates);

  if (!previous || previous.upstream !== data.upstreamUpdatedAt) {
    writeJSON(CONFIG.storageKeys.previous, {
      upstream: data.upstreamUpdatedAt,
      ts: Date.now(),
      rates: data.rates
    });
  }

  state.data = data;
  state.mode = data.mode;
  state.rows = buildRows();
  state.lastFetch = Date.now();
  state.connection = data.degraded ? 'warn' : mode === 'cache' ? 'cache' : 'ok';

  if (mode !== 'cache') {
    writeJSON(CONFIG.storageKeys.cache, { ts: Date.now(), data: data });
  }

  renderAll();
}

/* ============================================================================
   5. CONSTRUCCIÓN DE FILAS Y RENDERIZADO
   ========================================================================== */

function buildRows() {
  const rates = state.data.rates;
  const eurBase = rates.EUR;
  const extrasAll = state.data.extras || {};
  const quotes = state.data.quotes || {};
  const sources = state.data.sources || {};

  // Solo se muestran códigos publicados por una de las fuentes oficiales.
  const rows = Object.keys(rates).filter(function (code) {
    return !!CURRENCIES[code];
  }).map(function (code) {
    const meta = CURRENCIES[code];
    const usd = rates[code];
    const extras = extrasAll[code] || [];
    const quote = quotes[code] || {};
    const source = sources[code] || null;

    return {
      code: code,
      usd: usd,
      eur: usd / eurBase,
      usdDisplay: quote.base === 'USD' ? fmtSourceQuote(quote.value) : fmtRate(usd),
      eurDisplay: quote.base === 'EUR' ? fmtSourceQuote(quote.value) : fmtRate(usd / eurBase),
      country: meta ? meta.country : currencyName(code),
      iso: meta ? meta.iso : 'un',
      region: meta ? meta.region : 'otros',
      name: currencyName(code),
      known: !!meta,
      extras: extras,
      local: (state.data.local || []).indexOf(code) !== -1,
      official: !!source,
      officialSource: source,
      sourceQuote: quote,
      delta: state.deltas[code]
    };
  });

  // Orden neutro por defecto: todas las tarjetas iguales, sin países destacados.
  rows.sort(function (a, b) {
    return a.country.localeCompare(b.country, 'es');
  });

  return rows;
}

function renderAll() {
  fillConverterSelects();
  renderChips();
  renderGrid(!state.rendered);
  state.rendered = true;
  renderMeta();
  convert();
  updateClock();
}

function filteredRows() {
  let rows = state.rows.slice();

  if (state.region === 'favoritos') {
    rows = rows.filter(function (row) { return state.favorites.has(row.code); });
  } else if (state.region === 'oficial') {
    rows = rows.filter(function (row) { return row.official; });
  } else if (state.region !== 'todos') {
    rows = rows.filter(function (row) { return row.region === state.region; });
  }

  if (state.query) {
    const query = normalizeText(state.query);
    rows = rows.filter(function (row) {
      return normalizeText(row.country + ' ' + row.code + ' ' + row.name).indexOf(query) !== -1;
    });
  }

  if (state.sort === 'az') {
    rows.sort(function (a, b) { return a.country.localeCompare(b.country, 'es'); });
  } else if (state.sort === 'region') {
    rows.sort(function (a, b) {
      const rankA = REGION_RANK[a.region] == null ? 9 : REGION_RANK[a.region];
      const rankB = REGION_RANK[b.region] == null ? 9 : REGION_RANK[b.region];
      if (rankA !== rankB) return rankA - rankB;
      return a.country.localeCompare(b.country, 'es');
    });
  } else if (state.sort === 'rate-desc') {
    rows.sort(function (a, b) { return b.usd - a.usd; });
  } else if (state.sort === 'rate-asc') {
    rows.sort(function (a, b) { return a.usd - b.usd; });
  }

  return rows;
}

function renderGrid(animate) {
  const grid = $('#grid');
  if (!state.rows.length) return;

  const rows = filteredRows();
  const total = state.rows.length;

  grid.innerHTML = rows.map(cardHTML).join('');
  grid.setAttribute('aria-busy', 'false');
  grid.classList.toggle('grid--enter', !!animate);

  if (animate) {
    setTimeout(function () { grid.classList.remove('grid--enter'); }, 1000);
  }

  $('#empty').hidden = rows.length > 0;
  $('#countLabel').textContent = rows.length === total
    ? total + ' monedas disponibles'
    : 'Mostrando ' + rows.length + ' de ' + total + ' monedas';
}

const EXTRA_LABELS = {
  oficial: 'Oficial',
  paralelo: 'Paralelo',
  blue: 'Blue',
  bolsa: 'Bolsa',
  contadoconliqui: 'CCL',
  cripto: 'Cripto',
  mayorista: 'Mayorista',
  tarjeta: 'Tarjeta',
  trm: 'TRM',
  fix: 'FIX',
  ptax: 'PTAX',
  observado: 'Observado',
  brou: 'BROU'
};

/**
 * Quita una variante cuando su valor ya es el precio principal de la
 * tarjeta, para no mostrar el mismo número dos veces.
 */
function cardExtras(row) {
  return (row.extras || []).filter(function (extra) {
    return Math.abs(extra.valor - row.usd) >= 1e-6;
  });
}

function extraChip(extra) {
  const label = EXTRA_LABELS[extra.id] || extra.nombre || extra.id;
  const source = extra.fuente ? ' · Fuente: ' + extra.fuente : '';
  const title = (extra.nombre || label) + ' · ' + formatDateTime(extra.fecha) +
    source + ' · moneda local por 1 USD';
  return '<span class="extra" title="' + escapeHTML(title) + '">' +
    '<i>' + escapeHTML(label) + '</i>' +
    '<b>' + fmtRate(extra.valor) + '</b>' +
    '</span>';
}

function cardHTML(row, index) {
  const usdText = row.usdDisplay;
  const longClass = usdText.length > 11 ? ' long' : '';
  const flag = 'https://flagcdn.com/w80/' + row.iso + '.png';
  const flag2x = 'https://flagcdn.com/w160/' + row.iso + '.png';
  const favorite = state.favorites.has(row.code);

  let deltaHTML = '';
  if (row.delta != null && isFinite(row.delta)) {
    const up = row.delta > 0;
    deltaHTML = '<span class="delta ' + (up ? 'up' : 'down') + '" title="Cambio desde la última actualización del proveedor">' +
      (up ? '▲' : '▼') + ' ' + fmtPct(row.delta) + '%</span>';
  }

  let extrasHTML = '';
  const extras = cardExtras(row);
  if (extras.length) {
    const visible = extras.slice(0, 3).map(extraChip).join('');
    const remaining = extras.length - 3;
    extrasHTML = '<div class="extras">' + visible +
      (remaining > 0 ? '<span class="extra more">+' + remaining + ' más</span>' : '') +
      '</div>';
  }

  const subtitle = row.known ? row.code + ' · ' + row.name : row.code;
  const localSource = row.officialSource && row.officialSource.name;
  const localMark = row.local
    ? '<i class="rate-local" title="Tasa oficial local' +
      (localSource ? ' (' + escapeHTML(localSource) + ')' : '') + '"></i>'
    : '';
  const aria = row.country + ': 1 dólar equivale a ' + usdText + ' ' + row.code +
    '. Un euro equivale a ' + row.eurDisplay + ' ' + row.code + '.';

  return '<article class="card" data-code="' + row.code + '" tabindex="0" role="button" aria-label="' + escapeHTML(aria) + '" style="--i:' + Math.min(index, 14) + '">' +
    '<div class="card-top">' +
      '<span class="flag-wrap">' +
        '<span class="flag-fallback">' + escapeHTML(row.code.slice(0, 2)) + '</span>' +
        '<img src="' + flag + '" srcset="' + flag + ' 1x, ' + flag2x + ' 2x" alt="Bandera de ' + escapeHTML(row.country) + '" loading="lazy" width="40" height="29" onerror="this.remove()">' +
      '</span>' +
      '<div class="card-id">' +
        '<h3 title="' + escapeHTML(row.country) + '">' + escapeHTML(row.country) + '</h3>' +
        '<p>' + escapeHTML(subtitle) + '</p>' +
      '</div>' +
      '<button class="fav' + (favorite ? ' on' : '') + '" type="button" data-fav="' + row.code + '" aria-pressed="' + favorite + '" aria-label="' + (favorite ? 'Quitar de favoritos' : 'Añadir a favoritos') + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.62l-5.1 2.68.98-5.68L3.75 9.6l5.7-.83L12 3.6Z"></path></svg>' +
      '</button>' +
    '</div>' +
    '<div class="price-row">' +
      '<span class="price-label">USD' + localMark + '</span>' +
      '<span class="price-value' + longClass + '">' + usdText + '</span>' +
    '</div>' +
    '<div class="sub-row">' +
      '<span class="sub-label">EUR</span>' +
      '<span class="sub-value">' + row.eurDisplay + '</span>' +
      deltaHTML +
    '</div>' +
    extrasHTML +
  '</article>';
}

function renderChips() {
  const chips = $('#chips');
  const counts = { todos: state.rows.length, favoritos: 0 };

  state.rows.forEach(function (row) {
    if (state.favorites.has(row.code)) counts.favoritos++;
    if (row.official) counts.oficial = (counts.oficial || 0) + 1;
    counts[row.region] = (counts[row.region] || 0) + 1;
  });

  chips.innerHTML = REGIONS.map(function (region) {
    const count = counts[region.id] || 0;
    const active = state.region === region.id;
    const hideCount = region.id === 'favoritos' && count === 0;
    return '<button class="chip' + (active ? ' active' : '') + '" type="button" data-region="' + region.id + '" aria-pressed="' + active + '">' +
      region.label +
      (!hideCount ? '<span class="chip-count">' + count + '</span>' : '') +
      '</button>';
  }).join('');
}

function renderMeta() {
  const data = state.data;
  if (!data) return;

  $('#currencyCount').textContent = Object.keys(data.rates).filter(function (code) {
    return !!CURRENCIES[code];
  }).length;
  $('#nextText').textContent = 'días hábiles';
  $('#year').textContent = new Date().getFullYear();

  const link = $('#providerLink');
  link.textContent = data.provider;
  link.href = data.providerUrl || CONFIG.providerUrl;

  const sourceNote = $('#sourceNote');
  sourceNote.dataset.mode = data.mode;
  sourceNote.textContent = data.degraded
    ? 'Copia guardada de referencias oficiales'
    : 'Referencias oficiales guardadas en Google Sheets';

  updateClock();
}

function updateClock() {
  if (!state.data) return;
  const updated = $('#updatedText');
  if (updated) updated.textContent = 'Fuente del ' + formatSourceDate(state.data.updatedAt);
  updateStatus();
}

function updateStatus() {
  const status = $('#status');
  const label = $('#statusText');
  if (!status || !label) return;

  status.dataset.state = state.connection;

  if (!state.data || state.connection === 'loading') {
    label.textContent = 'Conectando…';
    return;
  }

  if (state.connection === 'error') {
    label.textContent = 'Sin conexión';
    return;
  }

  const sourceDate = formatSourceDate(state.data.updatedAt);
  let text;

  if (state.connection === 'cache') text = 'Caché · fuente del ' + sourceDate;
  else if (state.connection === 'warn') text = 'Copia guardada · fuente del ' + sourceDate;
  else text = 'Referencia oficial · ' + sourceDate;

  if (state.loading) text += ' · actualizando';
  label.textContent = text;
}

function setConnection(value) {
  state.connection = value;
  updateStatus();
}

function setBusy(busy) {
  const button = $('#refreshBtn');
  if (!button) return;
  button.classList.toggle('busy', busy);
  button.disabled = busy;
}

/* ============================================================================
   6. CONVERSOR
   ========================================================================== */

function fillConverterSelects() {
  const from = $('#calcFrom');
  const to = $('#calcTo');
  if (!from || !to || !state.data) return;

  const codes = Object.keys(state.data.rates).filter(function (code) {
    return !!CURRENCIES[code];
  }).sort();
  const ordered = ['USD', 'EUR'].concat(codes.filter(function (code) {
    return code !== 'USD' && code !== 'EUR';
  }));

  const previousFrom = from.value || 'USD';
  const previousTo = to.value || 'EUR';

  const options = ordered.map(function (code) {
    return '<option value="' + code + '">' + code + ' · ' + escapeHTML(currencyName(code)) + '</option>';
  }).join('');

  from.innerHTML = options;
  to.innerHTML = options;

  from.value = ordered.indexOf(previousFrom) !== -1 ? previousFrom : 'USD';

  if (ordered.indexOf(previousTo) !== -1) to.value = previousTo;
  else if (ordered.indexOf('EUR') !== -1) to.value = 'EUR';
  else to.value = ordered[1] || 'EUR';
}

function convert() {
  if (!state.data) return;

  const amount = parseAmount($('#calcAmount').value);
  const from = $('#calcFrom').value || 'USD';
  const to = $('#calcTo').value || 'EUR';
  const rates = state.data.rates;

  if (!rates[from] || !rates[to]) return;

  const result = (amount / rates[from]) * rates[to];
  $('#calcOut').textContent = fmtRate(result);
  $('#calcOutCode').textContent = to;
  $('#calcHint').textContent = '1 ' + from + ' = ' + fmtRate(rates[to] / rates[from]) + ' ' + to;
}

function swapCurrencies() {
  const from = $('#calcFrom');
  const to = $('#calcTo');
  const value = from.value;
  from.value = to.value;
  to.value = value;
  convert();
}

/* ============================================================================
   7. REFRESCO DE DATOS
   ========================================================================== */

async function refresh(force) {
  if (state.loading) return;

  state.loading = true;
  setBusy(true);
  setConnection(state.data ? state.connection : 'loading');

  try {
    const result = await getRates(force);
    const data = normalize(result.payload, result.mode);
    applyPayload(data, result.mode);

    if (data.mode === 'sheets' && data.degraded) {
      toast(data.warning || 'Mostrando la última copia guardada en Google Sheets.', 'warn', 6500);
    }

    if (data.sheetWarning) console.warn('[Tasas]', data.sheetWarning);
    state.retry = 0;
  } catch (error) {
    state.retry = (state.retry || 0) + 1;
    setConnection(state.data ? 'warn' : 'error');

    if (state.data) {
      toast('No se pudo actualizar: ' + error.message, 'error', 5200);
    } else {
      showFatal(error);
      toast('No se pudieron cargar las tasas.', 'error', 5200);
    }
  } finally {
    state.loading = false;
    setBusy(false);
    updateClock();
  }
}

function renderSkeletons() {
  const grid = $('#grid');
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: 12 }).map(function () {
    return '<div class="skeleton"></div>';
  }).join('');
}

function showFatal(error) {
  const grid = $('#grid');
  grid.setAttribute('aria-busy', 'false');
  grid.innerHTML = '<div class="fatal">' +
    '<strong>No pudimos cargar las tasas</strong>' +
    '<p>' + escapeHTML(error.message || 'Error de conexión.') + '</p>' +
    '<button class="btn" type="button" id="retryBtn">Reintentar</button>' +
    '</div>';

  $('#countLabel').textContent = 'Sin datos';
  $('#sourceNote').textContent = 'Revisa tu conexión';
  $('#sourceNote').dataset.mode = 'direct';
  updateStatus();
}

function init() {
  $('#year').textContent = new Date().getFullYear();
  $('#sortSel').value = state.sort;
  loadFavorites();
  renderSkeletons();
  bindEvents();
  initSecurity();

  const cached = readJSON(CONFIG.storageKeys.cache);
  if (cached && cached.data && Date.now() - cached.ts < CONFIG.cacheMaxAge) {
    try {
      applyPayload(normalize(cached.data, 'cache'), 'cache');
      setConnection('cache');
    } catch (_) { /* caché inválida */ }
  }

  refresh(false);

  setInterval(updateClock, 1000);
  setInterval(function () {
    if (!document.hidden) refresh(false);
  }, CONFIG.refreshMs);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - state.lastFetch > CONFIG.refreshMs) refresh(false);
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
}

/* ============================================================================
   8. EVENTOS
   ========================================================================== */

function bindEvents() {
  const search = $('#search');
  const clearSearch = $('#clearSearch');

  search.addEventListener('input', debounce(function (event) {
    state.query = event.target.value.trim();
    clearSearch.hidden = !state.query;
    renderGrid(false);
  }, 120));

  clearSearch.addEventListener('click', function () {
    search.value = '';
    state.query = '';
    clearSearch.hidden = true;
    renderGrid(false);
    search.focus();
  });

  $('#sortSel').addEventListener('change', function (event) {
    state.sort = event.target.value;
    renderGrid(false);
  });

  $('#chips').addEventListener('click', function (event) {
    const chip = event.target.closest('[data-region]');
    if (!chip) return;
    state.region = chip.dataset.region;
    renderChips();
    renderGrid(false);
  });

  $('#refreshBtn').addEventListener('click', function () { refresh(true); });

  $('#themeBtn').addEventListener('click', toggleTheme);

  $('#calcAmount').addEventListener('input', convert);
  $('#calcFrom').addEventListener('change', convert);
  $('#calcTo').addEventListener('change', convert);
  $('#calcSwap').addEventListener('click', swapCurrencies);

  $('#emptyReset').addEventListener('click', resetFilters);

  $('#grid').addEventListener('click', function (event) {
    const favorite = event.target.closest('[data-fav]');
    if (favorite) {
      event.stopPropagation();
      toggleFavorite(favorite.dataset.fav);
      return;
    }

    if (event.target.closest('#retryBtn')) {
      refresh(true);
      return;
    }

    const card = event.target.closest('.card');
    if (card) openModal(card.dataset.code);
  });

  $('#grid').addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.card');
    if (!card) return;
    event.preventDefault();
    openModal(card.dataset.code);
  });

  $$('#modal [data-close]').forEach(function (element) {
    element.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !$('#modal').hidden) closeModal();
  });

  $('#periods').addEventListener('click', function (event) {
    const button = event.target.closest('[data-days]');
    if (!button) return;
    setPeriod(Number(button.dataset.days));
  });

  $('#mCopy').addEventListener('click', copyRate);

  $('#mFlag').addEventListener('error', function () {
    $('#mFlag').hidden = true;
  });

  window.addEventListener('resize', debounce(function () {
    if (!$('#modal').hidden) drawChart();
  }, 150));
}

function debounce(fn, wait) {
  let timer = null;
  return function () {
    const args = arguments;
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(context, args); }, wait);
  };
}

function resetFilters() {
  state.region = 'todos';
  state.query = '';
  state.sort = 'az';

  $('#search').value = '';
  $('#sortSel').value = 'az';
  $('#clearSearch').hidden = true;

  renderChips();
  renderGrid(false);
}

function loadFavorites() {
  const saved = readJSON(CONFIG.storageKeys.favorites);
  if (Array.isArray(saved)) {
    state.favorites = new Set(saved.filter(function (code) {
      return typeof code === 'string';
    }));
  }
}

function saveFavorites() {
  writeJSON(CONFIG.storageKeys.favorites, Array.from(state.favorites));
}

function toggleFavorite(code) {
  if (!code) return;

  if (state.favorites.has(code)) {
    state.favorites.delete(code);
    toast(code + ' eliminado de favoritos.', 'info', 1800);
  } else {
    state.favorites.add(code);
    toast(code + ' añadido a favoritos.', 'info', 1800);
  }

  saveFavorites();
  renderChips();
  renderGrid(false);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';

  document.documentElement.dataset.theme = next;
  store.set(CONFIG.storageKeys.theme, next);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', next === 'dark' ? '#060a13' : '#f3f6fb');

  if (!$('#modal').hidden) drawChart();
}

/* ============================================================================
   9. MODAL, HISTORIAL Y GRÁFICO
   ========================================================================== */

function findRow(code) {
  for (let i = 0; i < state.rows.length; i++) {
    if (state.rows[i].code === code) return state.rows[i];
  }
  return null;
}

function openModal(code) {
  const row = findRow(code);
  if (!row || !state.data) return;

  state.chart.code = code;
  state.chart.days = 30;
  state.chart.points = [];

  $('#mTitle').textContent = row.country;
  $('#mSub').textContent = row.known ? row.code + ' · ' + row.name : row.code;
  $('#mUsd').textContent = row.usdDisplay + ' ' + row.code;
  $('#mEur').textContent = row.eurDisplay + ' ' + row.code;

  const flag = $('#mFlag');
  flag.hidden = false;
  flag.alt = 'Bandera de ' + row.country;
  flag.src = 'https://flagcdn.com/w160/' + row.iso + '.png';
  $('#mFlagFallback').textContent = row.code.slice(0, 2);

  const extras = $('#mExtras');
  const extraList = cardExtras(row);
  if (extraList.length) {
    extras.hidden = false;
    extras.innerHTML = extraList.map(function (extra) {
      const label = EXTRA_LABELS[extra.id] || extra.nombre || extra.id;
      return '<div class="m-extra">' +
        '<span>' + escapeHTML(label) + '</span>' +
        '<b>' + fmtRate(extra.valor) + '</b>' +
        '<small>' + escapeHTML(formatDateTime(extra.fecha)) + '</small>' +
        '</div>';
    }).join('');
  } else {
    extras.hidden = true;
    extras.innerHTML = '';
  }

  const source = row.officialSource;
  const providerName = source ? source.name : state.data.provider;
  let sourceHTML = 'Fuente: ' + escapeHTML(providerName) +
    ' · ' + escapeHTML(formatSourceDate(row.sourceQuote.date));
  if (source) {
    sourceHTML += ' · <a href="' + escapeHTML(source.url) +
      '" target="_blank" rel="noopener">' + escapeHTML(source.name) + '</a>';
  }
  $('#mSource').innerHTML = sourceHTML;
  $('#modal').hidden = false;
  document.body.classList.add('no-scroll');

  $$('#periods button').forEach(function (button) {
    button.classList.toggle('active', Number(button.dataset.days) === 30);
  });

  loadHistory(code, 30);

  const closeButton = $('#modal').querySelector('.modal-close');
  if (closeButton) closeButton.focus({ preventScroll: true });
}

function closeModal() {
  $('#modal').hidden = true;
  document.body.classList.remove('no-scroll');
  state.chart.code = null;
  state.chart.points = [];
  state.chart.requestId = (state.chart.requestId || 0) + 1;
}

function setPeriod(days) {
  if (!state.chart.code) return;
  state.chart.days = days;

  $$('#periods button').forEach(function (button) {
    button.classList.toggle('active', Number(button.dataset.days) === days);
  });

  loadHistory(state.chart.code, days);
}

async function loadHistory(code, days) {
  const key = code + ':' + days;
  const empty = $('#chartEmpty');
  empty.hidden = true;

  const requestId = (state.chart.requestId || 0) + 1;
  state.chart.requestId = requestId;

  if (historyCache.has(key)) {
    state.chart.points = historyCache.get(key);
    drawChart();
    if (state.chart.points.length < 2) {
      showChartMessage('Aún no hay suficientes muestras para este periodo.<br><small>El historial se guarda cada hora en Google Sheets.</small>');
    }
    return;
  }

  if (!CONFIG.appsScriptUrl) {
    showChartMessage('El historial se guarda en Google Sheets y requiere el Web App configurado.');
    return;
  }

  showChartMessage('Cargando historial…');

  try {
    const url = CONFIG.appsScriptUrl +
      (CONFIG.appsScriptUrl.indexOf('?') === -1 ? '?' : '&') +
      'action=history&code=' + encodeURIComponent(code) + '&days=' + days;

    const result = await fetchJSON(url);
    if (requestId !== state.chart.requestId) return;
    if (!result || result.ok === false) {
      throw new Error((result && result.error) || 'Historial no disponible.');
    }

    const points = Array.isArray(result.points) ? result.points.filter(function (point) {
      return point && isFinite(Number(point.usd));
    }) : [];

    historyCache.set(key, points);

    if (state.chart.code !== code || state.chart.days !== days) return;

    state.chart.points = points;

    if (points.length < 2) {
      showChartMessage('Aún no hay suficientes muestras para este periodo.<br><small>El historial se guarda cada hora en Google Sheets.</small>');
    } else {
      empty.hidden = true;
      drawChart();
    }
  } catch (error) {
    if (requestId !== state.chart.requestId) return;
    showChartMessage('No se pudo cargar el historial.<br><small>' + escapeHTML(error.message) + '</small>');
  }
}

function showChartMessage(html) {
  const empty = $('#chartEmpty');
  empty.innerHTML = html;
  empty.hidden = false;

  const canvas = $('#chart');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawChart() {
  const canvas = $('#chart');
  const points = state.chart.points;

  if (!$('#modal').hidden) {
    if (!points || points.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width < 40) return;

    const width = rect.width;
    const height = rect.height || 180;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);
    const accent = (styles.getPropertyValue('--accent') || '#34d399').trim();
    const muted = (styles.getPropertyValue('--muted') || '#8494b5').trim();
    const border = (styles.getPropertyValue('--border') || 'rgba(255,255,255,.09)').trim();

    const padding = { left: 10, right: 10, top: 16, bottom: 22 };

    const values = points.map(function (point) { return Number(point.usd); });
    let min = Math.min.apply(null, values);
    let max = Math.max.apply(null, values);

    if (max - min < 1e-9) {
      const base = Math.abs(max) || 1;
      max += base * 0.01;
      min -= base * 0.01;
    }

    const paddingValue = (max - min) * 0.14;
    min -= paddingValue;
    max += paddingValue;

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const x = function (index) {
      return padding.left + (index / (points.length - 1)) * plotWidth;
    };
    const y = function (value) {
      return padding.top + (1 - (value - min) / (max - min)) * plotHeight;
    };

    // Líneas guía
    context.strokeStyle = border;
    context.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(function (ratio) {
      const lineY = padding.top + plotHeight * ratio;
      context.beginPath();
      context.moveTo(padding.left, lineY);
      context.lineTo(width - padding.right, lineY);
      context.stroke();
    });

    // Área
    const gradient = context.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
    gradient.addColorStop(0, hexToRgba(accent, .30));
    gradient.addColorStop(1, hexToRgba(accent, 0));

    context.beginPath();
    context.moveTo(x(0), y(values[0]));
    for (let i = 1; i < values.length; i++) {
      context.lineTo(x(i), y(values[i]));
    }
    context.lineTo(x(points.length - 1), padding.top + plotHeight);
    context.lineTo(x(0), padding.top + plotHeight);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();

    // Línea
    context.beginPath();
    context.moveTo(x(0), y(values[0]));
    for (let j = 1; j < values.length; j++) {
      context.lineTo(x(j), y(values[j]));
    }
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();

    // Punto final
    const lastX = x(points.length - 1);
    const lastY = y(values[values.length - 1]);
    context.beginPath();
    context.arc(lastX, lastY, 6, 0, Math.PI * 2);
    context.fillStyle = hexToRgba(accent, .18);
    context.fill();
    context.beginPath();
    context.arc(lastX, lastY, 3, 0, Math.PI * 2);
    context.fillStyle = accent;
    context.fill();

    // Etiquetas
    context.fillStyle = muted;
    context.font = '500 10px Inter, system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(fmtRate(max - paddingValue), padding.left, 10);
    context.textAlign = 'left';
    context.fillText(fmtRate(min + paddingValue), padding.left, height - 6);

    context.textAlign = 'right';
    context.fillText(formatDateShort(points[points.length - 1].t), width - padding.right, height - 6);
  }
}

function hexToRgba(color, alpha) {
  const value = String(color || '').trim();
  if (value.charAt(0) !== '#') return value;

  let hex = value.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(function (char) { return char + char; }).join('');
  }

  const number = parseInt(hex, 16);
  if (isNaN(number)) return value;

  return 'rgba(' + ((number >> 16) & 255) + ',' + ((number >> 8) & 255) + ',' + (number & 255) + ',' + alpha + ')';
}

function copyRate() {
  const row = findRow(state.chart.code);
  if (!row || !state.data) return;

  const text = '1 USD = ' + row.usdDisplay + ' ' + row.code + '\n' +
    '1 EUR = ' + row.eurDisplay + ' ' + row.code + '\n' +
    'Tasas Global · ' + formatDateTime(state.data.updatedAt);

  copyText(text)
    .then(function () { toast('Tasa copiada al portapapeles.', 'info', 2000); })
    .catch(function () { toast('No se pudo copiar.', 'error', 2200); });
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise(function (resolve, reject) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/* ============================================================================
   10. NOTIFICACIONES
   ========================================================================== */

function toast(message, type, duration) {
  const container = $('#toasts');
  if (!container) return;

  while (container.children.length > 3) {
    container.removeChild(container.firstChild);
  }

  const element = document.createElement('div');
  element.className = 'toast ' + (type || 'info');
  element.innerHTML = '<span class="toast-dot"></span><span>' + escapeHTML(message) + '</span>';
  container.appendChild(element);

  requestAnimationFrame(function () { element.classList.add('show'); });

  setTimeout(function () {
    element.classList.remove('show');
    setTimeout(function () { element.remove(); }, 250);
  }, duration || 3200);
}

/* ============================================================================
   11. CAPA DE SEGURIDAD (disuasión en el navegador)
   ----------------------------------------------------------------------------
   Bloquea clic derecho, F12, F1 y atajos de inspección/código fuente.
   Nota: esto es disuasión, no seguridad real; el HTML y las tasas siempre
   son públicos. La protección real vive en el backend.
   ========================================================================== */

function initSecurity() {
  document.addEventListener('contextmenu', function (event) {
    if (event.target.closest('input, textarea, select')) return;
    event.preventDefault();
  });

  document.addEventListener('keydown', function (event) {
    const target = event.target;
    const tag = (target && target.tagName ? target.tagName : '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable);
    const key = event.key;
    const upper = key && key.length === 1 ? key.toUpperCase() : key;
    const modifier = event.ctrlKey || event.metaKey;

    const devtools = modifier && event.shiftKey && ['I', 'J', 'C', 'K', 'E'].indexOf(upper) !== -1;
    const blockedKey = key === 'F12' || key === 'F1';
    const blockedShortcut = modifier && !event.shiftKey && ['U', 'S', 'P'].indexOf(upper) !== -1 && !typing;

    if (devtools || blockedKey || blockedShortcut) {
      event.preventDefault();
      event.stopPropagation();
      toast('Atajo bloqueado por seguridad.', 'warn', 1600);
      return;
    }

    if (modifier && upper === 'A' && !typing) {
      event.preventDefault();
    }
  }, true);

  document.addEventListener('selectstart', function (event) {
    const tag = (event.target && event.target.tagName ? event.target.tagName : '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    event.preventDefault();
  });

  document.addEventListener('dragstart', function (event) {
    if (event.target && event.target.tagName === 'IMG') event.preventDefault();
  });

  console.log('%c⛔ Contenido protegido', 'font-size:20px;font-weight:800;color:#fb7185');
  console.log('Las tasas son informativas y públicas. Gracias por respetar el trabajo.');
}

/* ============================================================================
   12. ARRANQUE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', init);

