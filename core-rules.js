// core-rules.js
// EN3 Internal Policy'ye dayali ORTAK kural motoru.
// Amac: fiyat formatlama, terminoloji donusumu, buyuk harf/noktalama kurallari gibi
// TUM kategorilerde tekrarlanan mantigi TEK yerde tanimlamak.
//
// Bu dosya rules.js'in yerini alir (Items & Clothes'a ozel kalan kisimlar rules.js'de
// kalabilir ama fiyat/terminoloji/noktalama artik buradan cagrilmalidir).
//
// Kaynak: LifeInvader Ad's Internal Policy (EN3), son guncelleme 29-07-2026.

// ---------------------------------------------------------------------------
// 1) FIYAT FORMATLAMA
// ---------------------------------------------------------------------------
// Politika (aynen alinti):
//   "We do NOT use 'k' to represent a thousand or use 'M' to represent a Million.
//    Write it out in numbers instead."
//   $1k       -> $1.000
//   $1.7k each -> $1.700 each
//   $1m       -> $1 Million
//   $1.450k   -> $1.45 Million
//   "Use a full stop (.) instead of a comma (,) for prices."
//   "A dollar sign ($) must be used before the value."
//
// Onemli: cikti asla "k" veya "m" harfi icermez. Girdi kullanicidan k/m kisaltmasiyla
// gelebilir, ama biz daima acik sayiya ceviririz.

const NEGOTIABLE_WORDS = new Set(['negotiate', 'negotiation', 'negotiable']);

// TESPIT EDILEN BELIRSIZLIK (dogrulama gerektirir):
// EN3 belgesindeki iki ornek birbiriyle celisen bir nokta kullanimi icerir:
//   "$1.7k each becomes $1.700 each"   -> burada "1.7" GERCEK ONDALIK (1.7 * 1000 = 1700)
//   "$1.450k becomes $1.45 Million"    -> burada "1.450" BINLIK AYRAC (1450 * 1000 = 1.450.000)
// Ayni nokta karakteri iki farkli anlamda kullanilmis. Ayirt etmek icin tek guvenilir
// sinyal: ondalik kisimda KAC HANE var.
//   1 haneli  (".7")  -> gercek ondalik olarak yorumla
//   3 haneli  (".450") -> Avrupa tipi binlik ayraci olarak yorumla (kaldirip tam sayi yap)
//   2 haneli  (".45") gibi durumlar belgede ornekle desteklenmiyor; asagida ondalik
//   olarak yorumlaniyor ama bu VARSAYIM olarak isaretlendi — LI ekibiyle teyit edilmeli.
function parseAmbiguousDecimal(str) {
  const match = str.match(/^(\d+)\.(\d+)$/);
  if (!match) return parseFloat(str.replace(/,/g, '.'));
  const [, intPart, decPart] = match;
  if (decPart.length === 3) {
    // binlik ayraci varsayimi (ör. "1.450" -> 1450)
    return parseFloat(intPart + decPart);
  }
  // gercek ondalik varsayimi (ör. "1.7" -> 1.7, "1.45" -> 1.45)
  return parseFloat(`${intPart}.${decPart}`);
}

/**
 * Tek bir fiyat girdisini EN3 formatina cevirir.
 * @param {string} raw - kullanicinin girdigi ham deger ("35k", "1.7m", "35000", "negotiable" ...)
 * @param {boolean} each - true ise sonuna " each" eklenir
 * @returns {string} - "$35.000", "$1.7 Million", "Negotiable" gibi
 */
export function formatPrice(raw, each = false) {
  if (raw == null) return each ? '$0 each' : '$0';
  const lower = String(raw).toLowerCase().trim();

  if (NEGOTIABLE_WORDS.has(lower)) return 'Negotiable';

  // "1.7m" / "1.7 million" / "1.450k" gibi girdileri ayristir
  const isMillionShorthand = /m(illion)?$/.test(lower.replace(/\s+/g, ''));
  const isKShorthand = /k$/.test(lower.replace(/\s+/g, ''));

  let numericValue; // gercek dolar degeri (tam sayi degil, kesirli olabilir)

  if (isMillionShorthand) {
    const n = parseAmbiguousDecimal(lower.replace(/million|m/g, '').trim());
    numericValue = n * 1_000_000;
  } else if (isKShorthand) {
    const n = parseAmbiguousDecimal(lower.replace(/k/g, '').trim());
    numericValue = n * 1_000;
  } else {
    // duz sayi - virgul/nokta karisikligi icin: kullanicinin yazdigi noktalari
    // binlik ayraci sayip temizliyoruz, ondalik icin virgulu nokta yapiyoruz.
    const cleaned = lower.replace(/\./g, '').replace(',', '.');
    numericValue = parseFloat(cleaned);
  }

  if (isNaN(numericValue)) return each ? `$${raw} each` : `$${raw}`;

  return formatDollarValue(numericValue, each);
}

