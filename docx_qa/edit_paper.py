from docx import Document
from docx.text.paragraph import Paragraph
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from copy import deepcopy
from pathlib import Path
import zipfile, shutil

src = Path(r'C:\Users\Parth\Downloads\Literature_Review_Paper_IEEE_5pages (1).docx')
out = Path(r'C:\Users\Parth\OneDrive\Desktop\ManagementSystem\Literature_Review_Paper_IEEE_Expanded.docx')
shutil.copy2(src, out)
doc = Document(out)

def set_text(paragraph, text, rpr_from=None, clear_direct=False):
    # Keep the existing paragraph properties; replace its runs with a source-style run.
    template_run = rpr_from or (paragraph.runs[0] if paragraph.runs else None)
    rpr = deepcopy(template_run._r.rPr) if template_run is not None and template_run._r.rPr is not None else None
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)
    run = paragraph.add_run(text)
    if rpr is not None:
        run._r.insert(0, rpr)
    if clear_direct:
        # Remove highlight and shading inherited from the source's placeholder.
        if run._r.rPr is not None:
            for node in list(run._r.rPr):
                if node.tag in {qn('w:highlight'), qn('w:shd')}:
                    run._r.rPr.remove(node)
    return paragraph

def clone_after(anchor, text, para_template, run_template=None):
    new_p = OxmlElement('w:p')
    if para_template._p.pPr is not None:
        new_p.append(deepcopy(para_template._p.pPr))
    anchor._p.addnext(new_p)
    p = Paragraph(new_p, anchor._parent)
    p.style = para_template.style
    template_run = run_template or (para_template.runs[0] if para_template.runs else None)
    r = p.add_run(text)
    if template_run is not None and template_run._r.rPr is not None:
        r._r.insert(0, deepcopy(template_run._r.rPr))
    return p

def delete_paragraph(p):
    el = p._element
    el.getparent().remove(el)
    p._p = p._element = None

# Keep a stable reference to source paragraphs before inserting anything.
p = list(doc.paragraphs)
abstract_prefix_rpr = deepcopy(p[8].runs[0]._r.rPr) if len(p[8].runs) > 0 and p[8].runs[0]._r.rPr is not None else None
abstract_body_rpr = deepcopy(p[8].runs[1]._r.rPr) if len(p[8].runs) > 1 and p[8].runs[1]._r.rPr is not None else None

