// Planejamento ministerial: indicacoes, nao nomeacoes nem permissao de usuario.
// A mesma sessao opaca da API Jornada Diaconal e validada a cada requisicao.
const BASE=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ORIGINS=new Set(["https://gustavolmarquesg4f-dotcom.github.io","http://localhost:4200"]);
const ROLES=["care_leader","secretary","media"] as const;
const STAGES=["suggested","contacting","available","selected"] as const;
type CandidateRole=typeof ROLES[number];
type CandidateStage=typeof STAGES[number];
class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
const invalid=(status:number,message:string):never=>{throw new ApiError(status,message)};
function cors(req:Request){
 const origin=req.headers.get("origin")||"";
 return {"Access-Control-Allow-Origin":ORIGINS.has(origin)?origin:"null",
  "Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":"authorization,content-type,apikey,x-client-info",
  "Vary":"Origin","Cache-Control":"no-store",
  "Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff"};
}
const response=(req:Request,obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:cors(req)});
function uuid(value:unknown):string{
 const v=String(value||"");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))invalid(422,"Identificador inválido.");
 return v;
}
function enumValue<T extends string>(value:unknown,allowed:readonly T[],label:string):T{
 if(!allowed.includes(value as T))invalid(422,label+" inválido.");
 return value as T;
}
function notes(value:unknown):string{
 if(value===undefined||value===null)return "";
 if(typeof value!=="string"||value.length>500)invalid(422,"Observação deve ter até 500 caracteres.");
 return value.trim();
}
async function json(req:Request):Promise<Record<string,unknown>>{
 try{
  const body=await req.json();
  if(!body||typeof body!=="object"||Array.isArray(body))throw Error();
  return body;
 }catch{ return invalid(400,"JSON inválido."); }
}
async function db(path:string,method="GET",body?:unknown,prefer?:string):Promise<any>{
 if(!BASE||!KEY)invalid(503,"Serviço temporariamente indisponível.");
 const headers:Record<string,string>={"apikey":KEY,"authorization":"Bearer "+KEY,"content-type":"application/json"};
 if(prefer)headers["prefer"]=prefer;
 const r=await fetch(BASE+"/rest/v1/"+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const t=await r.text();let data:any=null;
 try{data=t?JSON.parse(t):null}catch{data=null}
 if(!r.ok){console.error("jdg-ministry-db",r.status,data?.code||"");invalid(r.status===409?409:500,r.status===409?"Esta pessoa já foi indicada para essa função.":"Erro ao salvar o planejamento.");}
 return data;
}
async function sha256(raw:string){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
async function authorize(req:Request){
 const bearer=req.headers.get("authorization")||"";
 const match=/^Bearer ([a-f0-9]{64})$/i.exec(bearer);
 if(!match)invalid(401,"É necessário entrar no sistema.");
 const hash=await sha256(match[1]);
 const sessions=await db("jdg_sessions?token_hash=eq."+hash+"&expires_at=gt."+encodeURIComponent(new Date().toISOString())+"&select=user_id&limit=1");
 if(!sessions?.length)invalid(401,"Sessão expirada.");
 const users=await db("jdg_users?id=eq."+encodeURIComponent(sessions[0].user_id)+"&active=eq.true&select=id,role,must_change_password&limit=1");
 if(!users?.length)invalid(401,"Acesso revogado.");
 const u=users[0];
 if(u.must_change_password)invalid(403,"Troque sua senha provisória primeiro.");
 if(u.role!=="admin"&&u.role!=="coordinator")invalid(403,"Somente administração e coordenação podem planejar a equipe.");
 return u as {id:string;role:"admin"|"coordinator"};
}
async function ensureDeacon(id:string){
 const persons=await db("jdg_deacons?id=eq."+id+"&status=eq.active&select=id&limit=1");
 if(!persons.length)invalid(422,"Selecione um diácono ativo.");
}
const query="jdg_ministry_candidates?select=id,deacon_id,role,stage,notes,created_at,updated_at&order=created_at.asc&limit=300";
async function listCandidates(req:Request){
 const [rows,people]=await Promise.all([db(query),db("jdg_deacons?select=id,full_name,status&limit=1000")]);
 const names=new Map(people.map((p:{id:string;full_name:string;status:string})=>[p.id,p]));
 return response(req,{items:rows.map((row:any)=>({...row,
  full_name:(names.get(row.deacon_id) as any)?.full_name||"Cadastro indisponível",
  deacon_active:(names.get(row.deacon_id) as any)?.status==="active"}))});
}
async function handle(req:Request){
 const origin=req.headers.get("origin");
 if(origin&&!ORIGINS.has(origin))return response(req,{error:"Origem não autorizada."},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 const pathname=new URL(req.url).pathname;
 const path=pathname.includes("/jornada-equipe-api")?pathname.slice(pathname.indexOf("/jornada-equipe-api")+"/jornada-equipe-api".length)||"/":pathname;
 if(req.method==="GET"&&(path==="/"||path==="/health"))return response(req,{ok:true,service:"jornada-equipe-api"});
 const user=await authorize(req);
 if(req.method==="GET"&&path==="/candidates")return listCandidates(req);
 if(req.method==="POST"&&path==="/candidates"){
  const body=await json(req);
  const deacon_id=uuid(body.deacon_id);
  const role=enumValue<CandidateRole>(body.role,ROLES,"Função");
  const stage=enumValue<CandidateStage>(body.stage??"suggested",STAGES,"Etapa");
  const note=notes(body.notes);
  await ensureDeacon(deacon_id);
  const result=await db("jdg_ministry_candidates?select=id,deacon_id,role,stage,notes,created_at,updated_at","POST",
   {deacon_id,role,stage,notes:note,created_by:user.id,updated_by:user.id},"return=representation");
  return response(req,{item:result[0]},201);
 }
 const m=/^\/candidates\/([a-f0-9-]{36})$/i.exec(path);
 if(m&&(req.method==="PATCH"||req.method==="DELETE")){
  const id=uuid(m[1]);
  const existing=await db("jdg_ministry_candidates?id=eq."+id+"&select=id,role,stage,notes&limit=1");
  if(!existing.length)invalid(404,"Indicação não encontrada.");
  if(req.method==="DELETE"){
   await db("jdg_ministry_candidates?id=eq."+id,"DELETE",undefined,"return=minimal");
   return response(req,{ok:true});
  }
  const body=await json(req);
  const stage=enumValue<CandidateStage>(body.stage??existing[0].stage,STAGES,"Etapa");
  const note=body.notes===undefined?existing[0].notes:notes(body.notes);
  const updated=await db("jdg_ministry_candidates?id=eq."+id+"&select=id,deacon_id,role,stage,notes,created_at,updated_at","PATCH",
   {stage,notes:note,updated_by:user.id,updated_at:new Date().toISOString()},"return=representation");
  return response(req,{item:updated[0]});
 }
 return invalid(404,"Rota não encontrada.");
}
Deno.serve(async req=>{
 try{return await handle(req)}
 catch(error){const status=error instanceof ApiError?error.status:500;
  if(status===500)console.error("jdg-ministry",error instanceof Error?error.name:"error");
  return response(req,{error:error instanceof ApiError?error.message:"Não foi possível concluir a solicitação."},status);}
});