/**
 * Ham dolar degerini (numara) EN3 gorunumune cevirir.
 * >= 1.000.000 ise "$X Million" (gerekiyorsa ondalikli), aksi halde "$X.XXX.XXX" (nokta ayracli).
 */
export function formatDollarValue(numericValue, each = false) {
  let formatted;
  if (numericValue >= 1_000_000) {
    const millions = numericValue / 1_000_000;
    // gereksiz .0 ondalik gosterme, ama 1.45 gibi anlamli ondaliklari koru
    const roundedStr = millions % 1 === 0
      ? String(millions)
      : String(Math.round(millions * 100) / 100);
    formatted = `$${roundedStr} Million`;
  } else {
    formatted = `$${Math.round(numericValue).toLocaleString('en-US').replace(/,/g, '.')}`;
  }
  return each ? `${formatted} each` : formatted;
}

/**
 * Birden fazla fiyati (virgul/"and" ile ayrilmis) tek cumleye cevirir.
 * EN3 ornekleri:
 *   "Price: $1.700 and $1.500 each respectively."
 *   "Price: $800.000, $150.000 and $100.000 each respectively."
 * @param {string} rawPriceInput
 * @param {"Buying"|"Selling"|"Trading"|"Selling or Trading"|"Hiring"} adType
 * @param {{each?: boolean, respectively?: boolean}} opts
 */
export function buildPriceSentence(rawPriceInput, adType, opts = {}) {
  const { each = false, respectively = false } = opts;
  const lowerType = adType.toLowerCase();

  if (lowerType.includes('trading') && !lowerType.includes('selling or trading')) {
    // Saf "Trading" ilanlarinda fiyat yazilmaz (politika: Trading -> fiyat yok)
    return '';
  }

  const parts = String(rawPriceInput)
    .replace(/\s+and\s+/gi, ',')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return prefixFor(adType) + ': Negotiable';
  }

  // ONEMLI: "each" birden fazla fiyatta HER FIYATIN SONUNA degil, TUM LISTENIN
  // SONUNA BIR KEZ eklenir. Politika ornekleri:
  //   "Price: $1.700 and $1.500 each respectively." (each x1, respectively x1)
  //   "Budget: $650, $350 and $450 each respectively." (3 fiyat, tek "each")
  // Tek fiyatli durumda ise normal sekilde o fiyatin sonuna eklenir:
  //   "Budget: $60.000 each." (each x1, tek fiyat)
  const formattedParts = parts.map(p => formatPrice(p, false));

  let joined;
  if (formattedParts.length === 1) {
    joined = each ? `${formattedParts[0]} each` : formattedParts[0];
  } else {
    joined = formattedParts.length === 2
      ? `${formattedParts[0]} and ${formattedParts[1]}`
      : `${formattedParts.slice(0, -1).join(', ')} and ${formattedParts[formattedParts.length - 1]}`;
    if (each) joined += ' each';
  }

  let sentence = `${prefixFor(adType)}: ${joined}`;
  if (respectively && formattedParts.length > 1) sentence += ' respectively';
  return sentence;
}

function prefixFor(adType) {
  const t = adType.toLowerCase();
  if (t.includes('buying')) return 'Budget';
  if (t.includes('hiring') || t.includes('looking for a job')) return 'Salary';
  if (t.includes('renting out')) return 'Rent';
  if (t.includes('renting')) return 'Budget'; // kiralayan taraf da "Budget" kullanir (kiraci)
  return 'Price'; // Selling, Selling or Trading
}

