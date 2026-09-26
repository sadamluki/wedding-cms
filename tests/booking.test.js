import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('public booking persists privately; same-date requests allowed',async()=>{
 const {createApp}=await import('../server/app.js'); const dir=mkdtempSync(join(tmpdir(),'cms-')); const {app,db}=createApp(join(dir,'test.sqlite')); const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r)); const base=`http://127.0.0.1:${server.address().port}`;
 try {const payload={name:'Test Client',phone:'081234567890',package:'makeup',date:'2028-12-20',location:'Jakarta',makeupPeople:2,consent:true};
 for(let i=0;i<2;i++){const res=await fetch(base+'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(res.status,201);assert.ok((await res.json()).reference);}
 assert.equal(db.prepare('SELECT count(*) n FROM bookings').get().n,2);assert.equal((await fetch(base+'/api/bookings')).status,401);
 const bad=await fetch(base+'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,makeupPeople:0})});assert.equal(bad.status,400);
 }finally{await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});}
});
