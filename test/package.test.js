const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
test('package is reproducible and its downloaded checksum uses the archive basename',()=>{
  const build=()=>{const result=spawnSync('bash',[path.join(root,'scripts/package.sh')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);return fs.readFileSync(path.join(root,'dist/leadership-board.zip'));};
  const first=build(),second=build();assert.deepEqual(first,second);
  const digest=createHash('sha256').update(first).digest('hex');assert.equal(fs.readFileSync(path.join(root,'dist/leadership-board.zip.sha256'),'utf8'),`${digest}  leadership-board.zip\n`);
});