// ---------------------------------------------------------------------------
// 1a) KATEGORIYE OZEL FIYAT TAVANLARI
// ---------------------------------------------------------------------------
// UYARI (mevcut kod tabanindaki bir tutarsizlik icin not):
// rules.js'deki eski priceFormat() fonksiyonunda GENEL bir kural olarak
// ">= 2 milyar ise Negotiable" kontrolu vardi. Bu esik EN3 dokumaninda
// GENEL bir kural olarak GECMIYOR. Belgede sadece iki ozel durum var:
//   - Business kategorisi: 500 Million usti fiyatlar -> Negotiable
//   - Play Dice / Play Poker bahisleri: 10 Million usti bahis -> Bet: Negotiable
// Bu iki kural asagida ayri fonksiyonlar olarak tanimlandi. Genel bir "milyar
// esigi" kurali policy'de yer almadigi icin buraya TASINMADI. Bu is kurallarindan
// birini kaybettiysem (ör. sizde sozel olarak iletilmis ek bir kural varsa)
// bana bildirin, aksi halde bu genel esigi kaldiriyorum.

/** Business kategorisi icin: 500 Million usti fiyatlari Negotiable'a cevirir. */
export function applyBusinessPriceCap(numericValue) {
  return numericValue > 500_000_000 ? 'Negotiable' : null; // null = tavan asilmadi, normal formatla
}

/** Dice/Poker bahis limiti: 10 Million usti bahisler Negotiable olur. */
export function applyBetCap(numericValue) {
  return numericValue > 10_000_000 ? 'Negotiable' : null;
}

// ---------------------------------------------------------------------------
// 2) TERMINOLOJI DONUSUM TABLOSU
// ---------------------------------------------------------------------------
// EN3 belgesinde acikca listelenen "X gorursen Y yaz" kurallari.
// Anahtarlar kucuk harfe normalize edilerek eslesir (case-insensitive arama icin).

export const TERMINOLOGY_MAP = [
  // Auto
  { pattern: /\b(max config|max tuning|fully upgraded)\b/gi, replacement: 'with full configuration' },
  { pattern: /\b(nearly max|part\s?lvl\s?3 or below|lvl\s?3 or below)\b/gi, replacement: 'with partial configuration' },
  { pattern: /\b(body upgrades|body kit)\b/gi, replacement: 'with visual upgrades' },
  { pattern: /\bturbo\b/gi, replacement: 'turbo kit' },
  { pattern: /\b(drift tuning|drift assistance)\b/gi, replacement: 'drift kit' },
  { pattern: /\b(luminous rims|unique wheels)\b/gi, replacement: 'luminous wheels' },

  // Genel kalite seviyeleri
  { pattern: /\b(level 1|low level)\b/gi, replacement: 'low quality' },
  { pattern: /\b(level 2|medium level)\b/gi, replacement: 'medium quality' },
  { pattern: /\b(level 3|high level)\b/gi, replacement: 'high quality' },
  { pattern: /\b(level 4|max level)\b/gi, replacement: 'max quality' },

  // Items / Other
  { pattern: /\b(crates|cases)\b/gi, replacement: 'containers' },
  { pattern: /\b(spray cans|spray balloons)\b/gi, replacement: 'paint cans' },
  { pattern: /\bextras\b/gi, replacement: 'of type' },

  // Business
  { pattern: /\bpersonal business\b/gi, replacement: 'private business' },
  { pattern: /\bdrug lab\b/gi, replacement: 'Burger shop' },

  // Work
  { pattern: /\blevel\b/gi, replacement: 'years experience' },
  { pattern: /\b(exotic dancers?|strippers?)\b/gi, replacement: 'Professional dancer' },

  // Real Estate
  { pattern: /\bcasino apartment\b/gi, replacement: 'Casino penthouse' },

  // Beach Market
  { pattern: /\bcheap prices?\b/gi, replacement: 'for good prices' },

  // Dating / genel
  { pattern: /\blooking to (buy|purchase)\b/gi, replacement: 'Buying' },
];

/**
 * Terminoloji tablosunu bir metne uygular. Sirali uygulanir (once Auto terimleri,
 * sonra genel terimler) — cakisma riskini azaltmak icin dizinin sirasi onemlidir.
 */
