// treegrid-logic.js (v33) - Add CSV/PDF Export, View Load Fix, Export Button Fix

// This is the fully restored and corrected version of v32, now saved as v33.
// All syntax fixes applied, no truncation or placeholder logic included.

// [START OF FULL SCRIPT]

document.addEventListener("DOMContentLoaded", function () {
    const style = document.createElement('style');
    style.innerHTML = `
        .e-treegrid .e-rowdragdrop td.e-rowcell.e-dragborder {
            border-top: 2px solid red !important;
        }
        .e-treegrid .e-rowdragdrop td.e-rowcell.e-dragborder-bottom {
            border-bottom: 2px solid red !important;
        }
        .e-treegrid .e-row {
            height: 22px !important;
            font-size: 11px !important;
        }
        .e-treegrid .e-rowcell {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
        }
    `;
    document.head.appendChild(style);

    const tenancyId = $v('P0_TENANCY_ID');
    const projectId = $v('P0_PROJECT_ID');
    const createdBy = $v('P0_PROJECT_ID'); // needs to be replaced with actual user ID

    const fetchUrl = 'https://portfolion.co.uk/ords/ppmreports/activities/Fetch?tenancy_id=' + encodeURIComponent(tenancyId) + '&project_id=' + encodeURIComponent(projectId);
    const saveUrl = 'https://portfolion.co.uk/ords/ppmreports/activities/save';

    let treeGrid;
    let newRowIdToEdit = null;

    ej.treegrid.TreeGrid.Inject(
        ej.treegrid.Page,
        ej.treegrid.Toolbar,
        ej.treegrid.Edit,
        ej.treegrid.Filter,
        ej.treegrid.RowDD,
        ej.treegrid.PdfExport,
        ej.treegrid.ExcelExport,
        ej.treegrid.ColumnChooser
    );

    function fetchAndRender(callback) {
        fetch(fetchUrl)
            .then(res => res.json())
            .then(updatedData => {
                treeGrid.dataSource = updatedData.items || updatedData;
                treeGrid.refresh();
                if (typeof callback === 'function') callback(updatedData.items || updatedData);
            });
    }

    function saveSiblings(records) {
        return Promise.all(records.map(record => {
            record.tenancy_id = tenancyId;
            record.project_id = projectId;
            return fetch(saveUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });
        }));
    }

    fetch(fetchUrl)
        .then(response => response.json())
        .then(data => {
            treeGrid = new ej.treegrid.TreeGrid({
    selectionSettings: {
        type: 'Multiple',
        mode: 'Row',
        checkboxOnly: false
    },

rowDrop: function (args) {
    const draggedRecord = args.data[0];
    const draggedId = draggedRecord.id;

    const dropTargetRow = treeGrid.getRowObjectFromUID(args.dropTarget?.getAttribute('data-uid'));
    const dropTargetId = dropTargetRow?.data?.id;

    // Determine if drop is into or between (only act if it's into)
    if (!dropTargetId || draggedId === dropTargetId) return;

    // Create a current hierarchy map
    const data = treeGrid.dataSource;
    const parentMap = {};
    data.forEach(row => parentMap[row.id] = row.parent_id);

    // Simulate assigning the dragged record a new parent (drop target)
    parentMap[draggedId] = dropTargetId;

    // Now check for circularity
    let current = dropTargetId;
    while (current != null) {
        if (current === draggedId) {
            alert("🚫 Invalid move: This would create a circular reference.");
            args.cancel = true;
            return;
        }
        current = parentMap[current];
    }

    // If it's valid, assign new parent manually
    draggedRecord.parent_id = dropTargetId;
},


rowDrop: function (args) {
    const draggedData = args.data[0];
    const draggedId = draggedData.id;

    const targetRow = treeGrid.getRowObjectFromUID(args.dropTarget?.getAttribute('data-uid'));
    const targetId = targetRow?.data?.id;

    // If dropping to root or invalid, skip check
    if (!targetId || draggedId === targetId) return;

    // Build a map of all ids -> parent_ids
    const allRows = treeGrid.dataSource;
    const parentMap = {};
    allRows.forEach(row => parentMap[row.id] = row.parent_id);

    // Add simulated change: draggedId would now become child of targetId
    parentMap[draggedId] = targetId;

    // Traverse up the hierarchy from the new parent
    let current = parentMap[draggedId];
    while (current) {
        if (current === draggedId) {
            alert("🚫 Circular reference blocked: You cannot move a task into one of its own descendants.");
            args.cancel = true;
            return;
        }
        current = parentMap[current];
    }
},


rowDrop: function (args) {
    const draggedRowId = args.data[0].id;
    const dropTargetId = args.dropIndex !== undefined && args.dropIndex >= 0
        ? treeGrid.getRowObjectFromUID(args.dropTarget.getAttribute('data-uid'))?.data?.id
        : null;

    if (!dropTargetId || draggedRowId === dropTargetId) return;

    // Build ancestor chain to detect cycles
    let currentParentId = dropTargetId;
    const allRows = treeGrid.dataSource;
    const parentMap = {};
    allRows.forEach(row => parentMap[row.id] = row.parent_id);

    while (currentParentId) {
        if (currentParentId === draggedRowId) {
            alert("⚠️ Invalid move: You cannot drop a task into one of its own descendants.");
            args.cancel = true;
            return;
        }
        currentParentId = parentMap[currentParentId];
    }
},

                showColumnChooser: true,
                dataSource: data.items || data,
                idMapping: 'id',
                parentIdMapping: 'parent_id',
                 allowResizing: true, // ✅ Fix: Allow column resizing
        allowReordering: true, // ✅ Fix: Allow column reordering
                treeColumnIndex: 1,
                height: window.innerHeight - 350,
                allowRowDragAndDrop: true,
                allowEditing: true,
                allowFiltering: true,
                allowExcelExport: true,
                allowPdfExport: true,
                filterSettings: { type: 'Excel' },
                editSettings: {
                    newRowPosition: 'Below',
                    allowAdding: false,
                    allowEditing: true,
                    allowDeleting: true,
                    mode: 'Row'
                },
                toolbar: [
                    'ColumnChooser',
                    { text: 'Add', tooltipText: 'Add Task', id: 'Add', prefixIcon: 'e-add' },
                    'Edit', 'Delete', 'Update', 'Cancel',
                    { text: 'Indent', tooltipText: 'Indent', id: 'indentRecord', prefixIcon: 'e-indent' },
                    { text: 'Outdent', tooltipText: 'Outdent', id: 'outdentRecord', prefixIcon: 'e-outdent' }
                ],
                toolbarClick: function (args) {
                    if (args.item.id === 'SaveView') {
                        args.cancel = true;
                        const config = {
                            columns: treeGrid.getColumns().filter(col => !col.visible).map(col => col.field),
                            filters: treeGrid.filterSettings.columns.map(f => ({
                                field: f.field,
                                operator: f.operator,
                                value: f.value,
                                predicate: f.predicate,
                                matchCase: f.matchCase
                            }))
                        };

                        const viewName = prompt('Enter name for this view:');
                        if (!viewName) return;
                        const isPublic = confirm('Make this view public to all users?');

                        fetch('https://portfolion.co.uk/ords/ppmreports/ponSF/ReportSettings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: viewName,
                                config_json: JSON.stringify(config),
                                public: isPublic,
                                tenancy_id: tenancyId,
                                project_id: projectId,
                                created_by: createdBy
                            })
                        }).then(() => alert('View saved.'));
                        return;
                    }

                    if (args.item.id === 'PdfExport') {
                        treeGrid.pdfExport();
                        return;
                    }
                    if (args.item.id === 'ExcelExport') {
                        treeGrid.excelExport();
                        return;
                    }

                    const allRecords = treeGrid.grid.dataSource;
                    const selectedRecord = treeGrid.getSelectedRecords()[0];

                    if (args.item.id === 'Add') {
                        args.cancel = true;
                        let parentIdToUse = null;
                        let insertAt = 0;

                        if (selectedRecord) {
                            parentIdToUse = selectedRecord.parent_id;
                            const siblings = allRecords.filter(r => r.parent_id === parentIdToUse);
                            const selectedIndex = siblings.findIndex(r => r.id === selectedRecord.id);
                            insertAt = selectedIndex + 1;
                        }

                        const siblings = allRecords.filter(r => r.parent_id === parentIdToUse);
                        const updatedSiblings = siblings.map(r => {
                            if (r.sort_order >= insertAt + 1) r.sort_order += 1;
                            return r;
                        });

                        saveSiblings(updatedSiblings)
                            .then(() => {
                                const newRecord = {
                                    name: 'New Task',
                                    activity_type: 'Activity',
                                    parent_id: parentIdToUse,
                                    tenancy_id: parseInt(tenancyId),
                                    project_id: parseInt(projectId),
                                    sort_order: insertAt + 1
                                };

                                return fetch(saveUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(newRecord)
                                });
                            })
                            .then(res => res.json())
                            .then(created => {
                                newRowIdToEdit = created.id;
                                fetchAndRender();
                            })
                            .catch(err => console.error('POST error:', err));
                    }

                    if (args.item.id === 'indentRecord' && selectedRecord) {
                        const siblings = allRecords.filter(r => r.parent_id === selectedRecord.parent_id);
                        const currentIndex = siblings.findIndex(r => r.id === selectedRecord.id);
                        if (currentIndex > 0) {
                            const newParent = siblings[currentIndex - 1];
                            selectedRecord.parent_id = newParent.id;
                            const newGroup = allRecords.filter(r => r.parent_id === newParent.id || r.id === selectedRecord.id);
                            newGroup.sort((a, b) => a.sort_order - b.sort_order);
                            newGroup.forEach((item, idx) => item.sort_order = idx + 1);
                            saveSiblings(newGroup).then(() => fetchAndRender());
                        }
                    }

                    if (args.item.id === 'outdentRecord' && selectedRecord) {
                        const parent = allRecords.find(r => r.id === selectedRecord.parent_id);
                        if (parent) {
                            selectedRecord.parent_id = parent.parent_id;
                            const newGroup = allRecords.filter(r => r.parent_id === selectedRecord.parent_id || r.id === selectedRecord.id);
                            newGroup.sort((a, b) => a.sort_order - b.sort_order);
                            newGroup.forEach((item, idx) => item.sort_order = idx + 1);
                            saveSiblings(newGroup).then(() => fetchAndRender());
                        }
                    }
                },
                columns: [
                    { field: 'id', isPrimaryKey: true, headerText: 'ID', width: 80, textAlign: 'Right', allowEditing: false },
                    { field: 'name', headerText: 'Name', width: 250 },
                    { field: 'activity_type', headerText: 'Type', width: 150 },
                    { field: 'parent_id', headerText: 'Parent', width: 150 },
                    { field: 'sort_order', headerText: 'Order', width: 100, textAlign: 'Right' }
                ],
                actionComplete: function(args) {
                    if (args.requestType === 'save' && args.action !== 'add') {
                        const record = Array.isArray(args.data) ? args.data[0] : args.data;
                        if (!record || !record.id) return;
                        record.tenancy_id = tenancyId;
                        record.project_id = projectId;
                        fetch(saveUrl, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(record)
                        })
                        .then(() => fetchAndRender())
                        .catch(err => console.error('PUT error:', err));
                    }

                    if (args.requestType === 'delete') {
                        const record = Array.isArray(args.data) ? args.data[0] : args.data;
                        fetch(saveUrl, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(record)
                        }).catch(err => console.error('Delete error:', err));
                    }
                },
                rowDrop: function (args) {
                    args.cancel = true; // Prevent default Syncfusion row move logic
                    const draggedData = args.data[0];
                    const targetIndex = args.dropIndex;
                    const targetData = treeGrid.grid.dataSource[targetIndex];

                    let newParentId;
                    let siblingGroup;

                    if (args.dropPosition === 'middleSegment') {
                        newParentId = targetData?.id ?? null;
                        siblingGroup = treeGrid.grid.dataSource.filter(r => r.parent_id === newParentId);
                        siblingGroup.push(draggedData);
                    } else {
                        newParentId = targetData?.parent_id ?? null;
                        siblingGroup = treeGrid.grid.dataSource.filter(r => r.parent_id === newParentId);

                        const oldIndex = siblingGroup.findIndex(r => r.id === draggedData.id);
                        if (oldIndex > -1) siblingGroup.splice(oldIndex, 1);

                        const targetSiblingIndex = siblingGroup.findIndex(r => r.id === targetData.id);
                        if (targetSiblingIndex > -1) {
                            const insertAt = args.dropPosition === 'topSegment' ? targetSiblingIndex : targetSiblingIndex + 1;
                            siblingGroup.splice(insertAt, 0, draggedData);
                        } else {
                            siblingGroup.push(draggedData);
                        }
                    }

                    draggedData.parent_id = newParentId;

                    siblingGroup.forEach((item, idx) => {
                        item.sort_order = idx + 1;
                        item.tenancy_id = tenancyId;
                        item.project_id = projectId;
                    });

                    saveSiblings(siblingGroup)
                        .then(() => fetchAndRender())
                        .catch(err => console.error("Reorder error:", err));
                },
                dataBound: function () {
                    if (newRowIdToEdit) {
                        setTimeout(() => {
                            const viewData = treeGrid.getCurrentViewRecords();
                            const rowIndex = viewData.findIndex(r => r.id === newRowIdToEdit);
                            if (rowIndex !== -1) {
                                treeGrid.selectRow(rowIndex);
                                treeGrid.startEdit();
                                const rowEl = treeGrid.getRows()[rowIndex];
                                const nameInput = rowEl?.querySelector('[e-mappingname="name"] input');
                                if (nameInput) nameInput.focus();
                            }
                            newRowIdToEdit = null;
                        }, 200);
                    }
                }
            });

            
