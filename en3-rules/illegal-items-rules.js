// illegal-items-rules.js
// EN3 "Illegal Items" kategorisi BIR ILAN URETICI DEGIL — bir KARAR/DENETIM aracidir.
// Personel ilanda gecen ogeleri isaretler, motor dogru aksiyonu (blacklist/reject/warning)
// ve kopyalanabilir gerekce metnini uretir.

// ---------------------------------------------------------------------------
// 1) TELEFON KARA LISTESI GEREKTIREN OGELER
// ---------------------------------------------------------------------------
export const BLACKLIST_ITEMS = [
  'Firearms of any kind',
  'Ammunition',
  'Bulletproof vests',
  'Dark Lui Vi Armored Vest',
  'Weed / cannabis seeds or trees',
  'Drugs and cocaine',
  'EMS surgical masks or medical masks',
  'Vehicle scanners and people scanners (radars)',
  'Balaclava masks',
  'Ropes',
  'Flash drive with a virus (USB)',
  'Lock picks',
  'Troll advertisements',
  'Anti-Radar',
  'Engine Block',
  'Smuggling Machine',
  'Submodule',
  'Hacking the Search Database',
  'Offensive/inappropriate license plate', // ayri kural ama ayni blok altinda gecer
];

// ---------------------------------------------------------------------------
// 2) SADECE RED GEREKTIREN OGELER (blacklist YOK)
// ---------------------------------------------------------------------------
export const REJECT_ONLY_ITEMS = [
  'Crowbar',
  'All fabric',
  'Head bag (except luminous head bag)',
  'Animal skin',
  'Armor skin',
  'Air Horn',
  'Earplugs',
  'Barricade',
  'Trap',
  'Poison dart',
  'Army Uniform',
  'Tracking sensor',
  'Dangerous razor',
  'Resource scanners',
  'Body armor plates',
  'Body Armor',
  'Ingredients for cocaine',
  'Paper for money',
  'Satellite dish',
  'Tincture of forest mushrooms',
  'First Aid Kits & all pills',
  'Food items (Banana, Burger, Grilled Steak)',
];

// ---------------------------------------------------------------------------
// 3) "THINGS WE CANNOT ADVERTISE" — genel red kategorileri (blacklist YOK,
//    yukaridaki iki listenin kapsamadigi ek kurallar)
// ---------------------------------------------------------------------------
export const CANNOT_ADVERTISE_ITEMS = [
  'Grand Coins (Premium/Premium Plus Battlepass)',
  'Specific family names (e.g. "Looking for Playboy family members.")',
  'Hype Body or branded armor',
  'Gangs',
  'Nationality',
  'Sale of people',
  'Sexual or sexually suggestive content',
  'Drugs of any kind',
  'Food items (except fish)',
  'Health products (medkits, pills, tincture soup, etc.)',
  'Birthday advertisements',
  'Leaders/deputy leaders (state orgs — excludes unofficial org & crime family leaders)',
];

// ---------------------------------------------------------------------------
// 4) "PLACES WE DO NOT PROMOTE" — sadece UYARI (warning), blacklist/red degil
// ---------------------------------------------------------------------------
export const WARNING_ONLY_PLACES = [
  'Mega Mall',
  'Gang Headquarters (Ballas, Vagos, Families, Bloods, Marabunta)',
  'Black Market',
  'Parties at LSPD, FIB, SAHP, EMS, LifeInvader or Government buildings',
  'Parties at the ghetto',
];

// ---------------------------------------------------------------------------
// KARAR MOTORU
// ---------------------------------------------------------------------------
// state.selectedBlacklist: string[] (BLACKLIST_ITEMS alt kumesi)
// state.selectedRejectOnly: string[] (REJECT_ONLY_ITEMS alt kumesi)
// state.selectedCannotAdvertise: string[] (CANNOT_ADVERTISE_ITEMS alt kumesi)
// state.selectedWarningPlaces: string[] (WARNING_ONLY_PLACES alt kumesi)

export function evaluateIllegalItems(state) {
  const {
    selectedBlacklist = [],
    selectedRejectOnly = [],
    selectedCannotAdvertise = [],
    selectedWarningPlaces = [],
  } = state;

  const hasBlacklist = selectedBlacklist.length > 0;
  const hasReject = selectedRejectOnly.length > 0 || selectedCannotAdvertise.length > 0;
  const hasWarning = selectedWarningPlaces.length > 0;

  if (!hasBlacklist && !hasReject && !hasWarning) {
    return {
      action: 'none',
      title: 'No violation selected',
      instructions: 'No item selected — this ad does not need to be rejected or blacklisted based on this checklist.',
      reasons: [],
    };
  }

  // En agir aksiyon oncelikli: blacklist > reject > warning
  if (hasBlacklist) {
    return {
      action: 'blacklist',
      title: '🔴 REJECT + PHONE BLACKLIST',
      instructions: 'You must take a proper screenshot of this ad and post it in #📱|phone-blacklist.',
      reasons: [
        'Cannot promote illegal items.',
        ...selectedBlacklist.map(i => `→ ${i}`),
      ],
    };
  }

  if (hasReject) {
    return {
      action: 'reject',
      title: '🟠 REJECT (no blacklist)',
      instructions: 'Reject the ad. Do not blacklist the phone number.',
      reasons: [
        ...selectedRejectOnly.map(i => `→ ${i}`),
        ...selectedCannotAdvertise.map(i => `→ ${i}`),
      ],
    };
  }

  return {
    action: 'warning',
    title: '🟡 WARNING',
    instructions: 'Issue a warning to the user. The ad itself is still rejected, but no blacklist is needed.',
    reasons: selectedWarningPlaces.map(i => `→ ${i}`),
  };
}
