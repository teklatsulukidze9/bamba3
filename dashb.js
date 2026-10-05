const $=s=>document.querySelector(s);
const API='/api';
async function secure(path,options={}){
  const r=await fetch(path,{credentials:'same-origin',...options});
  if(r.status===401){location.replace('admin-login.html');throw new Error('Unauthorized')}
  return r;
}
let all=[];
async function loadMenu(){
  const box=$('#adminMenuList');
  try{
    const r=await secure(`${API}/admin/menu`);
    all=await r.json();updateStats();render(all);
  }catch(e){if(e.message!=='Unauthorized')box.innerHTML='<div class="empty-state">⚠️ მენიუს ჩატვირთვა ვერ მოხერხდა.</div>'}
}
function updateStats(){
  $('#menuCount').textContent=all.length;
  const prices=all.map(x=>Number(x.p)).filter(Number.isFinite);
  $('#averagePrice').textContent=`${prices.length?(prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(2):'0.00'} ₾`;
}
function render(data){
  const box=$('#adminMenuList');
  if(!data.length){box.innerHTML='<div class="empty-state">🍽️ მენიუ ცარიელია.</div>';return}
  box.innerHTML=data.map(x=>`<article class="admin-menu-item"><img src="${x.img||''}" alt="${x.n||''}" onerror="this.style.display='none'"><div class="dish-details"><small>${x.c||'კერძი'}</small><h3>${x.n||'უსახელო'}</h3><p>${x.i||''}</p></div><div class="dish-actions"><label>ფასი</label><input id="price-${x.id}" type="number" min="0" step=".5" value="${x.p||0}"><button class="save-btn" onclick="updatePrice('${x.id}')">შენახვა</button><button class="delete-btn" onclick="deleteDish('${x.id}')">წაშლა</button></div></article>`).join('');
}
$('#menuSearch').oninput=e=>{const q=e.target.value.toLowerCase();render(all.filter(x=>`${x.n} ${x.e} ${x.c}`.toLowerCase().includes(q)))};
$('#addDishForm').onsubmit=async e=>{
  e.preventDefault();
  const b=e.target.querySelector('button');b.disabled=true;
  try{
    const r=await secure(`${API}/admin/menu`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({n:$('#dishName').value.trim(),e:$('#dishEng').value.trim(),c:$('#dishCat').value,p:Number($('#dishPrice').value),img:$('#dishImg').value.trim(),i:$('#dishIngredients').value.trim()})});
    if(!r.ok)throw 0;e.target.reset();await loadMenu();alert('კერძი დაემატა.');
  }catch{alert('კერძის დამატება ვერ მოხერხდა.')}finally{b.disabled=false}
};
window.updatePrice=async id=>{
  const p=Number($(`#price-${id}`).value);
  if(!Number.isFinite(p)||p<0)return alert('შეიყვანე სწორი ფასი.');
  const r=await secure(`${API}/admin/menu?id=${encodeURIComponent(id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({p})});
  if(r.ok){await loadMenu();alert('ფასი განახლდა.')}else alert('ფასის შეცვლა ვერ მოხერხდა.');
};
window.deleteDish=async id=>{
  if(!confirm('ნამდვილად გსურს კერძის წაშლა?'))return;
  const r=await secure(`${API}/admin/menu?id=${encodeURIComponent(id)}`,{method:'DELETE'});
  if(r.ok)loadMenu();else alert('წაშლა ვერ მოხერხდა.');
};
async function loadMessages(){
  try{
    const r=await secure(`${API}/messages`),data=await r.json();
    $('#messageCount').textContent=data.length;$('#messageBadge').textContent=data.length;
    $('#adminMessages').innerHTML=data.length?data.map(m=>`<div class="message-card"><strong>${m.name||'მომხმარებელი'}</strong><small>${m.email||''}</small><p>${m.message||''}</p></div>`).join(''):'<div class="empty-state">📭 შეტყობინებები ჯერ არ არის.</div>';
  }catch(e){}
}
$('#logoutBtn').onclick=async()=>{await fetch(`${API}/auth`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({logout:true})});location.replace('admin-login.html')};
const t=$('#themeToggle');t.onclick=()=>{const d=document.body.classList.toggle('dark');localStorage.setItem('theme',d?'dark':'light');t.textContent=d?'☀️':'🌙'};if(localStorage.getItem('theme')==='dark'){document.body.classList.add('dark');t.textContent='☀️'}
$('#burgerBtn').onclick=()=>$('#navMenu').classList.toggle('open');
loadMenu();loadMessages();
