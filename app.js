/* FAMILY HUB · mobile-first shared calendar */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const cfg=window.FAMILY_HUB_CONFIG||{};
const cloud=Boolean(cfg.supabaseUrl&&cfg.supabasePublishableKey);
const now=new Date();
const monthNames=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const dayNames=["So.","Mo.","Di.","Mi.","Do.","Fr.","Sa."];
const st={page:"calendar",month:new Date(now.getFullYear(),now.getMonth(),1),events:[],notes:[],members:[],familyId:null,user:null,client:null,reloading:false,channel:null,busy:false};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const dateFor=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addDay=(d,n)=>iso(new Date(d.getFullYear(),d.getMonth(),d.getDate()+n));
const uuid=()=>crypto.randomUUID();
const time=e=>e.all_day||!e.event_time?"Ganztägig":String(e.event_time).slice(0,5)+" Uhr";
const sorted=()=>[...st.events].sort((a,b)=>(a.event_date+" "+(a.all_day?"00:00":a.event_time||"99:99")).localeCompare(b.event_date+" "+(b.all_day?"00:00":b.event_time||"99:99")));
const shortDate=s=>dateFor(s).toLocaleDateString("de-DE",{day:"numeric",month:"long",year:"numeric"});
function status(s,type=""){const el=$("statusbar");el.textContent=s;el.className="statusbar "+type}
function localRead(key){try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:null}catch{return null}}
function saveLocal(){if(!cloud){localStorage.setItem("family-hub.events.v1",JSON.stringify(st.events));localStorage.setItem("family-hub.notes.v1",JSON.stringify(st.notes))}}
function demo(){
st.events=localRead("family-hub.events.v1")||[
{id:uuid(),event_date:iso(now),event_time:"10:30",all_day:false,title:"Arzt",details:""},
{id:uuid(),event_date:iso(now),event_time:"17:00",all_day:false,title:"Einkaufen",details:""},
{id:uuid(),event_date:addDay(now,1),event_time:null,all_day:true,title:"Oma Geburtstag",details:""},
{id:uuid(),event_date:addDay(now,2),event_time:"18:00",all_day:false,title:"Fußball",details:""},
{id:uuid(),event_date:addDay(now,4),event_time:"18:00",all_day:false,title:"Familienessen",details:""}];
st.notes=localRead("family-hub.notes.v1")||[{id:uuid(),body:"Einkaufsliste für das Wochenende",done:false}];
st.members=[{display_name:"Familienmitglied 1"},{display_name:"Familienmitglied 2"},{display_name:"Familienmitglied 3"}];saveLocal();
status("Demo-Modus: Daten werden nur auf diesem Gerät gespeichert. Für die gemeinsame Nutzung Supabase verbinden.","demo");render();
}
function showLogin(){st.user=null;$("add-button").hidden=true;$("main-content").innerHTML='<div class="panel"><h1>Willkommen bei FAMILY HUB</h1><p>Bitte anmelden, um den Familienkalender zu sehen.</p></div>';if(!$("login-dialog").open)$("login-dialog").showModal()}
function hideLogin(){if($("login-dialog").open)$("login-dialog").close()}
async function initCloud(){
if(!window.supabase?.createClient){status("Supabase-Bibliothek konnte nicht geladen werden. Bitte Verbindung prüfen.","error");return}
try{st.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
st.client.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){if(st.channel){st.client.removeChannel(st.channel);st.channel=null}st.familyId=null;st.events=[];st.notes=[];st.members=[];status("Bitte anmelden.");showLogin()}});
const {data,error}=await st.client.auth.getSession();if(error)throw error;
if(data.session){st.user=data.session.user;await reload()}else showLogin();
window.addEventListener("focus",()=>{if(st.user)reload(true)});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&st.user)reload(true)});
setInterval(()=>{if(!document.hidden&&st.user)reload(true)},30000);
}catch(e){status("Anmeldung kann nicht gestartet werden: "+(e.message||e),"error");showLogin()}
}
async function reload(quiet=false){
if(st.reloading||!st.user)return;st.reloading=true;
try{
const {data:member,error:memberError}=await st.client.from("family_members").select("family_id").eq("user_id",st.user.id).maybeSingle();
if(memberError)throw memberError;
if(!member){st.familyId=null;st.events=[];st.notes=[];st.members=[];status("Konto ist noch keiner Familie zugeordnet. Bitte in Supabase freischalten.","error");hideLogin();render();return}
st.familyId=member.family_id;
const r=await Promise.all([
st.client.from("events").select("id,title,event_date,event_time,all_day,details,created_by").eq("family_id",st.familyId),
st.client.from("notes").select("id,body,done,created_by").eq("family_id",st.familyId),
st.client.from("family_members").select("user_id,display_name").eq("family_id",st.familyId)]);
for(const x of r)if(x.error)throw x.error;
st.events=r[0].data||[];st.notes=r[1].data||[];st.members=r[2].data||[];
hideLogin();if(!quiet)status("Gemeinsamer Kalender verbunden – alle Familienmitglieder sehen die Änderungen.","demo");
if(!st.channel){st.channel=st.client.channel("family-hub-"+st.familyId).on("postgres_changes",{event:"*",schema:"public",table:"events",filter:"family_id=eq."+st.familyId},()=>reload(true)).on("postgres_changes",{event:"*",schema:"public",table:"notes",filter:"family_id=eq."+st.familyId},()=>reload(true)).subscribe()}
render();
}catch(e){status("Laden fehlgeschlagen: "+(e.message||e),"error");if(!quiet)render()}finally{st.reloading=false}
}
function iconFor(title){const t=title.toLowerCase();if(/arzt|klinik|zahnarzt/.test(t))return "♧";if(/einkauf/.test(t))return "🛒";if(/geburtstag|feier/.test(t))return "🎁";if(/schule|uni/.test(t))return "🎓";if(/fußball|sport/.test(t))return "⚽";if(/essen/.test(t))return "🍴";if(/müll/.test(t))return "♻";if(/flug|urlaub/.test(t))return "✈";return "•"}
function eventButton(e){return '<button class="event-item" type="button" data-event-id="'+esc(e.id)+'"><span class="event-icon" aria-hidden="true">'+iconFor(e.title)+'</span><span class="event-info"><span class="event-title">'+esc(e.title)+'</span><br><span class="event-time">'+esc(time(e))+'</span></span></button>'}
function week(d){const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));const y=x.getUTCFullYear();return [Math.ceil(((x-new Date(Date.UTC(y,0,1)))/86400000+1)/7),y]}
function calendar(){const y=st.month.getFullYear(),m=st.month.getMonth(),last=new Date(y,m+1,0).getDate();let h='<div class="month-navigation"><button class="text-button" data-month-shift="-1">← Vorheriger Monat</button><button class="text-button" data-month-shift="1">Nächster Monat →</button></div>';const events=sorted();for(let d=1;d<=last;d++){const date=new Date(y,m,d),key=iso(date);if(d===1||date.getDay()===1){const [w,yr]=week(date);h+='<div class="week-title"><h2>KW '+w+', '+yr+'</h2><small>Termine im Überblick</small></div>'}h+='<div class="calendar-row"><div class="date-label '+(key===iso(now)?"today":"")+'"><span class="weekday">'+dayNames[date.getDay()]+'</span><span class="day-number">'+d+'</span></div><div class="date-card">';const dayEvents=events.filter(e=>e.event_date===key);h+=dayEvents.length?dayEvents.map(eventButton).join(""):'<button type="button" class="empty-day" data-add-date="'+key+'">+ Zum Erstellen tippen</button>';h+='</div></div>'}return h}
function home(){const n=sorted().filter(e=>e.event_date>=iso(now)).slice(0,8);return '<div class="today-feature"><div><span class="pill">FAMILY HUB</span><h1 class="page-title" style="margin-top:13px">Hallo, Familie!</h1><p>'+now.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})+'</p></div><button class="outlined-button" data-go="calendar">Kalender →</button></div><div class="card-grid"><div class="mini-stat"><b>'+st.events.filter(e=>e.event_date===iso(now)).length+'</b><span>Termine heute</span></div><div class="mini-stat"><b>'+st.members.length+'</b><span>Familienmitglieder</span></div></div><div class="section-heading"><h2>Nächste Termine</h2></div>'+(n.length?n.map(e=>'<div class="panel"><small class="muted">'+shortDate(e.event_date)+'</small>'+eventButton(e)+'</div>').join(""):'<div class="panel">Keine Termine geplant</div>')}
function family(){return '<h1 class="page-title">Unsere Familie</h1><p class="lead">Alle Mitglieder sehen denselben Kalender – ohne unterschiedliche Farben.</p><div class="panel"><div class="section-heading" style="margin-top:0"><h2>Familienmitglieder</h2><small>'+st.members.length+' von 6</small></div>'+st.members.map(p=>'<div class="person-row"><div class="avatar">'+esc(p.display_name?.slice(0,1).toUpperCase()||"?")+'</div><div><b>'+esc(p.display_name)+'</b><span>Kann Termine sehen und bearbeiten</span></div></div>').join("")+'</div><div class="panel guide"><b>Familie verwalten</b><p class="muted">Die Familienkonten werden im Supabase-Dashboard angelegt und freigeschaltet. Maximal 6 Benutzer.</p></div>'}
function notes(){return '<h1 class="page-title">Familien-Merkzettel</h1><p class="lead">Aufgaben und Einkaufsnotizen für alle.</p>'+(st.notes.length?st.notes.map(n=>'<div class="note-row"><input type="checkbox" data-note-check="'+esc(n.id)+'" '+(n.done?"checked":"")+' aria-label="Erledigt"><button class="note-button '+(n.done?"done":"")+'" data-note-id="'+esc(n.id)+'">'+esc(n.body)+'</button><button class="note-more" data-note-id="'+esc(n.id)+'" aria-label="Notiz bearbeiten">✎</button></div>').join(""):'<div class="panel empty-state"><strong>Keine Notizen</strong>Tippe auf +.</div>')}
function help(){return '<h1 class="page-title">Hilfe & Einrichtung</h1><div class="panel guide"><h2>So funktioniert FAMILY HUB</h2><p>Tippe auf eine leere Tageskachel, um einen Termin einzutragen. Tippe auf einen Termin, um ihn zu bearbeiten oder zu löschen. Mit + kannst du jederzeit etwas hinzufügen.</p><p>Die Daten bleiben im Demo-Modus nur auf dem jeweiligen Gerät. Für gemeinsame Daten und sechs Logins bitte die Datei SETUP.md im GitHub-Repository beachten.</p><p>Auf dem iPhone: Safari → Teilen → Zum Home-Bildschirm. Auf Android: Browser-Menü → App installieren.</p></div>'}
function render(){if(cloud&&!st.user){showLogin();return}$("month-title").textContent=monthNames[st.month.getMonth()]+" "+st.month.getFullYear();if(cloud&&!st.familyId){$("add-button").hidden=true;$("main-content").innerHTML='<div class="panel"><h1>Noch nicht freigeschaltet</h1><p>Dieses Konto muss erst der Familie zugeordnet werden.</p><button class="outlined-button" id="no-member-logout">Abmelden</button></div>';return}const views={calendar,home,family,notes,help};$("main-content").innerHTML=(views[st.page]||calendar)();$("add-button").hidden=st.page==="family"||st.page==="help";document.querySelectorAll(".nav-item").forEach(b=>{b.classList.toggle("selected",b.dataset.page===st.page);if(b.dataset.page===st.page)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});$("account-info").textContent=cloud?"Angemeldet: "+(st.user?.email||"Familienmitglied"):"Demo-Modus auf diesem Gerät";$("logout-button").hidden=!cloud}
function go(page){st.page=page;render();window.scrollTo({top:0,behavior:"instant"})}
function changeMonth(n){st.month=new Date(st.month.getFullYear(),st.month.getMonth()+n,1);go("calendar")}
function openEvent(date=iso(now),id){const e=id?st.events.find(x=>x.id===id):null,f=$("event-form");f.reset();f.elements.id.value=e?.id||"";f.elements.title.value=e?.title||"";f.elements.event_date.value=e?.event_date||date;f.elements.event_time.value=String(e?.event_time||"").slice(0,5);f.elements.all_day.checked=Boolean(e?.all_day);f.elements.event_time.disabled=Boolean(e?.all_day);f.elements.details.value=e?.details||"";$("delete-event").hidden=!e;$("event-dialog-title").textContent=e?"Termin bearbeiten":"Termin hinzufügen";$("event-error").textContent="";$("event-dialog").showModal()}
function openNote(id){const n=id?st.notes.find(x=>x.id===id):null,f=$("note-form");f.reset();f.elements.id.value=n?.id||"";f.elements.body.value=n?.body||"";$("delete-note").hidden=!n;$("note-dialog-title").textContent=n?"Notiz bearbeiten":"Notiz hinzufügen";$("note-error").textContent="";$("note-dialog").showModal()}
async function saveEvent(p){if(cloud){const f=st.client.from("events");const q=p.id?f.update({title:p.title,event_date:p.event_date,event_time:p.event_time,all_day:p.all_day,details:p.details}).eq("id",p.id).eq("family_id",st.familyId):f.insert({title:p.title,event_date:p.event_date,event_time:p.event_time,all_day:p.all_day,details:p.details,family_id:st.familyId,created_by:st.user.id});const {error}=await q;if(error)throw error;await reload(true)}else{if(p.id){st.events=st.events.map(e=>e.id===p.id?{...e,...p}:e)}else st.events.push({...p,id:uuid()});saveLocal();render()}}
async function saveNote(p){if(cloud){const f=st.client.from("notes");const q=p.id?f.update({body:p.body,done:p.done}).eq("id",p.id).eq("family_id",st.familyId):f.insert({body:p.body,done:p.done,family_id:st.familyId,created_by:st.user.id});const {error}=await q;if(error)throw error;await reload(true)}else{if(p.id)st.notes=st.notes.map(n=>n.id===p.id?{...n,...p}:n);else st.notes.push({...p,id:uuid()});saveLocal();render()}}
async function remove(table,id){if(cloud){const {error}=await st.client.from(table).delete().eq("id",id).eq("family_id",st.familyId);if(error)throw error;await reload(true)}else{if(table==="events")st.events=st.events.filter(e=>e.id!==id);else st.notes=st.notes.filter(n=>n.id!==id);saveLocal();render()}}
function busy(v){st.busy=v;document.querySelectorAll(".sheet .primary-button").forEach(b=>b.disabled=v)}
$("event-form").addEventListener("submit",async e=>{e.preventDefault();if(st.busy)return;const f=e.target,p={id:f.elements.id.value||null,title:f.elements.title.value.trim(),event_date:f.elements.event_date.value,event_time:f.elements.all_day.checked?null:f.elements.event_time.value||null,all_day:f.elements.all_day.checked,details:f.elements.details.value.trim()};if(!p.title)return;busy(true);try{await saveEvent(p);$("event-dialog").close()}catch(x){$("event-error").textContent=x.message||"Fehler beim Speichern"}finally{busy(false)}});
$("note-form").addEventListener("submit",async e=>{e.preventDefault();if(st.busy)return;const f=e.target,n=st.notes.find(x=>x.id===f.elements.id.value),p={id:f.elements.id.value||null,body:f.elements.body.value.trim(),done:n?.done||false};if(!p.body)return;busy(true);try{await saveNote(p);$("note-dialog").close()}catch(x){$("note-error").textContent=x.message||"Fehler beim Speichern"}finally{busy(false)}});
$("event-allday").addEventListener("change",e=>{$("event-time").disabled=e.target.checked;if(e.target.checked)$("event-time").value=""});
$("add-button").addEventListener("click",()=>st.page==="notes"?openNote():openEvent());
document.querySelectorAll(".nav-item").forEach(x=>x.addEventListener("click",()=>go(x.dataset.page)));
$("today-button").addEventListener("click",()=>{st.month=new Date(now.getFullYear(),now.getMonth(),1);go("calendar");setTimeout(()=>document.querySelector(".date-label.today")?.scrollIntoView({behavior:"smooth",block:"center"}),100)});
$("month-picker-button").addEventListener("click",()=>{const s=$("jump-month");s.innerHTML=monthNames.map((v,i)=>'<option value="'+i+'">'+v+'</option>').join("");s.value=st.month.getMonth();$("jump-year").value=st.month.getFullYear();$("month-dialog").showModal()});
$("jump-button").addEventListener("click",()=>{const y=Number($("jump-year").value),m=Number($("jump-month").value);if(y>=2000&&y<=2100){st.month=new Date(y,m,1);$("month-dialog").close();go("calendar")}});
for(const id of ["menu-button","more-button"])$(id).addEventListener("click",()=>$("menu-dialog").showModal());
$("menu-today").addEventListener("click",()=>{$("menu-dialog").close();$("today-button").click()});
$("menu-help").addEventListener("click",()=>{$("menu-dialog").close();go("help")});
$("logout-button").addEventListener("click",async()=>{$("menu-dialog").close();if(st.client)await st.client.auth.signOut()});
document.querySelectorAll("[data-close-dialog]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.closeDialog).close()));
$("main-content").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.eventId)openEvent(undefined,b.dataset.eventId);else if(b.dataset.addDate)openEvent(b.dataset.addDate);else if(b.dataset.monthShift)changeMonth(Number(b.dataset.monthShift));else if(b.dataset.go)go(b.dataset.go);else if(b.dataset.noteId)openNote(b.dataset.noteId);else if(b.id==="no-member-logout")st.client?.auth.signOut()});
$("main-content").addEventListener("change",async e=>{const id=e.target.dataset.noteCheck,n=st.notes.find(x=>x.id===id);if(!n)return;try{await saveNote({...n,done:e.target.checked})}catch(x){status("Notiz konnte nicht geändert werden: "+x.message,"error");render()}});
$("delete-event").addEventListener("click",async()=>{const id=$("event-form").elements.id.value;if(!id||!confirm("Termin löschen?"))return;busy(true);try{await remove("events",id);$("event-dialog").close()}catch(e){$("event-error").textContent=e.message}finally{busy(false)}});
$("delete-note").addEventListener("click",async()=>{const id=$("note-form").elements.id.value;if(!id||!confirm("Notiz löschen?"))return;busy(true);try{await remove("notes",id);$("note-dialog").close()}catch(e){$("note-error").textContent=e.message}finally{busy(false)}});
$("login-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.target.querySelector('button[type="submit"]');b.disabled=true;$("login-error").textContent="";try{const {data,error}=await st.client.auth.signInWithPassword({email:$("login-email").value.trim(),password:$("login-password").value});if(error)throw error;st.user=data.user;await reload();if(st.familyId)hideLogin()}catch(x){$("login-error").textContent=x.message||"Login fehlgeschlagen"}finally{b.disabled=false}});
for(const d of document.querySelectorAll("dialog"))d.addEventListener("click",e=>{if(e.target===d&&d.id!=="login-dialog")d.close()});
cloud?initCloud():demo();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();