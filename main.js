// main.js
import { buildItemsClothesAd } from './en3-rules/items-clothes-rules.js';
import { itemList } from './item-list.js';
let adType = "";
let itemCount = 0;
let adCount = parseInt(localStorage.getItem('adCount')) || 0;

document.querySelectorAll('.ad-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ad-type-btn').forEach(b => b.classList.remove('active-btn'));
    btn.classList.add('active-btn');
    adType = btn.dataset.type;
  });
});

document.getElementById('addItemBtn').addEventListener('click', createItemSection);
document.getElementById('removeItemBtn').addEventListener('click', removeItemSection);

window.onload = () => {
  createItemSection();
  document.getElementById('adCounter').innerText = `Created Ads: ${adCount}`;
};

function createItemSection() {
  if (itemCount >= 3) return;
  itemCount++;
  const container = document.createElement('div');
  container.className = "bg-[#1c1c1c] border border-[#333] p-4 rounded-lg space-y-2 item-section";
  container.innerHTML = `
        <label><input type="number" min="1" class="item-quantity w-20 px-1 py-1 rounded bg-gray-800 text-white" placeholder="Qty"></label>
        <select placeholder="Select item..." class="item-select w-full"></select>
        <div class="flex gap-3 flex-wrap">
        <label><input type="checkbox" class="plural-toggle"> Plural</label>
        <label><input type="checkbox" class="article-toggle"> a/an</label>
        <label class="bg-yellow-900/40 px-2 py-1 rounded"><input type="checkbox" class="luminous-toggle"> Luminous</label>
        <select class="color-select bg-gray-800 text-white">
        <option value="">Color</option>
        <option>white</option>
        <option>black</option>
        <option>red</option>
        <option>yellow</option>
        <option>blue</option>
        <option>green</option>
        <option>purple</option>
        <option>pink</option>
        <option>brown</option>
        <option>grey</option>
        <option>orange</option>
      </select>
      <select class="type-select bg-gray-800 text-white">
        <option value="">Type</option>
        ${Array.from({ length: 40 }, (_, i) => `<option value="${i + 1}">Type ${i + 1}</option>`).join('')}
      </select>
      <label><input type="checkbox" class="for-men"> For Men</label>
      <label><input type="checkbox" class="for-women"> For Women</label>
      <label><input type="checkbox" class="in-bulk"> In Bulk</label>
      <label><input type="checkbox" class="each"> Each</label>
      <label><input type="checkbox" class="respectively-toggle"> Respectively</label>
    </div>
  `;

  document.getElementById('itemsContainer').appendChild(container);
  new TomSelect(container.querySelector('.item-select'), {
    create: false,
    sortField: 'text',
    options: itemList.map(item => ({ value: item, text: item }))
  });
}

function removeItemSection() {
  const container = document.getElementById('itemsContainer');
  const lastItem = container.querySelector('.item-section:last-child');
  if (lastItem) {
    container.removeChild(lastItem);
    itemCount--;
  }
}

window.generateAd = function () {
  const warning = document.getElementById('warningMsg');
  warning.classList.add('hidden');

  if (!adType) {
    warning.innerText = "Please select what you want to do (e.g. Buying, Selling, Trading) before generating an ad.";
    warning.classList.remove('hidden');
    return;
  }

  const priceRaw = document.getElementById('priceInput').value.trim();

  const items = [];
  let anyEach = false;
  let anyRespectively = false;

  document.querySelectorAll('#itemsContainer > div').forEach(section => {
    const name = section.querySelector('.item-select').value;
    if (!name) return; // bos secim varsa atla
    const quantity = parseInt(section.querySelector('.item-quantity')?.value) || 0;
    const plural = section.querySelector('.plural-toggle').checked;
    const article = section.querySelector('.article-toggle').checked;
    const color = section.querySelector('.color-select').value;
    const luminous = section.querySelector('.luminous-toggle').checked;
    const type = section.querySelector('.type-select').value;
    const men = section.querySelector('.for-men').checked;
    const women = section.querySelector('.for-women').checked;
    const bulk = section.querySelector('.in-bulk').checked;
    const each = section.querySelector('.each').checked;
    const respectively = section.querySelector('.respectively-toggle')?.checked || false;

    if (each) anyEach = true;
    if (respectively) anyRespectively = true;

    items.push({ name, quantity, plural, article, color, luminous, type, men, women, bulk });
  });

  if (items.length === 0) {
    warning.innerText = "Lutfen en az bir esya secin.";
    warning.classList.remove('hidden');
    return;
  }

  const { text, error } = buildItemsClothesAd({
    adType, items, priceRaw, each: anyEach, respectively: anyRespectively,
  });

  if (error) {
    warning.innerText = error;
    warning.classList.remove('hidden');
    return;
  }

  document.getElementById('output').innerText = text;
  adCount++;
  document.getElementById('adCounter').innerText = `Created Ads: ${adCount}`;
  localStorage.setItem('adCount', adCount);
};


window.copyAd = function () {
  const text = document.getElementById('output').innerText;
  if (!text || text === "Ready to post ad will appear here...") {
    showToast("⚠️ Nothing to copy!", "bg-yellow-600");
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    document.getElementById('output').innerText = "Ready to post ad will appear here...";
    document.getElementById('priceInput').value = "";
    document.getElementById('itemsContainer').innerHTML = "";
    itemCount = 0;
    createItemSection();
    document.querySelectorAll('.ad-type-btn').forEach(b => b.classList.remove('active-btn'));
    adType = "";
    showToast("✅ Copied! Ad cleared.", "bg-green-600");
  }).catch(err => {
    showToast("❌ Failed to copy!", "bg-red-600");
    console.error(err);
  });
};

function showToast(message, colorClass) {
  const toast = document.getElementById("toast");
  toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded-xl shadow-lg ${colorClass}`;
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3000);
}
