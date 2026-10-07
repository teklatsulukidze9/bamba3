const $ = s => document.querySelector(s);
const API = '/api';

async function secure(path, options = {}) {
  const r = await fetch(path, {
    credentials: 'same-origin',
    ...options
  });

  if (r.status === 401) {
    location.replace('admin-login.html');
    throw new Error('Unauthorized');
  }

  return r;
}

let all = [];

async function loadMenu() {
  const box = $('#adminMenuList');

  try {
    const r = await secure(`${API}/admin/menu`);
    all = await r.json();

    updateStats();
    render(all);
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      box.innerHTML =
        '<div class="empty-state">⚠️ მენიუს ჩატვირთვა ვერ მოხერხდა.</div>';
    }
  }
}

function updateStats() {
  $('#menuCount').textContent = all.length;

  const prices = all
    .map(x => Number(x.p))
    .filter(Number.isFinite);

  $('#averagePrice').textContent =
    `${prices.length
      ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
      : '0.00'} ₾`;
}

function render(data) {
  const box = $('#adminMenuList');

  if (!data.length) {
    box.innerHTML =
      '<div class="empty-state">🍽️ მენიუ ცარიელია.</div>';
    return;
  }

  box.innerHTML = data.map(x => `
    <article class="admin-menu-item">

      <img
        src="${x.img || ''}"
        alt="${x.n || ''}"
        onerror="this.style.display='none'"
      >

      <div class="dish-details">

        <label>ქართული სახელი</label>
        <input
          id="n-${x.id}"
          value="${escapeHtml(x.n || '')}"
        >

        <label>English name</label>
        <input
          id="e-${x.id}"
          value="${escapeHtml(x.e || '')}"
        >

        <label>კატეგორია</label>
        <select id="c-${x.id}">
          <option value="burger" ${x.c === 'burger' ? 'selected' : ''}>🍔 ბურგერები</option>
          <option value="pizza" ${x.c === 'pizza' ? 'selected' : ''}>🍕 პიცა</option>
          <option value="khachapuri" ${x.c === 'khachapuri' ? 'selected' : ''}>🧀 ხაჭაპური და ცომეული</option>
          <option value="drinks" ${x.c === 'drinks' ? 'selected' : ''}>🥤 სასმელები</option>
          <option value="dessert" ${x.c === 'dessert' ? 'selected' : ''}>🍰 დესერტი</option>
        </select>

        <label>ინგრედიენტები / აღწერა</label>
        <textarea id="i-${x.id}">${escapeHtml(x.i || '')}</textarea>

        <label>ფოტოს URL</label>
        <input
          id="img-${x.id}"
          value="${escapeHtml(x.img || '')}"
        >

        <label>სიცხარე</label>
        <select id="h-${x.id}">
          <option value="" ${x.h == null ? 'selected' : ''}>არაცხარე</option>
          <option value="1" ${Number(x.h) === 1 ? 'selected' : ''}>🌶 ნაკლებად ცხარე</option>
          <option value="2" ${Number(x.h) === 2 ? 'selected' : ''}>🌶🌶 საშუალო</option>
          <option value="3" ${Number(x.h) === 3 ? 'selected' : ''}>🌶🌶🌶 ცხარე</option>
        </select>

        <label>ფასი</label>
        <input
          id="p-${x.id}"
          type="number"
          min="0"
          step="0.5"
          value="${Number(x.p) || 0}"
        >

      </div>

      <div class="dish-actions">
        <button
          class="save-btn"
          onclick="saveDish('${x.id}')"
        >
          💾 შენახვა
        </button>

        <button
          class="delete-btn"
          onclick="deleteDish('${x.id}')"
        >
          🗑️ წაშლა
        </button>
      </div>

    </article>
  `).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.saveDish = async id => {
  const price = Number($(`#p-${id}`).value);

  if (!Number.isFinite(price) || price < 0) {
    alert('შეიყვანე სწორი ფასი.');
    return;
  }

  const data = {
    n: $(`#n-${id}`).value.trim(),
    e: $(`#e-${id}`).value.trim(),
    c: $(`#c-${id}`).value,
    p: price,
    i: $(`#i-${id}`).value.trim(),
    img: $(`#img-${id}`).value.trim()
  };

  const heat = $(`#h-${id}`).value;

  if (heat !== '') {
    data.h = Number(heat);
  }

  try {
    const r = await secure(
      `${API}/admin/menu?id=${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    if (!r.ok) {
      throw new Error('Update failed');
    }

    await loadMenu();
    alert('✅ კერძი განახლდა.');
  } catch {
    alert('❌ კერძის განახლება ვერ მოხერხდა.');
  }
};

window.deleteDish = async id => {
  if (!confirm('ნამდვილად გსურს ამ კერძის წაშლა?')) {
    return;
  }

  try {
    const r = await secure(
      `${API}/admin/menu?id=${encodeURIComponent(id)}`,
      {
        method: 'DELETE'
      }
    );

    if (!r.ok) {
      throw new Error('Delete failed');
    }

    await loadMenu();
  } catch {
    alert('❌ წაშლა ვერ მოხერხდა.');
  }
};

$('#menuSearch').oninput = e => {
  const q = e.target.value.toLowerCase().trim();

  render(
    all.filter(x =>
      `${x.n || ''} ${x.e || ''} ${x.c || ''} ${x.i || ''}`
        .toLowerCase()
        .includes(q)
    )
  );
};

$('#addDishForm').onsubmit = async e => {
  e.preventDefault();

  const button = e.target.querySelector('button');
  button.disabled = true;

  const data = {
    n: $('#dishName').value.trim(),
    e: $('#dishEng').value.trim(),
    c: $('#dishCat').value,
    p: Number($('#dishPrice').value),
    img: $('#dishImg').value.trim(),
    i: $('#dishIngredients').value.trim()
  };

  try {
    const r = await secure(
      `${API}/admin/menu`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    if (!r.ok) {
      throw new Error('Add failed');
    }

    e.target.reset();

    await loadMenu();

    alert('✅ კერძი დაემატა.');
  } catch {
    alert('❌ კერძის დამატება ვერ მოხერხდა.');
  } finally {
    button.disabled = false;
  }
};

loadMenu();

if (typeof loadMessages === 'function') {
  loadMessages();
}