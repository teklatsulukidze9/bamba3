const $=s=>document.querySelector(s);
const API='/api';
const HEAT=['არაცხარე','🌶 ნაკლებად ცხარე','🌶🌶 საშუალო','🌶🌶🌶 ცხარე'];
const ICON={burger:'🍔',pizza:'🍕',khachapuri:'🧀',drinks:'🥂',dessert:'🍰'};
const bcart=()=>JSON.parse(localStorage.getItem('bcart')||'{}');
const saveB=c=>localStorage.setItem('bcart',JSON.stringify(c));
const bfav=()=>JSON.parse(localStorage.getItem('bfav')||'[]');
const saveFav=f=>localStorage.setItem('bfav',JSON.stringify(f));
let MENU=typeof BMENU!=='undefined'?BMENU:[];

async function loadMenu(){
  try{
    const r=await fetch(`${API}/menu`);
    const data=await r.json();
    const valid=Array.isArray(data)?data.filter(x=>x&&x.n&&!/^n\s*\d+$/i.test(x.n)).map(x=>({...x,id:x.id||x.menu})): [];
    if(valid.length)MENU=valid;
  }catch{}
}
function updateCounts(){
  const c=bcart(),n=Object.values(c).reduce((a,b)=>a+b,0);
  if($('#cartCount'))$('#cartCount').textContent=n;
  if($('#favCount'))$('#favCount').textContent=bfav().length;
}
function card(d){
  const fav=bfav().includes(Number(d.id));
  return `<article class="card"><div class="card-img-wrap"><button class="fav-btn" data-fav="${d.id}">${fav?'♥':'♡'}</button>${d.img?`<img src="${d.img}" alt="${d.n}" loading="lazy" onerror="this.style.display='none'">`:`<div class="food-placeholder">${ICON[d.c]||'🍽️'}</div>`}</div><div class="card-content"><span class="card-cat">${ICON[d.c]||'🍽️'} ${d.c||'კერძი'}</span><h3>${d.n}</h3><small>${d.e||''}</small>${d.h?`<div class="heat">${HEAT[Number(d.h)]||''}</div>`:''}<p>${d.i||''}</p><div class="card-bottom"><strong>${Number(d.p).toFixed(2)} ₾</strong><button class="btn-main" data-b="${d.id}">კალათაში</button></div></div></article>`;
}
async function initBamba(){
  await loadMenu();
  const grid=$('#menuGrid')||$('#bgrid');
  if(!grid)return;
  let cat='';
  if($('#bcats')){
    const cats=typeof BCATS!=='undefined'?BCATS:{burger:'🍔 ბურგერები',pizza:'🍕 პიცა',khachapuri:'🧀 ხაჭაპური',drinks:'🥂 სასმელები',dessert:'🍰 დესერტი'};
    $('#bcats').innerHTML=`<button class="filter-btn active" data-c="">ყველა</button>${Object.entries(cats).map(([k,v])=>`<button class="filter-btn" data-c="${k}">${v}</button>`).join('')}`;
  }
  const draw=()=>{
    const q=($('#q')?.value||'').toLowerCase().trim();
    const h=$('#bh')?.value||'';
    let list=MENU.filter(d=>(!cat||d.c===cat)&&(`${d.n} ${d.e||''} ${d.i||''}`).toLowerCase().includes(q));
    if(h)list=list.filter(d=>String(d.h||'')===h);
    if(grid.id==='bgrid')list=list.slice(0,8);
    grid.innerHTML=list.length?list.map(card).join(''):'<div class="empty-state">🍽️<h3>კერძი ვერ მოიძებნა</h3><p>სცადე სხვა ძებნა ან კატეგორია.</p></div>';
  };
  $('#bcats')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-c]');
    if(!b)return;
    cat=b.dataset.c;
    $('#bcats').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
    draw();
  });
  ['q','bh','bn','bv'].forEach(id=>$('#'+id)?.addEventListener('input',draw));
  grid.addEventListener('click',e=>{
    const add=e.target.closest('[data-b]');
    const fav=e.target.closest('[data-fav]');
    if(add){
      const c=bcart(),id=String(add.dataset.b);c[id]=(c[id]||0)+1;saveB(c);updateCounts();
      add.textContent='✓ დამატებულია';setTimeout(()=>add.textContent='კალათაში',900);
    }
    if(fav){
      const id=Number(fav.dataset.fav),f=bfav(),next=f.includes(id)?f.filter(x=>x!==id):[...f,id];
      saveFav(next);updateCounts();draw();
    }
  });
  draw();
}
async function initCart(){
  await loadMenu();
  const box=$('#bcart');if(!box)return;
  const draw=()=>{
    const c=bcart(),items=Object.keys(c).map(id=>({d:MENU.find(x=>String(x.id)===id),id})).filter(x=>x.d);
    box.innerHTML=items.length?items.map(({d,id})=>`<div class="cart-item"><img src="${d.img||''}" alt="${d.n}"><div class="cart-info"><h3>${d.n}</h3><span>${Number(d.p).toFixed(2)} ₾</span></div><div class="qty"><button data-id="${id}" data-q="-1">−</button><b>${c[id]}</b><button data-id="${id}" data-q="1">+</button></div><strong>${(d.p*c[id]).toFixed(2)} ₾</strong><button class="remove-btn" data-id="${id}" data-q="del">×</button></div>`).join(''):'<div class="empty-state">🛒<h3>კალათა ცარიელია</h3><a class="btn-main" href="menu.html">მენიუს ნახვა</a></div>';
    if($('#btotal'))$('#btotal').textContent=items.reduce((s,x)=>s+x.d.p*c[x.id],0).toFixed(2);
  };
  box.onclick=e=>{
    const b=e.target.closest('[data-id]');if(!b)return;
    const c=bcart(),id=b.dataset.id,n=b.dataset.q==='del'?0:(c[id]||0)+Number(b.dataset.q);
    if(n<1)delete c[id];else c[id]=n;saveB(c);updateCounts();draw();
  };
  draw();
}
async function initFav(){
  await loadMenu();
  const grid=$('#favGrid');if(!grid)return;
  const draw=()=>{
    const list=MENU.filter(x=>bfav().includes(Number(x.id)));
    grid.innerHTML=list.length?list.map(card).join(''):'<div class="empty-state">♡<h3>ფავორიტები ცარიელია</h3><a class="btn-main" href="menu.html">კერძების ნახვა</a></div>';
  };
  grid.addEventListener('click',e=>{
    const b=e.target.closest('[data-fav]');if(!b)return;
    saveFav(bfav().filter(x=>x!==Number(b.dataset.fav)));updateCounts();draw();
  });
  draw();
}

