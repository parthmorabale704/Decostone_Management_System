from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

OUT=Path(r'C:\Users\Parth\OneDrive\Desktop\ManagementSystem\docs')
TEAM=[('Parth Sanjay Morabale','24213440464'),('Ayush Rajesh Patel','24213440466'),('Suyash Sunil Shalbidre','24213440483'),('Samarth Dadaso Patil','24213440479')]
TITLE='DecoStone Material Management System (MMS)'
ROLES=['Frontend and backend across all modules','Frontend and backend across all modules','Database design and implementation across all modules','Database design and implementation across all modules']

def cell(c,text,bold=False,size=9,align=None):
    c.text=''; p=c.paragraphs[0]
    if align is not None:p.alignment=align
    p.paragraph_format.space_before=Pt(0);p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=1.05
    r=p.add_run(str(text));r.bold=bold;r.font.name='Times New Roman';r.font.size=Pt(size)
    c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER

def replace(doc,old,new):
    for p in doc.paragraphs:
        if old in p.text:
            s=p.text.replace(old,new)
            if p.runs:p.runs[0].text=s
            else:p.add_run(s)
            for r in p.runs[1:]:r.text=''

def runfmt(r,size=12,bold=False,italic=False):
    r.font.name='Times New Roman';r.font.size=Pt(size);r.bold=bold;r.italic=italic
    r._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Times New Roman')

def repeat_header(row):
    e=OxmlElement('w:tblHeader');e.set(qn('w:val'),'true');row._tr.get_or_add_trPr().append(e)

# Fill the supplied diary template in place, leaving actual work and signatures open.
d=Document(r'C:\Users\Parth\Downloads\Project Diary 2026-27 (1).docx')
details=d.tables[2]
for i,v in enumerate([TITLE,'Multi-godown inventory management for tiles, marble, granite and related building materials.','Businesses need a consistent view of material quantities by godown and a traceable record of receipts, dispatches, transfers and adjustments.','React 19, Vite, JavaScript, Express 4, Node.js, SQLite / better-sqlite3, JWT, bcryptjs, Recharts, XLSX and jsPDF']):cell(details.rows[i].cells[1],v,size=8)
cell(details.rows[4].cells[1],'☒ Software    ☐ Hardware    ☐ Hardware + Software    ☐ Research / Survey    ☐ Industry Sponsored',size=7)
for i,(name,en) in enumerate(TEAM,1):
    row=d.tables[3].rows[i];cell(row.cells[1],name,size=8);cell(row.cells[3],en,size=8);cell(row.cells[4],ROLES[i-1],size=7)