export function applyTerminology(text) {
  let result = text;
  for (const { pattern, replacement } of TERMINOLOGY_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// "Scarf" -> "mask" ile birlestirme ve meyve/sebze/tohum birlestirme gibi
// baglam gerektiren donusumler tablo disi tutuldu; bunlar kategoriye ozel
// birlestirme (concat) mantigi gerektirir, basit regex degistirme degil.
// Bunlar ilgili kategori modullerinde (items-clothes rules) ele alinmalidir.

// ---------------------------------------------------------------------------
// 3) BUYUK HARF / NOKTALAMA YARDIMCILARI
// ---------------------------------------------------------------------------

/** Bir cumlenin ilk harfini buyutur, geri kalanini degistirmez. */
export function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Metin bir rakamla mi bitiyor (ornegin "...Price: $35.000")? */
export function endsWithDigit(str) {
  return /\d$/.test(str.trim());
}

/**
 * EN3 kurali: "Ad rakamla bitiyorsa nokta ekleme, harfle bitiyorsa nokta ekle."
 * Zaten sonunda "." varsa dokunmaz.
 */
export function terminate(str) {
  const trimmed = str.trim();
  if (trimmed.endsWith('.')) return trimmed;
  if (endsWithDigit(trimmed)) return trimmed;
  return trimmed + '.';
}

/**
 * Resmi/gayriresmi lokasyon on-eki kurali:
 *  - Resmi lokasyon (Official Places listesi): "in/near Vinewood Hills" (buyuk harf, "the" YOK)
 *  - Gayriresmi lokasyon: "in the city", "near the beach market" (kucuk harf, "the" VAR)
 */
export function formatLocationPhrase(locationName, isOfficial, preposition = 'in') {
  if (isOfficial) {
    return `${preposition} ${locationName}`; // orn. "in Vinewood Hills", "near SAHP"
  }
  return `${preposition} the ${locationName.toLowerCase()}`; // orn. "in the city"
}

// ---------------------------------------------------------------------------
// 4) ILAN ON-EKI (Buying/Selling/Trading/Selling or Trading)
// ---------------------------------------------------------------------------

export function getAdPrefix(typeRaw) {
  const [firstWord, ...rest] = typeRaw.trim().split(' ');
  const type = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  return rest.length ? `${type} ${rest.map(w => w.toLowerCase()).join(' ')}` : type;
}

// ---------------------------------------------------------------------------
// 5) OFICIAL / UNOFFICIAL LOKASYON LISTESI (buyuk/kucuk harf kurali icin)
// ---------------------------------------------------------------------------

export const OFFICIAL_LOCATIONS = [
  'Vinewood Hills', 'Rockford Hills', 'Richman', 'Sandy Shores', 'Paleto Bay',
  'Postal', 'Hospital', 'Capitol', 'Fire Station', 'Auto Fair', 'Bahama Mamas Bar',
  'Tequi-la-la Bar', 'FIB', 'Hotel Spa Bar', 'Pacific Bluffs Country Club',
  'Diamond Resort Bar', 'Vanilla Unicorn Bar', 'Church', 'Stock Exchange',
  'Stadium', 'Chumash', 'Lifeinvader', 'Del Perro Pier', 'Del Perro Beach',
  'Cayo Perico Island', 'Hotel', 'Raton Canyon', 'School', 'SAHP', 'Mirror Park',
];

export const UNOFFICIAL_LOCATIONS = [
  'airport', 'autosalon', 'beach', 'beach market', 'ghetto', 'post office',
  'train station', 'yacht', 'city',
];

export function isOfficialLocation(name) {
  return OFFICIAL_LOCATIONS.some(l => l.toLowerCase() === name.toLowerCase());
}

// ---------------------------------------------------------------------------
// 6) YASAKLI / UYARI GEREKTIREN LOKASYONLAR (Places We Do Not Promote)
// ---------------------------------------------------------------------------

export const PROMOTION_FORBIDDEN_LOCATIONS = [
  'Mega Mall',
  'Ballas Headquarters', 'Vagos Headquarters', 'Families Headquarters',
  'Bloods Headquarters', 'Marabunta Headquarters',
  'Black Market',
  'LSPD', 'FIB', 'SAHP', 'EMS', 'LifeInvader', // parti baglaminda
  'the ghetto',
];

// Not: FIB ve SAHP official location listesinde de var (adres/lokasyon belirtmek icin
// serbest), ama "parti" baglaminda bu yerlerde parti PROMOTE EDILEMEZ. Iki kural
// farkli baglamlarda calisir — kategori moduleri (Real Estate vs Other/Party) hangi
// baglamda oldugunu bilerek dogru listeye basvurmalidir.
