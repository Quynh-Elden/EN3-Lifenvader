// items-clothes-rules.js
// EN3 "Other" / "Clothing Feature Order" kurallarina dayali motor.
// Fiyat formatlama icin core-rules.js'i kullanir (eski rules.js'teki priceFormat
// artik KULLANILMIYOR — ayni "1.450k" belirsizligi ve gereksiz "2 milyar" tavani
// sorunlarini tasiyordu, core-rules.js'te zaten test edilip duzeltildi).

import { buildPriceSentence, terminate, getAdPrefix } from '../core-rules.js';

// ---------------------------------------------------------------------------
// ESYA ETIKETI URETIMI
// ---------------------------------------------------------------------------
// Politika (Clothing Feature Order): 1) color (kucuk harf) 2) item name (luminous
// varsa item name'den ONCE gelir) 3) type (of type) 4) gender (for men/women)
//
// ONEMLI DUZELTME: Eski sistemde "luminous" bir RENK secenegi olarak color-select
// icindeydi — yani "black" ile "luminous" AYNI ANDA secilemiyordu. Ama politika
// ornegi ikisini birlikte istiyor: "Buying black luminous Keezy Boost shoes of
// type 5." Bu yuzden luminous artik AYRI bir checkbox, renkle birlikte kullanilabilir.

export function buildItemLabel({
  name, quantity, plural, article, color, luminous, type,
  men, women, bulk, each, respectively,
}) {
  let label = name;

  if (quantity && quantity > 0) {
    const formattedQty = quantity.toLocaleString('en-US').replace(/,/g, '.');
    label = `${formattedQty} ${label}`;
  }
  if (plural) {
    label = label.endsWith('y') ? label.slice(0, -1) + 'ies' : label + 's';
  }
  if (article) {
    label = /^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`;
  }
  // Politika sirasi: once color, sonra luminous, sonra item name.
  if (luminous) label = `luminous ${label}`;
  if (color) label = `${color.toLowerCase()} ${label}`;

  if (type) label += ` of type ${type}`;
  if (men) label += ' for men';
  if (women) label += ' for women';
  if (bulk) label += ' in bulk';

  return label;
}

// ---------------------------------------------------------------------------
// BIRDEN FAZLA ESYA BIRLESTIRME (1-3 esya)
// ---------------------------------------------------------------------------
export function buildItemListText(items, adType) {
  const lowerType = adType.toLowerCase();
  if (items.length === 1) return items[0];
  if (items.length === 2) {
    return lowerType.includes('trading') && !lowerType.includes('selling or trading')
      ? `${items[0]} for ${items[1]}`
      : `${items[0]} and ${items[1]}`;
  }
  return `${items[0]}, ${items[1]} and ${items[2]}`;
}

// ---------------------------------------------------------------------------
// TAM ILAN URETIMI
// ---------------------------------------------------------------------------
// state.items: [{ name, quantity, plural, article, color, luminous, type, men, women, bulk }]
//   (1-3 eleman, bos elemanlar filtrelenmis olarak gelmeli)
// state.adType, state.priceRaw, state.each, state.respectively

export function buildItemsClothesAd(state) {
  const { adType, items, priceRaw, each, respectively } = state;

  if (!adType) return { text: '', error: 'Lutfen ilan turunu secin.' };
  if (!items || items.length === 0) return { text: '', error: 'En az bir esya secilmeli.' };
  if (items.length > 3) return { text: '', error: 'En fazla 3 esya ilan edilebilir.' };

  const labels = items.map(it => buildItemLabel(it));
  const lowerType = adType.toLowerCase();

  let ad = `${getAdPrefix(adType)} ${buildItemListText(labels, adType)}`;

  const isPureTrading = lowerType === 'trading';

  if (!isPureTrading) {
    const priceGiven = !!priceRaw && priceRaw.trim().length > 0;
    if (!priceGiven) {
      const label = lowerType.includes('buying') ? 'Budget' : 'Price';
      ad = terminateAlways(ad);
      ad += ` ${label}: Negotiable.`;
    } else {
      ad = terminateAlways(ad);
      const sentence = buildPriceSentence(priceRaw, lowerType.includes('buying') ? 'Buying' : 'Selling', { each, respectively });
      ad += ` ${terminate(sentence)}`;
    }
  } else {
    ad = terminateAlways(ad);
  }

  return { text: ad, error: null };
}

function terminateAlways(str) {
  const trimmed = str.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}
