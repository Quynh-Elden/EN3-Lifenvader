// auto-rules.js
// EN3 "Auto" kategorisine ozel kural motoru.

import { buildPriceSentence, terminate, getAdPrefix } from '../core-rules.js';
import { isSellable, isRentOnly, vehicleExists } from '../vehicle-list.js';

// ---------------------------------------------------------------------------
// ARAC ADI / TIRNAK KURALI
// ---------------------------------------------------------------------------
// Politika: marka+model xlsx listesinden BIREBIR kopyalanmali, tirnak icinde
// yazilmali. Arac belirtilmemisse "a car" (tirnaksiz, genel).
export function vehicleNounPhrase(vehicleName) {
  if (!vehicleName) return 'a car';
  return `"${vehicleName}"`;
}

// ---------------------------------------------------------------------------
// OZELLIK SIRASI (degistirilemez):
// 1) configuration (partial/full)  2) visual upgrades  3) luminous wheels (of type)
// 4) insurance (gun sayisi YOK)  5) turbo kit  6) drift kit
// ---------------------------------------------------------------------------

export function buildAutoFeatureList(f) {
  const items = [];
  if (f.configuration === 'full') items.push('full configuration');
  else if (f.configuration === 'partial') items.push('partial configuration');

  if (f.visualUpgrades) items.push('visual upgrades');

  if (f.luminousWheels && f.luminousWheelsType) {
    items.push(`luminous wheels of type ${f.luminousWheelsType}`);
  }

  if (f.insurance) items.push('insurance');
  if (f.turboKit) items.push('turbo kit');
  if (f.driftKit) items.push('drift kit');

  return items;
}

