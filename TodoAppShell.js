/* PortfoliON – TODO App Shell (UMD)  v2.0
 * Uses PortfolionListNav + PortfolionListAdmin. No embedded nav/admin code.
 * Mount with: PortfolionTodoAppV2.mount('todo-root')
 */
(function (global){
  const ICONS={};
  const CSS = `
  .pta { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; }
  .pta .grid { display:grid; grid-template-columns: 300px 1fr; gap:16px; height: calc(100vh - 220px); }
  .pta .left, .pta .right { height:100%; overflow:auto; }
  .pta .card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; }
  .pta .section { padding:12px; }
  .pta .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .pta .input { border:1px solid #e5e7eb; border-radius:10px; padding:7px 10px; min-width:240px; outline:none; }
  .pta .btn { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:6px 10px; cursor:pointer; }
  .pta .btn.primary { border-color:#4f46e5; background:#4f46e5; color:#fff; }
  .pta .slicers { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px; margin-bottom:10px; }
  .pta .slicer { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:10px; display:flex; align-items:center; gap:10px }
  .pta .slicer .val { font-size:20px; font-weight:700 }
  .pta .task { border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; }
  .pta .task + .task { margin-top:8px; }
  .pta .meta { display:flex; gap:10px; align-items:center; color:#475569; font-size:12px; }
  .pta .title-link{ cursor:pointer; text-decoration:underline; text-decoration-color:#e5e7eb }
  /* done styling */
  .pta .task.done{ background:#f8fafc; }
  .pta .task.done .title-link{ text-decoration:line-through; text-decoration-thickness:1.5px; color:#64748b; }
  .pta .task.done .meta{ color:#94a3b8; }
  /* compact scale */
  .pta { --scale:.85; }
  .pta .input { padding: calc(7px*var(--scale)) calc(10px*var(--scale)); min-width: calc(240px*var(--scale)); }
  .pta .btn { padding: calc(6px*var(--scale)) calc(10px*var(--scale)); font-size: calc(13px*var(--scale)); }
  `;
  function ensureCSS(){ if (!document.getElementById('pta-css')) document.head.appendChild(el('style',{id:'pta-css'}, CSS)); }
  function el(tag, props, ...kids){
    const e=document.createElement(tag);
    if (props) for (const [k,v] of Object.entries(props)){
      if (k==='class') e.className=v;
      else if (k.startsWith('on') && typeof v==='function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k!=null) e.setAttribute(k,v);
    }
    for (const k of kids.flat()) e.appendChild(typeof k==='string'?document.createTextNode(k):(k||document.createTextNode('')));
    return e;
  }
  function $v(n){ return (window.apex && apex.item && apex.item(n)) ? apex.item(n).getValue() : ''; }
  function setItem(n,v){ if (window.apex && apex.item && apex.item(n)) apex.item(n).setValue(v==null?'':v,null,true); }
  function apexCall(name, payload, opts){ return apex.server.process(name, payload||{}, Object.assign({ dataType:'json' }, opts||{})); }

  function App(rootId){
    this.root = typeof rootId==='string'? document.getElementById(rootId) : rootId;
    this.state = { rows:[], expanded:{}, search:'', summary:{open:0,overdue:0,dueToday:0,done:0} };
    ensureCSS();
    this.mount();
  }

  App.prototype.mount = function(){
    this.root.innerHTML='';
    this.wrap = el('div', {class:'pta'},
      el('div', {class:'grid'},
        this.left = el('div', {class:'left'}),
        this.right = el('div', {class:'right'},
          el('div', {class:'slicers'},
            this.slice1 = el('div', {class:'slicer'}, el('span',{},'📅'), el('div',{}, el('div',{},'Due Today'), this.v1 = el('div',{class:'val'},'0'))),
            this.slice2 = el('div', {class:'slicer'}, el('span',{},'⚑'), el('div',{}, el('div',{},'Overdue'),   this.v2 = el('div',{class:'val'},'0'))),
            this.slice3 = el('div', {class:'slicer'}, el('span',{},'◯'), el('div',{}, el('div',{},'Open'),      this.v3 = el('div',{class:'val'},'0'))),
            this.slice4 = el('div', {class:'slicer'}, el('span',{},'✓'), el('div',{}, el('div',{},'Done'),      this.v4 = el('div',{class:'val'},'0')))
          ),
          el('div', {class:'card'}, el('div', {class:'section toolbar'},
            this.search = el('input', {class:'input', placeholder:'Search title, description…', value:this.state.search, oninput:(e)=>{ this.state.search=e.target.value; this.renderTasks(); }}),
            el('button', {type:'button', class:'btn', onclick:()=>this.quickAdd()}, 'Quick add'),
            el('button', {type:'button', class:'btn', onclick:()=>this.toggleDone()}, '☑ Show done')
          )),
          this.tasksWrap = el('div', {class:'section'})
        )
      )
    );
    this.root.appendChild(this.wrap);

    // Mount List Nav component
    var NAV_API = {
      getNav: ()=> apexCall('TODO_GET_NAV', { pageItems:'#P0_TENANCY_ID,#P0_PERSON_ID' })
    };
    PortfolionListNav.mount(this.left, {
      api: NAV_API,
      active: $v('P50_VL') || $v('P50_LIST_ID'),
      onSelect: (key)=>{
        var k = String(key);
        if (/^-/.test(k)){ // virtual
          setItem('P50_VL', {
            '-101':'MYDAY', '-102':'IMPORTANT', '-103':'PLANNED', '-104':'ASSIGNED', '-105':'OPEN_ALL', '-106':'UNSORTED'
          }[k] || '');
          setItem('P50_LIST_ID','');
        } else {
          setItem('P50_LIST_ID', k);
          setItem('P50_VL','');
        }
        this.refresh();
      },
      onOpenAdmin: (listItem)=> {
        PortfolionListAdmin.openApex({
          listId: listItem.key,
          onChanged: ()=> { this.refreshNavOnly(); this.refresh(); }
        });
      }
    });

    // Events: refresh on data changed
    document.addEventListener('PF_TODO_DATA_CHANGED', ()=> this.refresh());
    if (window.$ && $.fn) $(document).on('PF_TODO_DATA_CHANGED', ()=> this.refresh());

    this.refresh();
  };

  App.prototype.refreshNavOnly = function(){
    // If you keep an instance handle to the nav, call .load() here. For simplicity we rely on its internal refresh
    apexCall('TODO_GET_NAV', { pageItems:'#P0_TENANCY_ID,#P0_PERSON_ID' }).then(()=>{});
  };

  App.prototype.toggleDone = function(){
    var cur = ($v('P50_SHOW_DONE') || 'N');
    setItem('P50_SHOW_DONE', cur==='Y' ? 'N' : 'Y');
    this.refresh();
  };

  App.prototype.quickAdd = function(){
    var title = prompt('Task name:'); if (!title) return;
    var listId = $v('P50_LIST_ID'); listId = /^\d+$/.test(listId) ? Number(listId) : null;
    apex.server.process('TODO_CREATE', { f01: [ JSON.stringify({ name:title, listId:listId }) ] }, { dataType:'json' })
      .then(()=> this.refresh());
  };

  App.prototype.refresh = function(){
    apexCall('TODO_GET_TASKS', { pageItems:'#P0_TENANCY_ID,#P0_PERSON_ID,#P50_LIST_ID,#P50_VL,#P50_Q,#P50_TASK_ID,#P50_SHOW_DONE' })
      .then((data)=>{
        var r = (data && data.rows) || [];
        r.forEach(t=>{
          t.due = t.due ? new Date(t.due) : null;
          if (t.list_id === '' || typeof t.list_id === 'undefined') t.list_id = null; // normalize unsorted
        });
        this.state.rows = r;
        // summary
        var today=r.filter(x=> x.due && (x.due.toDateString()===new Date().toDateString())).length;
        var done = r.filter(x=> (x.status_txt||'').toUpperCase()==='DONE').length;
        var overdue = r.filter(x=> x.due && x.due < new Date() && (x.status_txt||'OPEN')!=='DONE').length;
        this.state.summary = { open:r.length, overdue:overdue, dueToday:today, done:done };
        this.v1.textContent = today; this.v2.textContent = overdue; this.v3.textContent = r.length; this.v4.textContent = done;
        this.renderTasks();
      });
  };

  App.prototype.renderTasks = function(){
    var q = (this.state.search||'').trim().toUpperCase();
    var key = Number($v('P50_LIST_ID') || '');
    var filtered = this.state.rows.filter(function(t){
      if (!isNaN(key) && key>0){ if (Number(t.list_id)!==key) return false; }
      if (!q) return true;
      var hay=((t.title||'')+' '+(t.description||'')).toUpperCase();
      return hay.indexOf(q)>=0;
    });

    var frag=document.createDocumentFragment();
    if (filtered.length===0) frag.appendChild(el('div', {class:'section', style:'color:#64748b'}, 'No tasks match your filters.'));
    filtered.forEach(t=>{
      var row = el('div', {class:'task'+(t.status_txt==='DONE'?' done':'')},
        el('div', {},
          el('span', {class:'title-link', onclick:()=> this.toggleExpand(t.id)}, t.title||'(untitled)')
        ),
        t.id && this.state.expanded[t.id] ? el('div', {style:'color:#475569;font-size:13px; margin-top:6px'},
          el('div', {}, t.description||''),
          el('div', {class:'meta', style:'margin-top:8px'},
            t.assignee_name ? el('span', {}, '👤 '+t.assignee_name) : null,
            t.due ? el('span', {}, '📅 '+t.due.toLocaleDateString()) : null
          ),
          el('div', {style:'display:flex; gap:6px; margin-top:8px; flex-wrap:wrap'},
            el('button', {type:'button', class:'btn', onclick:()=> this.markDone(t.id)}, 'Mark done'),
            el('button', {type:'button', class:'btn', onclick:()=> this.editTask(t.id)}, 'Edit')
          )
        ) : null
      );
      frag.appendChild(row);
    });
    this.tasksWrap.innerHTML='';
    this.tasksWrap.appendChild(frag);
  };

  App.prototype.toggleExpand = function(id){
    this.state.expanded[id] = !this.state.expanded[id];
    this.renderTasks();
  };
  App.prototype.markDone = function(taskId){
    apexCall('TODO_COMPLETE', { pageItems:'#P0_TENANCY_ID,#P0_PERSON_ID,#P50_TASK_ID', x01:String(taskId) })
      .then(()=> this.refresh());
  };
  App.prototype.editTask = function(taskId){
    // Leave as-is: trigger your existing DA/modal
    if (window.apex && apex.event) apex.event.trigger(document, 'PF_EDIT_TASK', { id:String(taskId) });
  };

  const API = { mount: (containerId)=> new App(containerId) };
  global.PortfolionTodoAppV2 = API;
})(window);
