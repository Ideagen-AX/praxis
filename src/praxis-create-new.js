/* =====================================================================
   PRAXIS CREATE NEW — shared catalog data.

   Single source of truth for the record types a user can create, grouped by
   solution (with a brand tone per solution), plus the template starting
   points. Loaded by both the workspace and the record page so the two Create
   New menus never drift. Render logic + wiring live per-page; this file is
   pure data.
   ===================================================================== */

const CREATE_CATALOG = [
  { group: 'Incidents & Events', icon: 'emergency_home', tone: 'pink', items: [
    { id: 'observation',   icon: 'visibility',    label: 'Observation' },
    { id: 'near-miss',     icon: 'warning',       label: 'Near-Miss' },
    { id: 'incident',      icon: 'crisis_alert',  label: 'Incident' },
    { id: 'deviation',     icon: 'priority_high', label: 'Deviation' },
    { id: 'quality-event', icon: 'report',        label: 'Quality Event' },
    { id: 'complaint',     icon: 'support',       label: 'Complaint' },
    { id: 'rca',           icon: 'flag',          label: 'RCA / Investigation' }
  ]},
  { group: 'Audit & Findings', icon: 'frame_inspect', tone: 'teal', items: [
    { id: 'audit',           icon: 'fact_check', label: 'Audit' },
    { id: 'self-assessment', icon: 'rule',       label: 'Self-Assessment' },
    { id: 'finding',         icon: 'flag',       label: 'Finding' },
    { id: 'ncr',             icon: 'flag',       label: 'NCR' },
    { id: 'inspection',      icon: 'checklist',  label: 'Inspection' },
    { id: 'supplier-audit',  icon: 'factory',    label: 'Supplier Audit' },
    { id: 'esign',           icon: 'verified',   label: 'e-Signature (Part 11)' }
  ]},
  { group: 'Actions & Improvement', icon: 'person_alert', tone: 'blue', items: [
    { id: 'capa',          icon: 'build',          label: 'CAPA' },
    { id: 'action',        icon: 'check_box',      label: 'Action' },
    { id: 'scar',          icon: 'factory',        label: 'SCAR' },
    { id: 'moc',           icon: 'change_circle',  label: 'MOC / Change Request' },
    { id: 'effectiveness', icon: 'thumbs_up_down', label: 'Effectiveness Review' },
    { id: 'risk',          icon: 'warning',        label: 'Risk Assessment' },
    { id: 'improvement',   icon: 'lightbulb',      label: 'Improvement Idea' }
  ]},
  { group: 'Plant & Assets', icon: 'precision_manufacturing', tone: 'orange', items: [
    { id: 'calibration',      icon: 'event_available',      label: 'Calibration' },
    { id: 'maintenance',      icon: 'handyman',             label: 'Maintenance Work Order' },
    { id: 'permit',           icon: 'assignment_turned_in', label: 'Permit to Work' },
    { id: 'jsa',              icon: 'menu_book',            label: 'JSA' },
    { id: 'fai',              icon: 'science',              label: 'FAI' },
    { id: 'qualify-supplier', icon: 'how_to_reg',           label: 'Supplier Qualification' }
  ]},
  { group: 'People & Documents', icon: 'school', tone: 'purple', items: [
    { id: 'training',   icon: 'school',              label: 'Training Assignment' },
    { id: 'competency', icon: 'workspace_premium',   label: 'Competency Check' },
    { id: 'sop',        icon: 'description',         label: 'SOP Draft' },
    { id: 'policy',     icon: 'policy',              label: 'Policy Sign-off' },
    { id: 'bulletin',   icon: 'campaign',            label: 'Bulletin' },
    { id: 'review',     icon: 'groups',              label: 'Management Review' }
  ]},
  { group: 'Health & Safety', icon: 'health_and_safety', tone: 'green', items: [
    { id: 'hazard',       icon: 'dangerous',         label: 'Hazard Report' },
    { id: 'sds-request',  icon: 'biotech',           label: 'Chemical / SDS Request' },
    { id: 'ppe',          icon: 'masks',             label: 'PPE Issue' },
    { id: 'toolbox-talk', icon: 'record_voice_over', label: 'Toolbox Talk' },
    { id: 'ergo',         icon: 'accessibility_new',  label: 'Ergonomic Assessment' }
  ]}
];

const CN_INDEX = {};
CREATE_CATALOG.forEach(g => g.items.forEach(i => { CN_INDEX[i.id] = i; }));

/* Shortcuts — a predefined set of record types we surface for quick access,
   shown identically on every page and grouped by solution. Curated so each
   solution present carries 2–7 tiles (no lonely one-tile groups). */
const CN_SHORTCUTS = [
  'observation', 'near-miss', 'incident', 'quality-event',  // Incidents & Events
  'audit', 'inspection', 'finding',                         // Audit & Findings
  'capa', 'action', 'risk',                                 // Actions & Improvement
  'calibration', 'permit',                                  // Plant & Assets
  'sop', 'training',                                        // People & Documents
  'hazard', 'toolbox-talk'                                  // Health & Safety
];

const CN_TEMPLATES = [
  { icon: 'fact_check', label: 'Boeing audit-prep checklist', type: 'Audit',            tone: 'teal',   sub: 'Scope, standard & 12 checkpoints pre-filled' },
  { icon: 'science',    label: 'Wing-spar FAI pack',          type: 'FAI',              tone: 'orange', sub: 'Part, program & inspection plan set' },
  { icon: 'groups',     label: 'Quarterly management review', type: 'Management Review', tone: 'purple', sub: 'Agenda & standing attendees added' },
  { icon: 'visibility', label: 'Walkthrough observation card',type: 'Observation',       tone: 'pink',   sub: 'Area, category & prompts ready' },
  { icon: 'build',      label: 'Fastener-torque CAPA starter',type: 'CAPA',             tone: 'blue',   sub: 'Problem statement & 8D steps scaffolded' }
];