export function joinAutoFeatures(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------------------
// KIRALAMA SURESI (Real Estate'teki ile ayni mantik, Auto'da max 21 gun)
// ---------------------------------------------------------------------------
export function buildRentalPeriodPhrase({ periodType, days }) {
  if (!periodType) return null;
  if (periodType === 'per week') return 'per week';
  if (periodType === 'per day') {
    if (!days || days < 1 || days > 21) return null;
    return days === 1 ? 'for 1 day' : `for ${days} days`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// TAM ILAN URETIMI
// ---------------------------------------------------------------------------
// state alanlari:
//   adType: 'Buying'|'Selling'|'Trading'|'Selling or Trading'|'Renting out'|'Renting'
//   vehicle: string|null (xlsx'ten birebir isim) — bos ise "a car"/"a vehicle" genel
//   quantity: number (Renting out/Renting icin "vehicles" cogul durumunda >1 -- arac ismi
//             verilmisse quantity anlamsizdir, sadece genel "a vehicle"/"vehicles" icin gecerli)
//   tradeTarget: string|null (Trading/Selling or Trading icin "for X" hedefi)
//   configuration, visualUpgrades, luminousWheels, luminousWheelsType, insurance, turboKit, driftKit
//   autoFair: bool
//   priceRaw: string
//   rentalPeriod: {periodType, days}
//   exclusiveTruckPercent: string|null (kamyon kaplama kiralama ozel durumu)

export function buildAutoAd(state) {
  const { adType, vehicle, quantity, tradeTarget, autoFair, priceRaw, rentalPeriod, exclusiveTruckPercent } = state;

  const lowerType = adType.toLowerCase();
  const isPureTrading = lowerType === 'trading';
  const isSellingOrTrading = lowerType === 'selling or trading';
  const isRentingOut = adType === 'Renting out';
  const isRentingIn = adType === 'Renting';

  // --- validasyonlar ---
  if (vehicle && !vehicleExists(vehicle)) {
    return { text: '', error: `"${vehicle}" arac listesinde bulunamadi. Item not found in database.` };
  }
  if (tradeTarget && !vehicleExists(tradeTarget)) {
    return { text: '', error: `"${tradeTarget}" arac listesinde bulunamadi. Item not found in database.` };
  }

  const isNotSellable = vehicle && isRentOnly(vehicle);
  if (isNotSellable && !isRentingOut && !isRentingIn) {
    return { text: '', error: `"${vehicle}" sadece kiralanabilir/kiraya verilebilir (NOT SELLABLE CARS). Buying/Selling/Trading yapilamaz.` };
  }

  if ((isPureTrading || isSellingOrTrading)) {
    // "Can only trade a Vehicle for another Vehicle" — trade hedefi de arac olmali (UI zaten
    // sadece arac secturuyor, ama motor seviyesinde de dogrulaniyor).
    if (tradeTarget && isRentOnly(tradeTarget)) {
      return { text: '', error: `"${tradeTarget}" sadece kiralanabilir, takas edilemez.` };
    }
  }

  // --- ozel durum: kamyon kaplama kiralama ---
  if (exclusiveTruckPercent) {
    const percentPhrase = `"${exclusiveTruckPercent} percent" exclusive truck`;
    const prefix = isRentingIn ? 'Renting' : 'Renting out';
    const label = isRentingIn ? 'Budget' : 'Rent';
    const priceGiven = !!priceRaw && priceRaw.trim().length > 0;
    if (!priceGiven) return { text: `${prefix} a ${percentPhrase}. ${label}: Negotiable.`, error: null };
    const periodPhrase = buildRentalPeriodPhrase(rentalPeriod || {});
    if (!periodPhrase) return { text: '', error: 'Please indicate rental period.' };
    const priceOnly = buildPriceSentence(priceRaw, isRentingIn ? 'Buying' : 'Selling', {});
    const priceValue = priceOnly.replace(/^(Price|Budget):\s*/, '');
    return { text: `${prefix} a ${percentPhrase}. ${label}: ${priceValue} ${periodPhrase}.`, error: null };
  }

  // --- govde: prefix + arac ifadesi ---
  let noun;
  if (vehicle) {
    noun = vehicleNounPhrase(vehicle);
  } else if ((isRentingOut || isRentingIn) && quantity && quantity > 1) {
    noun = 'vehicles';
  } else if (isRentingOut || isRentingIn) {
    noun = 'a vehicle';
  } else {
    noun = 'a car';
  }

  const features = buildAutoFeatureList(state);
  const featurePhrase = joinAutoFeatures(features);

  let body = `${getAdPrefix(adType)} ${noun}`;
  if (featurePhrase) body += ` with ${featurePhrase}`;

  if ((isPureTrading || isSellingOrTrading) && tradeTarget) {
    body += ` for ${vehicleNounPhrase(tradeTarget)}`;
  }

  // --- Auto Fair ---
  if (autoFair) {
    body = terminateAlways(`${body} at Auto Fair`);
    return { text: body, error: null };
  }

  // --- Pure Trading: fiyat YOK ---
  if (isPureTrading) {
    return { text: terminateAlways(body), error: null };
  }

  body = terminateAlways(body);

  const priceGiven = !!priceRaw && priceRaw.trim().length > 0;

  // --- Renting out / Renting: kira sureli ---
  if (isRentingOut || isRentingIn) {
    const label = isRentingOut ? 'Rent' : 'Budget';
    if (!priceGiven) {
      return { text: `${body} ${label}: Negotiable.`, error: null };
    }
    const periodPhrase = buildRentalPeriodPhrase(rentalPeriod || {});
    if (!periodPhrase) return { text: '', error: 'Please indicate rental period.' };
    const priceOnly = buildPriceSentence(priceRaw, isRentingIn ? 'Buying' : 'Selling', {});
    let priceValue = priceOnly.replace(/^(Price|Budget):\s*/, '');
    // "Renting vehicles." (cogul, genel) durumunda "per car" eklenir (politika ornegi).
    let periodSuffix = periodPhrase;
    if (isRentingIn && noun === 'vehicles' && periodPhrase === 'per week') {
      periodSuffix = 'per week per car';
    }
    return { text: `${body} ${label}: ${priceValue} ${periodSuffix}.`, error: null };
  }

  // --- Buying / Selling / Selling or Trading: normal fiyat cumlesi ---
  if (!priceGiven) {
    const label = lowerType.includes('buying') ? 'Budget' : 'Price';
    return { text: `${body} ${label}: Negotiable.`, error: null };
  }
  const sentence = buildPriceSentence(priceRaw, isSellingOrTrading ? 'Selling' : adType, {});
  return { text: `${body} ${terminate(sentence)}`, error: null };
}

// Real Estate'teki "govde asla rakamla bitse de nokta alir" kuralinin ayni siniri:
// govde cumlesi HER ZAMAN nokta alir (fiyat/kira cumlesinden ayirmak icin),
// "ilan rakamla bitiyorsa nokta yok" kurali sadece EN SON cumleye uygulanir.
function terminateAlways(str) {
  const trimmed = str.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}
