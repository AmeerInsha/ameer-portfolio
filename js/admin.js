import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.AMEER_SUPABASE||{}; const $=id=>document.getElementById(id);
let sb, table='projects', editId=null;
const fields={
projects:['title','description','category','client','role','image_url','project_url','case_study_url','featured','published','sort_order'],
experience:['company','position','description','start_date','end_date','location','company_url','tags','logo_url','published','sort_order'],
education:['institution','degree','description','year','logo_url','published','sort_order'],
research:['title','abstract','methodology','key_findings','theoretical_contribution','practical_impact','pdf_url','published','sort_order'],
skills:['name','category','icon','published','sort_order'],services:['name','description','icon','published','sort_order'],
credentials:['name','issuer','description','display_date','credential_type','image_url','credential_url','official_url','details_url','published','sort_order'],
profile:['name','headline','bio','avatar_url','linkedin_url','whatsapp','email','resume_url'],
leads:['name','email','company','service','message','status']
};
const status=(m,e=false)=>{let x=$('status');x.textContent=m;x.classList.remove('hidden');x.classList.toggle('error',e)};

function normalizeArrayField(value){
  if(Array.isArray(value)) return value.join(', ');
  if(value==null) return '';
  return String(value);
}
function serializeField(field,value){
  if(field==='tags'){
    return String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
  }
  if(field==='start_date' || field==='end_date'){
    const v=String(value||'').trim();
    return v==='' ? null : v;
  }
  return value;
}

function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function config(){if(!cfg.url||!cfg.publishableKey)throw Error('Fill js/supabase-config.js with your Supabase Project URL and Publishable/anon key.');sb=createClient(cfg.url,cfg.publishableKey)}
function authUI(s){$('loginCard').classList.toggle('hidden',!!s);$('dashboard').classList.toggle('hidden',!s);$('logout').classList.toggle('hidden',!s);if(s){tabs();load()}}
function tabs(){let t=$('tabs');t.innerHTML='';
[...Object.keys(fields),'media'].forEach(n=>{let b=document.createElement('button');b.textContent=n[0].toUpperCase()+n.slice(1);b.className=n===table?'primary':'ghost';b.onclick=()=>{table=n;editId=null;tabs();n==='media'?loadMedia():load()};t.append(b)})}
function makeInput(f,v){let w=document.createElement('div'),l=document.createElement('label');l.textContent=f;w.append(l);let e;
if(['description','bio','abstract','methodology','key_findings','theoretical_contribution','practical_impact','message'].includes(f))e=document.createElement('textarea');
else if(['published','featured'].includes(f)){e=document.createElement('select');e.innerHTML='<option value="true">Yes</option><option value="false">No</option>';e.value=String(v??true)}
else if(f==='status'){e=document.createElement('select');e.innerHTML='<option value="new">New</option><option value="contacted">Contacted</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="archived">Archived</option>';e.value=String(v??'new')}
else{e=document.createElement('input');e.type=f.endsWith('_date')?'date':f==='sort_order'?'number':'text'}
e.value=v??'';e.dataset.f=f;w.append(e);
if(MEDIA_PICKER_FIELDS.has(f)){
  const pick=document.createElement('button');
  pick.type='button';
  pick.className='ghost media-pick-btn';
  pick.textContent='Choose from Media';
  pick.onclick=()=>chooseFromMedia(e,preferredFolderForField(f));
  w.append(pick);
}
return w}
async function load(){if(table==='media') return loadMedia(); let ed=$('editor');ed.innerHTML='Loading…';
let query=sb.from(table).select('*');
if(table==='leads') query=query.order('created_at',{ascending:false});
else if(table!=='profile') query=query.order('sort_order',{ascending:true});
let {data,error}=await query;
if(error){status(error.message,true);return}
let row=editId?data.find(x=>x.id===editId):null;let form=document.createElement('div');form.className='grid';let h=document.createElement('div');h.className='full';h.innerHTML='<h2>'+esc(table)+'</h2><p class="muted">Owner-only content management.</p>';form.append(h);
fields[table].forEach(f=>form.append(makeInput(f,row?.[f])));let actions=document.createElement('div');actions.className='full';let save=document.createElement('button');save.className='primary';save.textContent=editId?'Save changes':'Add';save.onclick=saveRow;let clear=document.createElement('button');clear.className='ghost';clear.textContent='Clear';clear.onclick=()=>{editId=null;load()};actions.append(save,clear);form.append(actions);
let list=document.createElement('div');list.className='full';data.forEach(r=>{let i=document.createElement('div');i.className='item';
let primary=r.title||r.name||r.company||r.institution||r.id;
let secondary='';
if(table==='leads'){primary=(r.name||'Lead')+(r.service?' · '+r.service:'');secondary=[r.email,r.company,r.status].filter(Boolean).join(' · ');}
i.innerHTML='<div><strong>'+esc(primary)+'</strong>'+(secondary?'<div class="muted">'+esc(secondary)+'</div>':'')+'</div>';let a=document.createElement('div');
let e=document.createElement('button');e.className='ghost';e.textContent='Edit';e.onclick=()=>{editId=r.id;load()};let d=document.createElement('button');d.className='danger';d.textContent='Delete';d.onclick=()=>del(r.id);a.append(e,d);i.append(a);list.append(i)});form.append(list);ed.replaceChildren(form)}
async function saveRow(){let p={};document.querySelectorAll('[data-f]').forEach(e=>{let v=e.value;if(['published','featured'].includes(e.dataset.f))v=v==='true';if(e.dataset.f==='sort_order')v=Number(v||0);p[e.dataset.f]=v});let q=editId?sb.from(table).update(experienceWritePayload(p)).eq('id',editId):sb.from(table).insert(experienceWritePayload(p));let {error}=await q;if(error)return status(error.message,true);editId=null;status('Saved successfully.');load()}
async function del(id){if(!confirm('Delete this item?'))return;let {error}=await sb.from(table).delete().eq('id',id);if(error)return status(error.message,true);status('Deleted.');load()}

