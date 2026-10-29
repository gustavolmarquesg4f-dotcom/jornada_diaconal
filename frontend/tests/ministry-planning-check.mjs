// Jornada Diaconal: E2E do planejamento com dados inteiramente fictícios.
// Não consulta nem modifica informações de produção.
import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('frontend/dist/jornada-diaconal-web/browser');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const pathname=new URL(req.url||'/','http://localhost').pathname;
 let relative=decodeURIComponent(pathname).replace(/^\/jornada_diaconal\/?/,'');
 if(!relative||relative==='/')relative='index.html';
 const file=resolve(root,relative.replace(/^\/+/,'')); 
 if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
 try{res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file))}
 catch{res.writeHead(404);res.end('missing')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const user={id:'fake-admin',name:'Coordenação Exemplo',email:'test@example.invalid',role:'admin',must_change_password:false};
const person={id:'11111111-1111-4111-8111-111111111111',full_name:'Pessoa Exemplo',cohort:'antigo',status:'active'};
const cHeaders={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','content-type':'application/json'};
let count=0;
try{
 for(const [engine,browserType] of [['webkit',webkit],['chromium',chromium]]){
  const browser=await browserType.launch();
  try{
   for(const viewport of [{width:393,height:852},{width:1280,height:800}]){
    const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
    await context.addInitScript(()=>sessionStorage.setItem('diaconato_access_token','MOCK_ONLY_TOKEN'));
    const page=await context.newPage();
    let records=[],invalidWrites=0;
    await page.route('**/functions/v1/**',async route=>{
     const url=new URL(route.request().url());
     const method=route.request().method();
     const path=url.pathname;
     if(method==='OPTIONS'){await route.fulfill({status:204,headers:cHeaders});return}
     let body={ok:true},status=200;
     if(path.endsWith('/auth/me'))body={user};
     else if(path.endsWith('/deacons'))body={items:[person]};
     else if(path.endsWith('/groups'))body={items:[]};
     else if(path.endsWith('/candidates')){
      if(method==='GET')body={items:records};
      else if(method==='POST'){
       const data=route.request().postDataJSON();
       records=[{id:'22222222-2222-4222-8222-222222222222',full_name:person.full_name,deacon_active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...data}];
       body={item:records[0]};status=201;
      }
     }else if(path.includes('/candidates/')){
      if(method==='PATCH'){records=records.map(r=>({...r,...route.request().postDataJSON()}));body={item:records[0]}}
      else if(method==='DELETE'){records=[];body={ok:true}}
     }
     if((path.endsWith('/users')||path.endsWith('/groups'))&&method!=='GET')invalidWrites++;
     await route.fulfill({status,headers:cHeaders,body:JSON.stringify(body)});
    });
    try{
     await page.goto(origin+'/jornada_diaconal/',{waitUntil:'domcontentloaded'});
     await page.locator('.jd-skeleton-dashboard').waitFor({state:'hidden',timeout:16000});
     if(viewport.width<500)await page.getByRole('button',{name:'Abrir menu de navegação'}).click();
     await page.getByRole('button',{name:'Planejamento da equipe'}).click();
     await page.getByRole('heading',{name:'Planejamento da equipe'}).waitFor({timeout:10000});
     assert.equal(await page.locator('.jd-ministry-target').count(),3);
     await page.locator('#ministry-person').selectOption(person.id);
     await page.locator('#ministry-role').selectOption('media');
     await page.getByRole('button',{name:/Registrar indicação/}).click();
     await page.getByText('Pessoa Exemplo',{exact:true}).waitFor({timeout:10000});
     assert.equal(records.length,1);
     await page.locator('.jd-ministry-edit select').selectOption('available');
     await page.getByRole('button',{name:'Salvar alterações'}).click();
     await page.waitForFunction(()=>document.body.innerText.includes('Acompanhamento da indicação atualizado.'));
     assert.equal(records[0].stage,'available');
     page.once('dialog',dialog=>dialog.accept());
     await page.getByRole('button',{name:'Retirar indicação'}).click();
     await page.getByText('Nenhuma indicação registrada nesta seleção.',{exact:false}).waitFor({timeout:10000});
     assert.equal(records.length,0);
     assert.equal(invalidWrites,0);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2),false,'Rolagem horizontal no painel mobile');
     console.log('PASS',engine,viewport.width,'indicacao/edicao/exclusao, sem criar acessos nem grupos');
     count++;
    }finally{await context.close()}
   }
  }finally{await browser.close()}
 }
 assert.equal(count,4);
}finally{await new Promise(ok=>server.close(ok))}