schedule=[
('10/09/2026','16/09/2026','Confirm domain, team roles and inventory problem; define project scope.'),
('17/09/2026','23/09/2026','Gather requirements; map user roles, godown workflows and feasibility.'),
('24/09/2026','30/09/2026','Review inventory literature; draft requirements and data entities.'),
('01/10/2026','07/10/2026','Plan architecture, database schema, API structure and interface modules.'),
('08/10/2026','14/10/2026','Plan catalogue CRUD and stock receipt, dispatch, transfer and adjustment flows.'),
('15/10/2026','21/10/2026','Plan integration of roles, multi-godown scope, alerts, audit/history, reports and responsive layouts.'),
('22/10/2026','23/10/2026','Plan code/build review, demo flow, synopsis and diary completion.')]
for k,(start,end,work) in enumerate(schedule):
    t=d.tables[10+k//2];r=1+(k%2)*2
    cell(t.rows[r].cells[1],work,size=8);cell(t.rows[r].cells[2],f'From: {start}\nTo: {end}',size=8,align=WD_ALIGN_PARAGRAPH.CENTER)
# Planner dates and planned markers only; actual rows remain empty.
plan=d.tables[9]
for j,(start,_,_) in enumerate(schedule,2):plan.rows[1].cells[j].text=start[:5]
for row,week in [(2,0),(4,0),(6,2),(8,1),(10,3),(12,6),(14,4)]:cell(plan.rows[row].cells[2+week],'●',size=9,align=WD_ALIGN_PARAGRAPH.CENTER)
for row in range(2,16,2):plan.rows[row].cells[16].text='Planned'
# Contributions: supplied role division only, no fabricated percentages or guide verification.
for ti in (31,32):
    for i,(name,en) in enumerate(TEAM,1):
        t=d.tables[ti];cell(t.rows[i].cells[1],name,size=8);cell(t.rows[i].cells[3],ROLES[i-1],size=7);cell(t.rows[i].cells[4],'React / Express / SQLite / SQL',size=7)
for i,x in enumerate([('React / Vite','React 19 / Vite 8','Frontend','Open source'),('Express / Node.js','Express 4','REST API','Open source'),('SQLite','SQLite 3','Relational persistence','Public domain'),('JWT / bcryptjs','JWT 9 / bcryptjs 2','Authentication','Open source'),('Recharts / XLSX / jsPDF','As in package manifest','Charts and exports','Open source')],1):
    for j,v in enumerate(x):cell(d.tables[35].rows[i].cells[j+1],v,size=7)
risk=[('Incorrect stock balance from invalid or repeated movements','High','Validate quantities and use atomic operations.'),('Unauthorized warehouse or user access','High','Enforce role and godown scope in backend.'),('Linked history blocks master-data cleanup','Medium','Preserve history and apply explicit archive rules.'),('Time pressure before presentation','Medium','Prioritize critical flows and record remaining issues.')]
for i,(a,b,c) in enumerate(risk,1):
    t=d.tables[34];cell(t.rows[i].cells[2],a,size=7);cell(t.rows[i].cells[3],b,size=7);cell(t.rows[i].cells[4],c,size=7)
# The diary also carries the project name in its Project Details table above.
refs=['J. B. Munyaka and V. S. S. Yadavalli, “Inventory management concepts and implementations: A systematic review,” South African Journal of Industrial Engineering, 33(2), 15–36, 2022.','R. Ramanathan, “ABC inventory classification with multiple-criteria using weighted linear optimization,” Computers & Operations Research, 33(3), 695–700, 2006.','C. W. Autry et al., “Warehouse management systems: Resource commitment, capabilities, and organizational performance,” Journal of Business Logistics, 26(2), 165–183, 2005.','T. E. Goltsos et al., “Inventory–forecasting: Mind the gap,” European Journal of Operational Research, 299(2), 397–419, 2022.','A. A. Tubis and J. Rohman, “Intelligent warehouse in Industry 4.0—Systematic literature review,” Sensors, 23(8), 4105, 2023.','SQLite Consortium, “Transactions,” SQLite Documentation, https://www.sqlite.org/lang_transaction.html.']
for i,x in enumerate(refs,1):
    t=d.tables[36];cell(t.rows[i].cells[1],x,size=7);cell(t.rows[i].cells[2],'Research paper' if i<6 else 'Web documentation',size=7);cell(t.rows[i].cells[3],'Synopsis / database',size=7)
d.save(OUT/'DecoStone Project Diary 2026-27.docx')

# Create synopsis from the supplied cover/certificate DOCX, preserving the seals and page design.
s=Document(r'C:\Users\Parth\Downloads\PROJECT SYNOPSIS FRONT PAGES.docx')
replace(s,'“PROJECT TITLE”',f'“{TITLE}”');replace(s,'“Project Title”',f'“{TITLE}”');replace(s,'GUIDE NAME','________________________');replace(s,'(                       )','(____________________)')
memberparas=[p for p in s.paragraphs if 'Student Name' in p.text and 'Enrollment No' in p.text]
for p,(name,en) in zip(memberparas,TEAM*2):p.text=f'      {name}\t                   ({en})'

def page():s.add_page_break()
def h(text,level=1):
    p=s.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER if level==1 else WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after=Pt(10);p.paragraph_format.keep_with_next=True
    runfmt(p.add_run(text.upper() if level==1 else text),14 if level==1 else 12,True);return p
def ptext(text,indent=True):
    p=s.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY;p.paragraph_format.line_spacing=1.5;p.paragraph_format.space_after=Pt(7)
    if indent:p.paragraph_format.first_line_indent=Inches(.3)
    runfmt(p.add_run(text),12);return p
def bullet(text):
    p=s.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY;p.paragraph_format.left_indent=Inches(.28);p.paragraph_format.first_line_indent=Inches(-.2);p.paragraph_format.line_spacing=1.25;p.paragraph_format.space_after=Pt(4);runfmt(p.add_run('• '+text),11);return p
def tab(headers,rows,widths=None,size=9):
    t=s.add_table(rows=1,cols=len(headers));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
    borders=OxmlElement('w:tblBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):
        e=OxmlElement('w:'+edge);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'5');e.set(qn('w:color'),'808080');borders.append(e)
    t._tbl.tblPr.append(borders)
    for j,x in enumerate(headers):
        cell(t.rows[0].cells[j],x,True,size,WD_ALIGN_PARAGRAPH.CENTER);sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'D9E2F3');t.rows[0].cells[j]._tc.get_or_add_tcPr().append(sh)
    repeat_header(t.rows[0])
    for row in rows:
        cs=t.add_row().cells
        for j,x in enumerate(row):cell(cs[j],x,size=size)
    if widths:
        for row in t.rows:
            for j,w in enumerate(widths):row.cells[j].width=Inches(w)
    s.add_paragraph();return t
