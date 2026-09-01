// real-estate-rules.js
// EN3 "Real Estate" kategorisine ozel kural motoru.
// Genel yardimcilar (fiyat formatlama, terminate, lokasyon buyuk/kucuk harf) icin
// core-rules.js'i kullanir; burada SADECE Real Estate'e ozgu mantik var.

import {
  buildPriceSentence,
  terminate,
  isOfficialLocation,
  OFFICIAL_LOCATIONS,
  UNOFFICIAL_LOCATIONS,
} from '../core-rules.js';

// ---------------------------------------------------------------------------
// APARTMAN KOMPLEKSLERI
// ---------------------------------------------------------------------------
// UYARI: Politika metni "8 apartman kompleksi var" diyor ama ornekler sadece
// 7 ismi acikca veriyor (8.'si "near the beach market" olarak gecen ama bu
// aslinda bir kompleks ADI degil, kompleks-disi bir konum aciklamasi).
// Eksik olan 8. kompleksin adini UYDURMADIM. Asagidaki listeye "Diger / Bilmiyorum"
// secenegi ekledim; siz 8. kompleksin adini verirseniz tek satirlik ekleme yeterli.
export const APARTMENT_COMPLEXES = [
  'Eclipse Towers',
  'Tinsel Towers',
  'Del Perro Heights',
  'Richards Majestic',
  'Tinkle Building',
  '3 Alta Street',
  'Celltowa Building',
  // 8. kompleks: PDF'te acikca isimlendirilmemis — bilgi geldiginde eklenecek.
];

// ---------------------------------------------------------------------------
// GARAJ / DEPO TIPLERI (politika: SADECE bu degerler gecerli)
// ---------------------------------------------------------------------------
export const GARAGE_SPACE_OPTIONS = ['2 g.s.', '5 g.s.', '9 g.s.', '25 g.s.', '30 g.s.'];
export const WAREHOUSE_OPTIONS = ['3 w.h.', '4 w.h.', '5 w.h.'];

// ---------------------------------------------------------------------------
// VIEW SECENEKLERI (politika: "(nice/beautiful/great) views" — SADECE bu 3'u)
// ---------------------------------------------------------------------------
export const VIEW_OPTIONS = ['nice', 'beautiful', 'great'];

// ---------------------------------------------------------------------------
// KIRALAMA PERIYODU (politika: donem belirtilmezse ad REJECT edilmeli)
// ---------------------------------------------------------------------------
export const RENTAL_PERIOD_TYPES = ['per week', 'per day']; // 'per day' -> gun sayisi 1-21 ister

export function isRentalPeriodRequired(adType, priceGiven) {
  const t = adType.toLowerCase();
  return (t.includes('renting')) && priceGiven;
}

/**
 * Kiralama donemi metnini uretir. Eksikse null doner (cagiran taraf reddetmeli).
 */
