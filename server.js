const express=require('express');
const cors=require('cors');
const crypto=require('crypto');
const path=require('path');
const app=express();
const PORT=process.env.PORT||3000;
const API=process.env.MOCKAPI_URL||'https://6ac401c0ae53bf25b80f317c.mockapi.io';
const ADMIN_USER=process.env.ADMIN_USER||'admin';
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'bamba-admin-2026';
const SECRET=process.env.ADMIN_SECRET||'local-bamba-secret';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function token(user){const body=Buffer.from(JSON.stringify({user,exp:Date.now()+8*60*60*1000})).toString('base64url');const sig=crypto.createHmac('sha256',SECRET).update(body).digest('base64url');return `${body}.${sig}`}
function session(req){
  const m=(req.headers.cookie||'').match(/(?:^|;\s*)bamba_admin=([^;]+)/);if(!m)return null;
  try{const [body,sig]=decodeURIComponent(m[1]).split('.');const exp=crypto.createHmac('sha256',SECRET).update(body).digest('base64url');if(sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return null;const p=JSON.parse(Buffer.from(body,'base64url').toString());return p.exp>Date.now()?p:null}catch{return null}
}
function cookie(res,value,maxAge){res.setHeader('Set-Cookie',`bamba_admin=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`)}
function guard(req,res,next){if(!session(req))return res.status(401).json({error:'Unauthorized'});next()}

app.get('/api/auth',(req,res)=>{const s=session(req);res.json({authenticated:!!s,user:s?.user||null})});
app.post('/api/auth',(req,res)=>{if(req.body?.logout){cookie(res,'',0);return res.json({ok:true})}if(req.body?.username!==ADMIN_USER||req.body?.password!==ADMIN_PASSWORD)return res.status(401).json({error:'არასწორი მომხმარებელი ან პაროლი'});cookie(res,token(req.body.username),8*60*60);res.json({ok:true})});

app.get('/api/menu',async(req,res)=>{try{const r=await fetch(`${API}/menu`);res.status(r.status).json(await r.json())}catch{res.status(502).json({error:'Menu unavailable'})}});
app.all('/api/admin/menu',guard,async(req,res)=>{
  const id=req.query.id;const url=id?`${API}/menu/${encodeURIComponent(id)}`:`${API}/menu`;
  try{const opts={method:req.method,headers:{'Content-Type':'application/json'}};if(['POST','PUT','PATCH'].includes(req.method))opts.body=JSON.stringify(req.body||{});const r=await fetch(url,opts);res.status(r.status).send(await r.text())}catch{res.status(502).json({error:'API unavailable'})}
});
app.all('/api/messages',async(req,res)=>{
  if(req.method==='GET'&&!session(req))return res.status(401).json({error:'Unauthorized'});
  try{const r=await fetch(`${API}/messages`,{method:req.method,headers:{'Content-Type':'application/json'},body:req.method==='POST'?JSON.stringify(req.body||{}):undefined});res.status(r.status).send(await r.text())}catch{res.status(502).json({error:'Messages unavailable'})}
});
app.listen(PORT,()=>console.log(`Bamba: http://localhost:${PORT}`));
