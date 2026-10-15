import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { canRenderAd } from '../src/components/ads/ad-readiness.mjs'
const placement = 'updates-bottom'
const configured = { enabled:true, provider:'adsense', siteApproved:true, rightsReviewed:true, privacyReady:true, consentReady:true, publisherId:'ca-pub-'+'1'.repeat(16), placements:[placement], slots:{[placement]:'1234567890'} }
test('advertising fails closed at every configuration and runtime gate', () => {
assert.equal(canRenderAd(configured,placement,true,true,300),true)
for(const flag of ['enabled','siteApproved','rightsReviewed','privacyReady','consentReady'])assert.equal(canRenderAd({...configured,[flag]:false},placement,true,true,300),false,flag)
for(const [consent,script,width] of [[false,true,300],[true,false,300],[true,true,299]])assert.equal(canRenderAd(configured,placement,consent,script,width),false)
for(const bad of [{provider:null},{publisherId:null},{publisherId:'ca-pub-pending'},{slots:{[placement]:null}},{slots:{[placement]:'pending'}}])assert.equal(canRenderAd({...configured,...bad},placement,true,true,300),false)
assert.equal(canRenderAd(configured,'garage',true,true,1000),false)
const actual=JSON.parse(readFileSync(new URL('../src/config/ads.json',import.meta.url)))
assert.equal(canRenderAd(actual,placement,true,true,1000),false)
assert.equal(actual.publisherId,null)
assert.ok(Object.values(actual.slots).every(s=>s===null))
})