def cap(text):
    p=s.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(7);runfmt(p.add_run(text),10,italic=True)

# Acknowledgement
page();h('Acknowledgement')
ptext('We express our sincere gratitude to Sanjay Ghodawat Institute, Atigre, and the Department of Computer Science & Engineering for academic support and resources for this project synopsis.')
ptext('We thank our project guide, whose name and review details will be completed by the department, for guidance and feedback. We also thank faculty members, staff and peers who helped us understand material inventory and warehouse workflows.')
ptext('This synopsis has been prepared by the four student authors listed below. The guide and department may review the technical description and completion records before certification.')
for name,en in TEAM:
    q=s.add_paragraph();q.alignment=WD_ALIGN_PARAGRAPH.RIGHT;q.paragraph_format.space_after=Pt(5);runfmt(q.add_run(f'{name} ({en})'),11)
q=s.add_paragraph();q.paragraph_format.space_before=Pt(20);runfmt(q.add_run('Date: ____________________\nPlace: Atigre'),11,True)

# Abstract, 124 words
page();h('Abstract')
ptext('DecoStone Material Management System (MMS) is a web-based inventory application for businesses handling tiles, marble, granite and related building materials across multiple godowns. It brings material and category records, warehouse stock, receipts, dispatches, transfers and adjustments into a shared workflow. The system uses a React single-page frontend, an Express REST backend and a relational SQLite database. Role-based access supports administrator, manager and supervisor workflows, including supervisors assigned to multiple godowns. Dashboard summaries, low-stock visibility, movement history and report exports help users review inventory activity. This synopsis presents the problem, related work, requirements, architecture, data model, modules, security considerations and validation plan. The team should verify transaction correctness, access boundaries, responsive operation and report accuracy before final demonstration.')
q=s.add_paragraph();q.paragraph_format.space_before=Pt(14);runfmt(q.add_run('Keywords: '),12,True);runfmt(q.add_run('Inventory management, warehouse, godown, stock movement, SQLite, role-based access.'),12)

# Contents page in the supplied index-table style; page numbers filled after render.
chapters=[('1','Introduction'),('2','Literature Survey'),('3','Problem Definition'),('4','Existing System'),('5','Proposed System'),('6','Objectives and Scope'),('7','Requirements and Feasibility'),('8','Methodology and Architecture'),('9','Database Design'),('10','System Modules and Workflows'),('11','Security and Access Control'),('12','Testing and Validation Plan'),('13','Resources and Consumables'),('14','Conclusion'),('R','References and Bibliography'),('A','Action Plan')]
page();h('Index');tab(['Chapter No.','Title','Page No.'],[(a,b,'') for a,b in chapters],[1.2,4.1,.9],9)
page();h('List of Tables');tab(['Table No.','Description','Page No.'],[(str(i),x,'') for i,x in enumerate(['Literature comparison','Functional requirements','Technology stack','Core data entities','Application modules','Validation checklist','Project action plan'],1)],[1,4.4,.8],9)
h('List of Figures');tab(['Figure No.','Description','Page No.'],[('1','System architecture and request flow',''),('2','Stock movement lifecycle','')],[1,4.4,.8],9)
h('List of Graphs');ptext('No graph is required in this synopsis. Dashboard visualizations are application features; no measured project results are claimed here.',False)