abstract_body = 'Material management depends on accurate stock records, clear responsibility and traceable transactions. This focused narrative review examines 16 peer-reviewed studies on construction material control, automated tracking, cloud and BIM integration, and digital supply chains. The literature shows substantial work on RFID-based identification and location, as well as broader studies of digital coordination; it does not support a claim that inventory software is absent in general. The paper positions the DecoStone capstone Material Management System as a transaction-focused web application for material records, issue and return, role-based access, dashboards and reports across godowns. The application uses HTML, CSS, JavaScript, Node.js, Express.js and SQLite. The supplied project record reports local functional checks for login, issue and return; it does not report performance, usability or security evaluation. The review therefore distinguishes implemented scope from future work and identifies evaluation priorities.'
set_text(p[8], 'Abstract—' + abstract_body)
for run in list(p[8].runs): p[8]._p.remove(run._r)
r = p[8].add_run('Abstract—')
if abstract_prefix_rpr is not None: r._r.insert(0, deepcopy(abstract_prefix_rpr))
r = p[8].add_run(abstract_body)
if abstract_body_rpr is not None: r._r.insert(0, deepcopy(abstract_body_rpr))
set_text(p[9], 'Keywords—material management, inventory control, warehouse operations, web application, role-based access, literature review')
set_text(p[13], 'Digital approaches to material control range from database-centered inventory applications to RFID, GPS, BIM and cloud-enabled tracking [1]–[16]. These approaches address different operating contexts and should not be treated as interchangeable. A location-tracking pilot, for example, answers different questions from a system that records who issued stock, to which location and whether it was returned.')
set_text(p[14], 'This paper has three aims: to synthesize relevant research, define the practical scope of the DecoStone capstone system, and identify evidence still needed to evaluate it. Section II explains the review scope and discusses the literature by theme. Section III compares representative studies, Section IV positions the project relative to that evidence, Section V describes the system and its reported checks, and Section VI concludes with future work.')
set_text(p[16], 'Review scope and approach. This is a focused narrative review, not a protocol-based systematic review. Peer-reviewed journal and conference papers were selected from publisher pages and institutional repositories using combinations of material management, inventory, construction logistics, RFID, BIM, cloud tracking and digital supply chain. The set includes foundational tracking work and reviews published through 2026. Selection favored studies that describe a system, field case, framework or review relevant to material records and movement. The summaries below report each study’s stated method and scope; they do not imply that every cited system was independently replicated.')
set_text(p[17], 'A. Inventory and Material-Control Frameworks')
set_text(p[18], 'Kasim [2] used a literature review and exploratory case studies to frame ICT-enabled material tracking and inventory control for complex projects. Ren, Anumba and Tah [3] then presented RFID-facilitated management across planning, ordering, inventory, site use and monitoring in a water-supply project. Lee et al. [5] organized RFID control around material types and lifecycle checkpoints and demonstrated the framework in construction-site trials. These works emphasize that reliable stock information depends on recording events across the material lifecycle, although their evidence and workflows are specific to construction settings and RFID-supported processes. Moon et al. [9] examined supplier-side scaffold stock in an Australasian supply chain. The case illustrates how tracking can extend beyond the construction site to suppliers, but its focus on scaffolding and a particular supplier limits direct transfer to general-purpose stock operations.')
set_text(p[19], 'B. Automated Identification, Location and Visibility')
set_text(p[20], 'Song, Haas and Caldas [1] proposed automatic RFID-based material location using readers carried by field supervisors or handling equipment together with GPS. Demiralp et al. [4] studied RFID for prefabricated components through a supply-chain case and simulation, highlighting that adoption also raises questions about investment and cost sharing. Valero et al. [6] reviewed RFID applications across construction phases and mapped a broad, technically focused evidence base. Ko, Azambuja and Lee [7] developed a cloud-based tracking prototype combining RFID and barcodes for small and medium contractors, with simulation and feasibility evaluations. Fang et al. [8] integrated RFID localization, BIM visualization and cloud services and tested the system on a full-scale construction site, including localization accuracy, latency and remote viewing. Together, these studies show how automated identification can improve visibility, while also showing that location-level tracking depends on tags, readers, site infrastructure and integration with project data.')
set_text(p[21], 'C. Planning, Supply-Chain Coordination and Recent Reviews')
set_text(p[22], 'Kasim et al. [10] used case studies and practitioner interviews to examine material-tracking practice in Malaysian construction projects; they reported continued reliance on manual processes and basic ICT in the studied context. Chen et al. [11] linked BIM and RFID data with look-ahead plans to align site demand and material supply. Zhao et al. [12] combined real-time indoor tracking of workers and material kits with schedule data in a renovation case, enabling analysis of whether kits and labor reached work locations as planned. These studies connect inventory visibility to planning, but their applications rely on construction-specific schedules, tracking infrastructure or case conditions.')
set_text(p[23], 'At a broader level, Yevu, Yu and Darko [13] used mixed review methods to map digital supply-chain and procurement research in the built environment, identifying fragmentation and integration needs. Liao, Yang and Quan [14] reviewed construction supply-chain management, analyzing a large article set quantitatively and a focused subset qualitatively to develop a resilience-oriented framework. Antai, Lenka and Achtenhagen [15] synthesized research on digital-platform adoption and integration in AEC, while Lopes and Turkan [16] reviewed 53 studies on RFID-BIM integration for circular construction. The recent reviews reinforce interoperability, data integration and stakeholder adoption as persistent themes. Their scope is broader than day-to-day warehouse transactions, and the RFID-BIM review remains centered on digitally tracked construction assets.')
# Remove yellow placeholder formatting on former placeholder paragraph and normalize it as body text.
for run in p[23].runs:
    if run._r.rPr is not None:
        for node in list(run._r.rPr):
            if node.tag in {qn('w:highlight'), qn('w:shd')}:
                run._r.rPr.remove(node)
