import React,{useState} from 'react';
import './calendar.css';
const weekdays=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function BookingCalendar({rows,statuses,packages,onSelect,initialMonth=new Date()}){
 const [month,setMonth]=useState(()=>new Date(initialMonth.getFullYear(),initialMonth.getMonth(),1));
 const year=month.getFullYear(),index=month.getMonth(),prefix=dateKey(month).slice(0,7);
 const visible=rows.filter(b=>b.date.startsWith(prefix));
 const days=new Date(year,index+1,0).getDate(),offset=(month.getDay()+6)%7;
 return <section className="booking-calendar" aria-label="Kalender booking">
  <div className="calendar-toolbar"><h3 aria-live="polite">{months[index]} {year}</h3><div><button className="secondary" aria-label="Bulan sebelumnya" onClick={()=>setMonth(new Date(year,index-1,1))}>←</button><button className="secondary" onClick={()=>setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>Hari ini</button><button className="secondary" aria-label="Bulan berikutnya" onClick={()=>setMonth(new Date(year,index+1,1))}>→</button></div></div>
  <p className="calendar-count" role="status">{visible.length} booking di bulan ini · {rows.length} booking sesuai filter di semua bulan.</p>
  <ul className="calendar-legend" aria-label="Legenda status booking">{Object.entries(statuses).map(([key,label])=><li className={'calendar-status '+key} key={key}>{label}</li>)}</ul>
  {!visible.length&&<p className="calendar-empty">Tidak ada booking di bulan ini sesuai filter. Ganti bulan atau reset filter untuk melihat booking lainnya.</p>}
  <div className="calendar-grid"><div className="calendar-weekdays">{weekdays.map(day=><span key={day}>{day}</span>)}</div>
   {Array.from({length:offset},(_,i)=><div className="calendar-padding" aria-hidden="true" key={'blank'+i}/>)}
   {Array.from({length:days},(_,i)=>{const day=i+1,key=`${prefix}-${String(day).padStart(2,'0')}`,events=visible.filter(b=>b.date===key);return <section className={'calendar-day'+(events.length?' has-events':'')} key={key} aria-label={`${day} ${months[index]} ${year}`}><time dateTime={key} aria-current={key===dateKey(new Date())?'date':undefined}><span className="calendar-mobile-weekday">{weekdays[(offset+i)%7]} </span>{day}</time>{events.map(b=><button key={b.id} className={'calendar-event '+b.status} onClick={()=>onSelect(b)}><strong>{b.name}</strong><span>{packages[b.package]} · {statuses[b.status]}</span></button>)}</section>})}
  </div>
 </section>;
}
