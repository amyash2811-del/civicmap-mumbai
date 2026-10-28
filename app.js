
// CivicMap UI state: theme, mobile navigation, reports and map data.

const issues = [
  {id:'MUM-2026-001245',cat:'Roads',title:'Large pothole',loc:'Andheri West',status:'In Progress',icon:'🚧',desc:'Large pothole affecting vehicles near a busy road entrance.',lat:19.1364,lng:72.8296},
  {id:'MUM-2026-001231',cat:'Garbage',title:'Overflowing waste point',loc:'Bandra West',status:'Reported',icon:'🗑️',desc:'Garbage accumulation around a public collection point.',lat:19.0607,lng:72.8362},
  {id:'MUM-2026-001220',cat:'Streetlight',title:'Streetlight not working',loc:'Dadar West',status:'Assigned',icon:'💡',desc:'Streetlight has reportedly remained non-functional.',lat:19.0178,lng:72.8301},
  {id:'MUM-2026-001198',cat:'Water',title:'Water leakage',loc:'Kurla West',status:'Resolved',icon:'💧',desc:'Water leakage reported near a public road.',lat:19.0726,lng:72.8793},
  {id:'MUM-2026-001176',cat:'Roads',title:'Damaged footpath',loc:'Colaba',status:'Verified',icon:'🚶',desc:'Broken section of footpath affecting pedestrians.',lat:18.9067,lng:72.8147}
];

const communityPosts = [
  {id:'POST-001',title:'Pothole near Andheri West station needs attention',category:'Pothole',loc:'Andheri West',body:'There is a large pothole close to the station entrance. It becomes harder to notice after rain. Has anyone else reported it?',author:'A Mumbai resident',time:'2h ago',replies:[{author:'Local resident',text:'Yes, I have noticed the same problem.'},{author:'A Mumbai resident',text:'I have added an official complaint on CivicMap.'}]},
  {id:'POST-002',title:'Garbage collection point overflowing',category:'Garbage',loc:'Bandra West',body:'The collection point has been overflowing since yesterday evening. Please share if the collection schedule has changed.',author:'Community member',time:'5h ago',replies:[{author:'Neighbour',text:'Same situation this morning.'}]},
  {id:'POST-003',title:'Streetlight is not working on our lane',category:'Streetlight',loc:'Dadar West',body:'The streetlight has remained off for several nights. It would be useful to know whether there is an existing complaint.',author:'Mumbai resident',time:'1d ago',replies:[]}
];
let authorityInbox = [];
try { authorityInbox = JSON.parse(localStorage.getItem('civicmap-authority-inbox') || '[]'); } catch (_) { authorityInbox = []; }
const OFFICER_RECEIVE_DELAY_MS = 8000;
const STATUS_FLOW = ['Reported','Received by BMC','Verified','Assigned','In Progress','Resolved','Citizen Verification','Closed'];
function persistAuthorityInbox(){ try{localStorage.setItem('civicmap-authority-inbox',JSON.stringify(authorityInbox.slice(0,50)));}catch(_){} }
function statusIndex(status){ const i=STATUS_FLOW.indexOf(status); return i<0?0:i; }
function syncAuthorityWithReports(){
  myReports.forEach(r=>{
    let a=authorityInbox.find(x=>x.id===r.id);
    if(!a){ a={id:r.id,title:r.title,description:r.description,category:r.category,authority:r.authority,location:r.location,photos:(r.photos||[]).length,status:r.status||'Reported',createdAt:r.createdAt,receivedAt:r.receivedAt||null,verifiedAt:r.verifiedAt||null,assignedAt:r.assignedAt||null,instructions:r.instructions||'',completionDate:r.completionDate||'',officerNote:r.officerNote||'',resolvedAt:r.resolvedAt||null,citizenVerified:r.citizenVerified||false}; authorityInbox.push(a); }
    if(a.status==='Reported' && r.receivedAt) a.status='Received by BMC';
  });
  persistAuthorityInbox();
}
function syncReportFromAuthority(id){
  const a=authorityInbox.find(x=>x.id===id), r=myReports.find(x=>x.id===id);
  if(!a||!r)return;
  Object.assign(r,{status:a.status,receivedAt:a.receivedAt,verifiedAt:a.verifiedAt,assignedAt:a.assignedAt,instructions:a.instructions,completionDate:a.completionDate,officerNote:a.officerNote,resolvedAt:a.resolvedAt,citizenVerified:a.citizenVerified});
  const issue=issues.find(x=>x.id===id); if(issue)issue.status=a.status;
  persistMyReports(); persistAuthorityInbox(); renderMyReports(); renderAuthorityInbox(); renderIssues(); updateMapMarkers();
}
function processAutomaticReceipt(){
  const now=Date.now(); let changed=false;
  authorityInbox.forEach(a=>{
    const r=myReports.find(x=>x.id===a.id);
    const created=Date.parse(r?.createdAt||a.createdAt||'')||now;
    if(a.status==='Reported' && now-created>=OFFICER_RECEIVE_DELAY_MS){ a.status='Received by BMC'; a.receivedAt=new Date().toLocaleString('en-IN'); if(r){r.status=a.status;r.receivedAt=a.receivedAt;} changed=true; }
  });
  if(changed){persistMyReports();persistAuthorityInbox();renderAuthorityInbox();renderMyReports();renderIssues();updateMapMarkers();toast('Your complaint has reached the BMC officer dashboard.');}
}
setInterval(processAutomaticReceipt,2000);
let myReports = [];
try { myReports = JSON.parse(localStorage.getItem('civicmap-my-reports') || '[]'); } catch (_) { myReports = []; }
// Remove obvious test/demo submissions from older prototype builds, while keeping real complaints.
const beforeCleanupCount=myReports.length;
myReports=myReports.filter(r=>!(/\b(test|demo|sample)\b/i.test(`${r.title||''} ${r.description||''}`)));
if(myReports.length!==beforeCleanupCount){try{localStorage.setItem('civicmap-my-reports',JSON.stringify(myReports.slice(0,20)));}catch(_){}}
syncAuthorityWithReports();
processAutomaticReceipt();
let selectedCat='Pothole';
let selectedLocation={lat:19.1364,lng:72.8296,address:'Andheri West, Mumbai'};
let selectedMarker=null;
let mapInstance=null;
const issueList=document.getElementById('issueList');

