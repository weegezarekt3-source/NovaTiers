
const KITS = ['Sword','Crystal','Mace','UHC','Axe','DiaSMP','DiaPOT','NethSMP','NethPOT','HG'];
const ACTIVE = ['HT1','LT1','HT2','LT2','HT3','LT3'];
const RETMAP = { HT1:'RHT1', LT1:'RLT1', HT2:'RHT2', LT2:'RLT2', HT3:'RHT3', LT3:'RLT3' };
const UNRETMAP = { RHT1:'HT1', RLT1:'LT1', RHT2:'HT2', RLT2:'LT2', RHT3:'HT3', RLT3:'LT3' };
const PTS = {
  HT1:60, LT1:45, HT2:30, LT2:20, HT3:10, LT3:6,
  RHT1:60, RLT1:45, RHT2:30, RLT2:20, RHT3:10, RLT3:6
};
const KEY = 'nova_6_clean';

function load(){
  try{
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  }catch(e){
    return {};
  }
}
function save(d){
  localStorage.setItem(KEY, JSON.stringify(d));
}

function ensure(){
  let d = load();
  for(const kit of KITS){
    if(!Array.isArray(d[kit])) d[kit] = [];
  }
  if(!Array.isArray(d._retired)) d._retired = [];
  if(typeof d._notes !== 'object' || !d._notes) d._notes = {};
  save(d);
}
ensure();

// --- Avatars (Bedrock auto skin) ---
function getAvatarHtml(name, big=false){
  if(!name) return '<span class="avatar">?</span>';
  const encoded = encodeURIComponent(name);
  const size = big ? 128 : 64;
  const url = `https://api.creepernation.net/head/${encoded}/bedrock?size=${size}`;
  return `<span class="avatar"><img src="${url}" alt=""></span>`;
}

// --- Core ladder actions ---

function addPlayer(kit, name, tier){
  name = (name || '').trim();
  if(!name) return;
  if(!ACTIVE.includes(tier)) return;
  let d = load();
  if(!Array.isArray(d[kit])) d[kit] = [];
  // remove from this kit active
  d[kit] = d[kit].filter(p => p.name !== name);
  d[kit].push({ name, tier });
  // remove retired entry for this kit+name
  d._retired = d._retired.filter(r => !(r.name === name && r.kit === kit));
  save(d);
  renderKit(kit);
  if(document.getElementById('lb')) renderLB();
}

function changeTier(kit, name, newTier){
  if(!ACTIVE.includes(newTier)) return;
  let d = load();
  const list = d[kit] || [];
  const p = list.find(x => x.name === name);
  if(p){
    p.tier = newTier;
    save(d);
    renderKit(kit);
    if(document.getElementById('lb')) renderLB();
  }
}

function changeTierPrompt(kit, name){
  const nt = prompt('Enter new tier (HT1,LT1,HT2,LT2,HT3,LT3):');
  if(nt && ACTIVE.includes(nt)) changeTier(kit, name, nt);
  else if(nt) alert('Invalid tier.');
}

function retirePlayer(kit, name){
  let d = load();
  const list = d[kit] || [];
  const p = list.find(x => x.name === name);
  if(!p) return;
  const rt = RETMAP[p.tier];
  if(!rt){
    alert('Cannot retire this tier.');
    return;
  }
  d._retired = d._retired.filter(r => !(r.name === name && r.kit === kit));
  d._retired.push({ name, kit, tier: rt });
  d[kit] = list.filter(x => x.name !== name);
  save(d);
  renderKit(kit);
  if(document.getElementById('lb')) renderLB();
}

function unretirePlayer(name, kit){
  let d = load();
  const r = d._retired.find(x => x.name === name && x.kit === kit);
  if(!r) return;
  const newTier = UNRETMAP[r.tier] || 'HT3';
  d._retired = d._retired.filter(x => !(x.name === name && x.kit === kit));
  if(!Array.isArray(d[kit])) d[kit] = [];
  d[kit].push({ name, tier: newTier });
  save(d);
  renderAdmin();
  if(document.getElementById('lb')) renderLB();
}

function removeTier(kit, name){
  if(!confirm(`Remove ${name}'s tier in ${kit}?`)) return;
  let d = load();
  d[kit] = (d[kit] || []).filter(p => p.name !== name);
  save(d);
  renderKit(kit);
  if(document.getElementById('lb')) renderLB();
}

