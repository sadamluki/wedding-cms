import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
test('public and protected admin creation accept optional phone and persist socials',async()=>{
 const {app,db}=createApp(':memory:');const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 const data={name:'No Phone',package:'dekor',date:'2028-12-20',location:'Jakarta',theme:'Garden',consent:true,instagram:'@client',facebook:'Client FB',tiktok:'@clienttok'};
 const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/api/bookings',data)).status,201,'public permits omitted phone');
  assert.equal((await post('/api/bookings',{...data,phone:''})).status,201);
  for(const phone of ['abc','123',123,null])assert.equal((await post('/api/bookings',{...data,phone})).status,400);
  assert.equal((await post('/api/bookings',{...data,instagram:{bad:true}})).status,400);
  assert.equal((await post('/api/admin/bookings',data)).status,401);
  const credentials={username:'testowner',password:'Only-test-password-123!'};await post('/api/setup',credentials);const login=await post('/api/login',credentials);const Cookie=login.headers.get('set-cookie').split(';')[0];const {csrf}=await login.json();
  assert.equal((await post('/api/admin/bookings',data,{Cookie})).status,403);
  assert.equal((await post('/api/admin/bookings',data,{Cookie,'X-CSRF-Token':csrf,Origin:'https://evil.example'})).status,403);
  const result=await post('/api/admin/bookings',{...data,consent:undefined},{Cookie,'X-CSRF-Token':csrf});assert.equal(result.status,201,'admin does not need public consent checkbox');const {reference}=await result.json();
  const row=JSON.parse(db.prepare('SELECT data FROM bookings WHERE id=?').get(reference).data);assert.equal(row.phone,'');for(const key of ['instagram','facebook','tiktok'])assert.equal(row[key],data[key]);
 }finally{await new Promise(r=>server.close(r));db.close();}
});