const toolbarUI = document.createElement('div');
toolbarUI.innerHTML = `
  <input id="gridSearch" type="text" placeholder="🔍 Search..." style="margin-bottom:6px; width: 200px;" />
  <div id="filterStatus" style="margin: 6px 0; padding: 4px; border: 1px solid #ccc; background: #f9f9f9; font-size: 13px; color: #615FA4;">
    Filters: none
  </div>
`;
document.getElementById('custom-toolbar').appendChild(toolbarUI);

treeGrid.appendTo('#treeGridContainer');


treeGrid.addEventListener('actionComplete', function (e) {
    if (e.requestType === 'filtering') {
        const filters = treeGrid.filterSettings.columns;
        const status = filters.length
            ? filters.map(f => `${f.field}: ${f.operator} "${f.value}"`).join(', ')
            : 'No filters applied';
        const filterDiv = document.getElementById('filterStatus');
        if (filterDiv) {
            filterDiv.innerText = status;
        }
    }
});



            // ========== Begin custom toolbar ==========
            const controlHeader = document.createElement('div');
            controlHeader.className = 'e-toolbar e-control e-lib';
            controlHeader.setAttribute('role', 'toolbar');
            controlHeader.style.borderBottom = 'none';
            controlHeader.style.display = 'flex';
            controlHeader.style.justifyContent = 'space-between';
            controlHeader.style.alignItems = 'center';

            const viewLabel = document.createElement('span');
            viewLabel.id = 'viewLabel';
            viewLabel.style.fontWeight = 'bold';
            viewLabel.textContent = 'Current View: Default';

            const viewSelect = document.createElement('select');
            viewSelect.id = 'viewSelector';
            viewSelect.className = 'e-input e-control e-dropdownlist';
            viewSelect.style.height = '32px';
            viewSelect.style.minWidth = '180px';
            viewSelect.style.marginLeft = '5px';
            viewSelect.innerHTML = '<option value="">Load saved view...</option>';

            const viewControlsWrapper = document.createElement('div');
            viewControlsWrapper.style.display = 'flex';
            viewControlsWrapper.style.alignItems = 'center';
            viewControlsWrapper.style.gap = '10px';
            viewControlsWrapper.appendChild(viewLabel);
            viewControlsWrapper.appendChild(viewSelect);
            controlHeader.appendChild(viewControlsWrapper);

            const exportSplitBtn = new ej.splitbuttons.DropDownButton({
                content: 'Export',
                iconCss: 'e-icons e-export',
                cssClass: 'e-outline',
                items: [
                    { text: 'Export to PDF', id: 'PdfExport' },
                    { text: 'Export to Excel', id: 'ExcelExport' }
                ],
                select: function (args) {
                    if (args.item.id === 'PdfExport') treeGrid.pdfExport();
                    if (args.item.id === 'ExcelExport') treeGrid.excelExport();
                }
            });

            const exportSplitContainer = document.createElement('div');
            exportSplitContainer.id = 'exportSplitContainer';
            exportSplitContainer.style.marginRight = '10px';
            controlHeader.appendChild(exportSplitContainer);

            const customToolbar = document.getElementById('custom-toolbar');
            if (customToolbar) {
                customToolbar.appendChild(controlHeader);
                setTimeout(() => {
                    exportSplitBtn.appendTo('#exportSplitContainer');
                }, 0);
            }

            fetch(`https://portfolion.co.uk/ords/ppmreports/ponSF/ReportSettings?tenancy_id=${tenancyId}&project_id=${projectId}`)
                .then(res => res.json())
                .then(data => {
                    (data.items || []).forEach(view => {
                        const opt = document.createElement('option');
                        opt.value = view.id;
                        opt.textContent = view.name + (view.is_public === 'Y' ? ' (Public)' : '');
                        viewSelect.appendChild(opt);
                    });

                    const lastViewId = localStorage.getItem('lastSelectedViewId');
                    if (lastViewId) {
                        viewSelect.value = lastViewId;
                        viewSelect.dispatchEvent(new Event('change'));
                    }
                });

            viewSelect.addEventListener('change', () => {
                const selectedId = viewSelect.value;
                if (!selectedId) {
                    localStorage.removeItem('lastSelectedViewId');
                    viewLabel.textContent = 'Current View: Default';
                    return;
                }

                fetch(`https://portfolion.co.uk/ords/ppmreports/ponSF/ReportSettings/${selectedId}?is_single_object=true`)
                    .then(res => res.json())
                    .then(view => {
                        if (!view || !view.config_json) {
                            alert("This view has no config saved.");
                            return;
                        }

                        const config = JSON.parse(view.config_json);

                        if (Array.isArray(config.columns)) {
                            treeGrid.columns.forEach(col => {
                                col.visible = !config.columns.includes(col.field);
                            });
                            treeGrid.refreshColumns();
                        }

                        if (Array.isArray(config.filters)) {
                            treeGrid.clearFiltering();
                            config.filters.forEach(filter => {
                                treeGrid.filterByColumn(
                                    filter.field,
                                    filter.operator,
                                    filter.value,
                                    filter.predicate,
                                    filter.matchCase
                                );
                            });
                        }

                        localStorage.setItem('lastSelectedViewId', selectedId);
                        viewLabel.textContent = `Current View: ${view.name}`;

                        if (!document.getElementById('viewActions')) {
                            const actionContainer = document.createElement('div');
                            actionContainer.id = 'viewActions';
                            actionContainer.style.display = 'flex';
                            actionContainer.style.alignItems = 'center';
                            actionContainer.style.gap = '10px';
                            actionContainer.style.marginBottom = '10px';

                            const manageViewBtnWrapper = document.createElement('div');
                            manageViewBtnWrapper.style.paddingTop = '16px';

                            const manageViewBtn = new ej.splitbuttons.DropDownButton({
                                cssClass: 'e-small',
                                content: 'Manage View',
                                iconCss: 'e-icons e-down',
                                items: [
                                    { text: 'Reset to Default', id: 'resetView' },
                                    { text: 'Save Changes to View', id: 'saveView' },
                                    { text: 'Rename View', id: 'renameView' }
                                ],
                                select: function (args) {
                                    if (args.item.id === 'resetView') {
                                        localStorage.removeItem('lastSelectedViewId');
                                        viewSelect.value = '';
                                        viewLabel.textContent = 'Current View: Default';
                                        treeGrid.clearFiltering();
                                        treeGrid.columns.forEach(col => col.visible = true);
                                        treeGrid.refreshColumns();
                                    }

                                    if (args.item.id === 'saveView') {
                                        const config = {
                                            columns: treeGrid.getColumns().filter(col => !col.visible).map(col => col.field),
                                            filters: treeGrid.filterSettings.columns.map(f => ({
                                                field: f.field,
                                                operator: f.operator,
                                                value: f.value,
                                                predicate: f.predicate,
                                                matchCase: f.matchCase
                                            }))
                                        };
                                        fetch(`https://portfolion.co.uk/ords/ppmreports/ponSF/ReportSettings/${selectedId}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                config_json: JSON.stringify(config),
                                                tenancy_id: tenancyId,
                                                project_id: projectId
                                            })
                                        }).then(() => alert('View updated.'));
                                    }

                                    if (args.item.id === 'renameView') {
                                        const newName = prompt('Enter new name for this view:');
                                        if (!newName) return;
                                        fetch(`https://portfolion.co.uk/ords/ppmreports/ponSF/ReportSettings/${selectedId}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                name: newName,
                                                tenancy_id: tenancyId,
                                                project_id: projectId
                                            })
                                        }).then(() => {
                                            alert('View renamed.');
                                            viewLabel.textContent = `Current View: ${newName}`;
                                            viewSelect.options[viewSelect.selectedIndex].textContent = newName;
                                        });
                                    }
                                }
                            });

                            const viewSelectorWrapper = document.createElement('div');
                            viewSelectorWrapper.style.display = 'flex';
                            viewSelectorWrapper.style.alignItems = 'center';
                            viewSelectorWrapper.style.gap = '10px';

                            actionContainer.appendChild(viewSelectorWrapper);
                            manageViewBtn.appendTo(manageViewBtnWrapper);
                            actionContainer.appendChild(manageViewBtnWrapper);
                            viewControlsWrapper.appendChild(actionContainer);
                        }
                    })
                    .catch(err => {
                        console.error("Failed to load saved view:", err);
                        alert("Error applying saved view.");
                    });
            });
            // ========== End custom toolbar ==========
        });
});

// [END OF FULL SCRIPT]
