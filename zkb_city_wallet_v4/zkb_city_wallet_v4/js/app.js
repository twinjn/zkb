const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};

// Tabs
$$('.tab_button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    $$('.tab_button').forEach(b=>b.setAttribute('aria-selected','false'));
    btn.setAttribute('aria-selected','true');
    const id=btn.dataset.tab; $$('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id==='tab_map'){setTimeout(()=>map?.invalidateSize(),100)}
    if(id==='tab_learn'){renderCards()}
  })
})

// Projekte
const PROJECTS=[
  {title:'Veloweg Aufwertung Kreis 5',desc:'Beleuchtung verbessern und sichere Querungen schaffen.',lat:47.3899,lng:8.5203},
  {title:'Jugend Makerspace Programm',desc:'Werkstatt für Code und Hardware mit Workshops.',lat:47.3842,lng:8.5176},
  {title:'Quartiergarten am Wasser',desc:'Gemeinschaftsgarten mit Lernen zu Nachhaltigkeit.',lat:47.3915,lng:8.5235}
];

// Map
let map; let currentProject=null;
function initMap(){
  map=L.map('map').setView([47.3889,8.5186],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  PROJECTS.forEach(p=>{const m=L.marker([p.lat,p.lng]).addTo(map); m.on('click',()=>showProject(p)); m.bindTooltip(p.title)})
}
function showProject(p){currentProject=p; $('#project_info').hidden=false; $('#project_title').textContent=p.title; $('#project_desc').textContent=p.desc}
$('#project_support').addEventListener('click',()=>{if(!currentProject)return; const amount=Number($('#micro_amount').value||0); const impact=store.get('impact',[]); impact.push({ts:Date.now(),project:currentProject.title,amount}); store.set('impact',impact); alert('Danke für deinen Beitrag an '+currentProject.title); updateImpactChart()})
$('#btn_add_micro').addEventListener('click',()=>{const impact=store.get('impact',[]); impact.push({ts:Date.now(),project:'Schneller Beitrag',amount:2}); store.set('impact',impact); updateImpactChart()})
$('#btn_locate').addEventListener('click',()=>{if(!navigator.geolocation)return alert('Ortung nicht verfügbar'); navigator.geolocation.getCurrentPosition(pos=>{const {latitude,longitude}=pos.coords; map.setView([latitude,longitude],15); L.circleMarker([latitude,longitude],{radius:6,color:'#1a72e7'}).addTo(map)})})

// Goals
function renderGoals(){
  const goals=store.get('goals',[]); const wrap=$('#goals_list'); wrap.innerHTML=''; const sel=$('#goal_select'); sel.innerHTML='';
  goals.forEach((g,i)=>{
    const d=document.createElement('div'); d.className='goal'; const pct=Math.min(100,Math.round((g.saved/g.target)*100));
    d.innerHTML=`<h3>${g.name}</h3><p class="muted">${g.saved.toFixed(2)} / ${g.target.toFixed(2)} CHF</p><div class="progress"><div style="width:${pct}%"></div></div><div class="inline" style="margin-top:8px"><input type="number" step="0.5" value="5" data-idx="${i}" class="add_amt"><button data-idx="${i}" class="add_btn">hinzufügen</button></div>`;
    wrap.appendChild(d); const o=document.createElement('option'); o.value=i; o.textContent=g.name; sel.appendChild(o)
  })
  $$('.add_btn').forEach(btn=>btn.addEventListener('click',e=>{const idx=Number(e.target.dataset.idx); const amt=Number(e.target.parentElement.querySelector('.add_amt').value||0); addToGoal(idx,amt)}))
}
function addToGoal(idx,amt){const goals=store.get('goals',[]); if(!goals[idx])return; goals[idx].saved=Math.max(0,(goals[idx].saved||0)+amt); store.set('goals',goals); renderGoals()}
$('#goal_add').addEventListener('click',()=>{const name=$('#goal_name').value.trim(); const target=Number($('#goal_target').value||0); if(!name||!target)return alert('Bitte Name und Zielbetrag eintragen'); const goals=store.get('goals',[]); goals.push({name,target,saved:0}); store.set('goals',goals); $('#goal_name').value=''; $('#goal_target').value=''; renderGoals()})
$('#purchase_log').addEventListener('click',()=>{const amt=Number($('#purchase_amount').value||0); const idx=Number($('#goal_select').value||0); const rounded=Math.ceil(amt)-amt; const toSave=Number(rounded.toFixed(2)); addToGoal(idx,toSave); $('#round_result').textContent=`Aufgerundet um ${toSave.toFixed(2)} CHF`})

// Guard
const phishRules=[
  {re:/(dringend|sofort|konto wird gesperrt|letzte warnung)/i,msg:'starke Dringlichkeit'},
  {re:/(passwort|login|verifizieren|verifikation|sms code|tan)/i,msg:'Aufforderung zu Zugangsdaten'},
  {re:/(geschenk|gewinn|preis|bonus)/i,msg:'Lockangebot'},
  {re:/(bitte klicken|hier klicken|link)/i,msg:'Link Druck'},
  {re:/(iban|bitcoin|krypto|geschenkkarte)/i,msg:'ungewöhnliche Zahlungsart'}
];
$('#phish_check').addEventListener('click',()=>{const text=($('#phish_text').value||'').trim(); if(!text)return; const hits=phishRules.filter(r=>r.re.test(text)).map(r=>r.msg); const el=$('#phish_result'); if(hits.length>=2){el.className='result bad'; el.textContent='Hohe Gefahr: '+hits.join(', ')} else if(hits.length===1){el.className='result warn'; el.textContent='Auffällig: '+hits.join(', ')} else {el.className='result ok'; el.textContent='Keine klaren Muster gefunden. Sei trotzdem aufmerksam.'} })
$('#url_check').addEventListener('click',()=>{const url=($('#url_input').value||'').trim(); const el=$('#url_result'); try{const u=new URL(url); const host=u.hostname; const looksIp=/^\d+\.\d+\.\d+\.\d+$/.test(host); const puny=/xn--/.test(host); const manySub=host.split('.').length>4; const badTld=/\.(zip|ru|quest|top|xyz|work)$/i.test(host); const flags=[]; if(looksIp)flags.push('IP Adresse statt Domain'); if(puny)flags.push('mögliche Homograph Zeichen'); if(manySub)flags.push('sehr viele Subdomains'); if(badTld)flags.push('ungewöhnliche Domainendung'); if(flags.length){el.className='result warn'; el.textContent='Auffällig: '+flags.join(', ')} else {el.className='result ok'; el.textContent='Sieht unauffällig aus. Prüfe trotzdem Schreibweise und Zertifikat.'}}catch{el.className='result bad'; el.textContent='Ungültige URL Eingabe'}})
$('#iban_check').addEventListener('click',()=>{const raw=($('#iban_input').value||'').replace(/\s+/g,''); const el=$('#iban_result'); if(!/^CH\d{19}$/i.test(raw)){el.className='result warn'; el.textContent='Kein gültiges CH IBAN Format gefunden. Demo prüft nur eine einfache Form.'; return} const moved=raw.slice(4)+raw.slice(0,4); const replaced=moved.toUpperCase().replace(/[A-Z]/g,c=>(c.charCodeAt(0)-55).toString()); let mod=0; for(const ch of replaced) mod=(mod*10+Number(ch))%97; if(mod===1){el.className='result ok'; el.textContent='IBAN Prüfziffer passt zur Demo Prüfung.'} else {el.className='result bad'; el.textContent='Prüfziffer stimmt nicht. Vorsicht.'}})

// Impact
let impactChart; function updateImpactChart(){const data=store.get('impact',[]); const by={}; data.forEach(i=>by[i.project]=(by[i.project]||0)+i.amount); const labels=Object.keys(by); const values=labels.map(l=>by[l]); const ctx=document.getElementById('impact_chart').getContext('2d'); if(impactChart)impactChart.destroy(); impactChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Beiträge CHF',data:values}]},options:{responsive:true,plugins:{legend:{display:false}}}})}

// CO₂
const co2Factors={kaffee:0.4,oepnv:0.05,elektronik:1.2,essen:0.3};
$('#co2_add').addEventListener('click',()=>{const k=$('#co2_cat').value; const amt=Number($('#co2_amount').value||0); const list=store.get('co2',[]); const est=Number((amt*(co2Factors[k]||0.2)).toFixed(2)); list.push({k,amt,est}); store.set('co2',list); renderCO2()})
function renderCO2(){const list=store.get('co2',[]); const ul=$('#co2_list'); ul.innerHTML=''; let sum=0; list.forEach(x=>{sum+=x.est; const li=document.createElement('li'); li.textContent=`${x.k} – Betrag ${x.amt} CHF – Schätzung ${x.est} kg CO₂`; ul.appendChild(li)}); $('#co2_sum').textContent=`Summe geschätzter CO₂ Werte: ${sum.toFixed(2)} kg`}

// Lernkarten
const learnCards=[
  {q:'Was ist Budgetierung',a:'Plane Einnahmen und Ausgaben im Voraus. Lege Ziele fest und prüfe monatlich den Stand.'},
  {q:'Wie wirkt Zinseszins',a:'Zinsen werden dem Kapital zugerechnet und erwirtschaften selber wieder Zinsen. Früh beginnen lohnt sich.'},
  {q:'Was ist ein Notgroschen',a:'Ein Geldpolster für unerwartete Ausgaben. Drei Monatsausgaben sind ein guter Richtwert.'},
  {q:'Sichere Karte online',a:'Nutze 3D Secure, gib Daten nur auf vertrauenswürdigen Seiten ein und prüfe die Adresse sorgfältig.'}
];
function renderCards(){
  const wrap=$('#cards');
  console.log('Rendering cards...');
  wrap.innerHTML='';
  learnCards.forEach((c,i)=>{
    const d=document.createElement('div');
    d.className='card';
    d.innerHTML=`<div class="q">${c.q}</div><div class="a">${c.a}</div><button data-i="${i}" class="reveal">zeigen</button>`;
    wrap.appendChild(d);
    const answer = d.querySelector('.a');
    if(answer) answer.style.display = 'none';
  });
  console.log('Cards rendered:', wrap.children.length);
  $$('.reveal').forEach(btn=>btn.addEventListener('click',e=>{
    console.log('zeigen button clicked for card', e.target.dataset.i, 'target:', e.target);
    const i=Number(e.target.dataset.i);
    const card=$$('.card')[i];
    card.classList.toggle('show');
    const answer = card.querySelector('.a');
    if(card.classList.contains('show')){
      answer.style.display = 'block';
    } else {
      answer.style.display = 'none';
    }
    e.target.textContent=card.classList.contains('show')?'verbergen':'zeigen';
  }));
}

// Tools
const RATES={CHF:1, EUR:0.98, USD:1.1, GBP:0.85};
$('#fx_convert').addEventListener('click',()=>{
  const amt=Number($('#fx_amount').value||0); const f=$('#fx_from').value; const t=$('#fx_to').value;
  const chf=amt*(RATES[f]?1/RATES[f]:1); const out=chf*(RATES[t]||1);
  $('#fx_out').textContent=`Ergebnis ${out.toFixed(2)} ${t}  Demo Kurse`;
})
let ciChart;
$('#ci_calc').addEventListener('click',()=>{
  const start=Number($('#ci_start').value||0); const r=Number($('#ci_rate').value||0)/100; const years=Number($('#ci_years').value||0); const m=Number($('#ci_month').value||0);
  let bal=start; const pts=[]; for(let y=1;y<=years;y++){for(let i=0;i<12;i++){bal=bal*(1+r/12)+m} pts.push(Number(bal.toFixed(2)))}
  const ctx=document.getElementById('ci_chart').getContext('2d'); if(ciChart)ciChart.destroy();
  ciChart=new Chart(ctx,{type:'line',data:{labels:Array.from({length:years},(_,i)=>`Jahr ${i+1}`),datasets:[{label:'Vermögen',data:pts}]},options:{plugins:{legend:{display:false}}}});
  $('#ci_out').textContent=`Endvermögen nach ${years} Jahren etwa ${bal.toFixed(2)} CHF  Demo Rechnung`;
})
$('#mt_calc').addEventListener('click',()=>{
  const price=Number($('#mt_price').value||0); const dp=Number($('#mt_dp').value||0)/100; const rate=Number($('#mt_rate').value||0)/100; const years=Number($('#mt_years').value||0);
  const loan=price*(1-dp); const i=rate/12; const n=years*12; const ann=i?loan*(i*Math.pow(1+i,n))/(Math.pow(1+i,n)-1):loan/n;
  $('#mt_out').textContent=`Kredit ${loan.toFixed(0)} CHF  Monatsrate etwa ${ann.toFixed(2)} CHF`;
})

// Budget
function renderBudget(){
  const list=store.get('budget',[]); const wrap=$('#bdg_list'); wrap.innerHTML='';
  list.forEach((b)=>{
    const pct=Math.min(100,Math.round((b.spent/b.plan)*100));
    const d=document.createElement('div'); d.className='goal';
    d.innerHTML=`<h3>${b.name}</h3><p class="muted">${b.spent.toFixed(2)} von ${b.plan.toFixed(2)} CHF</p><div class="progress"><div style="width:${pct}%"></div></div>`;
    wrap.appendChild(d);
  })
}
$('#bdg_add').addEventListener('click',()=>{
  const name=$('#bdg_name').value.trim(); const plan=Number($('#bdg_plan').value||0); if(!name||!plan)return;
  const list=store.get('budget',[]); list.push({name,plan,spent:0}); store.set('budget',list); $('#bdg_name').value=''; $('#bdg_plan').value=''; renderBudget();
})
$('#bdg_spent_add').addEventListener('click',()=>{
  const name=$('#bdg_spent_name').value.trim(); const amt=Number($('#bdg_spent_amt').value||0); if(!name||!amt)return;
  const list=store.get('budget',[]); const it=list.find(x=>x.name===name); if(it){it.spent+=amt; store.set('budget',list); renderBudget()} else {alert('Kategorie nicht gefunden')}
})

// Reset
$('#btn_reset').addEventListener('click',()=>{if(confirm('Alle Demo Daten löschen')){localStorage.clear(); renderGoals(); updateImpactChart(); renderCO2(); renderCards(); renderBudget()}})

// Init
window.addEventListener('DOMContentLoaded',()=>{
  if(!store.get('goals',null)) store.set('goals',[{name:'Notebook',target:1200,saved:120},{name:'Notgroschen',target:900,saved:60}]);
  renderGoals(); renderCO2(); renderCards(); renderBudget(); updateImpactChart(); initMap();
})
