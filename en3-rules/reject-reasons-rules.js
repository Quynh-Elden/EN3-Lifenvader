// reject-reasons-rules.js
// EN3 "Common Rejection Reasons" listesi — BIREBIR PDF'ten.
// Bazi maddelerin ek talimati var (ekran goruntusu alip belirli bir kanala
// postalama gibi) — bunlar "note" alaninda ayrica tutuluyor.

export const REJECT_REASONS = [
  { text: 'Cannot advertise more than 1 vehicle at a time.' },
  { text: 'Cannot advertise more than 3 items at a time.' },
  {
    text: 'Cannot promote illegal items.',
    note: 'You must take a proper screenshot of that ad and post it in #📱|phone-blacklist.',
  },
  { text: 'Improper advertisement.' },
  { text: 'Template not found. Contact LI to create a template.' },
  { text: 'Please mention the Full Name.' },
  { text: 'Person not found in database. (Person must be in the GRAND RP mail)' },
  {
    text: 'You cannot look for classified people.',
    note: 'State organization Leaders and Deputy Leaders only — only if their name is mentioned in the #🧾|leader-list in LI mails.',
  },
  { text: 'Item not found in database. (Including Grand Coins and Battlepass)' },
  { text: 'Insufficient information for the item name.' },
  { text: 'Insufficient information for the vehicle name.' },
  { text: 'Please indicate the rental period.' },
  { text: 'LI cloud server not loading or offline.', note: 'Only for PDA bug cases.' },
  {
    text: 'Trolling advertisements.',
    note: 'You must take a proper screenshot of that ad and post it in #📱|phone-blacklist.',
  },
  { text: 'Cannot advertise this vehicle as it is non-sellable.' },
  { text: 'A family cannot be traded.' },
  { text: 'Cannot look for a classified family.' },
  {
    text: 'We do not promote parties at any green grass location.',
    note: 'Example: "Party at the Beach Market." should not be promoted — label it as "Party at the Beach." instead (music is not allowed to be played in green grass areas).',
  },
];

export function getReasonByIndex(index) {
  return REJECT_REASONS[index] || null;
}