window.handleCheckout = () => {
  const c = bcart();

  if (!Object.keys(c).length) {
    alert('კალათა ცარიელია.');
    return;
  }
const user = JSON.parse(
  localStorage.getItem('customer') || 'null'
);

  if (!user) {
    const goLogin = confirm(
      'შეკვეთის გასაკეთებლად საჭიროა ავტორიზაცია.\n\nგსურთ შესვლის გვერდზე გადასვლა?'
    );

    if (goLogin) {
      window.location.href = 'auth.html';
    }

    return;
  }

  const oldModal = document.getElementById('checkoutModal');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'checkoutModal';

  modal.innerHTML = `
    <div class="checkout-overlay">
      <div class="checkout-box">
        <button class="checkout-close" id="checkoutClose">×</button>

        <div class="section-head left">
          <span>CHECKOUT</span>
          <h2>შეკვეთის გაფორმება</h2>
        </div>

        <form id="checkoutForm">
          <div class="checkout-field">
            <label for="checkoutFirstName">სახელი *</label>
            <input
              type="text"
              id="checkoutFirstName"
              name="firstName"
              placeholder="შეიყვანე სახელი"
              autocomplete="given-name"
              required
            >
          </div>

          <div class="checkout-field">
            <label for="checkoutLastName">გვარი *</label>
            <input
              type="text"
              id="checkoutLastName"
              name="lastName"
              placeholder="შეიყვანე გვარი"
              autocomplete="family-name"
              required
            >
          </div>

          <div class="checkout-field">
            <label for="checkoutPhone">ტელეფონის ნომერი *</label>
            <input
              type="tel"
              id="checkoutPhone"
              name="phone"
              placeholder="+995 5XX XX XX XX"
              autocomplete="tel"
              required
            >
          </div>

          <div class="checkout-field">
            <label for="checkoutEmail">ელფოსტა *</label>
            <input
              type="email"
              id="checkoutEmail"
              name="email"
              placeholder="example@email.com"
              autocomplete="email"
              required
            >
          </div>

          <div id="checkoutError" class="checkout-error"></div>

          <button type="submit" class="btn-main checkout-submit">
            შეკვეთის დადასტურება
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();

  document.getElementById('checkoutClose')?.addEventListener('click', close);

  modal.querySelector('.checkout-overlay')?.addEventListener('click', e => {
    if (e.target instanceof HTMLElement && e.target.classList.contains('checkout-overlay')) {
      close();
    }
  });

  document.getElementById('checkoutForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.target;
    const error = document.getElementById('checkoutError');

    if (!form || !error) return;

    const firstName = String(form.firstName?.value || '').trim();
    const lastName = String(form.lastName?.value || '').trim();
    const phone = String(form.phone?.value || '').trim();
    const email = String(form.email?.value || '').trim();

    error.textContent = '';

    if (!firstName || !lastName || !phone || !email) {
      error.textContent = 'გთხოვ, შეავსე ყველა აუცილებელი ველი.';
      return;
    }

    if (firstName.length < 2 || lastName.length < 2) {
      error.textContent = 'სახელი და გვარი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს.';
      return;
    }

    const phoneRegex = /^\+?[0-9\s()-]{9,20}$/;

    if (!phoneRegex.test(phone)) {
      error.textContent = 'გთხოვ, შეიყვანე სწორი ტელეფონის ნომერი.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      error.textContent = 'გთხოვ, შეიყვანე სწორი ელფოსტის მისამართი.';
      return;
    }

    const submit = form.querySelector('button[type="submit"]');

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'იგზავნება...';
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    localStorage.removeItem('bcart');
    updateCounts();
    modal.remove();

    alert(
      `შეკვეთა წარმატებით გაიგზავნა! 🎉\n\n` +
        `${firstName} ${lastName}, გმადლობთ შეკვეთისთვის.`
    );

    initCart();
  });
};
document.addEventListener('DOMContentLoaded', () => {
  updateCounts();
  initBamba();
  initCart();
  initFav();
  const f = document.querySelector('footer .container');
  if (f) f.insertAdjacentHTML('beforeend', '<p><a href="admin-login.html" style="text-decoration:underline">Admin Dashboard</a></p>');
});
