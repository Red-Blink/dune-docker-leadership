const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../web/addon.js'),'utf8');
function element(){return {value:'',textContent:'',className:'',disabled:false,children:[],addEventListener(){},appendChild(child){this.children.push(child);},replaceChildren(...children){this.children=children;}};}
async function harness(response){
  const elements=Object.fromEntries(['leaderRows','status','refreshButton','searchInput','playerCount','onlineCount','highestLevel'].map(id=>[id,element()]));
  const calls=[];
  const context=vm.createContext({document:{getElementById:id=>elements[id],createElement:element},window:{DuneAddon:{request:async(action,payload)=>{calls.push({action,payload});if(response instanceof Error)throw response;return response;}}},fetch(){throw new Error('Addon must not call REST directly');}});
  vm.runInContext(source,context);await new Promise(resolve=>setImmediate(resolve));
  return {context,elements,calls};
}
test('current Console fields produce correct online counts and level/online/name ranking',async()=>{
  const {elements,calls}=await harness({capabilities:{players:true},rows:[{name:'Offline Ace',level:10,status:'Offline'},{name:'Online Zed',level:10,status:'Online'},{name:'High Level',level:20,status:'Online'}]});
  assert.equal(calls[0].action,'leadership.players.list');assert.equal(calls.length,1);
  assert.equal(elements.playerCount.textContent,'3');assert.equal(elements.onlineCount.textContent,'2');assert.equal(elements.highestLevel.textContent,'20');
  assert.deepEqual(elements.leaderRows.children.map(row=>row.children[1].textContent),['High Level','Online Zed','Offline Ace']);
  assert.equal(elements.leaderRows.children[1].children[5].children[0].textContent,'Online');
});
test('legacy row aliases remain readable and unknown status is not mislabeled Offline',async()=>{
  const {elements}=await harness({rows:[{character_name:'Legacy',online_status:'Online',level:4},{characterName:'Unknown Status',level:1}]});
  assert.equal(elements.onlineCount.textContent,'1');assert.equal(elements.leaderRows.children[1].children[5].children[0].textContent,'Unavailable');
});
test('search filters canonical status and names while rendering untrusted names as text',async()=>{
  const {elements,context}=await harness({rows:[{name:'<img src=x>',status:'Online',guild:'Guild A'},{name:'Offline Player',status:'Offline',guild:'Guild B'}]});
  elements.searchInput.value='guild a';context.applyFilter();
  assert.equal(elements.leaderRows.children.length,1);assert.equal(elements.leaderRows.children[0].children[1].textContent,'<img src=x>');
  elements.searchInput.value='offline';context.applyFilter();assert.equal(elements.leaderRows.children[0].children[1].textContent,'Offline Player');
});
test('unsupported, malformed and failed summaries show an error and release Refresh',async()=>{
  for(const response of [{capabilities:{players:false},rows:[]},{rows:null},new Error('Permission denied')]){
    const {elements}=await harness(response);assert.equal(elements.status.className,'status error');assert.equal(elements.refreshButton.disabled,false);assert.equal(elements.leaderRows.children.length,0);
  }
});