# Chapter 1
page();h('Chapter 1 Introduction')
ptext('Building-material businesses manage varied inventory such as tiles, sanitaryware, stone slabs, adhesives and related products. A material may be stored in more than one godown, measured in a product-specific unit, and moved through receipts, issues, transfers and stock adjustments. Staff need to know what is available, where it is stored and how each balance changed.')
ptext('When these events are recorded in separate registers or spreadsheets, the same item may have inconsistent balances. Delayed updates make it harder to prevent stockouts, validate transfers or trace adjustments. A shared application can centralize material definitions and warehouse balances while retaining records of stock movements.')
ptext('DecoStone MMS provides a browser-based workspace for managing these records. The application separates the React frontend, Express API and SQLite persistence. Users work through role-specific screens while the server validates requests and stores inventory changes. This synopsis describes the project design; final implementation status and unresolved defects should be confirmed during the demonstration review.')
h('1.1 Relevance and Rationale',2);ptext('Inventory control is an operational and supply-chain concern [1]. Warehouse information systems also connect storage operations to organizational capabilities and performance [3]. This project focuses on practical functions for a multi-godown material business: current balances, movement records, low-stock review and controlled access.')
h('1.2 Synopsis Organization',2);ptext('The report reviews prior work, defines the problem, compares the existing approach with the proposed application, states objectives and scope, and explains requirements, architecture, data design, workflows, access control, validation and resources. References and an action plan conclude the report.')

# Chapter 2
page();h('Chapter 2 Literature Survey')
ptext('Inventory and warehouse research provides context for combining item records with location-specific stock and auditable movement. The selected studies inform the design and delimit what this project does not attempt to solve.')
h('2.1 Inventory Management',2);ptext('Munyaka and Yadavalli review inventory-management concepts and implementations, emphasizing that inventory control is a central logistics function and that methods depend on organizational objectives [1]. For this project, the implication is to maintain reliable item balances and traceable operations rather than a single aggregate stock number.')
ptext('Ramanathan presents an ABC inventory classification method using weighted linear optimization and multiple criteria [2]. ABC analysis can prioritize attention when item value, demand or criticality differ. DecoStone stores structured stock and category information that could support such analysis, but the project does not claim to implement this optimization method.')
h('2.2 Warehouse Systems and Forecasting',2);ptext('Autry and co-authors examine warehouse management systems in relation to resource commitment, capabilities and organizational performance [3]. Their work supports treating a warehouse system as an operational capability. Accordingly, the proposed MMS connects balances to receiving, storage and dispatch activity and keeps movement history.')
ptext('Goltsos and co-authors discuss the gap between inventory and forecasting research [4]. Inventory decisions depend on forecasts and planning assumptions. The current project focuses on transactional visibility and threshold-based alerts; it does not claim to implement demand forecasting.')
h('2.3 Intelligent Warehouses',2);ptext('Tubis and Rohman survey intelligent warehouses in the context of Industry 4.0 and discuss technology themes such as IoT, visual technologies and autonomous equipment [5]. These technologies extend beyond this project’s web and database scope. DecoStone is positioned as a foundational digital inventory tool, not a sensor-driven or automated warehouse.')
h('2.4 Comparative Findings',2)
tab(['Study','Focus','Design implication'],[('Munyaka & Yadavalli [1]','Inventory concepts','Keep stock records and control processes explicit.'),('Ramanathan [2]','ABC classification','Store data that may enable future prioritization.'),('Autry et al. [3]','WMS capabilities','Connect balances with warehouse operations.'),('Goltsos et al. [4]','Inventory and forecasts','Separate threshold alerts from forecasting.'),('Tubis & Rohman [5]','Industry 4.0 warehouses','Keep sensors and automation out of current scope.')],[1.6,1.8,3.0],8)
cap('Table 1. Comparison of selected literature and project implications.')