function renderIssues(filter='all'){
  issueList.innerHTML=issues.filter(x=>filter==='all'||x.cat===filter).map(x=>`<div class="issue" onclick="showIssue('${x.id}')"><div class="issue-top"><b>${x.icon} ${x.title}</b><span class="tag">${x.status}</span></div><p>📍 ${x.loc} · ${x.id}</p><p>${x.desc}</p></div>`).join('')||'<div class="issue"><b>No issues in this filter.</b><p>Try another category.</p></div>';
}
renderIssues();

document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  renderIssues(b.dataset.filter);
  updateMapMarkers(b.dataset.filter);
});

document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.cat').forEach(x=>x.classList.remove('selected'));
  b.classList.add('selected');
  selectedCat=b.dataset.cat;
  document.getElementById('routeIssue').textContent=selectedCat;
  const ai={Pothole:'Pothole detected · 94% confidence',Garbage:'Garbage issue detected · 91% confidence',Streetlight:'Streetlight issue detected · 88% confidence',Water:'Water/drainage issue suggested · 86% confidence',Footpath:'Footpath damage suggested · 84% confidence',Other:'AI classification pending'};
  document.getElementById('aiResult').textContent=ai[selectedCat]||ai.Other;
});

let selectedPhotoFiles=[];
function renderPhotoPreviews(){
  const p=document.getElementById('previews'); if(!p)return; p.innerHTML='';
  selectedPhotoFiles.forEach((file,index)=>{
    const wrap=document.createElement('div'); wrap.className='photo-preview';
    const img=document.createElement('img'); img.src=URL.createObjectURL(file); img.alt='Complaint evidence preview';
    const remove=document.createElement('button'); remove.type='button'; remove.className='remove-photo'; remove.textContent='×'; remove.title='Remove photo';
    remove.onclick=()=>{selectedPhotoFiles.splice(index,1); syncPhotoInput(); renderPhotoPreviews();};
    wrap.append(img,remove); p.appendChild(wrap);
  });
}
function syncPhotoInput(){
  const input=document.getElementById('photoInput'); if(!input)return;
  try{const dt=new DataTransfer(); selectedPhotoFiles.forEach(f=>dt.items.add(f)); input.files=dt.files;}catch(_){}
}
document.getElementById('photoInput').addEventListener('change',e=>{
  const incoming=[...e.target.files];
  if(selectedPhotoFiles.length+incoming.length>5){ toast('You can upload a maximum of 5 photos.'); syncPhotoInput(); return; }
  selectedPhotoFiles=[...selectedPhotoFiles,...incoming]; syncPhotoInput(); renderPhotoPreviews();
});

