// Teste de regressão: reproduz o menu autenticado sem acessar usuários ou dados reais.
// Usa os estilos efetivos da aplicação e verifica cliques em mobile (inclusive
// quando o menu lateral tinha sido recolhido em uma sessão desktop).
import { chromium, webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const css = [
  '../src/styles.css',
  '../public/jornada-ux-2026.css',
  '../public/jornada-polish-2026.css',
  '../public/jornada-workspace-2026.css',
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

const entries = [
  'Visão geral','Diáconos','Grupos e liderança','Acompanhamento',
  'Escala de intercessão','Agenda do Pr. Sato','Relatórios',
  'Observações reservadas','Usuários e acessos',
];
const html = (collapsed) => `<!DOCTYPE html><html lang="pt-BR"><head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>${css}</style></head><body>
<div class="app-shell ${collapsed ? 'nav-collapsed' : ''}">
<button id="backdrop" class="sidebar-backdrop" style="display:none" aria-label="Fechar menu"></button>
<aside id="drawer" class="sidebar">
  <div class="sidebar-controls"><button class="sidebar-collapse-toggle">«</button>
    <button id="close" class="sidebar-mobile-close">×</button></div>
  <div class="brand"><span class="brand-mark brand-ministry-icon"></span>
    <span>Jornada Diaconal<small>Ministério dos Diáconos</small></span></div>
  <div class="nav-heading">ÁREA DE TRABALHO</div>
  <nav class="navigation">
    ${entries.map((label,i)=>`<button id="nav-${i}" type="button"><span class="nav-icon">◫</span>${label}</button>`).join('')}
  </nav>
  <div class="sidebar-note">Acompanhamento</div>
  <div class="user-block"><span class="avatar">L</span><span class="user-details">Liderança</span><button class="exit">↪</button></div>
</aside>
<div class="content-shell"><header class="app-top">
<button id="open" class="menu-toggle" type="button">☰</button>
<span class="top-breadcrumb">JORNADA DIACONAL</span></header><main class="main-content">Teste móvel</main></div>
</div>
<script>
const drawer=document.getElementById('drawer');
const backdrop=document.getElementById('backdrop');
function openMenu(){drawer.classList.add('mobile-open');backdrop.style.display='';}
function closeMenu(){drawer.classList.remove('mobile-open');backdrop.style.display='none';}
document.getElementById('open').onclick=openMenu;
document.getElementById('close').onclick=closeMenu;
backdrop.onclick=closeMenu;
document.querySelectorAll('.navigation button').forEach(b=>b.onclick=()=>{document.body.dataset.clicked=b.id;closeMenu();});
</script></body></html>`;

for (const [browserName, browserType] of [['chromium',chromium], ['webkit',webkit]]) {
  const browser = await browserType.launch({headless:true});
  try {
    for (const size of [{width:393,height:852},{width:375,height:667},{width:852,height:393}]) {
      for (const collapsed of [false,true]) {
        const context = await browser.newContext({viewport:size,deviceScaleFactor:3,isMobile:true,hasTouch:true});
        const page = await context.newPage();
        try {
          await page.setContent(html(collapsed), {waitUntil:'domcontentloaded'});
          await page.locator('#open').click();
          const drawer = page.locator('#drawer');
          assert.equal(await drawer.isVisible(), true, 'Menu não abriu');
          const rect = await drawer.boundingBox();
          const backdrop = await page.locator('#backdrop').boundingBox();
          assert(rect && backdrop, 'Camada mobile não possui dimensão');
          assert(backdrop.x >= rect.x + rect.width - 2, 'Backdrop cobre o menu, bloqueando toques');
          assert(rect.width >= 260, 'Menu ilegivelmente estreito');
          for (const i of [0,4,8]) {
            const item = page.locator('#nav-'+i);
            const fontsize = Number.parseFloat(await item.evaluate(el => getComputedStyle(el).fontSize));
            assert(fontsize >= 12, 'Rótulo do menu invisível no modo recolhido');
            const target = await item.boundingBox();
            if (target) {
              assert(target.x >= rect.x && target.x+target.width <= rect.x+rect.width+2,'Botão fora da gaveta');
            }
            await item.click({timeout:7000});
            assert.equal(await page.locator('body').getAttribute('data-clicked'),'nav-'+i, 'Toque não alcançou o botão');
            assert.equal(await drawer.isVisible(),false,'Menu não fechou após navegação');
            await page.locator('#open').click();
          }
          await page.locator('#close').click();
          assert.equal(await drawer.isVisible(),false,'Botão fechar sem resposta');
          await page.locator('#open').click();
          await page.locator('#backdrop').click({position:{x:Math.max(5,backdrop.width/2),y:30}});
          assert.equal(await drawer.isVisible(),false,'Backdrop não fecha o menu');
          console.log('PASS',browserName,size.width+'x'+size.height,'recolhido='+collapsed);
        } finally {await context.close();}
      }
    }
  } finally {await browser.close();}
}