export function buildRentalPeriodPhrase({ periodType, days }) {
  if (!periodType) return null;
  if (periodType === 'per week') return 'per week';
  if (periodType === 'per day') {
    if (!days || days < 1 || days > 21) return null; // gecersiz gun sayisi
    return days === 1 ? 'for 1 day' : `for ${days} days`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// MULK TIPI ISIM/ARTICLE MANTIGI
// ---------------------------------------------------------------------------
// - Numarali mulk: "house №574", "apartment №154 in Eclipse Towers"
// - Numarasiz TEK mulk: "a house" / "an apartment"
// - Numarasiz COKLU mulk (2-3): "2 houses" / "3 apartments" (artikelsiz, cogul)
// - Casino Penthouse: her zaman "Casino penthouse", artikelsiz, numarasiz
//   (politika ornegi: "Selling Casino penthouse. Price: Negotiable." — numara
//   veya artikel kullanimi ornekle desteklenmiyor, bu yuzden bu tur icin
//   numara/miktar alanlarini UI'da DEVRE DISI biraktim.)

const TYPE_LABELS = {
  house: 'house',
  apartment: 'apartment',
  mansion: 'mansion',
  casino: 'Casino penthouse',
};

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

export function buildPropertyNounPhrase({ propertyType, number, quantity, complex }) {
  if (propertyType === 'casino') {
    return 'Casino penthouse'; // artikelsiz, numarasiz — bkz. yukaridaki not
  }

  const label = TYPE_LABELS[propertyType];

  if (number) {
    // Numarali mulk: max 1 tane olabilir (politika kurali)
    let phrase = `${label} №${number}`;
    if (propertyType === 'apartment' && complex) {
      phrase += ` in ${complex}`;
    }
    return phrase;
  }

  const qty = quantity && quantity > 1 ? quantity : 1;
  if (qty === 1) {
    return `${articleFor(label)} ${label}`;
  }
  // Politika: "Selling 2 houses. Price: Negotiable." / "Selling 3 houses. Price: Negotiable."
  // Cogul ek: house->houses, apartment->apartments, mansion->mansions (hepsi duz +s)
  return `${qty} ${label}s`;
}

// ---------------------------------------------------------------------------
// OZELLIK SIRALAMASI VE CUMLE URETIMI
// ---------------------------------------------------------------------------
// Politika sirasi (degistirilemez):
// 1. garden  2. garage spaces  3. warehouses  4. custom interior  5. insurance
// 6. helipad  7. swimming pool  8. tennis court  9. (long/large) driveway
// 10. (spacious) backyard  11. (nice/beautiful/great) views  12. lokasyon

/**
 * @param {object} f - form durumu
 * f.propertyType, f.garden(bool), f.garageSpace(str|null), f.warehouse(str|null),
 * f.customInterior(bool), f.insurance(bool), f.helipad(bool), f.swimmingPool(bool),
 * f.tennisCourt(bool), f.driveway(bool), f.drivewaySize('long'|'large'),
 * f.backyard(bool), f.view(str|null: 'nice'|'beautiful'|'great'),
 * f.location(str|null), f.locationPreposition('in'|'near')
 */
export function buildFeatureList(f) {
  const items = [];

  if (f.garden) items.push({ text: 'a garden', countable: false }); // politika: HER ZAMAN artikelli

  if (f.garageSpace) items.push({ text: f.garageSpace, countable: false, isAbbrev: true });
  if (f.warehouse) items.push({ text: f.warehouse, countable: false, isAbbrev: true });

  if (f.customInterior) items.push({ text: 'custom interior', countable: false });

  // Apartmanlar sigortalanamaz — bu kontrol UI tarafinda checkbox'i devre disi
  // birakarak da yapiliyor, ama motor seviyesinde de kesin kural olarak burada
  // tekrar uygulaniyor (savunma amacli çift kontrol).
  if (f.insurance && f.propertyType !== 'apartment') {
    items.push({ text: 'insurance', countable: false });
  }

  // Tekil sayilabilir ozellikler: SADECE tek basinalarsa "a/an" alirlar (bkz. asagi not)
  if (f.helipad) items.push({ text: 'helipad', countable: true });
  if (f.swimmingPool) items.push({ text: 'swimming pool', countable: true });
  if (f.tennisCourt) items.push({ text: 'tennis court', countable: true });

  if (f.driveway) {
    const size = f.drivewaySize === 'large' ? 'large' : 'long';
    items.push({ text: `${size} driveway`, countable: false });
  }

  if (f.backyard) items.push({ text: 'spacious backyard', countable: false });

  if (f.view) items.push({ text: `${f.view} views`, countable: false });

  return items;
}

/**
 * NOT (varsayim - belgede tam sistematik degil): "a garden" haric tum tekil
 * sayilabilir ozellikler (helipad, swimming pool, tennis court) SADECE listenin
 * TEK elemani olduklarinda "a/an" alir. Orn:
 *   "Selling a house with a helipad." (tek ozellik -> artikel var)
 *   "...9 g.s., 5 w.h., helipad and spacious backyard." (liste icinde -> artikel yok)
 * Bu heuristigi asagidaki fonksiyonda uyguluyoruz.
 */
export function joinFeatures(items) {
  if (items.length === 0) return '';

  let texts = items.map(i => i.text);

  if (items.length === 1 && items[0].countable) {
    texts[0] = `${articleFor(items[0].text)} ${items[0].text}`;
  }

  if (texts.length === 1) return texts[0];
  if (texts.length === 2) return `${texts[0]} and ${texts[1]}`;
  return `${texts.slice(0, -1).join(', ')} and ${texts[texts.length - 1]}`;
}

/**
 * Ozellik listesinin son elemani g.s./w.h. gibi zaten "." iceren bir kisaltmaysa,
 * cumle sonuna IKINCI bir nokta eklenmemeli (politika: "g.s. or w.h. does not need
 * an addition '.' at the end if that is mentioned as the last feature").
 * Bu fonksiyon feature cumlesinin gercekten "." ile bitip bitmedigini kontrol eder.
 */
export function featureListEndsWithAbbrev(items) {
  if (items.length === 0) return false;
  return !!items[items.length - 1].isAbbrev;
}

// ---------------------------------------------------------------------------
// LOKASYON IFADESI (resmi/gayriresmi)
// ---------------------------------------------------------------------------

export function buildLocationPhrase(locationName, preposition = 'in') {
  if (!locationName) return '';
  if (isOfficialLocation(locationName)) {
    return `${preposition} ${locationName}`;
  }
  return `${preposition} the ${locationName.toLowerCase()}`;
}

export { OFFICIAL_LOCATIONS, UNOFFICIAL_LOCATIONS };

// ---------------------------------------------------------------------------
// TAM CUMLE URETIMI
// ---------------------------------------------------------------------------

/**
 * @param {object} state - tum form alanlarini icerir (bkz. buildFeatureList + ust seviye alanlar)
 * state.adType: 'Buying' | 'Selling' | 'Renting out' | 'Renting'
 * state.priceRaw: string
 * state.rentalPeriod: {periodType, days} | null
 * @returns {{ text: string, error: string|null }}
 */
export function buildRealEstateAd(state) {
  const {
    adType, propertyType, number, quantity, complex,
    priceRaw, rentalPeriod,
  } = state;

  // --- kural kontrolleri (once validasyon) ---
  if (number && quantity && quantity > 1) {
    return { text: '', error: 'Numarali bir mulkten sadece 1 adet ilan edilebilir (Property № + Quantity > 1 celisiyor).' };
  }
  if (!number && quantity > 3) {
    return { text: '', error: 'Numarasiz ilanlarda en fazla 3 mulk belirtilebilir.' };
  }
  if ((propertyType === 'house' || propertyType === 'apartment') && adType.toLowerCase().includes('trad')) {
    return { text: '', error: 'Houses and apartments are not tradable.' };
  }

  const priceGiven = !!priceRaw && priceRaw.trim().length > 0;
  if (isRentalPeriodRequired(adType, priceGiven)) {
    const phrase = buildRentalPeriodPhrase(rentalPeriod || {});
    if (!phrase) {
      return { text: '', error: 'Please indicate rental period.' };
    }
  }

  // --- govde cumlesi ---
  const prefix = adType; // 'Buying' | 'Selling' | 'Renting out' | 'Renting'
  const nounPhrase = buildPropertyNounPhrase({ propertyType, number, quantity, complex });

  const features = buildFeatureList(state);
  const featurePhrase = joinFeatures(features);

  let body = `${prefix} ${nounPhrase}`;
  if (featurePhrase) body += ` with ${featurePhrase}`;

  if (state.location) {
    // ONEMLI: state.location artik "in Vinewood Hills" / "near the beach market" gibi
    // TAM ifade olarak geliyor (orijinal EN1 dropdown'undaki gibi, "in"/"near" onceden
    // gomulmus). Ayrica preposition/buyuk-kucuk harf hesaplamiyoruz — dropdown zaten
    // dogru halde geliyor, oldugu gibi ekleniyor.
    body += ` ${state.location}`;
  }

  // Govde cumlesinin sonuna nokta: bu ADIM "ilan rakamla bitiyorsa nokta ekleme"
  // kuraliyla KARISTIRILMAMALI — o kural sadece ilanin EN SONUNDA (fiyat
  // cumlesinden sonra) gecerlidir. Govde ile fiyat cumlesi arasi HER ZAMAN
  // nokta ile ayrilir (ozellik listesi zaten g.s./w.h. gibi kendi noktasini
  // tasimiyorsa). "house №758" gibi rakamla biten govdeler de nokta alir,
  // cunku govde ilanin sonu DEGIL, ortasidir.
  const endsWithAbbrev = featureListEndsWithAbbrev(features) && !state.location;
  if (!endsWithAbbrev) {
    const trimmed = body.trim();
    body = trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  // --- fiyat/kira cumlesi ---
  let priceSentence = '';
  if (adType === 'Renting out') {
    const periodPhrase = buildRentalPeriodPhrase(rentalPeriod || {});
    if (!priceGiven) {
      priceSentence = 'Rent: Negotiable.';
    } else {
      const priceOnly = buildPriceSentence(priceRaw, 'Selling', {}); // "Price: $X" formatini kullan, sonra Rent'e cevir
      const priceValue = priceOnly.replace(/^Price:\s*/, '');
      priceSentence = `Rent: ${priceValue}${periodPhrase ? ' ' + periodPhrase : ''}.`;
    }
  } else if (adType === 'Renting') {
    const periodPhrase = buildRentalPeriodPhrase(rentalPeriod || {});
    if (!priceGiven) {
      priceSentence = 'Budget: Negotiable.';
    } else {
      const priceOnly = buildPriceSentence(priceRaw, 'Buying', {});
      const priceValue = priceOnly.replace(/^Budget:\s*/, '');
      priceSentence = `Budget: ${priceValue}${periodPhrase ? ' ' + periodPhrase : ''}.`;
    }
  } else {
    // Buying / Selling
    if (!priceGiven) {
      priceSentence = adType === 'Buying' ? 'Budget: Negotiable.' : 'Price: Negotiable.';
    } else {
      const sentence = buildPriceSentence(priceRaw, adType, {});
      priceSentence = terminate(sentence);
    }
  }

  return { text: `${body} ${priceSentence}`, error: null };
}