function removeRetiredTier(name, kit){
  if(!confirm(`Remove ${name}'s retired tier in ${kit}?`)) return;
  let d = load();
  d._retired = d._retired.filter(r => !(r.name === name && r.kit === kit));
  save(d);
  renderAdmin();
  if(document.getElementById('lb')) renderLB();
}

function deletePlayer(name){
  if(!confirm(`Remove ${name} from all kits and retired tiers?`)) return;
  let d = load();
  for(const kit of KITS){
    d[kit] = (d[kit] || []).filter(p => p.name !== name);
  }
  d._retired = d._retired.filter(r => r.name !== name);
  delete d._notes[name];
  save(d);
  closeProfile();
  if(document.getElementById('kitView')){
    const activeTab = document.querySelector('.tab.active');
    const kit = activeTab ? activeTab.id.replace('tab_','') : 'Sword';
    renderKit(kit);
  }
  if(document.getElementById('lb')) renderLB();
  if(document.getElementById('adminBox')) renderAdmin();
}

// --- Rendering ---

function renderKit(kit){
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tab_' + kit);
  if(tabEl) tabEl.classList.add('active');
  let d = load();
  const box = document.getElementById('kitView');
  if(!box) return;
  box.innerHTML = '';
  const list = d[kit] || [];
  const isOwner = localStorage.getItem('nova_owner_ok') === 'yes';
  for(const tier of ACTIVE){
    const sec = document.createElement('div');
    sec.className = 'tierbox';
    sec.innerHTML = `<h3>${tier}</h3>`;
    list.filter(p => p.tier === tier).forEach(p => {
      let btns = '';
      if(isOwner){
        btns = `
          <button onclick="event.stopPropagation();changeTierPrompt('${kit}','${p.name}')">Edit</button>
          <button onclick="event.stopPropagation();retirePlayer('${kit}','${p.name}')">Retire</button>
          <button onclick="event.stopPropagation();removeTier('${kit}','${p.name}')">Remove tier</button>
        `;
      }
      sec.innerHTML += `
        <div class="player-cell clickable" onclick="showProfile('${p.name}')">
          ${getAvatarHtml(p.name)}
          <span>${p.name}</span>
          ${btns}
        </div>
      `;
    });
    box.appendChild(sec);
  }
}



function renderLB(){
  let d = load();
  const sum = {};
  const addPoints = (n,t) => {
    sum[n] = (sum[n] || 0) + (PTS[t] || 0);
  };
  for(const kit of KITS){
    for(const p of (d[kit] || [])){
      addPoints(p.name, p.tier);
    }
  }
  for(const r of d._retired){
    addPoints(r.name, r.tier);
  }
  const arr = Object.entries(sum).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
  const tb = document.getElementById('lb');
  if(!tb) return;
  tb.innerHTML = '';
  arr.forEach(([name, pts], index) => {
    const dnow = load();
    const badges = [];
    for(const kit of KITS){
      const act = (dnow[kit] || []).find(x => x.name === name);
      if(act){
        badges.push(`<span class="badge tier-${act.tier}">${act.tier} ${kit}</span>`);
        continue;
      }
      const ret = dnow._retired.find(x => x.name === name && x.kit === kit);
      if(ret){
        badges.push(`<span class="badge retired tier-${ret.tier}">${ret.tier} ${kit}</span>`);
        continue;
      }
      badges.push(`<span class="badge empty">— ${kit}</span>`);
    }
    const rankClass = index === 0 ? ' rank-1' : index === 1 ? ' rank-2' : index === 2 ? ' rank-3' : '';
    const crown = index === 0 ? '👑 ' : '';
    tb.innerHTML += `
      <tr class="clickable${rankClass}" onclick="showProfile('${name}')">
        <td><div class="player-cell">${getAvatarHtml(name)}<span>${crown}${name}</span></div></td>
        <td>${pts}</td>
        <td>${badges.join(' ')}</td>
      </tr>
    `;
  });
}

function searchPlayer(){
  const input = document.getElementById('searchName');
  if(!input) return;
  const name = input.value.trim();
  if(!name) return;
  showProfile(name);
}

