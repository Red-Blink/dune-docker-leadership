const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../web/dune-addon-bridge.js'),'utf8');

function harness({standalone=false,throwOnSend=false}={}) {
  const timers=new Map(),sent=[];let receive,next=0;
  const parent={postMessage(message,origin){if(throwOnSend)throw new Error('Send failed');sent.push({message,origin});}};
  const window={parent,location:{origin:'https://console.test'},crypto:{randomUUID:()=>`request-${++next}`},setTimeout(fn){const id=++next;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},addEventListener(type,callback){if(type==='message')receive=callback;}};
  if(standalone)window.parent=window;
  vm.runInNewContext(source,{window,document:{documentElement:{dataset:{addonId:'leadership-board-demo'}}}});
  return {window,parent,timers,sent,reply(message,overrides={}){receive({source:parent,origin:window.location.origin,data:message,...overrides});}};
}
test('bridge accepts only the expected parent/origin and resolves the matching response once',async()=>{
  const h=harness(),promise=h.window.DuneAddon.request('players.summary.list');
  const request=h.sent[0].message;assert.equal(h.sent[0].origin,'https://console.test');assert.equal(request.addonId,'leadership-board-demo');
  const response={type:'dune-addon-response',requestId:request.requestId,ok:true,result:{rows:[]}};
  h.reply(response,{source:{}});h.reply(response,{origin:'https://other.test'});h.reply({...response,addonId:'other-addon'});h.reply({...response,ok:'true'});
  assert.equal(h.timers.size,1,'spoofed messages must not settle requests');
  h.reply(response);assert.deepEqual(await promise,{rows:[]});assert.equal(h.timers.size,0,'successful requests must release timers');h.reply({...response,ok:false,error:'Late reply'});
});
test('concurrent calls resolve independently and errors release their timers',async()=>{
  const h=harness(),a=h.window.DuneAddon.request('addon.storage.get',{key:'a'}),b=h.window.DuneAddon.request('players.summary.list');
  const rejected=assert.rejects(b,/Permission denied/);
  h.reply({type:'dune-addon-response',requestId:h.sent[1].message.requestId,ok:false,error:'Permission denied'});
  h.reply({type:'dune-addon-response',requestId:h.sent[0].message.requestId,ok:true,result:'a'});
  assert.equal(await a,'a');await rejected;assert.equal(h.timers.size,0);
});
test('timeouts and synchronous send failures cannot leave requests pending',async()=>{
  const h=harness(),promise=h.window.DuneAddon.request('players.summary.list');
  const rejected=assert.rejects(promise,/timed out/);const [id,timeout]=h.timers.entries().next().value;h.timers.delete(id);timeout();await rejected;
  const bad=harness({throwOnSend:true});await assert.rejects(bad.window.DuneAddon.request('players.summary.list'),/Send failed/);assert.equal(bad.timers.size,0);
});
test('standalone preview fails immediately with development guidance',async()=>{
  const h=harness({standalone:true});await assert.rejects(h.window.DuneAddon.request('players.summary.list'),/local development mock/);assert.equal(h.timers.size,0);
});