# Compare the reviewed studies with qualified, evidence-based synthesis.
set_text(p[27], 'Table I summarizes eight representative papers from the 16-study review. The studies differ in purpose and evidence: some propose tracking frameworks, others test prototypes or field deployments, and recent reviews synthesize wider research trends. Their shared emphasis is better information visibility, but the technologies, users and evaluation settings vary. The project should therefore be compared by workflow and scope, rather than by assuming that a tracking pilot is equivalent to a complete inventory application.', clear_direct=True)
set_text(p[29], 'IV. PROJECT POSITION')
set_text(p[30], 'The reviewed literature includes inventory frameworks, RFID and barcode prototypes, supplier and construction-site cases, BIM-cloud integrations, and broader supply-chain reviews. It would be inaccurate to claim that web-based or integrated inventory systems do not exist: Ko et al. [7], for example, describe a cloud-based materials-tracking prototype. The more precise contribution of the DecoStone project is its application to routine stock transactions and role-based workflows across godowns, without requiring physical tracking hardware.')
set_text(p[31], 'For this capstone, the practical distinctions and remaining evidence needs are:')
set_text(p[32], '1) Operating context: Much of the reviewed empirical work concerns construction projects, prefabricated components, or specialized suppliers. The project instead addresses routine material records and stock transactions across multiple storage locations.')
set_text(p[33], '2) Technology choice: RFID, GPS, BIM and cloud systems add physical tracking or model integration. The current project is a browser-based, transaction-recording application; it does not identify or locate materials automatically.')
set_text(p[34], '3) Workflow focus: The system brings material records, issue and return, role-based access, dashboard information and reports into one application. This is a project-specific combination and should not be presented as a first-of-its-kind result.')
set_text(p[35], '4) Evaluation: The available test record confirms only login, material issue and return in a local environment. Tests of role permissions, reports, stock reconciliation, concurrent use, security and usability are still needed before broader operational claims can be made.')
set_text(p[38], 'A. System Overview')
set_text(p[39], 'The DecoStone capstone Material Management System is intended to maintain material records and support routine stock operations across godowns. Its stated modules include material inventory, material issue and return, role-based login, an administrative dashboard and reports. It uses a web application and relational database rather than RFID, GPS or automated physical identification. These boundaries distinguish the project’s current scope from the tracking and coordination technologies reviewed above.')
set_text(p[40], 'B. Technologies and Architecture')
set_text(p[41], 'HTML structures the pages, CSS controls presentation and JavaScript supports browser interactions. Node.js and Express.js handle application requests and logic, while SQLite stores application data. The architecture in Fig. 1 shows the browser-facing presentation layer, the server-side application layer and the database layer. This description reflects the supplied project synopsis; it is not a deployment or security assessment.')
set_text(p[44], 'C. Modules')
set_text(p[45], 'The inventory module maintains material records. Issue and return operations record stock leaving and re-entering storage. Authentication and role-based authorization are intended to restrict functions according to assigned access. The dashboard summarizes operational information, and reports present views derived from stored records. The paper reports that the application supports these modules, but the recorded functional checks cover only login, issue and return.')
set_text(p[46], 'D. Development Method')
set_text(p[47], 'The project work followed six stages: requirements identification, frontend development, backend development, database integration, module integration and functional checking. The stages describe the development sequence; no formal process-improvement or comparative study is claimed.')
set_text(p[48], 'E. Functional Checks')
set_text(p[49], 'The supplied project record states that the application was checked on a local computer for the three workflows listed in Table II. No independent test log or quantitative performance measurements were provided in the source paper.')
set_text(p[52], 'The three reported workflows passed in that local check. This evidence does not establish that every module or route works correctly, nor does it measure inventory accuracy, response time, concurrent-user behavior or user satisfaction. Further testing should use documented inputs, expected results and database-state checks.')
set_text(p[53], 'F. Security and Deployment Considerations')
set_text(p[54], 'Before deployment, the application should be assessed for password hashing, server-side authorization on every protected operation, parameterized database access, input validation, session and cookie settings, error handling, backup and restore, and transport security. These are review recommendations only; the supplied test record does not demonstrate that they are implemented or security-tested.')
set_text(p[55], 'VI. CONCLUSION AND FUTURE SCOPE')
set_text(p[56], 'Conclusion. This review synthesized 16 studies covering material-control frameworks, construction tracking technologies, cloud and BIM integration, and digital supply-chain research. The evidence does not justify a broad claim that integrated inventory software is absent. Instead, the DecoStone capstone is positioned as a transaction-focused web application for routine material records and role-based operations across godowns. The supplied local test record confirms login, issue and return only; further testing is required before making claims about complete functionality, quality or operational benefit.')
set_text(p[57], 'Future Scope. Future evaluation should document test cases for every role and route, verify stock balances against transaction history, reconcile the database with physical counts, and test backup recovery, concurrent use, security and mobile usability. Performance and user feedback should be measured with a defined test plan. Barcode or QR scanning and notifications may be considered later if operational requirements justify them. These are proposed extensions, not confirmed features or measured outcomes.')

