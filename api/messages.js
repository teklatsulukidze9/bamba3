const API=process.env.MOCKAPI_URL||'https://6ac401c0ae53bf25b80f317c.mockapi.io';
const crypto=require('crypto');
function session(req){
  const raw=req.headers.cookie||'',m=raw.match(/(?:^|;\s*)bamba_admin=([^;]+)/);
  if(!m)return null;
  try{
    const [body,sig]=decodeURIComponent(m[1]).split('.');
    const exp=crypto.createHmac('sha256',process.env.ADMIN_SECRET).update(body).digest('base64url');
    if(sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp)))return null;
    const p=JSON.parse(Buffer.from(body,'base64url').toString());
    return p.exp>Date.now()?p:null;
  }catch{return null}
}
module.exports=async(req,res)=>{
  if(req.method==='POST'){
    try{
      const r=await fetch(`${API}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(req.body||{})});
      return res.status(r.status).json(await r.json());
    }catch{return res.status(502).json({error:'Message unavailable'})}
  }
  if(req.method==='GET'){
    if(!process.env.ADMIN_SECRET)return res.status(500).json({error:'Admin environment is not configured'});if(!session(req))return res.status(401).json({error:'Unauthorized'});
    try{
      const r=await fetch(`${API}/messages`);
      return res.status(r.status).json(await r.json());
    }catch{return res.status(502).json({error:'Messages unavailable'})}
  }
  res.status(405).json({error:'Method not allowed'});
};
