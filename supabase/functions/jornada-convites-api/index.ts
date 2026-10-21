// Jornada Diaconal — API independente para convite de acesso.
// Um e-mail transacional contém APENAS link de ativação; nunca a senha.
const BASE = Deno.env.get("SUPABASE_URL") || "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const MAIL_FROM = Deno.env.get("JDG_EMAIL_FROM") || "";
const EMAIL_READY = !!(RESEND_API_KEY && MAIL_FROM);
const SITE = "https://gustavolmarquesg4f-dotcom.github.io/jornada_diaconal";
const ORIGINS = new Set(["https://gustavolmarquesg4f-dotcom.github.io", "http://localhost:4200"]);

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function fail(status: number, message: string): never { throw new HttpError(status,message); }
function uuid(x: unknown): string {
  const v=String(x||"");
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v))
    fail(422,"Identificador inválido.");
  return v;
}
function token(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function hash(x:string):Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(x)))]
    .map(x=>x.toString(16).padStart(2,"0")).join("");
}
function cors(origin:string) {
  return {
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store, private",
    "X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer",
    "Access-Control-Allow-Origin":ORIGINS.has(origin)?origin:"null",
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"authorization,content-type,apikey,x-client-info",
    "Vary":"Origin"
  };
}
function reply(body:unknown,status:number,origin:string) {
  return new Response(JSON.stringify(body),{status,headers:cors(origin)});
}
async function bodyObject(req:Request):Promise<Record<string,unknown>>{
  let data:unknown;
  try {data=await req.json();}catch{fail(400,"Envie um JSON válido.");}
  if(!data||typeof data!=="object"||Array.isArray(data))fail(400,"Formato inválido.");
  return data as Record<string,unknown>;
}
async function db(path:string,method="GET",body?:unknown,prefer?:string):Promise<any>{
  const h:Record<string,string>={"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"};
  if(prefer)h["Prefer"]=prefer;
  const response=await fetch(BASE+"/rest/v1/"+path,{method,headers:h,
    body:body===undefined?undefined:JSON.stringify(body)});
  const raw=await response.text();
  let data:any=null;try{data=raw?JSON.parse(raw):null;}catch{data=null;}
  if(!response.ok){console.error("Convites: erro no banco",response.status,data?.code||"");
    fail(response.status===409?409:500,"Não foi possível concluir esta operação.");}
  return data;
}
async function admin(req:Request):Promise<any>{
  const auth=req.headers.get("authorization")||"";
  const match=/^Bearer ([a-f0-9]{64})$/i.exec(auth);
  if(!match)fail(401,"Acesso não autorizado.");
  const sessions=await db("jdg_sessions?token_hash=eq."+await hash(match[1])+
    "&expires_at=gt."+encodeURIComponent(new Date().toISOString())+
    "&select=user_id&limit=1");
  if(!sessions.length)fail(401,"Sessão expirada.");
  const users=await db("jdg_users?id=eq."+uuid(sessions[0].user_id)+
    "&active=eq.true&select=id,role,must_change_password&limit=1");
  if(!users.length||users[0].role!=="admin"||users[0].must_change_password)
    fail(403,"Apenas o administrador pode enviar convites.");
  return users[0];
}
function validText(x:unknown,min:number,max:number,label:string):string{
  const value=String(x??"").trim();
  if(value.length<min||value.length>max)fail(422,label+" deve ter de "+min+" a "+max+" caracteres.");
  return value;
}
function escapeHtml(s:string):string {
  return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
}
async function deliver(name:string,email:string,rawToken:string):Promise<boolean>{
  const activation=SITE+"/ativar-acesso.html#token="+rawToken;
  const safeName=escapeHtml(name);
  const html="<div style='font-family:Arial,sans-serif;line-height:1.7;color:#214033;max-width:560px'>"+
    "<h2>Jornada Diaconal — acesso à liderança</h2>"+
    "<p>Olá, "+safeName+".</p><p>Foi criado um acesso para você acompanhar o serviço e o cuidado dos diáconos.</p>"+
    "<p><a style='display:inline-block;background:#275b45;color:white;padding:12px 18px;border-radius:8px;text-decoration:none' href='"+activation+"'>Ativar meu acesso</a></p>"+
    "<p>O link só pode ser usado uma vez e expira em 24 horas. Você definirá uma senha pessoal de pelo menos 12 caracteres.</p>"+
    "<p>Se não solicitou o acesso, ignore esta mensagem e converse com a liderança.</p>"+
    "<hr><small>Igreja de Deus no Guará 1 — Ministério dos Diáconos</small></div>";
  const text="Olá, "+name+". Seu convite para a Jornada Diaconal: "+activation+
    "\n\nO link expira em 24 horas e pode ser usado apenas uma vez. "+
    "Você definirá sua própria senha. Se não reconhece o convite, ignore-o.";
  try {
    const result=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":"Bearer "+RESEND_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({from:MAIL_FROM,to:[email],
        subject:"Jornada Diaconal — ative seu acesso",html,text})
    });
    if(!result.ok){console.error("Convite: falha de entrega",result.status);return false;}
    return true;
  }catch{console.error("Convite: falha de conexão com provedor");return false;}
}
async function sendInvite(user:any):Promise<{sent:boolean;message:string}>{
  const existing=await db("jdg_user_invites?user_id=eq."+uuid(user.id)+
    "&used_at=is.null&select=id,sent_at,created_at&order=created_at.desc&limit=10");
  const recent=existing.find((x:any)=>x.sent_at&&Date.parse(x.sent_at)>Date.now()-10*60*1000);
  if(recent)fail(429,"Um convite já foi enviado. Aguarde 10 minutos para reenviar.");
  if(existing.length){
    await db("jdg_user_invites?user_id=eq."+uuid(user.id)+"&used_at=is.null","PATCH",
      {used_at:new Date().toISOString()},"return=minimal");
  }
  const raw=token();
  const newInvites=await db("jdg_user_invites","POST",{
    user_id:user.id,token_hash:await hash(raw),
    expires_at:new Date(Date.now()+24*60*60*1000).toISOString()
  },"return=representation");
  if(!newInvites?.length)fail(500,"Convite não confirmado no banco.");
  const sent=await deliver(user.name,user.email,raw);
  if(sent)await db("jdg_user_invites?id=eq."+uuid(newInvites[0].id),"PATCH",
    {sent_at:new Date().toISOString()},"return=minimal");
  return {sent,message:sent?"Convite enviado por e-mail. Validade: 24 horas.":
    "Acesso criado, mas o e-mail não foi entregue. Verifique o emissor e reenvie pelo painel."};
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin")||"";
  if(origin&&!ORIGINS.has(origin))return reply({error:"Origem não autorizada."},403,origin);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  const name=new URL(req.url).pathname;
  const path=name.includes("/jornada-convites-api")?
    name.slice(name.indexOf("/jornada-convites-api")+"/jornada-convites-api".length)||"/":name;
  if(req.method==="GET"&&path==="/health")
    return reply({ok:true,email_ready:EMAIL_READY},200,origin);
  try{
    if(!BASE||!KEY)fail(503,"Serviço de convites indisponível.");
    if(req.method==="POST"&&path==="/auth/activate"){
      const b=await bodyObject(req);
      const raw=String(b.token||""),password=String(b.password||"");
      if(!/^[a-f0-9]{64}$/i.test(raw)||password.length<12||password.length>128)
        fail(422,"Link inválido ou senha fora dos requisitos.");
      const completed=await db("rpc/jdg_complete_user_invite","POST",
        {p_token_hash:await hash(raw),p_password:password});
      if(completed!==true)fail(409,"Link expirado, já utilizado ou acesso indisponível.");
      return reply({ok:true},200,origin);
    }
    const current=await admin(req);
    if(!EMAIL_READY&&req.method==="POST")fail(503,"E-mail automático ainda não está configurado.");
    if(req.method==="GET"&&path==="/users/pending"){
      const users=await db("jdg_users?active=eq.true&must_change_password=eq.true&select=id&limit=1000");
      return reply({ids:users.map((u:any)=>u.id)},200,origin);
    }
    if(req.method==="POST"&&path==="/users/invite"){
      const b=await bodyObject(req);
      const name=validText(b.name,2,160,"Nome");
      const email=validText(b.email,5,180,"E-mail").toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(422,"E-mail inválido.");
      const role=String(b.role||"");
      if(!["admin","coordinator","leader"].includes(role))fail(422,"Perfil inválido.");
      const linked=b.linked_deacon_id?uuid(b.linked_deacon_id):null;
      if(role==="leader"&&!linked)fail(422,"Selecione o diácono que receberá o acesso.");
      if(linked&&role!=="leader")fail(422,"Vínculo permitido somente para líder.");
      const dup=await db("jdg_users?email=eq."+encodeURIComponent(email)+"&select=id&limit=1");
      if(dup.length)fail(409,"Este e-mail já possui um acesso.");
      // Senha inacessível ao administrador e nunca transmitida por e-mail.
      const privatePassword=token();
      const rpc=linked?"rpc/jdg_create_leader_access":"rpc/jdg_create_user";
      const args=linked?{p_name:name,p_email:email,p_password:privatePassword,p_deacon_id:linked}:
        {p_name:name,p_email:email,p_password:privatePassword,p_role:role};
      const created=await db(rpc,"POST",args);
      if(!created?.length)fail(500,"Acesso não confirmado.");
      const delivered=await sendInvite(created[0]);
      await db("jdg_audit_events","POST",{user_id:current.id,event:"user.create_invite",target_id:created[0].id},"return=minimal");
      return reply({item:created[0],email_sent:delivered.sent,message:delivered.message},201,origin);
    }
    const resend=/^\/users\/([0-9a-f-]{36})\/resend$/i.exec(path);
    if(req.method==="POST"&&resend){
      const id=uuid(resend[1]);
      const pending=await db("jdg_users?id=eq."+id+
        "&active=eq.true&must_change_password=eq.true&select=id,name,email&limit=1");
      if(!pending.length)fail(409,"O acesso não está pendente de ativação.");
      const delivered=await sendInvite(pending[0]);
      await db("jdg_audit_events","POST",{user_id:current.id,event:"user.resend_invite",target_id:id},"return=minimal");
      return reply({email_sent:delivered.sent,message:delivered.message},200,origin);
    }
    return reply({error:"Rota não encontrada."},404,origin);
  }catch(e){
    if(e instanceof HttpError)return reply({error:e.message},e.status,origin);
    console.error("Convites: erro inesperado",e instanceof Error?e.name:"unknown");
    return reply({error:"Erro temporário no serviço de convites."},500,origin);
  }
});