const MEDIA_BUCKET='portfolio-media';
const MEDIA_FOLDERS=['avatar','badges','projects','certificates','audio','documents'];

function safeFileName(name='file'){
  const parts=String(name).split('.');
  const ext=parts.length>1?'.'+parts.pop().toLowerCase():'';
  const stem=parts.join('.').toLowerCase()
    .replace(/[^a-z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80) || 'file';
  return `${stem}-${Date.now()}${ext}`;
}

function mediaType(path=''){
  const p=path.toLowerCase();
  if(/\.(png|jpe?g|webp|svg)$/.test(p)) return 'image';
  if(/\.(mp3|ogg|wav|m4a)$/.test(p)) return 'audio';
  if(/\.pdf$/.test(p)) return 'pdf';
  return 'file';
}

async function signedUrl(path,expires=3600){
  const {data,error}=await sb.storage.from(MEDIA_BUCKET).createSignedUrl(path,expires);
  if(error) return null;
  return data?.signedUrl || null;
}

async function listFolder(folder){
  const {data,error}=await sb.storage.from(MEDIA_BUCKET).list(folder,{
    limit:100,sortBy:{column:'created_at',order:'desc'}
  });
  if(error) throw error;
  return (data||[]).filter(x=>x.name!=='.emptyFolderPlaceholder').map(x=>({
    ...x,path:`${folder}/${x.name}`
  }));
}

async function loadMedia(){
  const ed=$('editor');
  ed.innerHTML='<p class="muted">Loading media…</p>';
  try{
    const groups=await Promise.all(MEDIA_FOLDERS.map(async folder=>[folder,await listFolder(folder)]));
    const files=groups.flatMap(([folder,items])=>items.map(item=>({...item,folder})));

    const wrap=document.createElement('div');
    wrap.innerHTML=`
      <div class="media-head">
        <div>
          <h2 style="margin:0">Media Library</h2>
          <p class="muted">Private owner uploads in Supabase Storage. Use Copy Path to place media in Profile, Projects, Credentials and other content fields.</p>
        </div>
      </div>
      <div class="media-upload-panel">
        <label>Folder
          <select id="mediaFolder">${MEDIA_FOLDERS.map(f=>`<option value="${f}">${f}</option>`).join('')}</select>
        </label>
        <label>Choose file
          <input id="mediaFile" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf,audio/mpeg,audio/ogg,audio/wav,audio/mp4">
        </label>
        <button id="mediaUpload" class="primary">Upload</button>
        <div id="mediaUploadStatus" class="muted"></div>
      </div>
      <div class="media-grid" id="mediaGrid"></div>
    `;

    ed.replaceChildren(wrap);

    const grid=document.getElementById('mediaGrid');

    if(!files.length){
      grid.innerHTML='<div class="muted">No media uploaded yet.</div>';
    } else {
      for(const file of files){
        const url=await signedUrl(file.path,3600);
        const kind=mediaType(file.path);
        const card=document.createElement('article');
        card.className='media-card';

        let preview='<div class="media-generic">FILE</div>';
        if(kind==='image' && url) preview=`<img src="${url}" alt="${esc(file.name)}">`;
        else if(kind==='audio' && url) preview=`<audio controls preload="none" src="${url}"></audio>`;
        else if(kind==='pdf') preview='<div class="media-generic">PDF</div>';

        card.innerHTML=`
          <div class="media-preview">${preview}</div>
          <div class="media-info">
            <strong title="${esc(file.name)}">${esc(file.name)}</strong>
            <span>${esc(file.folder)}</span>
            <small>${file.metadata?.size ? Math.round(file.metadata.size/1024)+' KB' : ''}</small>
          </div>
          <div class="media-actions">
            ${url ? `<a class="ghost media-open" href="${url}" target="_blank" rel="noopener noreferrer">Open</a>` : ''}
            <button class="ghost" data-copy-path="${esc(file.path)}">Copy Path</button>
            <button class="danger" data-delete-path="${esc(file.path)}">Delete</button>
          </div>
        `;
        grid.appendChild(card);
      }
    }

    document.getElementById('mediaUpload').onclick=uploadMedia;
    grid.addEventListener('click',async event=>{
      const copy=event.target.closest('[data-copy-path]');
      if(copy){
        const path=copy.dataset.copyPath;
        await navigator.clipboard.writeText(path);
        status(`Copied storage path: ${path}`);
        return;
      }
      const delBtn=event.target.closest('[data-delete-path]');
      if(delBtn){
        const path=delBtn.dataset.deletePath;
        if(!confirm(`Delete ${path}?`)) return;
        const {error}=await sb.storage.from(MEDIA_BUCKET).remove([path]);
        if(error) return status(error.message,true);
        status('Media deleted.');
        loadMedia();
      }
    });
  }catch(e){
    status(e.message||String(e),true);
    ed.innerHTML='<p class="muted">Could not load Media Library.</p>';
  }
}

async function uploadMedia(){
  const folder=document.getElementById('mediaFolder').value;
  const input=document.getElementById('mediaFile');
  const note=document.getElementById('mediaUploadStatus');
  const file=input.files?.[0];
  if(!file){
    note.textContent='Choose a file first.';
    return;
  }
  note.textContent='Uploading…';
  const path=`${folder}/${safeFileName(file.name)}`;
  const {error}=await sb.storage.from(MEDIA_BUCKET).upload(path,file,{
    cacheControl:'3600',upsert:false,contentType:file.type||undefined
  });
  if(error){
    note.textContent=error.message;
    status(error.message,true);
    return;
  }
  note.textContent='Uploaded successfully.';
  status('Media uploaded successfully.');
  input.value='';
  loadMedia();
}


const MEDIA_PICKER_FIELDS = new Set([
  'avatar_url','logo_url','image_url','pdf_url','resume_url'
]);

function storageValue(path){
  return path ? `storage:${path}` : '';
}

async function chooseFromMedia(targetInput, preferredFolder=''){
  const overlay=document.createElement('div');
  overlay.className='media-picker-overlay';
  overlay.innerHTML=`
    <div class="media-picker-dialog">
      <div class="media-picker-head">
        <div>
          <h3>Choose from Media</h3>
          <p class="muted">Select a file from your Supabase Media Library.</p>
        </div>
        <button class="ghost" data-close-media-picker>Close</button>
      </div>
      <div class="media-picker-folders"></div>
      <div class="media-picker-grid"><div class="muted">Loading…</div></div>
    </div>`;
  document.body.appendChild(overlay);

  const folderBar=overlay.querySelector('.media-picker-folders');
  const grid=overlay.querySelector('.media-picker-grid');

  async function showFolder(folder){
    folderBar.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.folder===folder));
    grid.innerHTML='<div class="muted">Loading…</div>';
    const items=await listFolder(folder);
    grid.innerHTML='';
    if(!items.length){
      grid.innerHTML='<div class="muted">No files in this folder.</div>';
      return;
    }
    for(const file of items){
      const url=await signedUrl(file.path,1800);
      const kind=mediaType(file.path);
      const card=document.createElement('button');
      card.type='button';
      card.className='media-picker-card';
      let preview='<div class="media-generic">FILE</div>';
      if(kind==='image' && url) preview=`<img src="${url}" alt="${esc(file.name)}">`;
      else if(kind==='pdf') preview='<div class="media-generic">PDF</div>';
      else if(kind==='audio') preview='<div class="media-generic">AUDIO</div>';
      card.innerHTML=`<div class="media-picker-preview">${preview}</div><strong>${esc(file.name)}</strong><span>${esc(folder)}</span>`;
      card.onclick=()=>{
        targetInput.value=storageValue(file.path);
        targetInput.dispatchEvent(new Event('input',{bubbles:true}));
        overlay.remove();
      };
      grid.appendChild(card);
    }
  }

  MEDIA_FOLDERS.forEach(folder=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='ghost';
    b.dataset.folder=folder;
    b.textContent=folder;
    b.onclick=()=>showFolder(folder);
    folderBar.appendChild(b);
  });

  overlay.addEventListener('click',e=>{
    if(e.target===overlay || e.target.closest('[data-close-media-picker]')) overlay.remove();
  });

  let first = MEDIA_FOLDERS.includes(preferredFolder) ? preferredFolder : MEDIA_FOLDERS[0];
  await showFolder(first);
}

function preferredFolderForField(field){
  if(field==='avatar_url') return 'avatar';
  if(field==='logo_url') return table==='credentials' ? 'badges' : 'projects';
  if(field==='image_url') return table==='credentials' ? 'badges' : 'projects';
  if(field==='pdf_url' || field==='resume_url') return 'documents';
  return 'projects';
}

$('login').onclick=async()=>{try{config();let {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error}catch(e){$('loginStatus').textContent=e.message;$('loginStatus').classList.remove('hidden')}}
$('logout').onclick=()=>sb.auth.signOut();
try{config();sb.auth.getSession().then(({data})=>authUI(data.session));sb.auth.onAuthStateChange((_e,s)=>authUI(s))}catch(e){$('loginStatus').textContent=e.message;$('loginStatus').classList.remove('hidden')}


// v7b safeguard: Postgres experience.tags is text[].
// Convert the admin's comma-separated UI string to an array immediately before writes.
function experienceWritePayload(payload){
  if(table==='experience' && payload){
    if(typeof payload.tags==='string'){
      payload.tags=payload.tags.split(',').map(v=>v.trim()).filter(Boolean);
    }
    for(const f of ['start_date','end_date']){
      if(payload[f]==='') payload[f]=null;
    }
  }
  return payload;
}
