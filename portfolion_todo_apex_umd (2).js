// PortfoliON To-Do (APEX UMD Build) — v1.5
// Preserves v1.3 features (admin/sharing, group search/bind, inline create, mark-done/edit)
// Adds: split-pane independent scroll, favourites (❤️/🤍), "Show done" toggle, compact scale (~25%)
(function(){
  // --- tiny loader for Preact/HTM ---
  function loadScript(src){return new Promise(function(res, rej){var s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  function ensureLibs(){
    var chain = Promise.resolve();
    if (!window.preact){ chain = chain.then(function(){ return loadScript('https://unpkg.com/preact@10.19.3/dist/preact.umd.js'); }); }
    if (!window.preactHooks){ chain = chain.then(function(){ return loadScript('https://unpkg.com/preact@10.19.3/hooks/dist/hooks.umd.js'); }); }
    if (!window.htm){ chain = chain.then(function(){ return loadScript('https://unpkg.com/htm@3.1.1/dist/htm.umd.js'); }); }
    return chain;
  }

  // --- styles (v1.3 base + compact scale + split-scroll) ---
  function injectCSS(){
    if (document.getElementById('pf-todo-css')) return;
    var css=[
      ':root{--pf-border:#e5e7eb;--pf-accent:#4f46e5;--pf-muted:#64748b;--pf-primary:#4f46e5}',
      '.pf-wrap{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica Neue,Arial;color:#111827}',
      '.pf-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}',
      '.pf-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:20px}',
      '.pf-chip{background:#eef2ff;color:#3730a3;padding:2px 8px;border-radius:999px;font-size:12px}',
      '.pf-grid{display:grid;grid-template-columns:280px 1fr;gap:16px}',
      '.pf-card{background:#fff;border:1px solid var(--pf-border);border-radius:14px}',
      '.pf-card-section{padding:12px}',
      '.pf-list{display:flex;flex-direction:column;gap:2px}',
      '.pf-list-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;position:relative}',
      '.pf-list-item:hover{background:#f3f4f6}.pf-list-item.active{background:#eef2ff;font-weight:600}',
      '.pf-badge{margin-left:auto;background:#e5e7eb;color:#334155;border-radius:999px;padding:2px 8px;font-size:12px}',
      '.pf-divider{height:1px;background:var(--pf-border);margin:6px 0 8px}',
      '.pf-slicers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}',
      '.pf-slicer{background:#fff;border:1px solid var(--pf-border);border-radius:14px;padding:10px;display:flex;align-items:center;gap:10px}',
      '.pf-slicer .pf-value{font-size:22px;font-weight:700}',
      '.pf-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.pf-input{display:inline-block;border:1px solid var(--pf-border);border-radius:10px;padding:7px 10px;min-width:240px;outline:none}',
      '.pf-btn{border:1px solid var(--pf-border);border-radius:10px;background:#fff;padding:6px 10px;cursor:pointer}',
      '.pf-btn.pf-primary{border-color:var(--pf-primary);background:var(--pf-primary);color:#fff}',
      '.pf-btn.pf-ghost{background:#fff}',
      '.pf-task{border:1px solid var(--pf-border);border-radius:12px;padding:12px;background:#fff}',
      '.pf-task + .pf-task{margin-top:8px}',
      '.pf-task-line{display:flex;gap:10px}',
      '.pf-title-click{cursor:pointer;text-decoration:underline;text-decoration-color:#e5e7eb}',
      '.pf-meta{display:flex;gap:10px;align-items:center;color:#475569;font-size:12px}',
      '.pf-pill{background:#f3f4f6;border-radius:999px;padding:2px 8px;font-size:12px;display:inline-flex;align-items:center;gap:6px}',
      '.pf-list-actions{margin-left:6px;display:flex;align-items:center;gap:6px}',
      '.pf-iconbtn{border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px}',
      '.pf-iconbtn:hover{background:rgba(0,0,0,.05)}',
      '.pf-pop{position:fixed;min-width:200px;background:#fff;border:1px solid var(--pf-border);border-radius:10px;box-shadow:0 8px 22px rgba(0,0,0,.15);z-index:9999;overflow:hidden}',
      '.pf-pop .pf-pop-item{padding:8px 10px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px}',
      '.pf-pop .pf-pop-item:hover{background:#f6f7f8}',
      '.pf-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:100}',
      '.pf-modal{width:640px;max-width:calc(100vw - 24px);background:#fff;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.2)}',
      '.pf-modal .pf-head{padding:14px 16px;font-weight:600;border-bottom:1px solid var(--pf-border)}',
      '.pf-modal .pf-body{padding:16px;display:flex;flex-direction:column;gap:12px}',
      '.pf-modal .pf-foot{padding:12px 16px;border-top:1px solid var(--pf-border);display:flex;gap:8px;justify-content:flex-end}',
      '.pf-row{display:flex;align-items:center;gap:10px}',
      '.pf-row>*{flex:1}',
      '.pf-link{color:var(--pf-primary);cursor:pointer}',
      '.pf-danger{color:#b42318}',
      '@media (max-width:1100px){.pf-grid{grid-template-columns:1fr}}',
      /* --- compact overall scale (~25% smaller) --- */
      '.pf-wrap { --pf-scale:.75; }',
      '.pf-title{ font-size:calc(20px*var(--pf-scale)); }',
      '.pf-input{ padding:calc(7px*var(--pf-scale)) calc(10px*var(--pf-scale)); min-width:calc(240px*var(--pf-scale)); }',
      '.pf-btn{ padding:calc(6px*var(--pf-scale)) calc(10px*var(--pf-scale)); font-size:calc(13px*var(--pf-scale)); }',
      '.pf-card-section{ padding:calc(12px*var(--pf-scale)); }',
      '.pf-list-item{ padding:calc(8px*var(--pf-scale)) calc(10px*var(--pf-scale)); }',
      '.pf-slicer .pf-value{ font-size:calc(22px*var(--pf-scale)); }',
      /* --- split-pane scrolling --- */
      '.pf-grid{ height:calc(100vh - 220px); }',
      '.pf-left, .pf-right{ height:100%; overflow:auto; }',
      '.pf-tasks{ margin-top:10px; }',
      /* small dot for priority */
      '.pf-dot{width:10px;height:10px;border:2px solid #cbd5e1;border-radius:999px;margin-top:.35rem}',
      '.pf-task.done{ background:#f8fafc; }',
'.pf-task.done .pf-title-click{ text-decoration:line-through; text-decoration-thickness:1.5px; color:#64748b; }',
'.pf-task.done .pf-meta{ color:#94a3b8; }',
'.pf-task.done .pf-pill{ background:#f1f5f9; color:#64748b; }',
'.pf-task.done .pf-dot{ border-color:#d1d5db; }',

'.pf-subtle{color:#64748b;font-size:12px}',
'.pf-kv{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}',
'.pf-kv .kv{background:#f8fafc;border:1px solid var(--pf-border);border-radius:999px;padding:4px 10px;font-size:12px;color:#0f172a}',
'.pf-chip.red{background:#fee2e2;color:#b91c1c}',
'.pf-chip.gray{background:#e5e7eb;color:#334155}'



    ].join('');
    var el=document.createElement('style'); el.id='pf-todo-css'; el.textContent=css; document.head.appendChild(el);
  }

  // --- APEX call helper (fixed pageItems; text/json tolerant) ---
  function apexCall(name, params, opts){
    return new Promise(function(resolve,reject){
      if(!window.apex||!apex.server||!apex.server.process){reject('APEX not available');return;}
      var payload = {
        pageItems: (opts && opts.pageItems) ? opts.pageItems
                  : '#P0_TENANCY_ID,#P0_PERSON_ID,#P0_PROJECT_ID,#P50_LIST_ID,#P50_VL,#P50_Q,#P50_TASK_ID,#P50_SHOW_DONE'
      };
      if (params && typeof params==='object'){
        if (params.x01!=null) payload.x01=params.x01;
        if (params.x02!=null) payload.x02=params.x02;
        if (params.x03!=null) payload.x03=params.x03;
        if (params.x04!=null) payload.x04=params.x04;
        if (params.x05!=null) payload.x05=params.x05;
        if (params.f01!=null) payload.f01=params.f01;
        if (params.f02!=null) payload.f02=params.f02;
      }
      apex.server.process(name, payload, { dataType: (opts&&opts.dataType)||'json' })
        .then(resolve).catch(reject);
    });
  }
  function setItem(n,v){ if(window.apex&&apex.item(n)){ apex.item(n).setValue(v==null?'':v); } }

  var iconMap={ calendar:'📅', flag:'⚑', user:'👤', circle:'◯', folder:'📁', users:'👥', inbox:'📥' };

  // --- tiny utils ---
  function debounce(fn,ms){ var t; return function(){ var a=arguments,ctx=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(ctx,a); }, ms||250); }; }
  function fetchListAccess(listId){
    // parse as text first so we never explode the UI on bad responses
    return new Promise(function(resolve,reject){
      apex.server.process('LIST_ACCESS_GET',
        { x01:String(listId), pageItems:'#P0_TENANCY_ID,#P0_PERSON_ID' },
        { dataType:'text' }
      ).then(function(txt){
        try{ resolve(JSON.parse(txt||'{}')||{}); }catch(e){ console.error('LIST_ACCESS_GET non-JSON:', txt); reject(e); }
      }).catch(reject);
    });
  }

  function createApp(){
    var h=preact.h, html=htm.bind(h), hooks=preactHooks;
    function PriorityDot(p){ var c=p==='CRITICAL'?'#dc2626':p==='HIGH'?'#f59e0b':p==='MEDIUM'?'#3b82f6':'#cbd5e1'; return html`<span class="pf-dot" style=${'border-color:'+c}></span>`; }
    function Slicer(p){ return html`<div class="pf-slicer"><span>${p.icon}</span><div><div style="color:var(--pf-muted);font-size:12px">${p.title}</div><div class="pf-value">${p.value}</div></div></div>`; }
    function sameDay(a,b){ return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

    function App(opts){
      var useState=hooks.useState, useEffect=hooks.useEffect;

      var _a=useState(''), active=_a[0], setActive=_a[1];
      var _b=useState(''), search=_b[0], setSearch=_b[1];
      var _c=useState([]), nav=_c[0], setNav=_c[1];
      var _d=useState([]), rows=_d[0], setRows=_d[1];
      var _e=useState({}), expanded=_e[0], setExpanded=_e[1];

      var _f=useState(''), listSearch=_f[0], setListSearch=_f[1];
      var _g=useState({}), collapsed=_g[0], setCollapsed=_g[1];

      // Admin UI state
      var _h=useState(null), adminAnchor=_h[0], setAdminAnchor=_h[1]; // {list,x,y}
      var _i=useState(null), adminDialog=_i[0], setAdminDialog=_i[1]; // { id, name, project_name, is_archived, shares:[], owner:{}, groups:[] }
      var _j=useState(false), adminBusy=_j[0], setAdminBusy=_j[1];

      // People share (legacy email add kept as-is; can be replaced with user-picker)
      var _k=useState(''),   shareEmail=_k[0], setShareEmail=_k[1];
      var _l=useState('VIEWER'), shareRole=_l[0], setShareRole=_l[1];

      // Group search state
      var _gs = useState(''),        groupQuery   = _gs[0], setGroupQuery   = _gs[1];
      var _gr = useState([]),        groupResults = _gr[0], setGroupResults = _gr[1];
      var _gb = useState(false),     groupBusy    = _gb[0], setGroupBusy    = _gb[1];

      // counts
      var _sm = useState({open:0,overdue:0,dueToday:0,done:0}), summary=_sm[0], setSummary=_sm[1];

      // --- open/close admin menu & dialog ---
      function openMenuForList(list, evt){
        evt.stopPropagation();
        var rect = evt.currentTarget.getBoundingClientRect();
        setAdminAnchor({ list:list, x:rect.right, y:rect.bottom });
      }
      function closeMenu(){ setAdminAnchor(null); }

      function openAdminDialog(list){
        setAdminAnchor(null);
        setAdminBusy(true);
        fetchListAccess(list.key).then(function(d){
          setAdminDialog({
            id: list.key,
            name: list.label,
            project_name: list.project_name,
            is_archived: list.is_archived || 'N',
            shares: (d && d.people) || [],
            owner: (d && d.owner) || {},
            groups: (d && d.groups) || []
          });
        }).catch(function(err){
          console.error(err); apex.message?.alert?.('Could not load list settings');
        }).finally(function(){ setAdminBusy(false); });
      }
      function closeAdminDialog(){ setAdminDialog(null); setShareEmail(''); setShareRole('VIEWER'); setGroupQuery(''); setGroupResults([]); }


function personDisplay(p){
  if (!p) return '';
  var name = (p.display_name || ( (p.first_name||'') + ' ' + (p.surname||'') )).trim();
  return name || p.email || ('User ' + (p.person_id||''));
}

      // --- admin actions (server) ---
      function doRename(){
        if(!adminDialog) return;
        setAdminBusy(true);
        apexCall('LIST_ADMIN', { x01:'RENAME', x02:String(adminDialog.id), x03: adminDialog.name })
          .then(function(){ refreshNavOnly(); closeAdminDialog(); })
          .catch(function(e){ console.error(e); apex.message?.alert?.('Rename failed'); })
          .finally(function(){ setAdminBusy(false); });
      }
      function doArchive(flag){
        if(!adminDialog) return;
        setAdminBusy(true);
        apexCall('LIST_ADMIN', { x01: flag ? 'ARCHIVE' : 'UNARCHIVE', x02:String(adminDialog.id) })
          .then(function(){ refreshNavOnly(); closeAdminDialog(); })
          .catch(function(e){ console.error(e); apex.message?.alert?.('Archive action failed'); })
          .finally(function(){ setAdminBusy(false); });
      }
      function doDelete(){
        if(!adminDialog) return;
        if(!confirm('Delete this list and all tasks? This cannot be undone.')) return;
        setAdminBusy(true);
        apexCall('LIST_ADMIN', { x01:'DELETE', x02:String(adminDialog.id) })
          .then(function(){
            if(String(active) === String(adminDialog.id)){ setActive(null); }
            refreshNavOnly(); closeAdminDialog();
          })
          .catch(function(e){ console.error(e); apex.message?.alert?.('Delete failed'); })
          .finally(function(){ setAdminBusy(false); });
      }
      function doShareAdd(){
        if(!adminDialog || !shareEmail) return;
        setAdminBusy(true);
        apexCall('LIST_ADMIN', { x01:'SHARE_ADD', x02:String(adminDialog.id), x04: shareRole, x03: shareEmail })
          .then(function(){ return fetchListAccess(adminDialog.id).then(function(d){ setAdminDialog(Object.assign({},adminDialog,{shares:(d&&d.people)||[]})); }); })
          .catch(function(e){ console.error(e); apex.message?.alert?.('Could not add user'); })
          .finally(function(){ setAdminBusy(false); setShareEmail(''); setShareRole('VIEWER'); });
      }
      function doShareRemove(person_id){
        if(!adminDialog) return;
        setAdminBusy(true);
        apexCall('LIST_ADMIN', { x01:'SHARE_REMOVE', x02:String(adminDialog.id), x05:String(person_id) })
          .then(function(){ return fetchListAccess(adminDialog.id).then(function(d){ setAdminDialog(Object.assign({},adminDialog,{shares:(d&&d.people)||[]})); }); })
          .catch(function(e){ console.error(e); apex.message?.alert?.('Could not remove user'); })
          .finally(function(){ setAdminBusy(false); });
      }

      // --- group search/bind ---
      var doGroupSearch = debounce(function(q){
        if(!adminDialog) return;
        setGroupBusy(true);
        apexCall('LIST_GROUP_SEARCH', { x01:String(adminDialog.id), x02:(q||'') })
          .then(function(d){ setGroupResults((d&&d.rows)||[]); })
          .catch(function(err){ console.error(err); setGroupResults([]); })
          .finally(function(){ setGroupBusy(false); });
      }, 250);

      function doGroupAdd(groupObj){
        if(!adminDialog || !groupObj) return;
        setAdminBusy(true);
        apex.server.process('LIST_ACCESS_GROUP_BIND', {
          x01: 'GROUP_ADD',
          x02: String(adminDialog.id),
          f01: [ JSON.stringify(groupObj) ]
        }, { dataType:'json' })
        .then(function(){
          return fetchListAccess(adminDialog.id).then(function(d){
            setAdminDialog(Object.assign({}, adminDialog, { groups: (d&&d.groups)||[] }));
            setGroupQuery(''); setGroupResults([]);
          });
        })
        .catch(function(err){ console.error(err); apex.message?.alert?.('Could not add group'); })
        .finally(function(){ setAdminBusy(false); });
      }
      function doGroupRemove(grantId){
        if(!adminDialog) return;
        setAdminBusy(true);
        apex.server.process('LIST_ACCESS_GROUP_BIND', {
          x01: 'GROUP_REMOVE',
          x02: String(adminDialog.id),
          x05: String(grantId)
        }, { dataType:'json' })
        .then(function(){
          return fetchListAccess(adminDialog.id).then(function(d){
            setAdminDialog(Object.assign({}, adminDialog, { groups: (d&&d.groups)||[] }));
          });
        })
        .catch(function(err){ console.error(err); apex.message?.alert?.('Could not remove group'); })
        .finally(function(){ setAdminBusy(false); });
      }

      function refreshNavOnly(){
        apexCall('TODO_GET_NAV').then(function(data){
          setNav((data && data.items) || []);
        }).catch(console.error);
      }

      function refreshAll(){
        refreshNavOnly();
     apexCall('TODO_GET_TASKS').then(function(data){
  var r = (data && data.rows) || [];
  r.forEach(function(t){
    t.due = t.due ? new Date(t.due) : null;
    // normalize list_id: treat undefined/'' as null
    if (t.list_id === '' || typeof t.list_id === 'undefined') t.list_id = null;
  });
  setRows(r);
          var today=r.filter(function(x){ return sameDay(x.due, new Date()); }).length;
          var done = r.filter(function(x){ return (x.status_txt||'').toUpperCase()==='DONE'; }).length;
          var overdue = r.filter(function(x){ return x.due && x.due < new Date() && (x.status_txt||'OPEN')!=='DONE'; }).length;
          setSummary({open:r.length, overdue:overdue, dueToday:today, done:done});
        }).catch(console.error);
      }

      // init
      useEffect(function(){ refreshAll(); }, []);

      // event wiring (PF_TODO_DATA_CHANGED)
      useEffect(function(){
        function refreshFromEvent(){ refreshAll(); }
        var jqHandler = function(){ refreshFromEvent(); };
        try { if (window.$ && $.fn && $(document).on){ $(document).on('PF_TODO_DATA_CHANGED', jqHandler); } } catch(_){}
        var domHandler = function(){ refreshFromEvent(); };
        document.addEventListener('PF_TODO_DATA_CHANGED', domHandler);
        return function(){
          try { if (window.$ && $.fn && $(document).off){ $(document).off('PF_TODO_DATA_CHANGED', jqHandler); } } catch(_){}
          document.removeEventListener('PF_TODO_DATA_CHANGED', domHandler);
        };
      },[]);

      function normalise(s){ return (s||'').toLowerCase(); }
      function groupLists(items){
        var out={};
        items.filter(function(i){return i.kind==='LIST';}).forEach(function(i){
          var g=i.project_name||'Standalone lists';
          (out[g]=out[g]||[]).push(i);
        });
        Object.keys(out).forEach(function(g){ out[g].sort(function(a,b){return a.label.localeCompare(b.label);}); });
        return out;
      }

      function renderNav(){
        var items = (nav||[]);
        var q = normalise(listSearch);
        if (q){
          items = items.filter(function(n){
            if (n.kind!=='LIST') return true;
            return normalise(n.label).indexOf(q)>=0;
          });
        }
        // Smart group first
        var smart = items.filter(function(n){return n.group==='SMART';});
        var lists = items.filter(function(n){return n.group==='LISTS';});
        // Group real lists by project label
        var byProject = groupLists(lists);

       function ListRow(i){
  var act = (String(i.key)===String(active)) ? ' active' : '';
  var SMART_KEYS = {
    "-101":"MYDAY",
    "-102":"IMPORTANT",
    "-103":"PLANNED",
    "-104":"ASSIGNED",
    "-105":"OPEN_ALL",
    "-106":"UNSORTED"
  };
  return html`
  <div class=${'pf-list-item'+act}
       onClick=${function(){
         setActive(String(i.key));
         var k = Number(i.key);
         if (Number.isFinite(k) && k > 0) {
           // real list
           if (window.apex && apex.item('P50_LIST_ID'))  apex.item('P50_LIST_ID').setValue(String(i.key));
           if (window.apex && apex.item('P50_VL'))       apex.item('P50_VL').setValue('');
         } else {
           // smart / virtual list
           var vl = SMART_KEYS[String(i.key)] || '';
           if (window.apex && apex.item('P50_VL'))       apex.item('P50_VL').setValue(vl);
           if (window.apex && apex.item('P50_LIST_ID'))  apex.item('P50_LIST_ID').setValue('');
         }
         // refresh data
         refreshAll();
       }}>
    <span>${iconMap[i.icon]||'◯'}</span>
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${i.label||''}</span>
    ${i.badge>0?html`<span class="pf-badge">${i.badge}</span>`:null}
    <div class="pf-list-actions" onClick=${function(e){ e.stopPropagation(); }}>
      <button type="button" class="pf-iconbtn" title="Favourite"
        onClick=${function(e){
          e.stopPropagation();
          var next = (i.is_fav==='Y' ? 'N' : 'Y');
          apexCall('LIST_FAV_TOGGLE', { x01:String(i.key), x02:next })
            .then(function(){ refreshNavOnly(); })
            .catch(console.error);
        }}>${i.is_fav==='Y'?'❤️':'🤍'}</button>
      <button type="button" class="pf-iconbtn" title="Manage list"
        onClick=${function(e){ openMenuForList(i, e); }}>⋯</button>
    </div>
  </div>`;
}


        return html`
          <div class="pf-card">
            <div class="pf-card-section"><input class="pf-input" placeholder="Search lists…"
              value=${listSearch} onInput=${function(e){ setListSearch(e.currentTarget.value); }} /></div>
            <div class="pf-card-section">
              ${smart.length?html`<div style="color:#475569;margin-bottom:6px">Smart</div>`:null}
              ${smart.map(ListRow)}
              <div class="pf-divider"></div>
              ${Object.keys(byProject).map(function(g){
                var isCol = !!collapsed[g];
                return html`<div>
                  <div class="pf-list-item" onClick=${function(){ var n=Object.assign({},collapsed); n[g]=!n[g]; setCollapsed(n); }}>
                    <span>📁</span>
                    <span style="flex:1">${g}</span>
                    <span style="font-size:12px;color:#475569">${isCol?'(show)':'(hide)'}</span>
                  </div>
                  ${isCol?null:byProject[g].map(ListRow)}
                </div>`;
              })}
            </div>
          </div>
        `;
      }

      function renderTasks(){
  var q = (search||'').trim().toUpperCase();
  var key = Number(active); // nav key: >0 real list, negatives = SMART

  var filtered = rows.filter(function(r){
    if (Number.isFinite(key)) {
      if (key > 0) {
        // Real list: include only tasks from that list
        if (Number(r.list_id) !== key) return false;
      } else if (key === -106) {
        // Unsorted smart list: include only tasks with list_id IS NULL
     // Unsorted smart list: include only tasks with list_id IS NULL (or undefined)
if (r.list_id != null) return false;

      } else {
        // Other SMART lists: leave as-is (server visibility already applied)
      }
    }
    if (!q) return true;
    var hay=((r.title||'')+' '+(r.description||'')).toUpperCase();
    return hay.indexOf(q)>=0;
  });

  return html`
    <div class="pf-card"><div class="pf-card-section pf-toolbar">
      <input class="pf-input" placeholder="Search title, description…" value=${search}
        onInput=${function(e){ setSearch(e.currentTarget.value); }} />
      <button type="button" class="pf-btn" id="pf-todo-filter-btn">Filters</button>
      <button type="button" class="pf-btn" id="pf-todo-sort-btn">Sort</button>
      <button type="button" class="pf-btn" id="pf-todo-quick-btn">Quick add</button>
      <button type="button" class="pf-btn pf-ghost"
        onClick=${function(){
          var cur=(window.apex&&apex.item('P50_SHOW_DONE'))?apex.item('P50_SHOW_DONE').getValue():'N';
          var next=(cur==='Y'?'N':'Y');
          if (window.apex&&apex.item('P50_SHOW_DONE')) apex.item('P50_SHOW_DONE').setValue(next,null,true);
          refreshAll();
        }}>☑ Show done</button>
    </div></div>

    <div class="pf-tasks">
      ${filtered.length===0?html`<div class="pf-card-section" style="color:var(--pf-muted)">No tasks match your filters.</div>` :
        filtered.map(function(t){
          return html`<div class=${'pf-task ' + (t.status_txt==='DONE'?'done':'')}><div class="pf-task-line">
            ${PriorityDot(t.priority)}
            <div style="flex:1">
              <div><span class="pf-title-click" onClick=${function(){ var n=Object.assign({},expanded); n[t.id]=!expanded[t.id]; setExpanded(n); }}>${t.title}</span></div>
              ${expanded[t.id]?html`<div class="pf-task-details" style="color:#475569;font-size:13px">
                <div>${t.description||''}</div>
                <div class="pf-actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                  ${t.project_id?html`<span class="pf-pill">📁 ${t.project_id}</span>`:null}
                  <span class="pf-pill">👤 ${t.assignee_name||''}</span>
                  ${t.due?html`<span class="pf-pill">📅 ${new Date(t.due).toLocaleDateString()}</span>`:null}
                  <button type="button" class="pf-btn" onClick=${function(){
                    setItem('P50_TASK_ID', t.id);
                    apexCall('TODO_COMPLETE').then(function(){ refreshAll(); }).catch(console.error);
                  }}>Mark done</button>
                  <button type="button" class="pf-btn" onClick=${function(){
                    setItem('P150_TASK_ID', t.id);
                    try{ apex.event.trigger(document, 'PF_EDIT_TASK', { id:String(t.id) }); }catch(e){}
                  }}>Edit</button>
                </div>
              </div>`:null}
            </div>
            <div class="pf-meta">
              ${t.project_id?html`<span>📁 ${t.project_id}</span>`:null}
              <span>👤 ${t.assignee_name||''}</span>
              ${t.due?html`<span>📅 ${new Date(t.due).toLocaleDateString()}</span>`:null}
              ${t.comments_count?html`<span>💬 ${t.comments_count}</span>`:null}
            </div>
          </div></div>`;
        })}
    </div>`;
}


      return html`
        <div class="pf-wrap">
          <div class="pf-header">
            <div class="pf-title">To-Do <span class="pf-chip">TB_WORKITEMS</span></div>
            <div style="display:flex;gap:8px">
              <button type="button" class="pf-btn" id="pf-todo-new-list">+ New list</button>
              <button type="button" class="pf-btn pf-primary" id="pf-todo-new-task">+ New</button>
              <button type="button" class="pf-btn">🔔 Digest</button>
            </div>
          </div>

          <div class="pf-grid">
            <!-- Sidebar (independent scroll) -->
            <div class="pf-left">
              ${renderNav()}
              ${adminAnchor?html`<div class="pf-pop" style=${'left:'+Math.max(12, adminAnchor.x-220)+'px; top:'+adminAnchor.y+'px'}>
                <div class="pf-pop-item" onClick=${function(){ openAdminDialog(adminAnchor.list); closeMenu(); }}>⚙️ List settings</div>
                <div class="pf-pop-item" onClick=${function(){ closeMenu(); setItem('P50_LIST_ID', adminAnchor.list.key); apex.event.trigger(document, 'PF_TODO_LIST_RENAME', {detail:{id:adminAnchor.list.key}}); }}>✏️ Rename</div>
                <div class="pf-pop-item" onClick=${function(){ closeMenu(); setItem('P50_LIST_ID', adminAnchor.list.key); apex.event.trigger(document, 'PF_TODO_LIST_SHARE',  {detail:{id:adminAnchor.list.key}}); }}>👥 Share</div>
                ${adminAnchor.list.is_archived==='Y'
                  ? html`<div class="pf-pop-item" onClick=${function(){ closeMenu(); setAdminDialog({id:adminAnchor.list.key, name:adminAnchor.list.label}); doArchive(false); }}>📂 Unarchive</div>`
                  : html`<div class="pf-pop-item" onClick=${function(){ closeMenu(); setAdminDialog({id:adminAnchor.list.key, name:adminAnchor.list.label}); doArchive(true); }}>🗄 Archive</div>`}
              </div>`:null}

             ${adminDialog?html`<div class="pf-modal-mask" onClick=${function(e){ if(e.target.classList.contains('pf-modal-mask')) closeAdminDialog(); }}>
  <div class="pf-modal" role="dialog" aria-modal="true">
    <div class="pf-head">List settings</div>
    <div class="pf-body">
      <!-- Name + summary -->
      <div class="pf-row">
        <input class="pf-input" placeholder="List name" value=${adminDialog.name}
          onInput=${function(e){ setAdminDialog(Object.assign({},adminDialog,{name:e.currentTarget.value})); }} />
      </div>

      <div class="pf-kv">
        <span class="kv">Owner: <strong>${personDisplay(adminDialog.owner)}</strong></span>
        <span class="kv">Status: ${adminDialog.is_archived==='Y'
          ? html`<span class="pf-chip red">Archived</span>`
          : html`<span class="pf-chip gray">Active</span>`}</span>
        <span class="kv">Shared with: <strong>${(adminDialog.shares||[]).length}</strong> people · <strong>${(adminDialog.groups||[]).length}</strong> groups</span>
      </div>

      <!-- Access control intro -->
      <div class="pf-subtle" style="margin-top:6px">Sharing & access — add people or groups to grant access to this list.</div>

      <!-- People -->
      <div>
        <div style="font-weight:600;margin:14px 0 6px">Share with people</div>
        <div class="pf-row" style="gap:6px">
          <input class="pf-input" placeholder="user@email"
                 value=${shareEmail} onInput=${function(e){ setShareEmail(e.currentTarget.value); }} />
          <select class="pf-input" value=${shareRole}
                  onChange=${function(e){ setShareRole(e.currentTarget.value); }}>
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="button" class="pf-btn" onClick=${doShareAdd} disabled=${adminBusy || !shareEmail}>Add</button>
        </div>
        <div class="pf-subtle" style="margin-top:4px">People added here will appear below and get access immediately.</div>

        <div class="pf-card" style="margin-top:8px">
          <div class="pf-card-section" style="max-height:200px; overflow:auto">
            ${(adminDialog.shares||[]).length===0
              ? html`<div class="pf-subtle">No people have access yet.</div>`
              : (adminDialog.shares||[]).map(function(p){
                  return html`<div class="pf-row" style="align-items:center">
                    <div>${personDisplay(p)}</div>
                    <div style="text-align:right">
                      <span class="pf-link" onClick=${function(){ doShareRemove(p.person_id); }}>Remove</span>
                    </div>
                  </div>`;
                })}
          </div>
        </div>
      </div>

      <!-- Groups -->
      <div>
        <div style="font-weight:600;margin:14px 0 6px">Share with groups</div>
        <div class="pf-row" style="align-items:flex-start">
          <input class="pf-input" placeholder="Search groups (e.g., Project members, Tenancy admin, PMO)…"
                value=${groupQuery}
                onInput=${function(e){ var q=e.currentTarget.value; setGroupQuery(q); doGroupSearch(q); }} />
          <button type="button" class="pf-btn" disabled=${groupBusy || !groupQuery}
                onClick=${function(){ doGroupSearch(groupQuery); }}>
            ${groupBusy?'Searching…':'Search'}
          </button>
        </div>
        <div class="pf-subtle" style="margin-top:4px">Grant access to whole groups at once. Remove to revoke.</div>

        ${(groupResults||[]).length>0 ? html`
          <div class="pf-card" style="margin-top:8px">
            <div class="pf-card-section" style="max-height:220px; overflow:auto; padding:8px">
              ${(groupResults||[]).map(function(row){
                return html`<div class="pf-row" style="margin-bottom:6px; gap:8px">
                  <div style="flex:1 1 auto; min-width:0">
                    <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${row.code}
                    </div>
                    <div class="pf-subtle">
                      ${row.scope} · ${row.permission_level}
                    </div>
                  </div>
                  <button type="button" class="pf-btn" onClick=${function(){ doGroupAdd(row); }}>Add</button>
                </div>`;
              })}
            </div>
          </div>
        ` : null}

        <div class="pf-card" style="margin-top:8px">
          <div class="pf-card-section" style="max-height:220px; overflow:auto; padding:8px">
            ${(adminDialog.groups||[]).length===0
              ? html`<div class="pf-subtle">No groups have access yet.</div>`
              : (adminDialog.groups||[]).map(function(g){
                  return html`<div class="pf-row" style="margin-bottom:6px; gap:8px">
                    <div style="flex:1 1 auto; min-width:0">
                      <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${g.code}
                      </div>
                      <div class="pf-subtle">
                        ${g.scope} · ${g.permission_level}
                      </div>
                    </div>
                    <button type="button" class="pf-btn" onClick=${function(){ doGroupRemove(g.grant_id); }}>Remove</button>
                  </div>`;
                })}
          </div>
        </div>
      </div>
    </div>

    <div class="pf-foot">
      <button type="button" class="pf-btn" onClick=${function(){ doArchive(adminDialog.is_archived!=='Y'); }} disabled=${adminBusy}>
        ${adminDialog.is_archived==='Y' ? 'Unarchive' : 'Archive'}
      </button>
      <button type="button" class="pf-btn pf-danger" onClick=${doDelete} disabled=${adminBusy}>Delete</button>
      <button type="button" class="pf-btn" onClick=${doRename} disabled=${adminBusy || !adminDialog.name}>Save</button>
      <button type="button" class="pf-btn pf-ghost" onClick=${closeAdminDialog}>Close</button>
    </div>
  </div>
</div>`:null}

            </div>

            <!-- Main pane (independent scroll) -->
            <div class="pf-right">
              <div class="pf-slicers">
                ${Slicer({title:'Due Today', value:summary.dueToday, icon:'📅'})}
                ${Slicer({title:'Overdue',   value:summary.overdue,  icon:'⚑'})}
                ${Slicer({title:'Open',      value:summary.open,     icon:'◯'})}
                ${Slicer({title:'Done',      value:summary.done,     icon:'✓'})}
              </div>

              ${renderTasks()}
            </div>
          </div>
        </div>`;
      }
    return { App: App };
    }

  // ---- Bind inline actions (no reload / no submit)
  (function bindTodoInline(){
    if (window.__pf_todo_inline__) return; window.__pf_todo_inline__ = true;
    function $v(n){ return (window.apex && apex.item && apex.item(n)) ? apex.item(n).getValue() : ''; }
    function setIf(p, v){ if (window.apex && apex.item && apex.item(p)) { apex.item(p).setValue(v); } }
    function signalDataChanged(detail){
      try { apex.event.trigger(document, 'PF_TODO_DATA_CHANGED', detail||{}); } catch(_){}
      try { document.dispatchEvent(new CustomEvent('PF_TODO_DATA_CHANGED', { detail: detail||{} })); } catch(_){}
    }

    document.addEventListener('click', function(e){
      // + New task
      if (e.target.closest && e.target.closest('#pf-todo-new-task')){
        e.preventDefault(); e.stopPropagation();
        var title = window.prompt('Task name:'); if (!title) return;

        var currentListId = $v('P50_LIST_ID');
        var listId = /^\d+$/.test(currentListId) ? Number(currentListId) : null;
        if (listId==null){
          var add = window.confirm('Add to an existing list? (Cancel = put into Unsorted)');
          if (add){
            var other = window.prompt('Enter List ID (leave blank to keep Unsorted):','');
            if (other && other.trim() !== '') listId = Number(other);
          }
        }
        setIf('P50_VL', (/^\d+$/.test(String(listId||'')) ? '' : ($v('P50_VL') || 'MYDAY')));
        setIf('P50_LIST_ID', (listId!=null ? String(listId) : ''));

        apex.server.process('TODO_CREATE', {
          f01: [ JSON.stringify({ name: title, listId: listId }) ],
          pageItems: '#P0_TENANCY_ID,#P0_PERSON_ID'
        }, { dataType: 'json' })
        .then(function(){ signalDataChanged({ type:'taskCreated' }); })
        .catch(function(err){ console.error(err); apex.message?.alert?.('Could not create task'); });

        return;
      }

      // + New list
      if (e.target.closest && e.target.closest('#pf-todo-new-list')){
        e.preventDefault(); e.stopPropagation();
        var name = window.prompt('New list name:'); if (!name) return;

        apex.server.process('TODO_CREATE_LIST', {
          x01: name,
          x02: $v('P0_PROJECT_ID'),
          x03: $v('P0_TENANCY_ID'),
          x04: $v('P0_PERSON_ID')
        }, { dataType: 'json' })
        .then(function(res){
          var newId = res && res.list_id ? String(res.list_id) : null;
          if (newId){
            if (window.apex && apex.item){ apex.item('P50_LIST_ID').setValue(newId); apex.item('P50_VL').setValue(''); }
            window.__pf_todo_active_key__ = newId;
            signalDataChanged({ type:'listCreated', newListId:newId });
          } else {
            signalDataChanged({ type:'listCreated' });
          }
        })
        .catch(function(err){
          console.error(err);
          apex.message?.alert?.('Could not create list');
        });

        return;
      }
    }, true);
  })();

  // --- mount
  function mount(containerId, options){
    injectCSS();
    var root=document.getElementById(containerId);
    var C=createApp().App;
    preact.render(preact.h(C, options||{}), root);
  }

  window.PortfolionTodo = {
    mount: function(containerId, options){
      ensureLibs().then(function(){ mount(containerId, options); });
    }
  };
})();