# Chapter 3
page();h('Chapter 3 Problem Definition');ptext('The project addresses the difficulty of maintaining a consistent, timely and auditable view of building-material stock across multiple godowns. A business needs to identify each material, category and unit; record receipts and dispatches; transfer quantities between locations; and determine whether each godown has sufficient stock.')
ptext('The problem is not simply the absence of a digital list. Inventory changes must preserve a correct balance and explain how that balance was reached. A transfer must decrease stock at its source and increase stock at its destination exactly once. Access should reflect responsibility: an administrator manages the system, managers perform permitted operations, and supervisors may be assigned to one or more godowns.')
h('3.1 Problem Statement',2);ptext('To design and implement a web-based material management system that maintains material and category records, records stock transactions for multiple godowns, provides role-scoped access and presents useful stock and movement information while preserving transaction history.')
h('3.2 Constraints',2);ptext('The system depends on a reachable server and database, accurate user-entered transactions, correct master data and configured access rights. SQLite suits a compact deployment, but high-concurrency or multi-site expansion may require a different database architecture. Hardware sensors, automated purchasing and predictive replenishment are outside the current scope.')

# Chapter 4
page();h('Chapter 4 Existing System');ptext('In a manual or spreadsheet workflow, material descriptions, quantities and storage locations may be maintained in separate files. Staff update a stock sheet after a delivery or dispatch while another person records the event in an order or ledger. Such systems are familiar and inexpensive to start, but rely on consistent procedures and timely manual updates.')
h('4.1 Limitations',2)
for x in ['Warehouse balances may become inconsistent when movements are late or duplicated.','A transfer may appear as an issue without a matching receipt at the destination.','Historical evidence can be difficult to connect to current material or category records.','Finding out-of-stock items can require repeated checks across separate lists.','User responsibilities and warehouse visibility may not be enforced consistently.','Preparing summaries and exports may require manual filtering and reformatting.']:bullet(x)
h('4.2 Improvement Opportunity',2);ptext('A centralized application can validate a transaction at entry, associate it with a material and godown, and update related records in one server-side workflow. Consistent role checks, movement history and reports can improve reviewability. These benefits depend on correct implementation and disciplined data entry.')

# Chapter 5
page();h('Chapter 5 Proposed System');ptext('The proposed DecoStone MMS is a browser-based application with three layers. The React frontend presents role-specific pages and sends requests to an Express REST API. The API authenticates users, validates operations and applies business rules. SQLite stores users, materials, categories, godowns, balances and transaction records.')
h('5.1 Main Functions',2)
for x in ['Manage material and category records, including edits and controlled deletion or archival where history is linked.','Maintain godown records and assign supervisors to multiple godowns where authorized.','Record stock receipts, dispatches, transfers and adjustments with quantities and transaction context.','Review stock by material and godown, including low-stock and out-of-stock conditions.','View movement history, audit activity, dashboard summaries and warehouse/category reports.','Export supported reports to spreadsheet or PDF formats.']:bullet(x)
h('5.2 Operating Principles',2);ptext('Stock-changing operations should be atomic: either all database changes for a transaction succeed or none do. A transfer should link its outgoing and incoming legs and prevent an invalid or duplicate quantity change. Deletion should preserve referential integrity and transaction history. Reports should use the same stored balances and transaction records as the application.')

# Chapter 6
page();h('Chapter 6 Objectives and Scope');h('6.1 Objectives',2)
for x in ['Create a shared catalogue of materials and categories with units and stock thresholds.','Represent inventory separately for each active godown.','Record receipts, dispatches, inter-godown transfers and adjustments.','Provide secure login and role-based authorization.','Allow a supervisor to access multiple assigned godowns with server-side scope checks.','Display stock position, low-stock conditions and movement history.','Generate readable summaries and downloadable reports.','Maintain auditability and protect historical references when master records change.']:bullet(x)
h('6.2 Scope',2);ptext('The project covers master data, warehouse stock, movements, user access, dashboards, notifications, reports and transaction/audit history represented in the application. Roles include administrator, manager and supervisor. A supervisor can be associated with multiple godowns, subject to backend authorization.')
ptext('Barcode/RFID scanning, IoT sensors, automatic demand prediction, payment processing, external ERP integration and production cloud availability are not claimed. Future work may evaluate these features after core transaction correctness and deployment requirements are validated.')

