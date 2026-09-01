// work-rules.js
// EN3 "Work" kategorisine ozel kural motoru.

import { buildPriceSentence, terminate } from '../core-rules.js';

// ---------------------------------------------------------------------------
// INSAAT SAHASI ROLLERI VE LOKASYONLARI (politika: sadece bu 5 rol, 3 saha)
// ---------------------------------------------------------------------------
export const CONSTRUCTION_ROLES = ['locksmith', 'electrician', 'gardener', 'surveyor', 'driver'];

export const CONSTRUCTION_SITES = {
  1: 'on Vespucci Boulevard',
  2: 'on Calais Avenue',
  3: 'in Pillbox Hill',
};

// ---------------------------------------------------------------------------
// SERBEST MESLEKLER (insaat sahasi disinda, politika listesi)
// ---------------------------------------------------------------------------
export const FREE_PROFESSIONS = [
  'Trucker', 'Lawyer', 'DJ', 'Photographer', 'Bodyguard',
  'Professional dancer', 'Personal driver', 'Assistant', 'Professional singer',
];

// ---------------------------------------------------------------------------
// MESLEK BUYUK/KUCUK HARF KURALI
// ---------------------------------------------------------------------------
// Politika: "Eger meslek cumlenin EN BASINDA gecerse buyuk harfle baslar,
// aksi halde kucuk harfle." DJ istisna: HER ZAMAN buyuk kalir.
export function formatProfession(profession, atStart) {
  if (!profession) return profession;
  if (profession.toUpperCase() === 'DJ') return 'DJ';
  if (atStart) return profession.charAt(0).toUpperCase() + profession.slice(1).toLowerCase();
  return profession.toLowerCase();
}

