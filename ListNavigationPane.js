/* PortfoliON – List Navigation (UMD)  v1.0
 * Reusable left-pane for To-Do, Mobile, Kanban.
 * Mount with: PortfolionListNav.mount('#REGION_STATIC_ID', { api, onSelect, onOpenAdmin })
 *  - api.getNav(): Promise<{items:[{kind:'VIRTUAL'|'LIST'|'DIVIDER', key,label,icon,badge,project_name,is_archived}]}>
 *  - onSelect(keyOrListId) -> void
 *  - onOpenAdmin(listItem, event) -> void   // open settings for a real list
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
  .pln-top { padding:10px; border-bottom:1px solid #eef2f7; }
  .pln-search { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:6px 9px; font-size:.875rem; }
  .pln-list { overflow:auto; padding:8px; display:flex; flex-direction:column; gap:2px; }
  .pln-row { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:10px; cursor:pointer; }
  .pln-row:hover { background:#f3f4f6; }
  .pln-row.active { background:#eef2ff; font-weight:600; }
  .pln-badge { margin-left:auto; background:#e5e7eb; color:#334155; border-radius:999px; padding:2px 8px; font-size:.75rem; }
  .pln-divider { height:1px; background:#e5e7eb; margin:6px 8px; }
  .pln-group { font-weight:600; }
  .pln-child { padding-left:24px; }
  .pln-kebab { border:0; background:transparent; cursor:pointer; font-size:16px; line-height:1; padding:2px 6px; border-radius:6px; }
  .pln-kebab:hover { background:rgba(0,0,0,.05); }
  `;

  const ICONS = { calendar:'📅', flag:'⚑', user:'👤', circle:'◯', folder:'📁', users:'👥', inbox:'📥' };

  function ensureCSS(){
    if (document.getElementById('pln-css')) return;
    const s = h('style', {id:'pln-css'}, CSS);
    document.head.appendChild(s);
  }

  function normalize(s){ return (s||'').toLowerCase(); }
  function groupByProject(items){
    const out = {};
    items.filter(i => i.kind==='LIST').forEach(i=>{
      const g = i.project_name || 'Standalone lists';
      (out[g] = out[g] || []).push(i);
    });
    Object.values(out).forEach(arr => arr.sort((a,b)=> (a.label||'').localeCompare(b.label||'')));
    return out;
  }

  function ListNav(el, opts){
    this.root = typeof el === 'string' ? document.querySelector(el) : el;
    this.api  = opts.api;
    this.onSelect    = opts.onSelect    || function(){};
    this.onOpenAdmin = opts.onOpenAdmin || function(){};
    this.state = { items: [], active: String(opts.active||'') , q:'', collapsed:{} };
    ensureCSS();
    this.mount();
  }

  ListNav.prototype.mount = function(){
    this.root.innerHTML = '';
    this.wrap = h('div', {class:'pln pln-card'},
      h('div', {class:'pln-top'},
        this.search = h('input', {class:'pln-search', placeholder:'Search lists…', value:this.state.q, oninput:(e)=>{
          this.state.q = e.currentTarget.value; this.renderList();
        }})
      ),
      this.listWrap = h('div', {class:'pln-list', style:'min-height:220px'})
    );
    this.root.appendChild(this.wrap);
    this.load();
  };

  ListNav.prototype.load = function(){
    return this.api.getNav().then(data=>{
      this.state.items = (data && data.items) || [];
      // choose default active if none
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
    const items = this.state.items;
    const q = normalize(this.state.q);
    const virtuals = items.filter(i => i.kind!=='LIST' && !i.divider);
    const grouped  = groupByProject(items);
    const frag = document.createDocumentFragment();

    // Virtuals
    virtuals.forEach(i=>{
      const act = String(this.state.active)===String(i.key) ? ' active' : '';
      const row = h('div', {class:'pln-row'+act, onclick:()=> this.setActive(i.key)},
        h('span', {}, ICONS[i.icon] || ''),
        h('span', {}, i.label || ''),
        i.badge!=null ? h('span', {class:'pln-badge'}, String(i.badge)) : null
      );
      frag.appendChild(row);
    });
    frag.appendChild(h('div', {class:'pln-divider'}));

    // Real lists grouped by project
    Object.keys(grouped).sort().forEach(g=>{
      const arr = grouped[g].filter(i => !q || normalize(i.label).includes(q) || normalize(g).includes(q));
      if (arr.length===0) return;
      const total = arr.reduce((a,i)=> a + (i.badge||0), 0);

      const head = h('div', {class:'pln-row pln-group', onclick:()=>{
        this.state.collapsed[g] = !this.state.collapsed[g]; this.renderList();
      }},
        h('span', {}, ICONS.folder), h('span', {}, g),
        h('span', {class:'pln-badge'}, String(total))
      );
      frag.appendChild(head);

      if (!this.state.collapsed[g]){
        arr.forEach(i=>{
          const act = String(this.state.active)===String(i.key) ? ' active' : '';
          const row = h('div', {class:'pln-row pln-child'+act, onclick:()=> this.setActive(i.key)},
            h('span', {}, ICONS[i.icon] || ''),
            h('span', {style:'flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'}, i.label || ''),
            i.badge!=null ? h('span', {class:'pln-badge'}, String(i.badge)) : null,
            h('button', {type:'button', class:'pln-kebab', title:'Manage list', onclick:(e)=>{ e.stopPropagation(); this.onOpenAdmin(i, e); }}, '⋯')
          );
          frag.appendChild(row);
        });
      }
    });

    this.listWrap.innerHTML = '';
    this.listWrap.appendChild(frag);
  };

  const API = { mount: (sel, opts)=> new ListNav(sel, opts) };
  global.PortfolionListNav = API;
})(window);