# Chapter 7
page();h('Chapter 7 Requirements and Feasibility');h('7.1 Functional Requirements',2)
tab(['ID','Requirement'],[('FR-01','Authenticate users and enforce role permissions.'),('FR-02','Maintain materials and categories while protecting linked history.'),('FR-03','Maintain godowns and user-to-godown assignments.'),('FR-04','Record valid receipts, dispatches, transfers and adjustments.'),('FR-05','Display stock by material/godown and identify threshold conditions.'),('FR-06','Show transaction history, audit events, dashboard metrics and reports.'),('FR-07','Export supported report views.')],[.8,5.7],8.5);cap('Table 2. Core functional requirements.')
h('7.2 Non-Functional Requirements',2);ptext('Usability: common tasks need clear labels and validation feedback. Integrity: related stock changes must remain consistent. Security: credentials must be protected and the server must enforce access rules. Maintainability: interface, API and persistence concerns should be organized. Compatibility: the interface should support common desktop and mobile browsers. Reliability and performance targets must be defined and evaluated under the intended load.')
h('7.3 Feasibility',2);ptext('Technical feasibility is supported by the JavaScript stack and local relational database. Operational feasibility depends on users entering movements promptly and administrators configuring roles correctly. Open-source frameworks reduce licensing costs, while hosting, backups and maintenance still have operational costs. Schedule feasibility should be reviewed against remaining project milestones.')

# Chapter 8
page();h('Chapter 8 Methodology and Architecture');h('8.1 Development Method',2);ptext('The project follows iterative development: identify workflows, define data and access rules, implement modules, connect the frontend to the API, and review the integrated system. Parth and Ayush handle frontend and backend work across modules; Suyash and Samarth handle database work across modules. The guide should verify actual contributions and dates in the diary.')
h('8.2 Application Layers',2)
tab(['Layer','Responsibility'],[('User interface','React screens, forms, tables, navigation, feedback and visual summaries.'),('API and rules','Express routes, authentication, input validation, authorization and stock operation logic.'),('Persistence','SQLite tables, constraints, initialization and transaction history.'),('Reporting','Queries aggregate balances and movements for dashboards and exports.')],[1.4,5.1],9);cap('Figure 1. System architecture and request flow by application layer.')
ptext('A user submits a request through the interface. The API verifies identity and role, validates identifiers and quantities, and reads or changes the database. A successful stock movement should store its transaction record and update the affected balance consistently. The response returns a clear result for the interface.')
h('8.3 Transaction Workflow',2);ptext('For a receipt, the server validates the material, destination godown and positive quantity, then records the receipt and updates that balance. For dispatch, it checks sufficient stock before reduction. For transfer, it validates source and destination, checks stock, and commits the paired movement as one operation. An adjustment requires a reason and preserves the prior history.')

# Chapter 9
page();h('Chapter 9 Database Design');ptext('The application uses relational data to represent users, roles, godowns, materials, categories, stock and inventory events. Foreign keys connect operational records to master data. Unique constraints and validation rules should prevent duplicate identifiers and invalid references.')
tab(['Entity','Purpose','Relationships'],[('Users / roles','Login identity and authorization','User role and godown assignments'),('Godowns','Physical storage locations','Referenced by stock and movements'),('Categories','Material classification','One category may classify many materials'),('Materials','SKU, description, unit and thresholds','Belongs to category; referenced by stock/events'),('Stock balances','Current quantity by material and godown','Unique material + godown pair'),('Transactions','Receipt, issue, transfer or adjustment','References material, location(s), user and quantity'),('Audit events','Trace significant actions','References actor and affected record where available')],[1.3,2.4,2.8],8);cap('Table 3. Core entities and relationships.')
h('9.1 Integrity Rules',2)
for x in ['A balance is identified by both material and godown; a combined total is not a location balance.','Quantities must be numeric and valid for the material unit and operation.','Dispatch and transfer must not create negative stock unless an approved rule permits it.','A transfer must produce a linked source decrease and destination increase exactly once.','Delete/archive actions must preserve history and avoid orphaned records.','Database transactions should group multi-record stock changes atomically [6].']:bullet(x)

