// business-rules.js
// EN3 "Business" kategorisine ozel kural motoru.

import { buildPriceSentence, terminate, getAdPrefix } from '../core-rules.js';

// ---------------------------------------------------------------------------
// ISLETME LISTELERI (PDF'ten birebir)
// ---------------------------------------------------------------------------
export const PRIVATE_BUSINESSES = [
  'Ammunition Store', 'ATM business', 'Bar', 'Car wash', 'Car sharing',
  'Chip tuning', 'Clothing shop', 'Electric station', 'Farm', 'Flower shop',
  'Fight club', 'Furniture shop', 'Gas station', 'Grand Elite', 'Hair salon',
  'Jewelry store', 'Juice shop', 'Luna park', 'Parking', 'Pet Shop',
  'State object', 'Service station', 'Tattoo studio', 'Taxi company',
  'Warehouse', '24/7 Store',
];

// Aile isletmeleri: TAKAS EDILEMEZ (politika: "Family businesses cannot be traded.")
export const FAMILY_BUSINESSES = [
  'Burger shop', 'Cowshed', 'Freight train', 'Plantation', 'Oil Well',
];

// Hisse (shares) satisi izinli olan isletmeler (politika listesi)
export const SHARES_ELIGIBLE = [
  'Taxi company', 'Gas station', 'Chip tuning', 'Hair salon', 'Tattoo studio',
  'Ammunition Store', 'Bar', 'Car sharing',
];
// Not: politika "Taxi fleet", "Barber shop", "Armory store" diyor ama bizim
// isim listemizde bunlarin karsiligi "Taxi company", "Hair salon" (not barber),
// "Ammunition Store" (not gun/weapon store) olarak geciyor — ayni isletmeler,
// dogru/onaylanmis isimlerle eslestirildi.

export const PLANTATION_CROPS = ['Pumpkin', 'Cabbage', 'Mandarin', 'Pineapple'];

export function isFamilyBusiness(name) {
  return FAMILY_BUSINESSES.includes(name);
}

// ---------------------------------------------------------------------------
// ISLETME ADI URETIMI
// ---------------------------------------------------------------------------
// Kurallar:
// - Numara verilmisse: "{Name} №{N}" — suffix ("business") EKLENMEZ.
//   Ama "Control" numarali ilanlarda da eklenebilir (politika ornegi:
//   "Selling Chip tuning №4 Control.").
// - Numara yoksa: "{Name} business" (varsayilan) veya "{Name} Control" veya
//   "{Name} shares" (sadece SHARES_ELIGIBLE listesindeki isletmeler icin).
// - "Private business" (isim belirtilmemis, genel isletme): "a private business"
//   — burada ARTIKEL var, "business" sozcugu tekrar eklenmez.
// - Plantation: "{Crop} plantation business with {N} beds" — SADECE ilk kelime
//   (mahsul adi) buyuk harfle baslar, "plantation" kucuk.

export function buildBusinessNounPhrase({ businessName, number, suffix, plantationCrop, plantationBeds }) {
  if (businessName === 'Private business') {
    return 'a private business';
  }

  let name = businessName;
  if (businessName === 'Plantation' && plantationCrop) {
    name = `${plantationCrop} plantation`; // "Cabbage plantation" - sadece ilk kelime buyuk
  }
  // Not: mahsul turu belirtilmemisse "Plantation" jenerik olarak kalir
  // (politika ornegi: "Buying Plantation business with 20 beds." — mahsul YOK).

  if (number) {
    let phrase = `${name} №${number}`;
    if (suffix === 'control') phrase += ' Control';
    return phrase;
  }

  // numara yok
  if (suffix === 'shares' && SHARES_ELIGIBLE.includes(businessName)) {
    return `${name} shares`;
  }
  if (suffix === 'control') {
    return `${name} Control`;
  }
  // varsayilan: "business" eklenir. Plantation icin "with N beds" burada DEGIL,
  // ayri bir ozellik olarak asagida ekleniyor (buildBusinessAd icinde).
  return `${name} business`;
}

// ---------------------------------------------------------------------------
// TAM ILAN URETIMI
// ---------------------------------------------------------------------------
export function buildBusinessAd(state) {
  const {
    adType, businessName, number, suffix, plantationCrop, plantationBeds,
    tradeTarget, location, priceRaw,
  } = state;

  const lowerType = adType.toLowerCase();
  const isPureTrading = lowerType === 'trading';
  const isSellingOrTrading = lowerType === 'selling or trading';

  // --- validasyonlar ---
  if ((isPureTrading || isSellingOrTrading) && isFamilyBusiness(businessName)) {
    return { text: '', error: 'Family businesses cannot be traded.' };
  }
  if ((isPureTrading || isSellingOrTrading) && tradeTarget && isFamilyBusiness(tradeTarget)) {
    return { text: '', error: 'Family businesses cannot be traded.' };
  }
  // Not: Plantation icin mahsul turu ZORUNLU DEGIL — PDF ornegi "Plantation business"
  // seklinde jenerik kullanima da izin veriyor ("Buying Plantation business with 20 beds.").


  const noun = buildBusinessNounPhrase({ businessName, number, suffix, plantationCrop, plantationBeds });

  let body = `${getAdPrefix(adType)} ${noun}`;

  // Plantation "with N beds" ozelligi — sadece Plantation icin
  if (businessName === 'Plantation' && plantationBeds) {
    body += ` with ${plantationBeds} beds`;
  }

  if ((isPureTrading || isSellingOrTrading) && tradeTarget) {
    const targetNoun = buildBusinessNounPhrase({
      businessName: tradeTarget, number: null, suffix: 'plain_business',
    });
    body += ` for ${targetNoun}`;
  }

  if (location) {
    body += ` ${location}`;
  }

  body = terminateAlways(body);

  // --- Pure Trading: fiyat YOK ---
  if (isPureTrading) {
    return { text: body, error: null };
  }

  const priceGiven = !!priceRaw && priceRaw.trim().length > 0;
  const label = lowerType.includes('buying') ? 'Budget' : 'Price';

  if (!priceGiven) {
    return { text: `${body} ${label}: Negotiable.`, error: null };
  }

  // 500 Million usti fiyat -> Negotiable (politika: Business kategorisine ozel tavan)
  const numericValue = parseApproxValue(priceRaw);
  if (numericValue !== null && numericValue > 500_000_000) {
    return { text: `${body} ${label}: Negotiable.`, error: null };
  }

  const sentence = buildPriceSentence(priceRaw, isSellingOrTrading ? 'Selling' : adType, {});
  return { text: `${body} ${terminate(sentence)}`, error: null };
}

// core-rules.js'teki formatPrice ile ayni ayristirma mantigi (k/m/duz sayi) —
// burada sadece 500M tavan kontrolu icin yaklasik sayisal deger lazim.
function parseApproxValue(raw) {
  const lower = String(raw).toLowerCase().trim();
  if (['negotiate', 'negotiation', 'negotiable'].includes(lower)) return null;
  if (/m(illion)?$/.test(lower.replace(/\s+/g, ''))) {
    const n = parseFloat(lower.replace(/million|m/g, ''));
    return isNaN(n) ? null : n * 1_000_000;
  }
  if (/k$/.test(lower.replace(/\s+/g, ''))) {
    const n = parseFloat(lower.replace(/k/g, ''));
    return isNaN(n) ? null : n * 1_000;
  }
  const cleaned = lower.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function terminateAlways(str) {
  const trimmed = str.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}