function renderKitPodiums(){
  const d = load();
  const container = document.getElementById('kitPodiums');
  if(!container) return;
  let html = '';
  for(const kit of KITS){
    const entries = [];
    for(const p of (d[kit] || [])){
      entries.push({ name:p.name, tier:p.tier, pts:PTS[p.tier] || 0 });
    }
    for(const r of d._retired){
      if(r.kit === kit){
        entries.push({ name:r.name, tier:r.tier, pts:PTS[r.tier] || 0 });
      }
    }
    // best tier per player in that kit
    const best = {};
    for(const e of entries){
      const cur = best[e.name];
      if(!cur || e.pts > cur.pts){
        best[e.name] = e;
      }
    }
    const top = Object.values(best).sort((a,b) => b.pts-a.pts || a.name.localeCompare(b.name)).slice(0,3);
    html += `<div class="kit-podium glass"><h3>${kit} top 3</h3>`;
    if(top.length === 0){
      html += `<div class="small">No players yet.</div>`;
    }else{
      top.forEach((e, idx) => {
        const place = idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd';
        const extraClass = idx === 0 ? ' rank-1' : idx === 1 ? ' rank-2' : ' rank-3';
        html += `
          <div class="podium-row${extraClass}" onclick="showProfile('${e.name}')">
            <div class="player-cell">${getAvatarHtml(e.name)}<span>${place}: ${e.name}</span></div>
            <div class="small">${e.tier} • ${e.pts} pts</div>
          </div>
        `;
      });
    }
    html += `</div>`;
  }
  container.innerHTML = html;
}

// --- Admin retired list ---

function renderAdmin(){
  let d = load();
  const box = document.getElementById('adminBox');
  if(!box) return;
  box.innerHTML = '';
  if(d._retired.length === 0){
    box.innerHTML = "<div class='small'>No retired players yet.</div>";
  }else{
    d._retired.forEach(r => {
      box.innerHTML += `
        <div class="player-cell clickable" onclick="showProfile('${r.name}')">
          ${getAvatarHtml(r.name)}
          <span>${r.name} — ${r.tier} ${r.kit}</span>
          <button onclick="event.stopPropagation();unretirePlayer('${r.name}','${r.kit}')">Unretire</button>
          <button onclick="event.stopPropagation();removeRetiredTier('${r.name}','${r.kit}')">Remove tier</button>
        </div>
      `;
    });
  }
}

// --- Staff notes & profile modal ---

function saveNote(name){
  let d = load();
  if(typeof d._notes !== 'object' || !d._notes) d._notes = {};
  const box = document.getElementById('noteBox');
  if(box){
    d._notes[name] = box.value;
    save(d);
    alert('Staff note saved');
  }
}

function showProfile(name){
  let d = load();
  let total = 0;
  const addPoints = (n,t) => {
    if(n === name) total += (PTS[t] || 0);
  };
  for(const kit of KITS){
    for(const p of (d[kit] || [])){
      addPoints(p.name, p.tier);
    }
  }
  for(const r of d._retired){
    addPoints(r.name, r.tier);
  }
  // tiers across all kits
  let tiersHtml = '';
  for(const kit of KITS){
    const act = (d[kit] || []).find(x => x.name === name);
    if(act){
      tiersHtml += `<span class="badge tier-${act.tier}">${act.tier} ${kit}</span>`;
      continue;
    }
    const ret = d._retired.find(x => x.name === name && x.kit === kit);
    if(ret){
      tiersHtml += `<span class="badge retired tier-${ret.tier}">${ret.tier} ${kit}</span>`;
      continue;
    }
    tiersHtml += `<span class="badge empty">— ${kit}</span>`;
  }

  const overlay = document.getElementById('profileOverlay');
  const modal = document.getElementById('profileModal');
  if(!overlay || !modal) return;
  const noteText = (d._notes && d._notes[name]) || '';
  modal.innerHTML = `
    <button class="close-btn" onclick="closeProfile()">×</button>
    <div class="profile-header">
      ${getAvatarHtml(name,true)}
      <div>
        <div class="profile-name">${name}</div>
        <div class="profile-points">${total} points total</div>
      </div>
    </div>
    <div class="small">Tiers across all kits:</div>
    <div class="profile-tiers">${tiersHtml}</div>
    <div style="margin-top:14px;">
      <div class="small">Staff notes:</div>
      <textarea id="noteBox" class="note-box" rows="3" placeholder="e.g. Cheated in Sword test, promoted after tourney">${noteText}</textarea>
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:space-between;">
        <button class="danger-btn" onclick="deletePlayer('${name}')">Remove from all tiers</button>
        <button class="primary-btn" onclick="saveNote('${name}')">Save note</button>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
}

function closeProfile(){
  const overlay = document.getElementById('profileOverlay');
  if(overlay) overlay.style.display = 'none';
}