# Chapter 10
page();h('Chapter 10 System Modules and Workflows');ptext('The interface and server are organized around the following modules. Route coverage and edge cases should be confirmed through code review and validation before final presentation.')
tab(['Module','Primary workflow'],[('Authentication and users','Sign in, manage members and grant permitted access.'),('Godowns','View locations and assign supervisors to one or more godowns.'),('Categories and materials','Maintain classification, SKU/material details, units and thresholds.'),('Stock received','Record receipt context and increase a godown balance.'),('Stock dispatched','Record issue context and reduce available stock.'),('Transfers','Move quantity between godowns with linked history.'),('Adjustments and history','Record a reviewed discrepancy with reason and audit trail.'),('Dashboard and low stock','Review balances, threshold items and recent movements.'),('Reports and exports','Review warehouse/category data and export supported formats.')],[1.55,4.95,],8);cap('Table 4. Application modules and primary workflows.')
h('10.1 End-to-End Example',2);ptext('An authorized user selects a material and receiving godown, enters a valid quantity and submits a receipt. The server validates and stores the event with its actor and time, then updates that material’s balance in that godown. A later transfer selects source and destination; the source must have enough stock. History should show the quantity leaving one godown and arriving at the other without double-counting.')

# Chapter 11
page();h('Chapter 11 Security and Access Control');ptext('The project separates user identity from permissions. The administrator creates members and grants access; operational roles should not gain administrative powers through interface visibility alone. Backend handlers must enforce authorization on protected operations.')
h('11.1 Authentication',2);ptext('The backend dependency manifest includes bcryptjs and JSON Web Token packages. Passwords should be stored only as salted hashes, never plaintext. Tokens should be validated on protected requests and handled with appropriate expiry and secure storage. OWASP guidance describes established controls for authentication and password storage [7], [8].')
h('11.2 Authorization and Data Scope',2);ptext('A supervisor may be assigned to multiple godowns. Authorization should check that a requested godown is among that supervisor’s assignments for each relevant read and write. Client-side filtering is not sufficient. User management, transaction changes and exports should be limited to roles with explicit permission.')
h('11.3 Audit and Data Protection',2);ptext('Movements and significant administrative actions should retain actor, timestamp, operation, quantity, location and reference information. Backup and restore procedures should be documented and tested. Production deployment should use HTTPS, protect environment secrets, restrict database-file access and verify restoration before relying on backups.')

# Chapter 12
page();h('Chapter 12 Testing and Validation Plan');ptext('This chapter defines validation work and does not claim every check has already passed. The team should record actual results, evidence and corrective actions in its diary. Test the interface, API and database using realistic multi-godown workflows.')
tab(['Area','Validation examples'],[('Master data','Create, edit, search and remove unused records; preserve linked history.'),('Receipt / dispatch','Positive quantity, invalid input, insufficient stock and repeated submission.'),('Transfer','Source/destination checks; source decrease equals destination increase.'),('Access control','Role permissions and supervisor access only to assigned godowns.'),('Reports','Compare totals with database balances and movement records.'),('Database integrity','Foreign keys, uniqueness, rollback and backup restoration.'),('Responsive UI','Forms, navigation, tables and dialogs at phone/tablet/desktop widths.'),('Build and security','Production build, backend configuration and authentication failures.')],[1.4,5.1],8.4);cap('Table 5. Planned validation checklist.')
h('12.1 Acceptance Conditions',2);ptext('A receipt increases exactly one selected material/godown balance. Dispatch reduces stock only when valid. Transfer reduces the source by quantity q and raises the destination by q, preserving the total. Unauthorized users cannot access restricted routes. Report totals match the database state. These conditions should be evidenced with repeatable tests and recorded results.')

# Chapter 13
page();h('Chapter 13 Resources and Consumables')
tab(['Resource','Purpose'],[('Development computer and browser','Run and review the application locally.'),('Node.js and npm','Run server and build scripts.'),('React and Vite','Build the client interface.'),('Express.js','Implement the backend API.'),('SQLite / better-sqlite3','Persist relational inventory and transaction data.'),('Recharts, XLSX, jsPDF','Present charts and export reports.'),('Git repository','Track changes and collaborate across modules.'),('Representative test data','Validate workflows using non-sensitive records.')],[2.0,4.5],9);cap('Table 6. Development resources and their use.')
ptext('The current software scope requires no physical consumables or warehouse sensors. It does require a backup location, test data and a reliable runtime. Package versions should be confirmed against lockfiles at submission time because dependencies may change.')