# Remove the now-obsolete placeholder note below Table I.


# Fill the existing comparison matrix with eight representative studies and remove placeholder shading.
rows = [
 ['1','Zhao et al., 2021 [12]','Real-time indoor tracking of workers and material kits with schedule data','Links material presence with planned work','Single renovation case; tracking infrastructure required'],
 ['2','Ren et al., 2011 [3]','RFID-based material planning, inventory, site use and monitoring','Connects several material-control stages','Water-supply case and RFID-specific workflow'],
 ['3','Moon et al., 2018 [9]','RFID tracking for scaffold-supplier stock','Extends visibility into supplier stock','Specialized supplier and material context'],
 ['4','Ko et al., 2016 [7]','Cloud prototype integrating RFID and barcodes','Designed for accessible SMB contractor tracking','Tags and readers remain part of the solution'],
 ['5','Fang et al., 2016 [8]','BIM, cloud and RFID indoor localization','Tests location, latency and remote visualization','Site infrastructure and BIM integration required'],
 ['6','Chen et al., 2020 [11]','BIM-RFID workflow with look-ahead plans','Matches site demand with material supply','Depends on planning and tracking data'],
 ['7','Liao et al., 2023 [14]','Systematic review of construction supply-chain management','Maps resilience and integration themes','Broad sector review; not a product evaluation'],
 ['8','Antai et al., 2025 [15]','Systematic review of digital platforms in AEC','Explains adoption and integration themes','Not focused on warehouse stock transactions'],
]
tbl = doc.tables[0]
for ri,row in enumerate(rows, start=1):
    for ci,value in enumerate(row):
        cell=tbl.cell(ri,ci)
        cell.text=value
        # Keep current table font and paragraph alignment while cleaning placeholder highlights.
        for par in cell.paragraphs:
            par.paragraph_format.keep_together=True
            for r in par.runs:
                if r._r.rPr is not None:
                    for node in list(r._r.rPr):
                        if node.tag in {qn('w:highlight'), qn('w:shd')}:
                            r._r.rPr.remove(node)
    # Clear yellow background on rows that were placeholders; retain existing white on first three.
    trPr=tbl.rows[ri]._tr.get_or_add_trPr()
    for cell in tbl.rows[ri].cells:
        tcPr=cell._tc.get_or_add_tcPr()
        for shd in list(tcPr.findall(qn('w:shd'))):
            tcPr.remove(shd)