function initTheme(){
  const saved=localStorage.getItem('civicmap-theme');
  const theme=saved==='dark'||saved==='light'?saved:(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light');
  applyTheme(theme);
}
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  localStorage.setItem('civicmap-theme',theme);
  const btn=document.getElementById('themeToggle');
  if(btn){btn.innerHTML=theme==='dark'?'☀️ <span>Light</span>':'🌙 <span>Dark</span>'; btn.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode');}
  setTimeout(()=>mapInstance?.invalidateSize(true),50);
}
function toggleTheme(){applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');}
function toggleMobileMenu(){
  const top=document.querySelector('.topbar'); const btn=document.getElementById('menuToggle'); if(!top)return;
  const open=top.classList.toggle('nav-open'); btn?.setAttribute('aria-expanded',String(open));
}
function closeMobileMenu(){document.querySelector('.topbar')?.classList.remove('nav-open'); document.getElementById('menuToggle')?.setAttribute('aria-expanded','false');}
document.querySelectorAll('#mainNav a').forEach(a=>a.addEventListener('click',closeMobileMenu));
document.addEventListener('click',e=>{const top=document.querySelector('.topbar'); if(top?.classList.contains('nav-open')&&!top.contains(e.target))closeMobileMenu();});
initTheme();


function escapeHtml(value){
  return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function renderCommunity(){
  const feed=document.getElementById('communityFeed');
  if(!feed)return;
  feed.innerHTML=communityPosts.map(post=>`<article class="community-post">
    <div class="post-head"><div><span class="post-category">${escapeHtml(post.category)}</span><h3>${escapeHtml(post.title)}</h3><div class="post-meta">📍 ${escapeHtml(post.loc)} · ${escapeHtml(post.author)} · ${escapeHtml(post.time)}</div></div><button class="text-btn" onclick="scrollToComplaintForm('${escapeHtml(post.category)}')">Report this issue</button></div>
    <p>${escapeHtml(post.body)}</p>
    <div class="post-actions"><span>💬 ${post.replies.length} responses</span><button onclick="toggleReplies('${post.id}')">View / reply</button></div>
    <div class="reply-area" id="reply-${post.id}" style="display:none"><div class="replies">${post.replies.map(r=>`<div class="reply"><b>${escapeHtml(r.author)}</b><span>${escapeHtml(r.text)}</span></div>`).join('') || '<div class="muted">No responses yet.</div>'}</div><div class="reply-compose"><input id="reply-input-${post.id}" placeholder="Write a response…" maxlength="300"/><button class="primary" onclick="addReply('${post.id}')">Reply</button></div></div>
  </article>`).join('');
}
function toggleReplies(id){
  const el=document.getElementById('reply-'+id); if(!el)return;
  el.style.display=el.style.display==='none'?'block':'none';
}
function addReply(id){
  const input=document.getElementById('reply-input-'+id); const text=input?.value.trim(); if(!text){toast('Write a response first.');return;}
  const post=communityPosts.find(x=>x.id===id); if(!post)return;
  post.replies.push({author:'You',text}); input.value=''; renderCommunity(); document.getElementById('reply-'+id).style.display='block'; toast('Your response was added to the discussion.');
}
function openCommunityComposer(){
  const title=prompt('Discussion heading'); if(title===null)return;
  const body=prompt('What would you like the Mumbai community to know?'); if(body===null)return;
  if(!title.trim()||!body.trim()){toast('Please add both a heading and description.');return;}
  const post={id:'POST-'+String(Date.now()).slice(-6),title:title.trim(),category:selectedCat,loc:selectedLocation.address.split(',')[0],body:body.trim(),author:'You',time:'just now',replies:[]};
  communityPosts.unshift(post); renderCommunity(); document.getElementById('community').scrollIntoView({behavior:'smooth'}); toast('Discussion posted to the Mumbai community.');
}
function scrollToComplaintForm(category){
  const btn=document.querySelector(`.cat[data-cat="${CSS.escape(category)}"]`); if(btn)btn.click();
  openReport();
}
function renderAuthorityInbox(){
  const box=document.getElementById('authorityInbox'); if(!box)return;
  const filter=document.getElementById('authorityFilter')?.value||'all';
  const rows=authorityInbox.filter(x=>filter==='all'||x.authority.startsWith(filter));
  box.innerHTML=rows.length?rows.map(x=>`<div class="authority-item authority-workflow-item">
    <div class="authority-item-main"><div class="my-report-top"><span class="post-category">${escapeHtml(x.category)}</span><span class="status-pill status-${String(x.status).toLowerCase().replace(/\s+/g,'-')}">${escapeHtml(x.status)}</span></div>
    <h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description)}</p><small>📍 ${escapeHtml(x.location)} · 🆔 ${escapeHtml(x.id)}</small>
    <div class="authority-timeline"><span class="done">✓ Reported</span><span class="${statusIndex(x.status)>=1?'done':''}">BMC Received</span><span class="${statusIndex(x.status)>=2?'done':''}">Verified</span><span class="${statusIndex(x.status)>=3?'done':''}">Assigned</span><span class="${statusIndex(x.status)>=4?'done':''}">In Progress</span><span class="${statusIndex(x.status)>=5?'done':''}">Resolved</span><span class="${statusIndex(x.status)>=6?'done':''}">Citizen Verification</span></div></div>
    <div class="authority-item-side"><b>${escapeHtml(x.authority)}</b><small>${escapeHtml(String(x.photos||0))} photo(s)</small>
      ${statusIndex(x.status)<2?`<button class="authority-action" onclick="officerVerify('${escapeHtml(x.id)}')">✓ Verify complaint</button>`:''}
      ${statusIndex(x.status)>=2&&statusIndex(x.status)<3?`<button class="authority-action" onclick="openOfficerAction('${escapeHtml(x.id)}')">Assign & give instruction</button>`:''}${statusIndex(x.status)===3?`<button class="authority-action" onclick="officerStartWork('${escapeHtml(x.id)}')">▶ Start work</button>`:''}
      ${statusIndex(x.status)===4?`<button class="authority-action" onclick="officerResolve('${escapeHtml(x.id)}')">Mark work completed</button>`:''}
      ${statusIndex(x.status)>=5&&statusIndex(x.status)<7?`<button class="authority-action" onclick="citizenVerifyComplaint('${escapeHtml(x.id)}')">Citizen verifies repair</button>`:''}
    </div>
    ${x.instructions||x.completionDate||x.officerNote?`<div class="officer-plan"><b>Officer instruction</b><p>${escapeHtml(x.instructions||'No instruction added yet.')}</p><span>Expected completion: <b>${escapeHtml(x.completionDate||'Not set')}</b></span>${x.officerNote?`<small>Officer note: ${escapeHtml(x.officerNote)}</small>`:''}</div>`:''}
  </div>`).join(''):'<div class="authority-empty">No complaints have reached the officer dashboard yet. New complaints appear here automatically after the simulated routing delay.</div>';
}
function officerVerify(id){
  const a=authorityInbox.find(x=>x.id===id); if(!a)return;
  if(statusIndex(a.status)>=2)return;
  a.status='Verified'; a.verifiedAt=new Date().toLocaleString('en-IN'); syncReportFromAuthority(id); toast(`${id} verified by the BMC officer.`);
}
function openOfficerAction(id){
  const a=authorityInbox.find(x=>x.id===id); if(!a)return;
  const instruction=prompt('Officer instruction — what work should be carried out?',a.instructions||'Inspect the reported issue and complete the required civic repair work.');
  if(instruction===null)return;
  const date=prompt('Expected completion date (e.g. 15 Oct 2026):',a.completionDate||''); if(date===null)return;
  const note=prompt('Optional officer note for the citizen:',a.officerNote||''); if(note===null)return;
  a.instructions=instruction.trim()||'Work assigned to the responsible field team.'; a.completionDate=date.trim()||'To be scheduled'; a.officerNote=note.trim(); a.status='Assigned'; a.assignedAt=new Date().toLocaleString('en-IN'); syncReportFromAuthority(id); toast(`Work assigned for ${id}.`);
}
function officerStartWork(id){ const a=authorityInbox.find(x=>x.id===id); if(!a)return; a.status='In Progress'; syncReportFromAuthority(id); }
function officerResolve(id){
  const a=authorityInbox.find(x=>x.id===id); if(!a)return;
  const note=prompt('Add a completion note (optional):',a.officerNote||'Repair work completed.'); if(note===null)return;
  a.officerNote=note.trim()||'Repair work completed.'; a.status='Resolved'; a.resolvedAt=new Date().toLocaleString('en-IN'); syncReportFromAuthority(id); toast(`${id} marked as work completed. Citizen verification is now pending.`);
}
function citizenVerifyComplaint(id){
  const a=authorityInbox.find(x=>x.id===id); if(!a)return;
  a.citizenVerified=true; a.status='Closed'; syncReportFromAuthority(id); toast(`${id} is closed after citizen verification.`);
}
renderCommunity();
renderAuthorityInbox();
renderMyReports();

function openReport(){document.querySelector('#report').scrollIntoView({behavior:'smooth'}); setTimeout(()=>mapInstance?.invalidateSize(),500)}
function chooseReportLocation(){
  document.querySelector('#map').scrollIntoView({behavior:'smooth'});
  setTimeout(()=>{
    mapInstance?.invalidateSize(true);
    toast('Click anywhere on the Mumbai map to select the issue location.');
  },450);
}
function renderMyReports(){
  const box=document.getElementById('myReports'); if(!box)return;
  if(!myReports.length){
    box.innerHTML='<div class="my-reports-empty"><div class="empty-icon">📍</div><div><b>No complaints raised yet</b><p>When you submit a civic issue, it will appear here with its location, photos, complaint ID and status.</p></div><button class="primary" onclick="openReport()">＋ Report an issue</button></div>';
    return;
  }
  box.innerHTML=myReports.map(r=>`<article class="my-report-card">
    <div class="my-report-main">
      <div class="my-report-top"><span class="post-category">${escapeHtml(r.category)}</span><span class="status-pill status-${String(r.status).toLowerCase().replace(/\s+/g,'-')}">${escapeHtml(r.status)}</span></div>
      <h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.description)}</p>
      <div class="my-report-meta"><span>📍 ${escapeHtml(r.location)}</span><span>🆔 ${escapeHtml(r.id)}</span><span>📷 ${(r.photos||[]).length} photo(s)</span></div><div class="citizen-workflow"><b>Complaint progress</b><div class="workflow-line">${STATUS_FLOW.map((step,i)=>`<span class="${i<=statusIndex(r.status)?'done':''}">${i<=statusIndex(r.status)?'✓':'○'} ${step}</span>`).join('')}</div>${r.instructions?`<div class="instruction-box"><b>Officer instruction</b><p>${escapeHtml(r.instructions)}</p><span>Expected completion: <strong>${escapeHtml(r.completionDate||'Not set')}</strong></span>${r.officerNote?`<small>${escapeHtml(r.officerNote)}</small>`:''}</div>`:''}</div>
      <div class="report-actions"><button class="text-btn" onclick="viewMyReport('${escapeHtml(r.id)}')">View on map</button><button class="text-btn" onclick="trackMyReport('${escapeHtml(r.id)}')">Track status</button><button class="danger-btn" onclick="removeComplaint('${escapeHtml(r.id)}')">Remove complaint</button></div>
    </div>
    <div class="my-report-photos">${(r.photos||[]).length ? r.photos.slice(0,3).map(src=>`<img src="${src}" alt="Complaint photo"/>`).join('') : '<div class="no-photo">No photo</div>'}</div>
  </article>`).join('');
}
function persistMyReports(){
  try{localStorage.setItem('civicmap-my-reports',JSON.stringify(myReports.slice(0,20)));return true;}catch(_){return false;}
}
function removeComplaint(id){
  const report=myReports.find(x=>x.id===id); if(!report)return;
  if(!confirm(`Remove complaint ${id}? This removes it from your local dashboard and map in this prototype.`))return;
  myReports=myReports.filter(x=>x.id!==id);
  for(let i=issues.length-1;i>=0;i--) if(issues[i].id===id) issues.splice(i,1);
  for(let i=authorityInbox.length-1;i>=0;i--) if(authorityInbox[i].id===id) authorityInbox.splice(i,1);
  persistMyReports(); persistAuthorityInbox(); renderMyReports(); renderIssues(); renderAuthorityInbox(); updateMapMarkers();
  document.getElementById('totalStat').textContent=(1248+myReports.length).toLocaleString('en-IN');
  toast('Complaint removed from this prototype.');
}
function clearMyComplaints(){
  if(!myReports.length){toast('There are no complaints to remove.');return;}
  if(!confirm('Remove all complaints you created in this browser?'))return;
  const ids=new Set(myReports.map(x=>x.id));
  for(let i=issues.length-1;i>=0;i--) if(ids.has(issues[i].id)) issues.splice(i,1);
  for(let i=authorityInbox.length-1;i>=0;i--) if(ids.has(authorityInbox[i].id)) authorityInbox.splice(i,1);
  myReports=[]; persistMyReports(); persistAuthorityInbox(); renderMyReports(); renderIssues(); renderAuthorityInbox(); updateMapMarkers();
  document.getElementById('totalStat').textContent='1,248';
  toast('Your complaints were removed from this prototype.');
}
function viewMyReport(id){
  const r=myReports.find(x=>x.id===id); if(!r)return;
  mapInstance?.setView([r.lat,r.lng],16);
  document.querySelector('#map').scrollIntoView({behavior:'smooth'});
  setTimeout(()=>mapInstance?.invalidateSize(true),400);
  toast(`${r.id} · ${r.location}`);
}
function trackMyReport(id){
  const r=myReports.find(x=>x.id===id); if(!r)return;
  document.getElementById('trackInput').value=r.id;
  trackComplaint();
  document.querySelector('#tracking').scrollIntoView({behavior:'smooth'});
}
function closeModal(){document.getElementById('modal').classList.remove('show')}
function showIssue(id){
  const x=issues.find(i=>i.id===id); if(!x)return;
  mapInstance?.setView([x.lat,x.lng],15);
  toast(`${x.id} · ${x.title} · ${x.status}`);
}
function trackComplaint(){
  const v=document.getElementById('trackInput').value.trim()||'MUM-2026-001245';
  const mine=myReports.find(x=>x.id===v);
  if(mine){
    const a=authorityInbox.find(x=>x.id===mine.id)||mine; const flow=STATUS_FLOW.map((step,i)=>`${i<=statusIndex(a.status)?'✓':'○'} ${step}`).join(' → '); document.getElementById('trackResult').innerHTML=`<b>${escapeHtml(mine.id)}</b> — ${escapeHtml(mine.title)}<br>📍 ${escapeHtml(mine.location)}<br><strong>Status: ${escapeHtml(a.status)}</strong><br><small>${flow}</small>${a.instructions?`<br><br><b>Officer instruction:</b> ${escapeHtml(a.instructions)}`:''}${a.completionDate?`<br><b>Expected completion:</b> ${escapeHtml(a.completionDate)}`:''}${a.officerNote?`<br><b>Officer note:</b> ${escapeHtml(a.officerNote)}`:''}`;
    return;
  }
  const known=issues.find(x=>x.id===v)||issues[0];
  document.getElementById('trackResult').innerHTML=`<b>${known.id}</b> — ${known.title}<br>📍 ${known.loc}<br><strong>Status: ${known.status}</strong><br><br>✓ Reported &nbsp; → &nbsp; ✓ Verified &nbsp; → &nbsp; ${known.status==='Resolved'?'✓ Resolved':'→ '+known.status}`;
}
async function compressImage(file){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const max=1000, scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
      const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg',0.76));
    };
    img.onerror=()=>resolve('');
    img.src=URL.createObjectURL(file);
  });
}
async function submitComplaint(){
  const title=document.getElementById('issueTitle').value.trim();
  const desc=document.getElementById('description').value.trim();
  const files=[...selectedPhotoFiles];
  const authority=document.getElementById('authoritySelect').value;
  if(!title){toast('Please add a heading for the issue.');return;}
  if(!desc){toast('Please add a detailed description.');return;}
  if(files.length>5){toast('You can upload a maximum of 5 photos.');return;}
  if(!selectedLocation){toast('Please select the issue location on the map.');return;}
  const id='MUM-2026-'+String(1246+Math.floor(Math.random()*700)).padStart(6,'0');
  const photos=[];
  for(const file of files){ const photo=await compressImage(file); if(photo)photos.push(photo); }
  const createdAt=new Date();
  const report={id,title,description:desc,category:selectedCat,authority,location:selectedLocation.address,lat:selectedLocation.lat,lng:selectedLocation.lng,photos,status:'Reported',createdAt:createdAt.toISOString(),receivedAt:null,verifiedAt:null,assignedAt:null,instructions:'',completionDate:'',officerNote:'',resolvedAt:null,citizenVerified:false};
  myReports.unshift(report);
  try{localStorage.setItem('civicmap-my-reports',JSON.stringify(myReports.slice(0,20)));}catch(_){toast('Report saved for this session; browser storage is full.');}
  // Best-effort save to the new SQLite backend. The original browser demo still works if the API is offline.
  try {
    const apiResponse = await fetch('/api/complaints', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({complaint_id:id,title,description:desc,category:selectedCat,location:selectedLocation.address,
        latitude:selectedLocation.lat,longitude:selectedLocation.lng,authority})
    });
    if (apiResponse.ok) refreshBackendStatus();
    else if (apiResponse.status !== 409) console.warn('Backend did not save this report:', await apiResponse.text());
  } catch (apiError) { console.warn('Backend is offline; complaint remains in browser demo storage.', apiError); }
  const mapCat=['Pothole','Footpath'].includes(selectedCat)?'Roads':selectedCat;
  issues.unshift({id,cat:mapCat,title,loc:selectedLocation.address.split(',')[0],status:'Reported',icon:selectedCat==='Garbage'?'🗑️':selectedCat==='Streetlight'?'💡':selectedCat==='Water'?'💧':selectedCat==='Footpath'?'🚶':'🚧',desc,lat:selectedLocation.lat,lng:selectedLocation.lng});
  authorityInbox.unshift({id,title,description:desc,category:selectedCat,authority,location:selectedLocation.address,photos:photos.length,status:'Reported',createdAt:createdAt.toISOString(),receivedAt:null,verifiedAt:null,assignedAt:null,instructions:'',completionDate:'',officerNote:'',resolvedAt:null,citizenVerified:false});
  persistAuthorityInbox();
  document.getElementById('newId').textContent=id;
  document.getElementById('modalText').textContent=`Your report has been created with a selected map location, detailed description, ${photos.length} photo(s), and a tagged responsible civic/government body.`;
  document.getElementById('modalRouting').innerHTML=`<b>Tagged authority:</b> ${escapeHtml(authority)}<br><span>The complaint is now visible in your dashboard and the authority dashboard in this prototype.</span>`;
  document.getElementById('modal').classList.add('show');
  document.getElementById('totalStat').textContent=(1248+myReports.length).toLocaleString('en-IN');
  renderAuthorityInbox(); renderMyReports(); renderIssues(); updateMapMarkers();
  document.getElementById('issueTitle').value=''; document.getElementById('description').value=''; selectedPhotoFiles=[]; document.getElementById('photoInput').value=''; document.getElementById('previews').innerHTML='';
  toast('Complaint submitted successfully. Check the Dashboard section.');
}