function pluralize(word) {
  if (word.toUpperCase() === 'DJ') return 'DJs';
  return word.endsWith('y') ? word.slice(0, -1) + 'ies' : word + 's';
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

// ---------------------------------------------------------------------------
// MAAS / BONUS CUMLESI
// ---------------------------------------------------------------------------
// Secenekler: Negotiable (varsayilan) | Salary: $X | Awarding $X bonus |
//             Awarding bonuses | paying well
export function buildSalaryClause({ mode, amountRaw }) {
  switch (mode) {
    case 'salary': {
      const sentence = buildPriceSentence(amountRaw, 'Hiring', {});
      return terminate(sentence.replace(/^Salary:/, 'Salary:'));
    }
    case 'awarding_amount': {
      const priceOnly = buildPriceSentence(amountRaw, 'Selling', {}).replace(/^Price:\s*/, '');
      return `Awarding ${priceOnly} bonus.`;
    }
    case 'awarding_bonuses':
      return 'Awarding bonuses.';
    case 'paying_well':
      return 'Paying well.';
    default:
      return 'Salary: Negotiable.';
  }
}

// ---------------------------------------------------------------------------
// TAM ILAN URETIMI
// ---------------------------------------------------------------------------
// state:
//   mode: 'hiring' | 'looking'
//   isConstructionSite: bool
//   siteNumber: 1|2|3|null
//   roles: string[] (CONSTRUCTION_ROLES alt kumesi, sadece isConstructionSite+hiring icin)
//   profession: string|null (serbest meslek veya CONSTRUCTION_ROLES'ten biri, tekil rol secildiyse)
//   yearsExperience: number|null
//   salary: { mode, amountRaw }
//   location: string|null (insaat sahasi DISI hiring icin, orn. "at TV station")

export function buildWorkAd(state) {
  const { mode, isConstructionSite, siteNumber, roles, profession, yearsExperience, salary, location, plural, lookingPhrase, isSolarPlantation } = state;

  if (mode === 'hiring') {
    return buildHiringAd({ isConstructionSite, siteNumber, roles, profession, yearsExperience, salary, location, plural, isSolarPlantation });
  }
  return buildLookingAd({ isConstructionSite, profession, location, lookingPhrase, isSolarPlantation });
}

function buildHiringAd({ isConstructionSite, siteNumber, roles, profession, yearsExperience, salary, location, plural, isSolarPlantation }) {
  let body;

  if (isSolarPlantation) {
    // Politika: "Hiring workers for solar panel plantations. Salary: $10.000"
    body = 'Hiring workers for solar panel plantations';
  } else if (isConstructionSite) {
    const roleList = roles && roles.length ? roles : [];
    let subject;
    if (roleList.length === 0) {
      subject = 'workers';
    } else if (roleList.length === 1) {
      subject = `a ${roleList[0].toLowerCase()}`;
    } else {
      // Politika: birden fazla rol -> "hiring workers" (tek tek saymak yok)
      subject = 'workers';
    }

    body = `Hiring ${subject} at construction site`;
    if (siteNumber && CONSTRUCTION_SITES[siteNumber]) {
      // NOT: PDF'te bu lokasyon ifadesi iki farkli sekilde geciyor —
      // tanimlayici listede "at construction site №1 on Vespucci Boulevard"
      // (virgulsuz), sonraki ornekte "at construction site №1, in Vespucci
      // Boulevard" (virgullu, "in" ile). Tanimlayici (kanonik) listeye sadik
      // kaliyoruz; PDF'in kendi ic tutarsizligi, ikisini de "dogru" saymak
      // mumkun degil.
      body += ` №${siteNumber} ${CONSTRUCTION_SITES[siteNumber]}`;
    }
    if (yearsExperience && roleList.length === 1) {
      // Politika: insaat sahasi baglaminda "years OF experience" kullanilir
      // (ornek: "Hiring a driver with 3 years of experience at construction site №2.")
      body += ` with ${yearsExperience} years of experience`;
    }
  } else {
    // Serbest meslek / genel hiring
    const prof = profession ? formatProfession(profession, false) : null;
    if (!prof) {
      body = plural ? 'Hiring workers' : 'Hiring a worker';
    } else if (plural) {
      body = `Hiring ${pluralize(prof)}`;
    } else {
      body = `Hiring ${articleFor(prof)} ${prof}`;
    }
    if (yearsExperience) {
      // Politika: serbest meslek baglaminda "years experience" ("of" YOK) —
      // ornek: "Hiring a trucker with 3 years experience." (insaat sahasi
      // ornegindeki "years OF experience" ile CELISIYOR, PDF'in kendi
      // tutarsizligi — ikisi de kendi baglaminda oldugu gibi uygulaniyor.)
      body += ` with ${yearsExperience} years experience`;
    }
    if (location) {
      body += ` ${location}`;
    }
  }

  body = terminateAlways(body);
  const salaryClause = buildSalaryClause(salary || {});
  return { text: `${body} ${salaryClause}`, error: null };
}

function buildLookingAd({ isConstructionSite, profession, location, lookingPhrase, isSolarPlantation }) {
  if (isSolarPlantation) {
    return { text: 'Looking for solar panel plantation work.', error: null };
  }
  if (isConstructionSite) {
    return { text: 'Looking for a job at the construction site.', error: null };
  }

  if (!profession) {
    return { text: 'Looking for a job.', error: null };
  }

  if (lookingPhrase === 'looking_to_work_as') {
    // Politika ornegi: "Looking to work as a professional dancer."
    const prof = formatProfession(profession, false);
    return { text: `Looking to work as ${articleFor(prof)} ${prof}.`, error: null };
  }

  const prof = formatProfession(profession, true);
  let text = `${prof} looking for work.`;
  if (location) {
    text = `${prof} looking for work ${location}.`;
  }
  return { text, error: null };
}

function terminateAlways(str) {
  const trimmed = str.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

// ---------------------------------------------------------------------------
// TRUCKER VAN KIRALAMA (ozel durum)
// ---------------------------------------------------------------------------
// UYARI: PDF'te bu iki ornek birbiriyle VE genel kiralama kuralinin geri
// kalaniyla CELISIYOR:
//   "Renting 15% trucker van. Rent: $12.000 per week."       (Renting + Rent)
//   "Renting out 15% trucker van. Budget: $10.000 per week." (Renting out + Budget)
// Standart kural (Real Estate, Auto, ve Auto'daki "exclusive truck" ornegi
// dahil HER YERDE): "Renting out" = mal sahibi teklif ediyor = "Rent:";
// "Renting" = kiralamak isteyen kisi = "Budget:". Bu iki ornek bu kuralin
// TAM TERSI — muhtemelen PDF'te sehven yer degistirmis. Standart kurala
// sadik kaliyorum (Renting->Budget, Renting out->Rent), PDF'in bu iki
// ornegini BIREBIR uygulamiyorum. LI ekibinden teyit isterseniz bu satiri
// degistirebiliriz.
export function buildTruckerVanRentalAd({ mode, percent, priceRaw, periodType, days }) {
  const prefix = mode === 'renting_out' ? 'Renting out' : 'Renting';
  const label = mode === 'renting_out' ? 'Rent' : 'Budget';
  const percentPhrase = `${percent}% trucker van`;

  let periodPhrase = '';
  if (periodType === 'per week') periodPhrase = 'per week';
  else if (periodType === 'per day' && days) periodPhrase = days === 1 ? 'for 1 day' : `for ${days} days`;

  const priceGiven = !!priceRaw && priceRaw.trim().length > 0;
  if (!priceGiven) {
    return { text: `${prefix} ${percentPhrase}. ${label}: Negotiable.`, error: null };
  }
  if (!periodPhrase) {
    return { text: '', error: 'Please indicate rental period.' };
  }
  const priceOnly = buildPriceSentence(priceRaw, 'Selling', {}).replace(/^Price:\s*/, '');
  return { text: `${prefix} ${percentPhrase}. ${label}: ${priceOnly} ${periodPhrase}.`, error: null };
}
