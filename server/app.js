import express from 'express';
import {installAdmin} from './auth.js';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
export function createApp(file){
 const db=new DatabaseSync(file);db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,created TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'baru',dp INTEGER NOT NULL DEFAULT 0,notes TEXT NOT NULL DEFAULT '');`);
 const app=express();app.disable('x-powered-by');app.use(express.json({limit:'24kb'}));
 const createBooking=(admin=false)=>(req,res)=>{const b=req.body||{};const packages=['makeup','makeup_dekor','dekor','custom'];const validDate=/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&!Number.isNaN(Date.parse(b.date))&&new Date(b.date).toISOString().slice(0,10)===b.date&&b.date>=new Date().toISOString().slice(0,10);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||(b.phone!==undefined&&(typeof b.phone!=='string'||(b.phone!==''&&!/^\+?\d{9,15}$/.test(b.phone))))||['instagram','facebook','tiktok'].some(key=>b[key]!==undefined&&(typeof b[key]!=='string'||b[key].length>300))||!packages.includes(b.package)||!validDate||typeof b.location!=='string'||!b.location.trim()||b.location.length>500||(!admin&&b.consent!==true)||(['makeup','makeup_dekor'].includes(b.package)&&(!Number.isInteger(b.makeupPeople)||b.makeupPeople<1||b.makeupPeople>100))||(['dekor','makeup_dekor'].includes(b.package)&&(!b.theme||typeof b.theme!=='string'||!b.theme.trim()||b.theme.length>300))||(b.package==='custom'&&(!b.requirements||typeof b.requirements!=='string'||!b.requirements.trim()||b.requirements.length>2000)))return res.status(400).json({error:'Lengkapi data dan kebutuhan paket dengan benar.'});const id=randomUUID();const data={name:b.name.trim(),phone:b.phone||'',instagram:(b.instagram||'').trim(),facebook:(b.facebook||'').trim(),tiktok:(b.tiktok||'').trim(),package:b.package,date:b.date,location:b.location.trim(),makeupPeople:b.makeupPeople,theme:b.theme,requirements:b.requirements,consent:!admin,source:admin?'admin':'public'};db.prepare('INSERT INTO bookings(id,created,data) VALUES(?,?,?)').run(id,new Date().toISOString(),JSON.stringify(data));res.status(201).json({reference:id});};
 app.post('/api/bookings',createBooking());
 installAdmin(app,db,createBooking(true));
 return {app,db};
}
