// other-rules.js
// EN3 "Other" kategorisine ozel kural motoru. Bu kategori 7 farkli alt-turu
// tek cati altinda topluyor (politikada hepsi ayni "Other" basligi altinda).

import { buildPriceSentence, terminate, getAdPrefix } from '../core-rules.js';
import { PRIVATE_BUSINESSES, FAMILY_BUSINESSES } from './business-rules.js';

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function terminateAlways(str) {
  const trimmed = str.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

// ---------------------------------------------------------------------------
// 1) PARTI (Party)
// ---------------------------------------------------------------------------
export const PARTY_LOCATIONS = [
  'the beach', 'the yacht', 'Bahama Mamas Bar', 'Tequi-la-la Bar', 'Stadium',
  'Diamond Resort Bar', 'Arena', 'Raton Canyon', 'Vanilla Unicorn Bar',
  'Hotel Spa Bar', 'Cayo Perico',
];

// Politika: "Places We Do Not Promote" — parti YASAK olan yerler
export const PARTY_FORBIDDEN = [
  'Mega Mall', 'Gang Headquarters', 'Black Market', 'LSPD', 'FIB', 'SAHP',
  'EMS', 'LifeInvader', 'Government buildings', 'the ghetto',
];

export function buildPartyAd({ hasParty, isPool, location, houseNumber }) {
  if (!hasParty) return { text: 'Looking for a party.', error: null };

  if (PARTY_FORBIDDEN.includes(location)) {
    return { text: '', error: `Parties cannot be promoted at "${location}" (Places We Do Not Promote — warning).` };
  }

  const prefix = isPool ? 'Pool party' : 'Party';
  let place;
  if (houseNumber) {
    place = `house №${houseNumber}`;
  } else if (location) {
    place = location;
  } else {
    return { text: '', error: 'Please select a party location or house number.' };
  }
  return { text: `${prefix} at ${place}.`, error: null };
}

// ---------------------------------------------------------------------------
// 2) HIZMET ARAMA (Service)
// ---------------------------------------------------------------------------
export const SERVICE_PROFESSIONS = [
  'lawyer', 'personal driver', 'professional dancer', 'professional singer', 'DJ',
];

export function buildServiceAd({ profession }) {
  if (!profession) return { text: '', error: 'Please select a profession.' };
  const prof = profession.toUpperCase() === 'DJ' ? 'DJ' : profession.toLowerCase();
  return { text: `Looking for ${articleFor(prof)} ${prof}.`, error: null };
}

// ---------------------------------------------------------------------------
// 3) DUGUN (Wedding)
// ---------------------------------------------------------------------------
export function buildWeddingAd({ person1, person2, time }) {
  let text = 'Wedding at Church';
  if (person1 && person2) {
    text += ` for ${person1} and ${person2}`;
  }
  if (time) {
    text += ` at ${time}`;
  }
  return { text: terminateAlways(text), error: null };
}

// ---------------------------------------------------------------------------
// 4) ARABA BULUSMASI (Car meet)
// ---------------------------------------------------------------------------
export function buildCarMeetAd({ vehicleName, location }) {
  if (!location) return { text: '', error: 'Please specify a location for the car meet.' };
  if (vehicleName) {
    return { text: `"${vehicleName}" exclusive car meet at ${location}.`, error: null };
  }
  return { text: `Car meet at ${location}.`, error: null };
}

// ---------------------------------------------------------------------------
// 5) POKER / ZAR (Play Poker / Play Dice)
// ---------------------------------------------------------------------------
// Politika: bahis verilmezse Negotiable; max izinli bahis $10 Million,
// bunun ustu de Negotiable'a cevrilir.
export function buildBetAd({ game, betRaw }) {
  const gameLabel = game === 'dice' ? 'dice' : 'poker';
  const prefix = `Looking to play ${gameLabel}`;

  const betGiven = !!betRaw && betRaw.trim().length > 0;
  if (!betGiven) {
    return { text: `${prefix}. Bet: Negotiable.`, error: null };
  }

  const numericValue = parseApproxValue(betRaw);
  if (numericValue !== null && numericValue > 10_000_000) {
    return { text: `${prefix}. Bet: Negotiable.`, error: null };
  }

  const sentence = buildPriceSentence(betRaw, 'Selling', {}).replace(/^Price:/, 'Bet:');
  return { text: `${prefix}. ${terminate(sentence)}`, error: null };
}

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

// ---------------------------------------------------------------------------
// 6) AILE ITTIFAKI (Alliance)
// ---------------------------------------------------------------------------
export function buildAllianceAd() {
  return { text: 'Looking for an alliance.', error: null };
}

// ---------------------------------------------------------------------------
// 7) ISLETME SAHIBI ARAMA (Business owner)
// ---------------------------------------------------------------------------
export const OWNER_SEARCHABLE_BUSINESSES = [...PRIVATE_BUSINESSES, ...FAMILY_BUSINESSES];

export function buildBusinessOwnerAd({ businessName }) {
  if (!businessName || businessName === 'Business') {
    return { text: 'Looking for a Business owner.', error: null };
  }
  return { text: `Looking for ${articleFor(businessName)} ${businessName} owner.`, error: null };
}