# Chapter 14
page();h('Chapter 14 Conclusion');ptext('DecoStone MMS addresses the need to maintain material and warehouse stock records through a shared web application. Its intended value comes from connecting master data, godown-level balances and auditable stock movements, then presenting the information through alerts, dashboards and reports. The frontend/API/relational database structure separates user interaction from persistence rules.')
ptext('The key correctness requirement is that each stock operation has one validated, traceable effect on the right material and godown. Role checks must enforce intended boundaries, including supervisors assigned to multiple godowns. The team should demonstrate these properties using repeatable scenarios and database evidence and complete guide-reviewed diary entries before submission.')
ptext('Future enhancements may include barcode scanning, supplier integration, forecasting, multi-branch deployment and richer analysis. These should follow verification of transaction integrity, backups, access control and report consistency.')

# References
page();h('References and Bibliography')
refs=[
'[1] J. B. Munyaka and V. S. S. Yadavalli, “Inventory management concepts and implementations: A systematic review,” South African Journal of Industrial Engineering, vol. 33, no. 2, pp. 15–36, 2022, doi: 10.7166/33-2-2527.',
'[2] R. Ramanathan, “ABC inventory classification with multiple-criteria using weighted linear optimization,” Computers & Operations Research, vol. 33, no. 3, pp. 695–700, 2006, doi: 10.1016/j.cor.2004.07.014.',
'[3] C. W. Autry, S. E. Griffis, T. J. Goldsby, and L. M. Bobbitt, “Warehouse management systems: Resource commitment, capabilities, and organizational performance,” Journal of Business Logistics, vol. 26, no. 2, pp. 165–183, 2005, doi: 10.1002/j.2158-1592.2005.tb00210.x.',
'[4] T. E. Goltsos, A. A. Syntetos, C. H. Glock, and G. Ioannou, “Inventory–forecasting: Mind the gap,” European Journal of Operational Research, vol. 299, no. 2, pp. 397–419, 2022, doi: 10.1016/j.ejor.2021.07.040.',
'[5] A. A. Tubis and J. Rohman, “Intelligent warehouse in Industry 4.0—Systematic literature review,” Sensors, vol. 23, no. 8, art. 4105, 2023, doi: 10.3390/s23084105.',
'[6] SQLite Consortium, “Transactions,” SQLite Documentation. [Online]. Available: https://www.sqlite.org/lang_transaction.html. Accessed: 22-Oct-2026.',
'[7] OWASP Foundation, “Authentication Cheat Sheet,” OWASP Cheat Sheet Series. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html. Accessed: 22-Oct-2026.',
'[8] OWASP Foundation, “Password Storage Cheat Sheet,” OWASP Cheat Sheet Series. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Accessed: 22-Oct-2026.',
'[9] Meta Platforms, “Quick Start,” React Documentation. [Online]. Available: https://react.dev/learn. Accessed: 22-Oct-2026.',
'[10] OpenJS Foundation, “Express Documentation.” [Online]. Available: https://expressjs.com/. Accessed: 22-Oct-2026.',
'[11] OpenJS Foundation, “Node.js Documentation.” [Online]. Available: https://nodejs.org/docs/latest/api/. Accessed: 22-Oct-2026.',
'[12] Vite Contributors, “Getting Started,” Vite Documentation. [Online]. Available: https://vite.dev/guide/. Accessed: 22-Oct-2026.']
for x in refs:
    q=s.add_paragraph();q.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY;q.paragraph_format.left_indent=Inches(.25);q.paragraph_format.first_line_indent=Inches(-.25);q.paragraph_format.line_spacing=1.15;q.paragraph_format.space_after=Pt(7);runfmt(q.add_run(x),10.5)

# Scheduled action plan appendix
page();h('Action Plan')
tab(['Scheduled dates','Planned activities'],[(a+' – '+b,x) for a,b,x in schedule],[1.65,4.85],9);cap('Table 7. Schedule from 10 September to 23 October 2026.')
ptext('The plan records scheduled activities only. Actual completion dates, results, attendance and guide review must be entered by the team and verified by the project guide.',False)
for sec in s.sections:sec.top_margin=Inches(1);sec.bottom_margin=Inches(1);sec.left_margin=Inches(1);sec.right_margin=Inches(1)
s.save(OUT/'DecoStone Project Synopsis 2026-27.docx')
print('Created both DOCX files in',OUT)
