const API=process.env.MOCKAPI_URL||'https://6ac401c0ae53bf25b80f317c.mockapi.io';
module.exports=async(req,res)=>{
  try{
    const r=await fetch(`${API}/menu`);
    const data=await r.json();
    res.status(r.status).json(data);
  }catch{res.status(502).json({error:'Menu unavailable'})}
};
