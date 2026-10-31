import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.env.LEADERSHIP_WEB||fileURLToPath(new URL('../web',import.meta.url)));
const policy="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; frame-ancestors 'self'; sandbox allow-scripts";
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const rows=[{name:'Offline Ace',level:10,status:'Offline',guild:'Other Guild',faction:'Atreides',map:'Survival_1'},{name:'Online Zed',level:10,status:'Online',guild:'Desert Guild',map:'Survival_1'},{name:'High Level',level:20,status:'Online',guild:'Desert Guild',lastSeen:'2026-10-31T10:00:00Z'}];
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());requests.push(url.pathname);
    if(url.hostname!=='leadership.test')return route.abort();
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<iframe title="Leadership" sandbox="allow-scripts" style="width:100%;height:950px;border:0" src="/addon/index.html"></iframe><script>window.calls=[];addEventListener('message',event=>{const frame=document.querySelector('iframe');if(event.source!==frame.contentWindow||event.data.type!=='dune-addon-request')return;window.calls.push(event.data);if(event.data.addonId!=='leadership-board-demo'||event.data.action!=='leadership.players.list')throw new Error('Unexpected bridge request');event.source.postMessage({type:'dune-addon-response',requestId:event.data.requestId,ok:true,result:{capabilities:{players:true},rows:${JSON.stringify(rows)}}},'*')})</script>`});
    const file=resolve(root,'.'+url.pathname.replace(/^\/addon\//,'/'));if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
    return route.fulfill({headers:url.pathname.startsWith('/addon/')?{'content-security-policy':policy}:{},contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[extname(file)]||'application/octet-stream',body:readFileSync(file)});
  });
  await page.goto('http://leadership.test/');const frame=page.frameLocator('iframe');
  await frame.getByText('Loaded 3 players.',{exact:true}).waitFor();assert.equal(await frame.locator('#onlineCount').innerText(),'2');
  assert.deepEqual(await frame.locator('#leaderRows .player').allTextContents(),['High Level','Online Zed','Offline Ace']);
  assert.equal(await frame.locator('.status-pill.online').count(),2);
  await frame.locator('#searchInput').fill('desert');assert.equal(await frame.locator('#leaderRows tr').count(),2);await frame.locator('#searchInput').fill('');
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    const bounds=await frame.locator('body').evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(bounds.page<=bounds.viewport,'page must not overflow');
    assert.ok((await frame.locator('#refreshButton').boundingBox()).height>=44);
    if(process.env.LEADERSHIP_SCREENSHOTS)await page.screenshot({path:resolve(process.env.LEADERSHIP_SCREENSHOTS,`leadership-${width}.png`),fullPage:true});
  }
  const calls=await page.evaluate(()=>window.calls);assert.equal(calls.length,1);assert.equal(calls[0].action,'leadership.players.list');assert.equal(calls[0].addonId,'leadership-board-demo');
  await page.goto('http://leadership.test/index.html');await page.getByText('Open this addon in Dune Docker Console, or provide a local development mock.').waitFor();
  assert.ok(!requests.some(path=>path.startsWith('/api/')),'standalone preview must not call a nonexistent REST route');assert.deepEqual(errors,[]);
  await page.close();console.log('PASS: actual sandbox bridge, current field names, online counts/ranking/search, four widths and standalone guidance; no live data or writes.');
} finally {await browser.close();}
