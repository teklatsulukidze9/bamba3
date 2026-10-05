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
    const valid=Array.isArray(data)?data.filter(x=>x&&x.n&&!/^n\s*\d+$/i.test(x.n)): [];
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
window.handleCheckout=()=>{
  const c=bcart();
  if(!Object.keys(c).length)return alert('კალათა ცარიელია.');
  const name=prompt('შეიყვანე სახელი შეკვეთისთვის:');
  if(!name)return;
  alert(`გმადლობთ, ${name}! თქვენი შეკვეთა მიღებულია.`);
  localStorage.removeItem('bcart');updateCounts();initCart();
};
function common(){
  updateCounts();
  const t=$('#themeToggle');
  if(t){
    const dark=localStorage.getItem('theme')==='dark';
    document.body.classList.toggle('dark',dark);t.textContent=dark?'☀️':'🌙';
    t.onclick=()=>{const x=document.body.classList.toggle('dark');localStorage.setItem('theme',x?'dark':'light');t.textContent=x?'☀️':'🌙';};
  }
  const b=$('#burgerBtn'),n=$('#navMenu');
  b?.addEventListener('click',()=>n?.classList.toggle('open'));
}
document.addEventListener('DOMContentLoaded',()=>{
  common();
  if($('#menuGrid')||$('#bgrid'))initBamba();
  if($('#bcart'))initCart();
  if($('#favGrid'))initFav();
});
