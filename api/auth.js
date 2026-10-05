const crypto=require('crypto');
const secret=()=>process.env.ADMIN_SECRET;
const user=()=>process.env.ADMIN_USER;
const pass=()=>process.env.ADMIN_PASSWORD;

function sign(payload){
  const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig=crypto.createHmac('sha256',secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function read(req){
  const raw=req.headers.cookie||'';
  const match=raw.match(/(?:^|;\s*)bamba_admin=([^;]+)/);
  if(!match)return null;
  const [body,sig]=decodeURIComponent(match[1]).split('.');
  if(!body||!sig)return null;
  const expected=crypto.createHmac('sha256',secret()).update(body).digest('base64url');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
  try{
    const p=JSON.parse(Buffer.from(body,'base64url').toString());
    return p.exp>Date.now()?p:null;
  }catch{return null}
}
function set(res,value,maxAge){
  res.setHeader('Set-Cookie',`bamba_admin=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`);
}
module.exports=async(req,res)=>{
  if(!process.env.ADMIN_USER||!process.env.ADMIN_PASSWORD||!process.env.ADMIN_SECRET)return res.status(500).json({error:'Admin environment is not configured'});
  if(req.method==='GET'){
    const session=read(req);
    return res.status(200).json({authenticated:!!session,user:session?.user||null});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(req.body?.logout){set(res,'',0);return res.status(200).json({ok:true});}
  const {username,password}=req.body||{};
  if(username!==user()||password!==pass())return res.status(401).json({error:'არასწორი მომხმარებელი ან პაროლი'});
  set(res,sign({user:username,exp:Date.now()+8*60*60*1000}),8*60*60);
  res.status(200).json({ok:true});
};
