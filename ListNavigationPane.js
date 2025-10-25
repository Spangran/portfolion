/* PortfoliON – List Navigation (UMD)  v2.1
 * - Smart lists pinned at the top
 * - Favourites (❤️/🤍) restored
 * - "+ New list" button + inline create dialog
 * - Independent scroll
 * Usage:
 *   PortfolionListNav.mount('#REGION', {
 *     api: {
 *       getNav: () => Promise<{items:[...]}>,
 *       toggleFav: (listId, yn) => Promise,
 *       createList: (payload:{name:string, project_id?:number}) => Promise<{id:number}>
 *     },
 *     active,                 // optional initial active key (string/number)
 *     onSelect: (key)=>{},    // when user clicks a nav row
 *     onOpenAdmin: (list, ev)=>{}, // open settings for a real list
 *     onCreated: (newId)=>{}  // after creating a new list
 *   })
 */
(function (global){
  function h(tag, props, ...kids){
    const el = document.createElement(tag);
    if (props) for (const [k,v] of Object.entries(props)){
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v != null) el.setAttribute(k, v);
    }
    for (const k of kids.flat()) el.appendChild(typeof k === 'string' ? document.createTextNode(k) : (k||document.createTextNode('')));
    return el;
  }

  const CSS = `
  .pln { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 0.875rem; color:#111; }
  .pln-card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; display:flex; flex-direction:column; max-height:100%; }
  .pln-top { position:sticky; top:0; z-index:1; background:#fff; padding:10px; border-bottom:1px solid #eef2f7; display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; }
  .pln-search { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:6px 9px; font-size:.875rem; }
  .pln-new { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:6px 10px; cursor:pointer; }
  .pln-list { overflow:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
  .pln-section { padding:6px 8px; font-weight:700; color:#334155; }
  .pln-row { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:10px; cursor:pointer; }
  .pln-row:hover { background:#f3f4f6; }
  .pln-row.active { background:#eef2ff; font-weight:600; }
  .pln-badge { margin-left:auto; background:#e5e7eb; color:#334155; border-radius:999px; padding:2px 8px; font-size:.75rem; }
  .pln-div { height:1px; background:#e5e7eb; margin:6px 8px; }
  .pln-grouphead { display:flex; align-items:center; gap:8px; padding:8px 10px; font-weight:700; }
  .pln-child { padding-left:24px; }
  .pln-kebab, .pln-heart { border:0; background:transparent; cursor:pointer; font-size:16px; line-height:1; padding:2px 6px; border-radius:6px; }
  .pln-kebab:hover, .pln-heart:hover { background:rgba(0,0,0,.05); }
  /* create-dialog */
  .pln-mask { position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:9999; }
  .pln-dialog { width:420px; max-width:calc(100vw - 24px); background:#fff; border-radius:14px; box-shadow:0 14px 40px rgba(0,0,0,.2); overflow:hidden; }
  .pln-d-head { padding:12px 14px; border-bottom:1px solid #e5e7eb; font-weight:700; }
  .pln-d-body { padding:14px; display:grid; gap:10px; }
  .pln-d-foot { padding:12px 14px; border-top:1px solid #e5e7eb; display:flex; gap:8px; justify-content:flex-end; }
  .pln-input { border:1px solid #e5e7eb; border-radius:10px; padding:7px 10px; width:100%; font-size:.875rem; }
  .pln-btn { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:6px 10px; cursor:pointer; }
  .pln-btn.primary { background:#4f46e5; border-color:#4f46e5; color:#fff; }
  `;

  const ICONS = { calendar:'📅', flag:'⚑', user:'👤', circle:'◯', folder:'📁', inbox:'📥', star:'⭐' };

  function ensureCSS(){
    if (document.getElementById('pln-css')) return;
    document.head.appendChild(h('style', {id:'pln-css'}, CSS));
  }

  function normalize(s){ return (s||'').toLowerCase(); }
  function splitItems(items){
    const smart = [];
    const lists = [];
    items.forEach(i=>{
      if (i.group && String(i.group).toUpperCase()==='SMART') smart.push(i);
      else if (i.kind==='LIST' || !i.group) lists.push(i);
    });
    return { smart, lists };
  }
  function groupByProject(items){
    const out = {};
    items.forEach(i=>{
      if (i.kind!=='LIST') return;
      const g = i.project_name || 'Standalone lists';
      (out[g] = out[g] || []).push(i);
    });
    Object.values(out).forEach(arr => arr.sort((a,b)=> (a.is_fav===b.is_fav?0:(a.is_fav==='Y'?-1:1)) || (a.label||'').localeCompare(b.label||'')));
    return out;
  }

  function ListNav(el, opts){
    this.root = typeof el === 'string' ? document.querySelector(el) : el;
    this.api  = opts.api || {};
    this.onSelect    = opts.onSelect    || function(){};
    this.onOpenAdmin = opts.onOpenAdmin || function(){};
    this.onCreated   = opts.onCreated   || function(){};
    this.state = { items: [], active: String(opts.active||''), q:'', collapsed:{} };
    ensureCSS();
    this.mount();
  }

  ListNav.prototype.mount = function(){
    this.root.innerHTML = '';
    this.wrap = h('div', {class:'pln pln-card'},
      h('div', {class:'pln-top'},
        this.search = h('input', {class:'pln-search', placeholder:'Search lists…', value:this.state.q, oninput:(e)=>{
          this.state.q = e.currentTarget.value; this.renderList();
        }}),
        h('button', {type:'button', class:'pln-new', title:'Create list', onclick:()=> this.openCreateDialog()}, '＋ New')
      ),
      this.listWrap = h('div', {class:'pln-list', style:'min-height:220px'})
    );
    this.root.appendChild(this.wrap);
    this.load();
  };

  ListNav.prototype.load = function(){
    return (this.api.getNav ? this.api.getNav() : Promise.resolve({items:[]})).then(data=>{
      this.state.items = (data && data.items) || [];
      if (!this.state.active){
        const first = this.state.items.find(i => !i.divider && (i.kind!=='LIST' || !isNaN(+i.key)));
        if (first) this.state.active = String(first.key);
      }
      this.renderList();
    });
  };

  ListNav.prototype.setActive = function(key){
    this.state.active = String(key);
    this.renderList();
    this.onSelect(String(key));
  };

  ListNav.prototype.renderList = function(){
    const q = normalize(this.state.q);
    const { smart, lists } = splitItems(this.state.items);
    const grouped = groupByProject(lists);
    const frag = document.createDocumentFragment();

    // SMART section (always on top)
    if (smart.length){
      frag.appendChild(h('div', {class:'pln-section'}, 'Smart'));
      smart.forEach(i=>{
        const act = String(this.state.active)===String(i.key) ? ' active' : '';
        const row = h('div', {class:'pln-row'+act, onclick:()=> this.setActive(i.key)},
          h('span', {}, ICONS[i.icon] || ''),
          h('span', {}, i.label || ''),
          i.badge!=null ? h('span', {class:'pln-badge'}, String(i.badge)) : null
        );
        frag.appendChild(row);
      });
      frag.appendChild(h('div', {class:'pln-div'}));
    }

    // Project groups
    Object.keys(grouped).sort().forEach(g=>{
      const arrAll = grouped[g];
      const arr = arrAll.filter(i => !q || normalize(i.label).includes(q) || normalize(g).includes(q));
      if (arr.length===0) return;
      const total = arr.reduce((a,i)=> a + (i.badge||0), 0);
      frag.appendChild(h('div', {class:'pln-grouphead'}, '📁 ', g, h('span', {class:'pln-badge'}, String(total))));
      arr.forEach(i=>{
        const act = String(this.state.active)===String(i.key) ? ' active' : '';
        const row = h('div', {class:'pln-row pln-child'+act, onclick:()=> this.setActive(i.key)},
          h('span', {}, ICONS[i.icon] || ''),
          h('span', {style:'flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'}, i.label || ''),
          i.badge!=null ? h('span', {class:'pln-badge'}, String(i.badge)) : null,
          h('button', {type:'button', class:'pln-heart', title:(i.is_fav==='Y'?'Unfavourite':'Favourite'), onclick:(e)=>{
            e.stopPropagation();
            const next = (i.is_fav==='Y') ? 'N' : 'Y';
            if (!this.api.toggleFav) return;
            this.api.toggleFav(i.key, next).then(()=> this.load());
          }}, i.is_fav==='Y'?'❤️':'🤍'),
          h('button', {type:'button', class:'pln-kebab', title:'Manage list', onclick:(e)=>{ e.stopPropagation(); this.onOpenAdmin(i, e); }}, '⋯')
        );
        frag.appendChild(row);
      });
    });

    this.listWrap.innerHTML = '';
    this.listWrap.appendChild(frag);
  };

  /* -------- New List Dialog -------- */
  ListNav.prototype.openCreateDialog = function(){
    const close = ()=> mask.remove();
    const mask = h('div', {class:'pln-mask', onclick:(e)=>{ if(e.target===mask) close(); }},
      h('div', {class:'pln-dialog', onclick:(e)=>e.stopPropagation()},
        h('div', {class:'pln-d-head'}, 'Create list'),
        h('div', {class:'pln-d-body'},
          h('div', {}, 'Name'),
          this.nameInput = h('input', {class:'pln-input', placeholder:'e.g., Sprint backlog'}),
          // Optional project id input (simple for now; wire real picker later)
          h('div', {}, 'Project ID (optional)'),
          this.projInput = h('input', {class:'pln-input', placeholder:'numeric ID (optional)'}),
          this.err = h('div', {style:'color:#b42318; font-size:.8rem; display:none;'}, '')
        ),
        h('div', {class:'pln-d-foot'},
          h('button', {type:'button', class:'pln-btn', onclick:close}, 'Cancel'),
          h('button', {type:'button', class:'pln-btn primary', onclick:()=> this.doCreate(close)}, 'Create')
        )
      )
    );
    document.body.appendChild(mask);
    this.nameInput.focus();
  };

  ListNav.prototype.doCreate = function(closeFn){
    const name = (this.nameInput.value||'').trim();
    const pid  = (this.projInput.value||'').trim();
    if (!name){ this.err.textContent='Name is required'; this.err.style.display='block'; return; }
    if (!this.api.createList){ closeFn(); return; }
    const payload = { name:name };
    if (/^\d+$/.test(pid)) payload.project_id = Number(pid);
    this.api.createList(payload).then((res)=>{
      closeFn();
      this.load().then(()=>{
        const newId = (res && (res.id||res.list_id)) || null;
        if (newId!=null){ this.setActive(newId); this.onCreated(newId); }
      });
    }).catch(err=>{
      this.err.textContent = (err && err.message) || 'Failed to create list';
      this.err.style.display='block';
    });
  };

  const API = { mount: (sel, opts)=> new ListNav(sel, opts) };
  global.PortfolionListNav = API;
})(window);
