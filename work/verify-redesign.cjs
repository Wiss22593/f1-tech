const {chromium}=require('C:/Users/mb937/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const fs=require('fs')
;(async()=>{
const out='C:/Users/mb937/Documents/Codex/2026-10-08/referenced-chatgpt-conversation-this-is-an-11/outputs'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'msedge'})
const results=[]
for(const [width,height] of [[360,800],[390,844],[412,915],[768,1024],[1280,900],[1440,1000]]) {
const page=await browser.newPage({viewport:{width,height}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
for(const [path,name] of [['actualizaciones','updates'],['equipos','teams'],['pilotos','drivers']]){
await page.goto('http://127.0.0.1:5186/'+path)
await page.locator('.atlas-page').waitFor()
await page.locator('.atlas-loading').waitFor({state:'hidden'})
await page.waitForTimeout(500)
const check=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,cards:document.querySelectorAll('.engineering-team,.engineering-driver').length,stats:[...document.querySelectorAll('.atlas-stats strong')].map(x=>x.textContent),demo:/\bDEMO\b/i.test(document.querySelector('.atlas-page').innerText),glb:performance.getEntriesByType('resource').filter(x=>x.name.includes('.glb')).length}))
if(check.scroll>width)throw Error('Overflow '+name+' '+width+': '+check.scroll)
if(check.demo||check.glb)throw Error('Unexpected demo or GLB '+name)
if(name==='teams'&&check.cards!==11)throw Error('Teams mismatch')
if(name==='drivers'&&check.cards!==22)throw Error('Drivers mismatch')
if(width===390||width===1440)await page.screenshot({path:out+'/'+name+'-'+width+'.png',fullPage:true})
results.push({name,width,height,...check,errors:[...errors]})
}
await page.close()
}
const p=await browser.newPage({viewport:{width:1440,height:1000}})
await p.goto('http://127.0.0.1:5186/actualizaciones')
await p.locator('.atlas-stats strong').first().filter({hasText:/[1-9]/}).waitFor()
await p.locator('.atlas-filters select').nth(2).selectOption('singapore-2026')
if(await p.locator('.atlas-stats strong').first().innerText()!=='0')throw Error('Future GP count')
await p.locator('.atlas-filters button').click()
await p.locator('.atlas-bar').first().click()
const count=Number(await p.locator('.atlas-stats strong').first().innerText())
if(count<1)throw Error('Team filter failed')
await p.locator('.atlas-record summary').first().click()
if(!await p.locator('.atlas-record[open] a').first().getAttribute('href'))throw Error('Missing source')
await p.goto('http://127.0.0.1:5186/equipos')
await p.locator('.engineering-team').first().click()
if(!await p.locator('.atlas-page a[href*="/inicio?team="]').count())throw Error('Team garage links')
await p.goto('http://127.0.0.1:5186/pilotos?team=alpine')
await p.locator('.engineering-driver').first().waitFor();
if(await p.locator('.engineering-driver').count()!==2)throw Error('Driver filter')
const href=await p.getByRole('link',{name:/Explorar en Garage/}).last().getAttribute('href')
if(!href.includes('driver=colapinto'))throw Error('Garage deep link mapping')
fs.writeFileSync(out+'/VALIDACION-BROWSER.json',JSON.stringify({results,interactions:{futureGP:true,teamFilter:true,sourceDetail:true,teamDetail:true,driversFilter:true,garageLink:href}},null,2))
await browser.close()
console.log(JSON.stringify({checked:results.length,screenshots:6,interactions:'passed'}))
})().catch(e=>{console.error(e);process.exit(1)})





