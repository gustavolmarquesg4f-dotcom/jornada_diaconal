// E2E com dados fictícios: não utiliza credenciais nem consulta a base real.
// Executado contra o bundle Angular de produção por Chromium e WebKit/Safari.
import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('frontend/dist/jornada-diaconal-web/browser');
const indexSource=readFileSync(resolve(root,'index.html'),'utf8');
assert(indexSource.includes('id="jd-boot"'),'A primeira pintura deve trazer identidade visual estática');
assert(indexSource.includes('jornada-loading-2026.css'),'CSS da experiência não foi empacotado');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url||'/', 'http://localhost');
 let relative=decodeURIComponent(url.pathname).replace(/^\/jornada_diaconal\/?/,'');
 if(!relative||relative==='/')relative='index.html';
 const path=resolve(root,relative.replace(/^\/+/,'')); 
 if(!(path===root||path.startsWith(root+sep))){res.writeHead(403);res.end();return}
 try{const bytes=readFileSync(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes)}
 catch{res.writeHead(404);res.end('missing')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const fakeUser={id:'fake-user',name:'Responsável Teste',email:'teste@exemplo.invalid',role:'admin',must_change_password:false};
const fakePerson={id:'fake-deacon',full_name:'Pessoa de Demonstração',cohort:'antigo',status:'active',last_contact:null,group_id:null};
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
let checks=0;
try{
 for(const [name,type] of [['webkit',webkit],['chromium',chromium]]){
  const browser=await type.launch({headless:true});
  try{
   for(const viewport of [{width:393,height:852},{width:1280,height:800}]){
    const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
    try{
     const publicPage=await context.newPage();
     await publicPage.goto(origin+'/jornada_diaconal/',{waitUntil:'domcontentloaded'});
     await publicPage.locator('#email').waitFor({timeout:14000});
     assert.equal(await publicPage.locator('#jd-boot').count(),0,'Splash estático não foi removido');
     await publicPage.close();
     // A sessão e todas as respostas abaixo são simuladas localmente.
     await context.addInitScript(()=>sessionStorage.setItem('diaconato_access_token','E2E_FAKE_TOKEN'));
     let fail=false,delayMs=1100;
     const page=await context.newPage();
     await page.route('**/functions/v1/jornada-gestao-api/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      const method=route.request().method();
      if(method==='OPTIONS'){await route.fulfill({status:204,headers});return}
      let body={ok:true}; let status=200;
      if(path.endsWith('/auth/me'))body={user:fakeUser};
      else if(path.endsWith('/deacons')){
       if(delayMs)await new Promise(ok=>setTimeout(ok,delayMs));
       if(fail){body={error:'Falha simulada de rede'};status=503}
       else body={items:[fakePerson]};
      } else if(path.endsWith('/groups'))body={items:[]};
      await route.fulfill({status,headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body)});
     });
     await page.goto(origin+'/jornada_diaconal/',{waitUntil:'domcontentloaded'});
     await page.locator('.jd-skeleton-dashboard').waitFor({timeout:14000});
     assert.equal(await page.locator('.jd-skeleton-stats .jd-skeleton-card').count(),4,'Cartões skeleton não renderizaram');
     const overflowing=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
     assert(!overflowing,'Skeleton produziu rolagem horizontal');
     await page.locator('.jd-skeleton-dashboard').waitFor({state:'hidden',timeout:14000});
     await page.getByRole('heading',{name:'Visão geral'}).waitFor({timeout:10000});
     assert(await page.getByText('Pessoa de Demonstração').count()>=0);
     // Valida estado de falha sem expor nenhum dado sensível ou criar registros.
     fail=true;delayMs=0;
     await page.reload({waitUntil:'domcontentloaded'});
     await page.getByRole('heading',{name:'Não conseguimos carregar suas informações.'}).waitFor({timeout:14000});
     fail=false;
     await page.getByRole('button',{name:'Tentar novamente'}).click();
     await page.getByRole('heading',{name:'Visão geral'}).waitFor({timeout:14000});
     assert.equal(await page.locator('.jd-loading-error').count(),0,'Erro permaneceu após retry');
     console.log('PASS',name,viewport.width+'x'+viewport.height,'login, skeleton, dados, erro e retry');
     checks++;
     await page.close();
    } finally{await context.close()}
   }
  } finally{await browser.close()}
 }
 assert.equal(checks,4);
}finally{await new Promise(ok=>server.close(ok))}
