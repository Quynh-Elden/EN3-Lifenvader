export const priceFormat = (input, addEach = false) => {
  const lower = input.toLowerCase().trim();

  // Kullanıcı "negotiate", "negotiable" vb. yazarsa düzelt
  if (["negotiate", "negotiation", "negotiable"].includes(lower)) {
    return "Negotiable"; // Nokta kaldırıldı
  }

  const cleanInput = lower.replace(/\./g, '').replace(',', '.'); // 33.000 → 33000
  let num = parseFloat(cleanInput);

  // Billion kontrolü
  if (lower.includes("billion") || num >= 2000000000) {
    return "Negotiable"; // Nokta kaldırıldı
  }

  // Million formatı
  if (lower.includes("m")) {
    const millionValue = parseFloat(lower.replace('m', ''));
    // price artık nokta içermiyor
    const price = `$${millionValue} Million`; 
    return addEach ? `${price} each` : `${price}`;
  }

  // Noktalı decimal milyon (örnek: 25.55m → 25.55 Million)
  if (lower.match(/^\d+(\.\d+)?$/) && num >= 1 && num < 2000 && lower.includes('.')) {
    const price = `$${num} Million`;
    return addEach ? `${price} each` : `${price}`;
  }

  // K formatı → $X.000
  if (lower.includes("k")) {
    const kValue = parseFloat(lower.replace('k', '')) * 1000;
    const formatted = `$${kValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).replace(/,/g, '.')}`;
    return addEach ? `${formatted} each` : `${formatted}`;
  }

  // Düz sayı (örneğin sadece 35000 → $35.000)
  if (!isNaN(num)) {
    const formatted = `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).replace(/,/g, '.')}`;
    return addEach ? `${formatted} each` : `${formatted}`;
  }

  // Diğer durumlar
  return addEach ? `$${input} each` : `$${input}`;
};

export const getAdPrefix = (typeRaw) => {
  const [firstWord, ...rest] = typeRaw.split(" ");
  const type = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  return rest.length ? `${type} ${rest.map(w => w.toLowerCase()).join(" ")}` : type;
};

export const buildItemLabel = ({
  name,
  quantity,
  plural,
  article,
  color,
  type,
  men,
  women,
  bulk,
  each,
  respectively,
  price
}) => {
  let label = name;
  if (quantity && quantity > 0) {
  const formattedQty = quantity.toLocaleString('en-US').replace(/,/g, '.');
  label = `${formattedQty} ${label}`;
}
  if (plural) label = label.endsWith('y') ? label.slice(0, -1) + 'ies' : label + 's';
  if (article) label = /^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`;
  if (color) label = `${color} ${label}`;
  if (type) label += ` of ${type.toLowerCase()}`;
  if (men) label += ' for men';
  if (women) label += ' for women';
  if (bulk) label += ' in bulk';
  return label;
};

export const buildPriceText = (adType, priceRaw, addEach = false, respectively = false) => {
  const lowerType = adType.toLowerCase();

  // 1. Çoklu fiyatları parse et
  const rawParts = priceRaw
    .replace(/\s+and\s+/gi, ',')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  // 2. Her bir fiyatı formatla
  const formattedParts = rawParts.map(p => priceFormat(p, addEach));

  // 3. Tek fiyat / 2 fiyat / 3 fiyat durumu
  let formatted = "";
  if (formattedParts.length === 1) {
    formatted = formattedParts[0];
  } else if (formattedParts.length === 2) {
    formatted = `${formattedParts[0]} and ${formattedParts[1]}`;
  } else if (formattedParts.length === 3) {
    formatted = `${formattedParts[0]}, ${formattedParts[1]} and ${formattedParts[2]}`;
  }

  // 4. Prefix belirle (Price / Budget / Salary)
  let prefix = "";
  if (lowerType.includes("selling") || lowerType.includes("selling or trading")) {
    prefix = `Price: ${formatted}`;
  } else if (lowerType.includes("buying")) {
    prefix = `Budget: ${formatted}`;
  } else if (lowerType.includes("hiring") || lowerType.includes("looking for a job")) {
    prefix = `Salary: ${formatted}`;
  }

  // 5. Respectively varsa sona ekle ve nokta koy
  if (respectively) {
    prefix += " respectively.";
  } else {
    // 🚨 BURASI KALDIRILDI: Bu satır, çift nokta hatasına neden oluyordu.
    // prefix += "."; 
  }

  return prefix; // Örn: "Budget: $5 Million" veya "Price: $35.000" (Noktasız)
};


export const buildItemListText = (items, adType) => {
  const lowerType = adType.toLowerCase();
  if (items.length === 1) return items[0];
  if (items.length === 2) {
    return lowerType.includes('trading') ? `${items[0]} for ${items[1]}` : `${items[0]} and ${items[1]}`;
  }
  return `${items[0]}, ${items[1]} and ${items[2]}`;
};
