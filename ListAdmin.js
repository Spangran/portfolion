/* PortfoliON – List Admin Dialog (UMD)  v1.1
 * Reusable list settings dialog/drawer (owner, archive, delete, access control).
 * New: PortfolionListAdmin.open({ listId, api, onClose, onChanged })
 *      PortfolionListAdmin.openApex({ listId, processes?, onClose?, onChanged? }) – convenience for APEX
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
  .pla { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: .875rem; color:#111; }
  .pla-mask { position: fixed; inset:0; background: rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index: 9999; }
  .pla-dialog { width: 720px; max-width: calc(100vw - 24px); background:#fff; border-radius:14px; box-shadow:0 14px 40px rgba(0,0,0,.2); display:flex; flex-direction:column; }
  .pla-head { padding:14px 16px; border-bottom:1px solid #e5e7eb; font-weight:600; }
  .pla-body { padding:16px; display:grid; gap:12px; max-height:70vh; overflow:auto; }
  .pla-foot { padding:12px 16px; border-top:1px solid #e5e7eb; display:flex; gap:8px; justify-content:flex-end; }
  .pla-row { display:flex; align-items:center; gap:10px; }
  .pla-row > label { flex:0 0 140px; color:#334155; }
  .pla-input { border:1px solid #e5e7eb; border-radius:10px; padding:7px 10px; width:100%; font-size:.875rem; }
  .pla-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; font-size:.8125rem; }
  .pla-btn.primary { background:#4f46e5; border-color:#4f46e5; color:#fff; }
  .pla-btn.danger { color:#b42318; border-color:#f3d0d0; }
  .pla-chip { display:flex; align-items:center; gap:8px; background:#f3f4f6; border-radius:999px; padding:4px 10px; }
  .pla-section { padding:10px; border:1px solid #e5e7eb; border-radius:12px; }
  .pla-help { color:#64748b; font-size:.8rem; }
  .pla-col2 { display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; }
  `;
  function ensureCSS(){ if (!document.getElementById('pla-css')) document.head.appendChild(h('style', {id:'pla-css'}, CSS)); }
  function text(v){ return v==null ? '' : String(v); }

  function ListAdmin(opts){
    this.api       = opts.api;
    this.listId    = opts.listId;
    this.onClose   = opts.onClose   || function(){};
    this.onChanged = opts.onChanged || function(){};
    ensureCSS();
    this.mount();
  }
  ListAdmin.prototype.mount = function(){
    this.mask = h('div', {class:'pla pla-mask', onclick: (e)=>{ if(e.target===this.mask) this.close(); }},
      this.dlg = h('div', {class:'pla-dialog', onclick:(e)=>e.stopPropagation()},
        h('div', {class:'pla-head'}, 'List settings'),
        this.body = h('div', {class:'pla-body'}, h('div', {}, 'Loading…')),
        this.foot = h('div', {class:'pla-foot'},
          h('button', {type:'button', class:'pla-btn', onclick:()=>this.doArchiveToggle()}, 'Archive/Unarchive'),
          h('button', {type:'button', class:'pla-btn danger', onclick:()=>this.doDelete()}, 'Delete'),
          h('button', {type:'button', class:'pla-btn', onclick:()=>this.close()}, 'Close')
        )
      )
    );
    document.body.appendChild(this.mask);
    this.load();
  };
  ListAdmin.prototype.close = function(){ this.mask.remove(); this.onClose(); };
  ListAdmin.prototype.load = function(){
    return this.api.get(this.listId).then(d=>{ this.data = d || {}; this.render(); })
      .catch(err=>{ console.error(err); this.body.innerHTML = '<div>Failed to load.</div>'; });
  };

  ListAdmin.prototype.render = function(){
    const d = this.data;
    const owner = d.owner ? (d.owner.name || d.owner.email || '') : '—';
    const archived = (d.is_archived||'N') === 'Y';

    const peopleWrap = h('div', {class:'pla-col2'});
    (d.people || []).forEach(p=>{
      peopleWrap.appendChild(h('div', {class:'pla-chip'}, `${p.name || p.email} · ${p.role}`));
      peopleWrap.appendChild(h('button', {type:'button', class:'pla-btn', onclick:()=>this.doPersonRemove(p.id)}, 'Remove'));
    });

    const groupWrap = h('div', {class:'pla-col2'});
    (d.groups || []).forEach(g=>{
      groupWrap.appendChild(h('div', {class:'pla-chip'}, `${g.name || g.code} · ${g.role}`));
      groupWrap.appendChild(h('button', {type:'button', class:'pla-btn', onclick:()=>this.doGroupRemove(g.id)}, 'Remove'));
    });
    if (d.project_group){
      groupWrap.appendChild(h('div', {class:'pla-help'}, `Implicit: ${d.project_group.name} (via project)`));
    }

    const roleSel = h('select', {class:'pla-input'},
      h('option', {value:'Viewer'}, 'Viewer'),
      h('option', {value:'Editor'}, 'Editor'),
      h('option', {value:'Admin'},  'Admin')
    );
    const emailInput = h('input', {class:'pla-input', placeholder:'Add people by email…'});
    const addBtn = h('button', {type:'button', class:'pla-btn', onclick:()=>{
      const email = emailInput.value.trim(); if (!email) return;
      this.api.personAdd(this.listId, roleSel.value, [email]).then(()=> this.load().then(()=> this.onChanged()));
    }}, 'Add');

    const groupFinder = h('input', {class:'pla-input', placeholder:'Search groups (e.g., Project members)…'});
    const groupResults = h('div');
    groupFinder.addEventListener('input', (e)=>{
      this.api.groupFind(this.listId, e.target.value).then(rows=>{
        groupResults.innerHTML = '';
        (rows||[]).forEach(row=>{
          groupResults.appendChild(h('div', {class:'pla-row'},
            h('div', {}, row.name || row.code),
            h('button', {type:'button', class:'pla-btn', onclick:()=> this.api.groupAdd(this.listId, row).then(()=> this.load().then(()=> this.onChanged()))}, 'Add')
          ));
        });
      });
    });

    this.body.innerHTML = '';
    this.body.appendChild(
      h('div', {class:'pla-section'},
        h('div', {class:'pla-row'}, h('label', {}, 'Name'), this.nameInput = h('input', {class:'pla-input', value:text(d.name)})),
        h('div', {class:'pla-row'}, h('label', {}, 'Project'), h('div', {}, d.project_name || 'Standalone lists')),
        h('div', {class:'pla-row'}, h('label', {}, 'Owner'), h('div', {}, owner)),
        h('div', {class:'pla-row'}, h('label', {}, 'Status'), h('div', {}, archived ? 'Archived' : 'Active')),
        h('div', {class:'pla-row'}, h('label', {}, ''), h('div', {}, h('button', {type:'button', class:'pla-btn primary', onclick:()=>this.doRename()}, 'Save name')))
      )
    );
    this.body.appendChild(
      h('div', {class:'pla-section'},
        h('div', {style:'font-weight:600; margin-bottom:6px'}, 'Access control'),
        h('div', {class:'pla-row'}, h('label', {}, 'Shared with'), h('div', {style:'width:100%'}, peopleWrap,
          h('div', {class:'pla-row', style:'margin-top:8px'},
            h('label', {style:'flex:0 0 80px'}, 'Add person'),
            h('div', {style:'flex:1'}, emailInput),
            h('div', {}, roleSel),
            h('div', {}, h('button', {type:'button', class:'pla-btn', onclick:addBtn.onclick}, 'Add'))
          ),
          h('div', {class:'pla-help'}, 'Tip: enter an email; the server maps it to a person.')
        )),
        h('div', {class:'pla-row'}, h('label', {}, 'Groups'), h('div', {style:'width:100%'}, groupWrap,
          h('div', {class:'pla-row', style:'margin-top:8px'}, h('label', {style:'flex:0 0 80px'}, 'Add group'), h('div', {style:'flex:1'}, groupFinder)),
          groupResults
        ))
      )
    );
  };

  // Actions
  ListAdmin.prototype.doRename = function(){
    const name = (this.nameInput && this.nameInput.value || '').trim();
    if (!name) return;
    this.api.rename(this.listId, name).then(()=> this.load().then(()=> this.onChanged()));
  };
  ListAdmin.prototype.doArchiveToggle = function(){
    const archived = (this.data && this.data.is_archived==='Y');
    this.api.archive(this.listId, archived ? 'N' : 'Y').then(()=> this.load().then(()=> this.onChanged()));
  };
  ListAdmin.prototype.doDelete = function(){
    if (!confirm('Delete this list and all tasks? This cannot be undone.')) return;
    this.api.remove(this.listId).then(()=>{ this.onChanged(); this.close(); });
  };
  ListAdmin.prototype.doPersonRemove = function(personId){
    this.api.personRemove(this.listId, personId).then(()=> this.load().then(()=> this.onChanged()));
  };
  ListAdmin.prototype.doGroupRemove = function(grantId){
    this.api.groupRemove(this.listId, grantId).then(()=> this.load().then(()=> this.onChanged()));
  };

  // Public API
  const API = {
    open: (opts)=> new ListAdmin(opts),
    openApex: ({ listId, processes, onClose, onChanged })=>{
      const p = Object.assign({
        get:                 'LIST_ACCESS_GET',
        admin:               'LIST_ADMIN',
        groupSearch:         'LIST_GROUP_SEARCH',
        groupBind:           'LIST_ACCESS_GROUP_BIND'
      }, processes||{});
      const APEX_API = {
        get: function(id){
          return apex.server.process(p.get, { x01:String(id), pageItems:'#P0_TENANCY_ID,#P0_PERSON_ID' }, { dataType:'json' }).then(function(d){
            return {
              id: id,
              name: d.name || d.list_name || '',
              project_name: d.project_name || '',
              is_archived: d.is_archived || 'N',
              owner: d.owner || null,
              people: (d.people || d.shares || []).map(function(x){ return { id:x.person_id, name:x.display_name||x.email, email:x.email, role:x.role||x.permission_level||'Viewer' }; }),
              groups: (d.groups || []).map(function(g){ return { id:g.grant_id, name:g.code, code:g.code, role:g.permission_level||'Viewer' }; }),
              project_group: d.project_group || null
            };
          });
        },
        rename:  (id, name)=> apex.server.process(p.admin, { x01:'RENAME', x02:String(id), x03:name }, { dataType:'json' }),
        archive: (id, yn)=> apex.server.process(p.admin, { x01:(yn==='Y'?'ARCHIVE':'UNARCHIVE'), x02:String(id) }, { dataType:'json' }),
        remove:  (id)=>     apex.server.process(p.admin, { x01:'DELETE', x02:String(id) }, { dataType:'json' }),
        personAdd:    (id, role, emails)=> apex.server.process(p.admin, { x01:'PERSON_ADD', x02:String(id), x04:role, f01:emails }, { dataType:'json' }),
        personRemove: (id, personId)=>    apex.server.process(p.admin, { x01:'PERSON_REMOVE', x02:String(id), x05:String(personId) }, { dataType:'json' }),
        groupFind:  (id, q)=> apex.server.process(p.groupSearch, { x01:String(id), x2:q||'' }, { dataType:'json' }).then(d=> (d&&d.rows)||[] ),
        groupAdd:   (id, obj)=> apex.server.process(p.groupBind, { x01:'GROUP_ADD', x02:String(id), f01:[ JSON.stringify(obj) ] }, { dataType:'json' }),
        groupRemove:(id, grantId)=> apex.server.process(p.groupBind, { x01:'GROUP_REMOVE', x02:String(id), x05:String(grantId) }, { dataType:'json' })
      };
      return new ListAdmin({ listId:listId, api:APEX_API, onClose:onClose, onChanged:onChanged });
    }
  };

  global.PortfolionListAdmin = API;
})(window);
