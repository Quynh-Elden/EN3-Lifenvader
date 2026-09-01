// dating-rules.js
// EN3 "Dating" kategorisine ozel kural motoru.
//
// ONEMLI: Bu kategoride SERBEST METIN YOK. Politika acikca "Only the following
// types of ads are allowed in this category" diyor ve 15 sabit ifade listeliyor.
// Bu yuzden asagidaki liste bir "varsayilan" degil, TEK izinli kume.

export const FIXED_PHRASES = [
  { key: 'family', label: 'a family', text: 'a family' },
  { key: 'family_members', label: 'family members', text: 'family members' },
  { key: 'date', label: 'a date', text: 'a date' },
  { key: 'wife', label: 'a wife', text: 'a wife' },
  { key: 'husband', label: 'a husband', text: 'a husband' },
  { key: 'valentine', label: 'a valentine', text: 'a valentine' },
  { key: 'friend', label: 'a friend', text: 'a friend' },
  { key: 'friends', label: 'friends', text: 'friends' },
  { key: 'boyfriend', label: 'a boyfriend', text: 'a boyfriend' },
  { key: 'boyfriends', label: 'boyfriends', text: 'boyfriends' },
  { key: 'girlfriend', label: 'a girlfriend', text: 'a girlfriend' },
  { key: 'girlfriends', label: 'girlfriends', text: 'girlfriends' },
  { key: 'poker', label: 'Casino poker players', text: 'Casino poker players' },
  { key: 'arm_wrestling', label: 'an Arm Wrestling opponent', text: 'an Arm Wrestling opponent' },
];

// ---------------------------------------------------------------------------
// ISIM BUYUK/KUCUK HARF KURALI
// ---------------------------------------------------------------------------
// Politika: "Use capitalization on the first letter of each name."
function titleCaseName(name) {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

// ---------------------------------------------------------------------------
// TAM ILAN URETIMI
// ---------------------------------------------------------------------------
// state:
//   mode: 'fixed' | 'person'
//   phraseKey: FIXED_PHRASES icin key (mode='fixed' ise)
//   firstName, lastName: string (mode='person' ise)
//   isClassifiedPerson: bool (Devlet lideri/yardimcisi VE LI mails leader-list'te
//     KAYITLI DEGIL ise true — bu durumda ilan degil, RED nedeni uretilir)

export function buildDatingAd(state) {
  const { mode, phraseKey, firstName, lastName, isClassifiedPerson } = state;

  if (isClassifiedPerson) {
    // Politika (IMPORTANT not): "You cannot search for classified person."
    return { text: '', error: 'You cannot search for classified person. (This ad must be rejected — state leader/deputy not on the LI mails leader-list.)' };
  }

  if (mode === 'fixed') {
    const phrase = FIXED_PHRASES.find(p => p.key === phraseKey);
    if (!phrase) return { text: '', error: 'Please select a phrase.' };
    return { text: `Looking for ${phrase.text}.`, error: null };
  }

  if (mode === 'person') {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!first || !last) {
      // Politika reject-reasons listesi: "Please mention the Full Name."
      return { text: '', error: 'Please mention the Full Name.' };
    }
    return { text: `Looking for ${titleCaseName(first)} ${titleCaseName(last)}.`, error: null };
  }

  return { text: '', error: 'Invalid mode.' };
}