function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove('show'),2800)}

function markerIcon(emoji){
  return L.divIcon({className:'civic-marker',html:`<div>${emoji}</div>`,iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-18]});
}
const markerLayers=[];
function updateMapMarkers(filter='all'){
  markerLayers.forEach(m=>m.remove()); markerLayers.length=0;
  if(!mapInstance)return;
  issues.filter(x=>filter==='all'||x.cat===filter).forEach(x=>{
    const m=L.marker([x.lat,x.lng],{icon:markerIcon(x.icon)}).addTo(mapInstance);
    m.bindPopup(`<strong>${x.icon} ${x.title}</strong><br><small>${x.loc}</small><br><span>${x.status}</span><br><button onclick="showIssue('${x.id}')" style="margin-top:7px;border:0;background:#12231d;color:white;border-radius:6px;padding:6px 8px;cursor:pointer">View complaint</button>`);
    markerLayers.push(m);
  });
}

async function reverseGeocode(lat,lng){
  try{
    const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
    const res=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!res.ok)throw new Error('geocode failed');
    const data=await res.json();
    const a=data.address||{};
    return a.suburb||a.neighbourhood||a.city_district||a.city||data.display_name||'Selected Mumbai location';
  }catch(e){return 'Selected Mumbai location'}
}

function setSelectedLocation(lat,lng,address){
  selectedLocation={lat,lng,address};
  document.getElementById('locationText').textContent=address;
  document.querySelector('.location-box small').textContent=`${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  document.querySelector('.route div:first-child b').textContent=address.split(',')[0];
  if(selectedMarker)selectedMarker.remove();
  selectedMarker=L.marker([lat,lng],{icon:markerIcon('📍')}).addTo(mapInstance).bindPopup('<strong>Report location</strong><br>'+address).openPopup();
}

async function initMumbaiMap(){
  mapInstance=L.map('leafletMap',{zoomControl:true}).setView([19.0760,72.8777],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(mapInstance);
  updateMapMarkers();
  mapInstance.on('click',async e=>{
    const {lat,lng}=e.latlng;
    setSelectedLocation(lat,lng,'Loading location…');
    const address=await reverseGeocode(lat,lng);
    setSelectedLocation(lat,lng,address);
    toast(`Location selected: ${address}`);
    document.querySelector('#report').scrollIntoView({behavior:'smooth'});
  });
  setTimeout(()=>mapInstance.invalidateSize(true),200);
  window.addEventListener('resize',()=>mapInstance?.invalidateSize(true));
}

if(window.L){initMumbaiMap();}


// Backend status card: reads live health and SQLite counts from FastAPI.
async function refreshBackendStatus(){
  const dot=document.getElementById('backendDot');
  const title=document.getElementById('backendStatusTitle');
  const message=document.getElementById('backendStatusText');
  if(!dot||!title||!message)return;
  try{
    const [healthResponse,statsResponse]=await Promise.all([fetch('/api/health'),fetch('/api/stats')]);
    if(!healthResponse.ok||!statsResponse.ok)throw new Error('API response was not successful');
    const health=await healthResponse.json(); const stats=await statsResponse.json();
    dot.className='backend-dot online'; title.textContent='Backend connected';
    message.textContent=`${health.service} · SQLite database is responding`;
    document.getElementById('backendTotal').textContent=stats.total_complaints;
    document.getElementById('backendOpen').textContent=stats.open_complaints;
    document.getElementById('backendResolved').textContent=stats.resolved_complaints;
  }catch(error){
    dot.className='backend-dot offline'; title.textContent='Backend not connected';
    message.textContent='Start the Python server to enable saved backend records.';
    ['backendTotal','backendOpen','backendResolved'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—';});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshBackendStatus);else refreshBackendStatus();
setInterval(refreshBackendStatus,30000);