# Rebuild references in IEEE numbered style, preserving paragraph style from existing reference entries.
refs = [
 '[1] J. Song, C. T. Haas, and C. H. Caldas, “Tracking the location of materials on construction job sites,” Journal of Construction Engineering and Management, vol. 132, no. 9, pp. 911–918, Sep. 2006, doi: 10.1061/(ASCE)0733-9364(2006)132:9(911).',
 '[2] N. B. Kasim, “Towards a framework for ICT-enabled materials management in complex projects,” Journal of Techno-Social, vol. 2, no. 1, 2010. [Online]. Available: https://journal.uthm.edu.my/index.php/JTS/article/view/315.',
 '[3] Z. Ren, C. J. Anumba, and J. Tah, “RFID-facilitated construction materials management (RFID-CMM): A case study of water-supply project,” Advanced Engineering Informatics, vol. 25, no. 2, pp. 198–207, 2011, doi: 10.1016/j.aei.2010.02.002.',
 '[4] G. Demiralp, G. Guven, and E. Ergen, “Analyzing the benefits of RFID technology for cost sharing in construction supply chains: A case study on prefabricated precast components,” Automation in Construction, vol. 24, pp. 120–129, 2012, doi: 10.1016/j.autcon.2012.02.005.',
 '[5] J. H. Lee, J. H. Song, K. S. Oh, and N. Gu, “Information lifecycle management with RFID for material control on construction sites,” Advanced Engineering Informatics, vol. 27, no. 1, pp. 108–119, 2013, doi: 10.1016/j.aei.2012.11.004.',
 '[6] E. Valero, A. Adan, and C. Cerrada, “Evolution of RFID applications in construction: A literature review,” Sensors, vol. 15, no. 7, pp. 15988–16008, 2015, doi: 10.3390/s150715988.',
 '[7] H. S. Ko, M. Azambuja, and H. F. Lee, “Cloud-based materials tracking system prototype integrated with radio frequency identification tagging technology,” Automation in Construction, vol. 63, pp. 144–154, 2016, doi: 10.1016/j.autcon.2015.12.011.',
 '[8] Y. Fang, Y. K. Cho, S. Zhang, and E. Perez, “Case study of BIM and cloud-enabled real-time RFID indoor localization for construction management applications,” Journal of Construction Engineering and Management, vol. 142, no. 7, Art. no. 05016003, 2016, doi: 10.1061/(ASCE)CO.1943-7862.0001125.',
 '[9] S. Moon, S. Xu, L. Hou, C. Wu, X. Wang, and V. W. Y. Tam, “RFID-aided tracking system to improve work efficiency of scaffold supplier: Stock management in Australasian supply chain,” Journal of Construction Engineering and Management, vol. 144, no. 2, Art. no. 04017115, 2018, doi: 10.1061/(ASCE)CO.1943-7862.0001432.',
 '[10] N. Kasim, N. Sarpin, H. Mohd Noh, R. Zainal, S. Mohamed, N. Manap, and M. Y. Yahya, “Automatic materials tracking practices through RFID implementation in construction projects,” MATEC Web of Conferences, vol. 266, Art. no. 05001, 2019, doi: 10.1051/matecconf/201926605001.',
 '[11] Q. Chen, B. T. Adey, C. Haas, and D. M. Hall, “Using look-ahead plans to improve material flow processes on construction projects when using BIM and RFID technologies,” Construction Innovation, vol. 20, no. 3, pp. 471–508, 2020, doi: 10.1108/CI-11-2019-0133.',
 '[12] J. Zhao, Y. Zheng, O. Seppänen, M. Tetik, and A. Peltokorpi, “Using real-time tracking of materials and labor for kit-based logistics management in construction,” Frontiers in Built Environment, vol. 7, Art. no. 713976, 2021, doi: 10.3389/fbuil.2021.713976.',
 '[13] S. K. Yevu, A. T. W. Yu, and A. Darko, “Digitalization of construction supply chain and procurement in the built environment: Emerging technologies and opportunities for sustainable processes,” Journal of Cleaner Production, vol. 306, Art. no. 129093, 2021, doi: 10.1016/j.jclepro.2021.129093.',
 '[14] L. Liao, C. Yang, and L. Quan, “Construction supply chain management: A systematic literature review and future development,” Journal of Cleaner Production, vol. 382, Art. no. 135230, 2023, doi: 10.1016/j.jclepro.2022.135230.',
 '[15] I. Antai, S. Lenka, and L. Achtenhagen, “Digital platforms and the construction supply chain: Trends and emerging themes in extant AEC research,” Construction Management and Economics, vol. 43, no. 2, pp. 113–129, 2025, doi: 10.1080/01446193.2024.2396592.',
 '[16] I. T. Lopes and Y. Turkan, “Digital enablers for circular construction: A systematic review of RFID and BIM integration,” ASCE OPEN: Multidisciplinary Journal of Civil Engineering, vol. 4, no. 1, 2026, doi: 10.1061/AOMJAH.AOENG-0104.'
]
# Preserve bibliography formatting from the first source entry, including 10-pt font and hanging tab.
ref_template = p[60]
set_text(ref_template, refs[0])
prev = ref_template
for text in refs[1:]:
    prev = clone_after(prev, text, ref_template, ref_template.runs[0] if ref_template.runs else None)
# Remove the three old citation entries and placeholder text after inserting the complete list.
for old in [p[61], p[62], p[63], p[36], p[58]]:
    delete_paragraph(old)

# Word count and content guardrails for the finished review.
for paragraph in doc.paragraphs:
    if any(marker in paragraph.text for marker in ['TO BE COMPLETED','Add the remaining papers','Rows 4 onwards','Add the remaining references']):
        raise RuntimeError('Placeholder remained: '+paragraph.text)
# Update core metadata without changing the original named authors.
doc.core_properties.title='Web-Based Material Management Systems: A Literature Review and a Proposed Implementation'
doc.core_properties.subject='Focused narrative literature review of material management and tracking systems'
doc.save(out)
print(out)
print('paragraphs',len(doc.paragraphs),'tables',len(doc.tables),'references',len(refs))



