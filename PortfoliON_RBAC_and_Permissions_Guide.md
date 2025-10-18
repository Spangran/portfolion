# PortfoliON — RBAC, ACL, and Permissions Design Guide

## 1. Overview

PortfoliON uses a Role-Based Access Control (RBAC) and Access Control List (ACL) model that operates across four logical levels of scope:

| Level | Object | Purpose |
|-------|---------|----------|
| 1 | **Tenancy** | Top-level security boundary. Governs user membership, admin rights, and system-wide settings. |
| 2 | **Project** | Container for lists/boards and work items. ACLs and roles define project membership and admin capabilities. |
| 3 | **List / Board** | Task or Kanban board containing items. List-level ACLs define who can view, edit, or administer. |
| 4 | **Work Item** | The atomic task, card, or RAID entry. Access is inherited from its parent List. |

---

## 2. Capability Matrix

| Capability | Who can do it | Permission |
|-------------|----------------|-------------|
| Manage Tenancy LOVs | Tenancy Admin | `tenancy.lov.manage` |
| Manage Tenancy Users / Roles | Tenancy Admin | `tenancy.user.manage` |
| Create Project | Tenancy Admin | `project.create` |
| Delete Project | Tenancy Admin | `project.delete` |
| Archive Project | Project Admin or Tenancy Admin | `project.archive` |
| Manage Project Members | Project Admin or Tenancy Admin | `project.member.manage` |
| Create Lists | Project Admin | `list.create` |
| Delete Lists | Project Admin | `list.delete` |
| View Lists | Project Member or ACL-granted user | `list.view` |
| Edit Lists / Items | Project Member or List Editor | `list.edit` |
| Administer Lists | Project Admin or Owner | `list.admin` |
| Create / Edit / Delete Work Items | List Editor or Admin | `workitem.create`, `workitem.edit`, `workitem.delete` |

---

## 3. Permission Catalogue

**Tenancy Level**
- `tenancy.user.manage`
- `tenancy.lov.manage`
- `project.create`
- `project.delete`

**Project Level**
- `project.member`
- `project.member.manage`
- `project.archive`
- `list.create`
- `list.delete`

**List / Item Level**
- `list.view`
- `list.edit`
- `list.admin`
- `workitem.create`
- `workitem.edit`
- `workitem.delete`

---

## 4. Core Tables

**RBAC Core:**
- `TB_PERMISSIONS` – master list of permission codes.
- `TB_ROLES` – roles per tenancy (e.g. TENANCY_ADMIN, PROJECT_ADMIN).
- `TB_ROLE_PERMS` – mapping of roles to permissions.
- `TB_USER_ROLES` – mapping of users to roles.

**ACL Layer:**
- `TB_ACL` – per-resource grants (USER or ROLE subjects). Supports resource types `TENANCY`, `PROJECT`, `LIST`.

**Reference Function:**
- `f_has_permission(p_tenancy_id, p_user_id, p_perm_code, p_resource_type, p_resource_id)` – main evaluation logic.

**Helper Views:**
- `V_LIST_EFFECTIVE_PERMS`
- `V_PROJECT_EFFECTIVE_PERMS`
- `V_TENANCY_EFFECTIVE_PERMS`
- `V_USER_EFFECTIVE_PERMS`

Full DDL definitions are contained in *Work items and permissions DDL.txt*.

---

## 5. Seeding Roles & Permissions

| Role | Scope | Key Permissions |
|------|--------|----------------|
| **TENANCY_ADMIN** | Tenancy-wide | tenancy.user.manage, tenancy.lov.manage, project.create/delete |
| **TENANCY_MEMBER** | Tenancy-wide | list.view |
| **PROJECT_ADMIN** | Project-specific (via ACL) | project.member.manage, project.archive, list.create/delete |
| **PROJECT_MEMBER** | Project-specific (via ACL) | list.view, list.edit, workitem.create/edit |

Role mappings are inserted via `TB_ROLE_PERMS`. ACL rows attach roles or users to specific projects/lists.

---

## 6. Effective Permission Evaluation

`f_has_permission` checks permissions in order:
1. **Owner Override** (for LIST → owner gets `list.admin`)
2. **Direct USER ACL** (resource-specific or tenancy-wide)
3. **ROLE ACL** (through user’s roles)
4. **Role→Permission** (plain RBAC without ACL)

Returns `1` (allow) or `0` (deny).

---

## 7. APEX Admin Page – Tenancy Admin Center

**Purpose:** Allow `tenancy.admin` users to view and manage all permissions from a single UI.

**Layout:**
- Master: user selector (`TB_PEOPLE` within tenancy)
- Detail tabs:
  1. Effective Permissions (read-only)
  2. Tenancy Roles (`TB_USER_ROLES`)
  3. Project ACLs (`TB_ACL` where `resource_type='PROJECT'`)
  4. List ACLs (`TB_ACL` where `resource_type='LIST'`)

**Authorization:**  
```sql
RETURN f_has_permission(:P0_TENANCY_ID, :P0_PERSON_ID, 'tenancy.user.manage', 'TENANCY', :P0_TENANCY_ID) = 1;
```

**Key Processes:**
- Add / Remove roles (`TB_USER_ROLES`)
- Grant / Revoke ACLs (`TB_ACL`)
- Show `V_USER_EFFECTIVE_PERMS` for visibility.

---

## 8. Common SQL Tasks

**Check if user can delete project:**
```sql
SELECT f_has_permission(:TENANCY, :USER, 'project.delete', 'TENANCY', :TENANCY) FROM dual;
```

**Grant project admin to a user:**
```sql
INSERT INTO TB_ACL (tenancy_id, resource_type, resource_id, subject_type, subject_id, perm_code, grant_yn)
VALUES (:TENANCY, 'PROJECT', :PROJECT_ID, 'USER', :USER_ID, 'project.member.manage', 'Y');
```

**Grant tenancy admin role:**
```sql
INSERT INTO TB_USER_ROLES (tenancy_id, user_id, role_id)
SELECT :TENANCY, :USER_ID, r.id FROM TB_ROLES r
 WHERE r.tenancy_id=:TENANCY AND r.code='TENANCY_ADMIN';
```

---

## 9. Integration Notes

**To‑Do (UMD Build):**
- File: `PortfoliON To‑Do JS (APEX UMD Build).txt`
- Uses APEX processes `TODO_GET_NAV`, `TODO_GET_TASKS`, `TODO_CREATE`, `TODO_CREATE_LIST`.
- Refresh signals: `PF_TODO_DATA_CHANGED` (via both jQuery + CustomEvent).

**Kanban (UMD Build):**
- File: `portfolion_kanban.js`
- CRUD endpoints via APEX process `KANBAN_AJAX`.
- Uses `TB_LISTS`, `TB_LIST_KANBAN_COLS`, `TB_WORKITEMS` for data model.

**Risk Heatmap Demo:**
- File: `risk-heatmap-demo-html 5 v1_1.html`
- Independent front-end for scoring risks (impact × probability).

---

## 10. Appendix: File References

| File | Description |
|------|--------------|
| **Work items and permissions DDL.txt** | Complete DDL for RBAC + ACL + Work Items |
| **portfolion_kanban.js** | UMD Kanban board widget |
| **PortfoliON To‑Do JS (APEX UMD Build).txt** | To‑Do / Task management component |
| **risk-heatmap-demo-html 5 v1_1.html** | Client-side risk heatmap |
| **portfolion main tables DDL.txt** | Core base tables (Projects, Lists, People, Tenants, etc.) |

---

**End of File — PortfoliON RBAC & Permissions Design Guide**
