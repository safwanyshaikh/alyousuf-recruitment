/**
 * KAI NL Search — Trade Taxonomy  ▸▸  SEED LAYER ONLY
 *
 * ⚠ THIS FILE IS NOT THE SOURCE OF TRUTH. IT IS THE SEED.
 *
 * KAI is a SKILL MINER, not a job-title matcher. The taxonomy is a LIVING
 * ORGANISM that mutates every week from the JDs that walk in the door.
 * This file is only the embryo it grows from.
 *
 * THREE-LAYER TAXONOMY MODEL (see taxonomy-learning-engine.md):
 *   Layer 1 — SEED (this file + GAS seedTaxonomyGCC_)
 *             Static starting point. Hand-curated GCC trades. Never the limit.
 *   Layer 2 — LEARNED (_Taxonomy sheet + _KAI_Knowledge sheet in GAS)
 *             Grows automatically. Every JD upload writes new trades, aliases,
 *             certs, specializations, nationality rules, country×trade demand.
 *   Layer 3 — RUNTIME UNION
 *             nlSearch_ reads SEED ∪ LEARNED at query time. A trade ZAMIL asked
 *             for last Tuesday is searchable today — with NO code change.
 *
 * ALIGNED WITH (read these — do not duplicate their logic):
 *   - GAS TRADE_FAMILIES        (Section T16.5 in KAI_API_Bridge_MASTER.gs)
 *   - T13 _Taxonomy + governance (KAI_T13_Intelligence.gs — Deliverable 1, 5)
 *   - T13 collar/level ladder    (T13_LADDER, T13_COLLAR_OF_LEVEL)
 *   - T13 eligibility groups      (T13_ALLOWED matrix)
 *   - T14 Recruitment Classes     (KAI_T14_Intelligence.gs Section B)
 *   - T14 _KAI_Knowledge capture  (captureJDIntelligenceT14_)
 *   - taxanomy996.txt             (Industry → Department → Trade → Specialization)
 *
 * GULF RECRUITER RULE:
 *   Every entry exists because a real Gulf client (NMDC, ZAMIL, GAS Arabia,
 *   Aramco/ADNOC/SABIC contractor) raised a manpower demand for it. We do not
 *   document; we deploy. We mine the skill in the man's hands, not the title
 *   on his last payslip.
 *
 * NEVER ADD TO THE SEED:
 *   - IT, Healthcare, Banking, Hospitality, Retail trades
 *   - Generic ATS categories that don't appear in GCC industrial manpower JDs
 *   (The LEARNED layer will add real trades on its own — let it.)
 */

// ── T14 Recruitment Classes ───────────────────────────────────────────────────
// Source: KAI_T14_Intelligence.gs RECRUITMENT_CLASS_DEFS_T14_
// These 7 classes are the ONLY lens Gulf recruiters use to classify roles.

export type T14RecruitmentClass =
  | 'UNSKILLED_WORKER'        // helper, labourer — no formal skill required
  | 'SEMI_SKILLED_WORKER'     // operator (forklift, dump truck), driver
  | 'SKILLED_TRADESMAN'       // welder, pipe fitter, rigger, scaffolder, painter, mason, carpenter
  | 'MEP_TRADES'              // HVAC, electrician, instrument tech (GREY collar)
  | 'TECHNICIAN'              // QC inspector, HSE officer, supervisor, DCS operator
  | 'ENGINEER'                // degree-level engineering professionals
  | 'PROFESSIONAL_MANAGEMENT';// PM, contracts, operations management

// ── Collar Type ───────────────────────────────────────────────────────────────
// BLUE  = outdoor, physical, manual craft (welder, fitter, rigger)
// GREY  = indoor technical, MEP trades (instrument tech, electrician, HVAC)
// WHITE = office/site-office, inspection, engineering, management

export type CollarType = 'BLUE' | 'GREY' | 'WHITE';

// ── GCC Industries (from taxanomy996.txt — deployment-relevant only) ──────────
// These are the ONLY industries KAI recruits for. Anything else is out of scope.
export const GCC_INDUSTRIES = [
  'Oil & Gas',
  'Construction',
  'Power & Utilities',
  'Petrochemical',
  'Chemical / Fertilizers / Plastic / Rubber / Glass',
  'Manufacturing',
  'Shipping & Marine',
  'Cement, Mining & Steel',
  'Wastewater Treatment & Environment',
  'Exploration & Production',
  'Facility Management',
] as const;

export type GCCIndustry = typeof GCC_INDUSTRIES[number];

// ── Trade Family Definition ───────────────────────────────────────────────────

export interface TradeFamilyDef {
  /** Canonical display name used in UI */
  canonical: string;
  /** Must match TRADE_FAMILIES key in GAS KAI_API_Bridge_MASTER.gs exactly */
  gasKey: string;
  /** T14 recruitment class — used to gate eligibility in nlSearch_ */
  recruitmentClass: T14RecruitmentClass;
  /** T13 collar type */
  collar: CollarType;
  /** GCC industries this trade is deployed into (from taxanomy996.txt) */
  industries: GCCIndustry[];
  /** Department label from taxanomy996.txt */
  departments: string[];
  /**
   * Lowercase aliases, abbreviations, common spellings.
   * Order does NOT matter — parser scores by match length.
   * Longer alias always beats shorter (prevents "mechanical" matching "mechanical fitter").
   */
  aliases: string[];
  /**
   * Premium specializations within this trade.
   * These trigger premiumCert=true and priority ranking in NL search results.
   * A Gulf recruiter pays premium for these — they are NOT the same as the base trade.
   */
  premiumSpecializations: string[];
  /** Certifications tied to this trade — matching these boosts trade confidence */
  certs: string[];
}

export const TRADE_FAMILIES: TradeFamilyDef[] = [

  // ── WELDING ─────────────────────────────────────────────────────────────────
  // taxanomy996: rows 165, 225, 300, 352, 467, 650, 696, 786, 845, 853
  // Departments: Manufacturing → Welding; Commissioning → Welding
  {
    canonical: 'Welder',
    gasKey: 'WELDER',
    recruitmentClass: 'SKILLED_TRADESMAN',
    collar: 'BLUE',
    industries: ['Oil & Gas', 'Construction', 'Manufacturing', 'Shipping & Marine',
                 'Cement, Mining & Steel', 'Chemical / Fertilizers / Plastic / Rubber / Glass',
                 'Power & Utilities'],
    departments: ['Manufacturing – Welding', 'Commissioning & Pre-Commissioning – Welding'],
    aliases: [
      'welder', 'welding', 'tig welder', 'arc welder', 'mig welder', 'pipe welder',
      'structural welder', 'smaw', 'gtaw', 'gmaw', 'fcaw',
      'coded welder', 'tig/mig', 'tig & arc', 'stick welder', 'pressure welder',
      'aluminium welder', 'ss welder', 'stainless welder', 'stainless steel welder',
      'argon welder', 'co2 welder', 'combo welder', 'multi-process welder',
      'plastic welder', 'steel welder', 'weld shop',
    ],
    premiumSpecializations: [
      '6g', '6gr', '6g welder', '6gr welder', 'coded 6g', 'coded 6gr',
      '6g coded', '6gr coded', 'pressure vessel welder', 'asme welder',
      'shutdown welder', 'tig coded', '3g', '5g',
    ],
    certs: ['6g', '6gr', '3g', '5g', 'cswip 3.1', 'aws d1.1', 'asme ix', 'bs en iso 9606'],
  },

  // ── PIPE FITTING ─────────────────────────────────────────────────────────────
  // taxanomy996: rows 612, Exploration & Production various piping
  // Departments: Operations → Plumbing/Pipefitting; Fabrication & Fitting
  {
    canonical: 'Pipe Fitter',
    gasKey: 'PIPEFITTER',
    recruitmentClass: 'SKILLED_TRADESMAN',
    collar: 'BLUE',
    industries: ['Oil & Gas', 'Construction', 'Exploration & Production',
                 'Chemical / Fertilizers / Plastic / Rubber / Glass', 'Power & Utilities'],
    departments: ['Operations – Plumbing', 'Manufacturing – Fabrication & Fitting'],
    aliases: [
      'pipe fitter', 'pipefitter', 'pipe layer', 'pipe erector',
      'pipe fabricator', 'piping erector', 'pipe mechanic', 'pipeline fitter',
      'pipe fitting', 'piping fitter', 'mechanical fitter',
      'plumber fitter', 'pipe fitter plumber',
    ],
    premiumSpecializations: [
      'pipe fitter shutdown', 'mechanical fitter shutdown', 'pipe fitter turnaround',
      'senior pipe fitter', 'pipe fitter leadman',
    ],
    certs: [],
  },

  // ── HVAC (MEP — GREY COLLAR) ─────────────────────────────────────────────────
  // taxanomy996: rows 22, 49, 146, 150 (HVAC Engineer, Technician, Draftsman etc.)
  // Departments: Maintenance & Facilities → BMS / HVAC / Fire
  {
    canonical: 'HVAC Technician',
    gasKey: 'HVAC',
    recruitmentClass: 'MEP_TRADES',
    collar: 'GREY',
    industries: ['Construction', 'Facility Management', 'Oil & Gas',
                 'Power & Utilities', 'Wastewater Treatment & Environment'],
    departments: ['Maintenance & Facilities – BMS / HVAC / Fire',
                  'Engineering – MEP', 'Commissioning & Pre-Commissioning – BMS / HVAC / Fire'],
    aliases: [
      'hvac', 'hvac technician', 'hvac mechanic', 'air conditioning technician',
      'ac technician', 'ac mechanic', 'refrigeration technician', 'chiller technician',
      'ductwork technician', 'ventilation technician', 'hvac/r', 'central ac technician',
      'split unit technician', 'vrf technician', 'vrv technician', 'hvac bms',
      'air handling unit', 'ahu technician',
    ],
    premiumSpecializations: [
      'hvac engineer', 'hvac supervisor', 'hvac foreman',
      'chiller plant engineer', 'district cooling technician',
    ],
    certs: ['f-gas', 'refrigerant handling', 'ashrae 90.1'],
  },

  // ── ELECTRICIAN (MEP — GREY COLLAR) ─────────────────────────────────────────
  // taxanomy996: rows 741, 837, 857, 934 (O&G Electrician, Rig Electrician etc.)
  // Departments: Maintenance & Facilities → Electrical; Manufacturing → Electrical
  {
    canonical: 'Electrician',
    gasKey: 'ELECTRICIAN',
    recruitmentClass: 'MEP_TRADES',
    collar: 'GREY',
    industries: ['Oil & Gas', 'Construction', 'Power & Utilities', 'Manufacturing',
                 'Exploration & Production', 'Shipping & Marine'],
    departments: ['Maintenance & Facilities – Electrical',
                  'Engineering – Electrical', 'Engineering – Electrical & Instrumentation'],
    aliases: [
      'electrician', 'electrical technician', 'electrical fitter',
      'hv electrician', 'lv electrician', 'mv electrician',
      'industrial electrician', 'maintenance electrician',
      'power electrician', 'rig electrician', 'electrical rig technician',
      'e&i technician', 'ei technician', 'electrical & instrumentation technician',
      'auto electrician', 'crane electrician',
    ],
    premiumSpecializations: [
      'hv electrician', 'mv electrician', 'rig electrician', 'offshore electrician',
      'electrical inspector', 'e&i inspector', 'e&i engineer',
    ],
    certs: ['city & guilds 2391', 'btec electrical', 'ieee', '17th edition'],
  },

  // ── INSTRUMENTATION (MEP — GREY COLLAR) ─────────────────────────────────────
  // taxanomy996: rows 623, 673, 684, 756 (Instrument Technician various grades)
  // The 756 "Instrument Technician – Shutdown Specialist" = premium in Gulf
  // Departments: Maintenance & Facilities → Instrumentation & Control
  {
    canonical: 'Instrument Technician',
    gasKey: 'INSTRUMENTATION',
    recruitmentClass: 'MEP_TRADES',
    collar: 'GREY',
    industries: ['Oil & Gas', 'Chemical / Fertilizers / Plastic / Rubber / Glass',
                 'Power & Utilities', 'Manufacturing', 'Wastewater Treatment & Environment'],
    departments: ['Maintenance & Facilities – Instrumentation & Control',
                  'Engineering – Instrumentation & Control',
                  'Commissioning & Pre-Commissioning – Instrumentation & Control'],
    aliases: [
      'instrument technician', 'instrumentation technician', 'instruments technician',
      'field instrument technician', 'instrument maintenance technician',
      'i&c technician', 'control instrument technician',
      'dcs technician', 'plc technician', 'scada technician',
      'calibration technician', 'instrument fitter', 'instrument mechanic',
      'bms technician', 'analyser technician', 'metering technician',
      'condition monitoring technician',
    ],
    premiumSpecializations: [
      'instrument technician shutdown', 'instrument shutdown specialist',
      'shutdown instrument technician', 'instrument technician shutdown specialist',
      'analyser technician shutdown specialist', 'i&c shutdown',
      'instrument lead technician', 'senior instrument technician',
    ],
    certs: ['emerson delta-v', 'honeywell dcs', 'siemens plc', 'yokogawa'],
  },

  // ── QA/QC INSPECTION ────────────────────────────────────────────────────────
  // taxanomy996: rows 694, 777, 820, 821 (CWI Inspector, E&I Inspector, Piping QC)
  // Departments: Quality & Inspection → Inspection; QA/QC; Welding QA; Piping QA
  {
    canonical: 'QC Inspector',
    gasKey: 'QA_QC',
    recruitmentClass: 'TECHNICIAN',
    collar: 'WHITE',
    industries: ['Oil & Gas', 'Construction', 'Manufacturing', 'Shipping & Marine',
                 'Cement, Mining & Steel', 'Power & Utilities'],
    departments: ['Quality & Inspection – Inspection', 'Quality & Inspection – QA / QC',
                  'Quality & Inspection – Welding Inspection', 'Quality & Inspection – Piping QA'],
    aliases: [
      'qc inspector', 'qa qc inspector', 'qa/qc', 'quality control inspector',
      'quality inspector', 'welding inspector', 'piping inspector',
      'mechanical inspector', 'coating inspector', 'civil inspector',
      'structural inspector', 'e&i inspector', 'instrument inspector',
      'ndt inspector', 'ndt technician',
      'rt technician', 'ut technician', 'mt technician', 'pt technician',
      'radiographic testing technician', 'ultrasonic testing technician',
      'cwi inspector', 'cswip inspector', 'api inspector',
      'visual inspection', 'dimensional inspection',
    ],
    premiumSpecializations: [
      'cswip 3.1', 'cswip 3.2', 'api 510', 'api 570', 'api 653',
      'ndt level ii', 'ndt level iii', 'asnt level iii',
      'welding quality engineer', 'piping quality engineer',
    ],
    certs: [
      'cswip 3.1', 'cswip 3.2', 'api 510', 'api 570', 'api 653',
      'ndt level ii', 'ndt level iii', 'asnt level ii', 'asnt level iii',
      'iso 9001 lead auditor', 'aws cwi',
    ],
  },

  // ── HSE / SAFETY ────────────────────────────────────────────────────────────
  // taxanomy996: rows 581, 652, 677, 705, 712, 785
  // "BOSIET Certified – Emergency Response" = offshore premium
  // Departments: Health, Safety & Environment → HSE
  {
    canonical: 'HSE Officer',
    gasKey: 'HSE',
    recruitmentClass: 'TECHNICIAN',
    collar: 'WHITE',
    industries: ['Oil & Gas', 'Construction', 'Power & Utilities', 'Manufacturing',
                 'Chemical / Fertilizers / Plastic / Rubber / Glass', 'Exploration & Production'],
    departments: ['Health, Safety & Environment – HSE',
                  'Health, Safety & Environment – Environmental',
                  'Health, Safety & Environment – Fire Protection'],
    aliases: [
      'hse officer', 'hse', 'safety officer', 'health safety environment',
      'ehs officer', 'ehs', 'ohs officer', 'hsse officer',
      'fire safety officer', 'loss prevention officer', 'loss control officer',
      'safety inspector', 'safety coordinator', 'ems coordinator',
      'environmental health safety', 'process safety officer',
      'emergency response supervisor',
    ],
    premiumSpecializations: [
      'nebosh', 'nebosh igc', 'nebosh diploma',
      'loss prevention engineer', 'process safety engineer',
      'hse engineer', 'bosiet', 'offshore hse', 'drilling hse advisor',
      'fire protection engineer',
    ],
    certs: [
      'nebosh igc', 'nebosh diploma', 'nebosh certificate',
      'iosh managing safely', 'iosh working safely',
      'bosiet', 'opito bosiet', 'huet',
    ],
  },

  // ── RIGGER / LIFTING ─────────────────────────────────────────────────────────
  // taxanomy996: row 607 (Crane Health Check Specialist, O&G Lifting)
  // Departments: Maintenance & Facilities → Lifting & Rigging
  {
    canonical: 'Rigger',
    gasKey: 'RIGGER',
    recruitmentClass: 'SKILLED_TRADESMAN',
    collar: 'BLUE',
    industries: ['Oil & Gas', 'Construction', 'Exploration & Production', 'Shipping & Marine'],
    departments: ['Maintenance & Facilities – Lifting & Rigging', 'Operations – Rigging'],
    aliases: [
      'rigger', 'rigging', 'lifting operations', 'banksman', 'slinger',
      'rigger banksman', 'crane banksman', 'lifting technician',
    ],
    premiumSpecializations: [
      'lift supervisor', 'lifting supervisor', 'senior rigger', 'lead rigger',
      'rigging foreman', 'heavy lift rigger',
    ],
    certs: ['opito rigger', 'leea rigger', 'lifting operations & rigging', 'cpcs slinger'],
  },

  // ── CRANE OPERATOR ───────────────────────────────────────────────────────────
  // taxanomy996: rows 126, 872 (Crawler Crane Operator, Crane & Hoisting Equipment)
  // Departments: Operations → Heavy Equipment
  {
    canonical: 'Crane Operator',
    gasKey: 'CRANE_OPERATOR',
    recruitmentClass: 'SEMI_SKILLED_WORKER',
    collar: 'BLUE',
    industries: ['Oil & Gas', 'Construction', 'Exploration & Production', 'Power & Utilities'],
    departments: ['Operations – Heavy Equipment'],
    aliases: [
      'crane operator', 'mobile crane operator', 'tower crane operator',
      'overhead crane operator', 'crawler crane operator',
      'rough terrain crane operator', 'all terrain crane operator',
      'lattice crane operator', 'hydraulic crane operator', 'boom truck operator',
      'quay crane operator',
    ],
    premiumSpecializations: [
      'heavy lift crane operator', 'offshore crane operator',
      'crane supervisor', 'lifting supervisor crane',
    ],
    certs: ['npors crane operator', 'cpcs crane operator', 'opito crane operator'],
  },

  // ── SCAFFOLDING ──────────────────────────────────────────────────────────────
  {
    canonical: 'Scaffolder',
    gasKey: 'SCAFFOLDER',
    recruitmentClass: 'SKILLED_TRADESMAN',
    collar: 'BLUE',
    industries: ['Oil & Gas', 'Construction', 'Power & Utilities'],
    departments: ['Operations – Scaffolding', 'Manufacturing – Scaffolding'],
    aliases: [
      'scaffolder', 'scaffolding', 'scaffold erector', 'scaffold builder',
      'tube and fitting scaffolder', 'system scaffolder',
    ],
    premiumSpecializations: [
      'scaffold inspector', 'scaffold supervisor', 'scaffold foreman',
      'lead scaffolder',
    ],
    certs: ['cisrs scaffold card', 'pasma', 'nasc'],
  },

  // ── MECHANICAL (Maintenance) ─────────────────────────────────────────────────
  // taxanomy996: rows 596 variants, "rotating equipment", "static equipment"
  // Important: this is MAINTENANCE mechanical, not engineering design
  // Departments: Maintenance & Facilities → Mechanical
  {
    canonical: 'Mechanical Technician',
    gasKey: 'MECHANICAL',
    recruitmentClass: 'TECHNICIAN',
    collar: 'GREY',
    industries: ['Oil & Gas', 'Manufacturing', 'Chemical / Fertilizers / Plastic / Rubber / Glass',
                 'Power & Utilities', 'Shipping & Marine'],
    departments: ['Maintenance & Facilities – Mechanical', 'Operations – Maintenance'],
    aliases: [
      'mechanical technician', 'maintenance technician', 'mechanical maintenance technician',
      'rotating equipment technician', 'static equipment technician',
      'diesel mechanic', 'corrective maintenance technician',
      'building maintenance technician', 'plant maintenance technician',
      'hydraulic mechanic', 'field service technician',
      // NOTE: "mechanical fitter" maps here only when NOT in construction context
      // In construction/piping context "mechanical fitter" → PIPEFITTER
    ],
    premiumSpecializations: [
      'rotating equipment engineer', 'reliability technician', 'vibration analyst',
      'mechanical shutdown specialist', 'plant maintenance engineer',
    ],
    certs: [],
  },

  // ── CIVIL / STRUCTURAL ──────────────────────────────────────────────────────
  // taxanomy996: rows 929 (Civil Engineer), 810 (Civil Draughtsman)
  // Departments: Engineering → Civil; Operations → Masonry, Carpentry
  {
    canonical: 'Civil Works',
    gasKey: 'CIVIL',
    recruitmentClass: 'SKILLED_TRADESMAN',
    collar: 'BLUE',
    industries: ['Construction', 'Oil & Gas', 'Power & Utilities',
                 'Wastewater Treatment & Environment'],
    departments: ['Engineering – Civil', 'Operations – Masonry', 'Operations – Carpentry',
                  'Operations – Civil'],
    aliases: [
      'civil', 'mason', 'masonry', 'carpenter', 'formwork carpenter',
      'shuttering carpenter', 'civil technician', 'land surveyor',
      'concrete worker', 'reinforced concrete worker', 'civil foreman',
      'block layer', 'bricklayer', 'civil supervisor',
      'marine carpenter', 'gypsum carpenter', 'finishing carpenter',
    ],
    premiumSpecializations: [
      'civil engineer', 'structural engineer', 'civil supervisor', 'civil foreman',
    ],
    certs: [],
  },

  // ── REBAR / STEEL FIXING ─────────────────────────────────────────────────────
  {
    canonical: 'Rebar Man',
    gasKey: 'REBARMAN',
    recruitmentClass: 'SKILLED_TRADESMAN',
    collar: 'BLUE',
    industries: ['Construction', 'Power & Utilities'],
    departments: ['Manufacturing – Fabrication', 'Operations – Reinforcement'],
    aliases: [
      'rebar', 'rebar man', 'rebarman', 'bar bender', 'steel fixer',
      'iron worker', 'bar bending', 'reinforcement fixer', 'rod buster',
    ],
    premiumSpecializations: ['lead rebar man', 'rebar foreman'],
    certs: [],
  },

  // ── INDUSTRIAL PAINTER / BLASTER ─────────────────────────────────────────────
  // taxanomy996: rows 611, 670, 719, 783, 844
  // Gulf JDs consistently ask for "Painter / Blaster" as one role
  {
    canonical: 'Painter / Blaster',
    gasKey: 'PAINTER',
    recruitmentClass: 'SKILLED_TRADESMAN',
    collar: 'BLUE',
    industries: ['Oil & Gas', 'Construction', 'Manufacturing', 'Shipping & Marine',
                 'Power & Utilities'],
    departments: ['Operations – Painting', 'Manufacturing – Painting'],
    aliases: [
      'painter', 'industrial painter', 'blaster', 'sandblaster', 'sand blaster',
      'abrasive blaster', 'spray painter', 'painting technician',
      'blasting painting technician', 'painter blaster', 'blaster painter',
      'surface treatment', 'coating applicator', 'coating technician',
      'anti-corrosion painter', 'protective coating applicator',
    ],
    premiumSpecializations: [
      'coating inspector', 'nace coating inspector', 'painting foreman',
      'blasting painting foreman', 'bgas inspector',
    ],
    certs: ['nace cip level 1', 'nace cip level 2', 'sspc', 'bgas', 'frosio'],
  },

  // ── HEAVY EQUIPMENT OPERATOR ─────────────────────────────────────────────────
  // SPLIT FROM HEAVY DRIVER — Gulf recruiter treats these as different roles
  // taxanomy996: rows 298, 522, 593, 647, 715, 794, 872, 916, 937
  {
    canonical: 'Heavy Equipment Operator',
    gasKey: 'HEAVY_EQUIPMENT',
    recruitmentClass: 'SEMI_SKILLED_WORKER',
    collar: 'BLUE',
    industries: ['Construction', 'Oil & Gas', 'Manufacturing', 'Cement, Mining & Steel',
                 'Power & Utilities'],
    departments: ['Operations – Heavy Equipment'],
    aliases: [
      'heavy equipment operator', 'plant operator', 'machinery operator',
      'excavator operator', 'bulldozer operator', 'dozer operator',
      'grader operator', 'loader operator', 'backhoe operator',
      'compactor operator', 'roller operator', 'forklift operator',
      'boom truck operator', 'concrete pump operator', 'dump truck operator',
      'crawler loader operator', 'heavy machinery operator',
    ],
    premiumSpecializations: [
      'heavy equipment supervisor', 'plant supervisor',
    ],
    certs: ['npors plant', 'cpcs plant'],
  },

  // ── HEAVY DRIVER ─────────────────────────────────────────────────────────────
  // SEPARATE from heavy equipment — Gulf JDs specifically ask for driving license
  // taxanomy996: rows 548, 645
  // Saudi license / GCC license is a HARD requirement in most Gulf JDs
  {
    canonical: 'Heavy Driver',
    gasKey: 'HEAVY_DRIVER',
    recruitmentClass: 'SEMI_SKILLED_WORKER',
    collar: 'BLUE',
    industries: ['Construction', 'Oil & Gas', 'Manufacturing',
                 'Courier / Transportation / Freight'],
    departments: ['Transport & Logistics – Driver'],
    aliases: [
      'heavy driver', 'truck driver', 'lorry driver', 'hgv driver', 'lgv driver',
      'tipper driver', 'trailer driver', 'dump truck driver',
      'tanker driver', 'low-bed driver', 'low loader driver',
      'heavy vehicle driver', 'commercial driver',
    ],
    premiumSpecializations: [
      'heavy driver saudi license', 'heavy driver gcc license',
    ],
    certs: [
      'saudi driving license', 'gcc driving license', 'saudi dl', 'gcc dl',
      'gulf driving license', 'hgv license', 'lgv license',
    ],
  },

  // ── SUPERVISOR / FOREMAN ─────────────────────────────────────────────────────
  // taxanomy996: row 824 (Construction Supervisor)
  // A Gulf recruiter looking for "supervisor" always means a specific trade supervisor
  // Use ONLY when no specific trade is mentioned in the query
  {
    canonical: 'Site Supervisor',
    gasKey: 'SUPERVISOR',
    recruitmentClass: 'TECHNICIAN',
    collar: 'WHITE',
    industries: ['Oil & Gas', 'Construction', 'Manufacturing', 'Power & Utilities'],
    departments: ['Operations – Supervision', 'Engineering – Supervision'],
    aliases: [
      'supervisor', 'site supervisor', 'construction supervisor', 'foreman',
      'site foreman', 'gang leader', 'leadman', 'chargeman',
      'charge hand', 'in charge',
    ],
    premiumSpecializations: [
      'welding supervisor', 'piping supervisor', 'electrical supervisor',
      'mechanical supervisor', 'civil supervisor', 'hse supervisor',
      'instrument supervisor',
    ],
    certs: [],
  },

  // ── ENGINEER (WHITE COLLAR) ──────────────────────────────────────────────────
  // taxanomy996: extensive — piping engineer, mechanical engineer, instrument engineer
  // Used when query explicitly says "engineer" — different from technician/worker
  {
    canonical: 'Site Engineer',
    gasKey: 'MANAGER',
    recruitmentClass: 'ENGINEER',
    collar: 'WHITE',
    industries: ['Oil & Gas', 'Construction', 'Power & Utilities', 'Manufacturing'],
    departments: ['Engineering – Mechanical', 'Engineering – Piping',
                  'Engineering – Instrumentation & Control', 'Engineering – Electrical'],
    aliases: [
      'engineer', 'site engineer', 'field engineer', 'project engineer',
      'piping engineer', 'mechanical engineer', 'instrument engineer',
      'electrical engineer', 'civil engineer', 'process engineer',
      'reliability engineer', 'corrosion engineer', 'commissioning engineer',
    ],
    premiumSpecializations: [
      'lead engineer', 'senior engineer', 'principal engineer',
    ],
    certs: ['pe', 'pmp', 'cpe'],
  },

];

// ── GCC Destination Countries ─────────────────────────────────────────────────
// These are DEPLOYMENT targets — where the candidate will work.
// Distinct from source countries (where the candidate currently lives).

export interface GCCDestination {
  canonical: string;
  aliases: string[];
  /** Saudi Arabia requires ECR/ECNR check — flag this */
  requiresECRCheck: boolean;
}

export const GCC_DESTINATIONS: GCCDestination[] = [
  {
    canonical: 'Saudi Arabia',
    aliases: ['saudi', 'saudi arabia', 'ksa', 'kingdom of saudi', 'aramco', 'sabic', 'sec',
              'neom', 'saudi aramco'],
    requiresECRCheck: true,
  },
  {
    canonical: 'UAE',
    aliases: ['uae', 'emirates', 'dubai', 'abu dhabi', 'sharjah', 'ajman',
              'ras al khaimah', 'fujairah', 'adnoc', 'musandam'],
    requiresECRCheck: false,
  },
  {
    canonical: 'Qatar',
    aliases: ['qatar', 'doha', 'qatarenergy', 'qatar energy', 'lusail', 'ras laffan'],
    requiresECRCheck: false,
  },
  {
    canonical: 'Kuwait',
    aliases: ['kuwait', 'kuwaiti', 'koc', 'knpc', 'kpc'],
    requiresECRCheck: false,
  },
  {
    canonical: 'Bahrain',
    aliases: ['bahrain', 'manama', 'bapco'],
    requiresECRCheck: false,
  },
  {
    canonical: 'Oman',
    aliases: ['oman', 'muscat', 'salalah', 'pdo', 'omantel'],
    requiresECRCheck: false,
  },
];

// ── Source Countries (Candidate Nationality / Current Location) ───────────────
// Where candidates are sourced FROM — NOT deployment destination.

export interface SourceCountry {
  canonical: string;
  aliases: string[];
  /** Indian passport holders need ECR/ECNR verification for Saudi */
  needsECRCheck: boolean;
}

export const SOURCE_COUNTRIES: SourceCountry[] = [
  {
    canonical: 'India',
    aliases: ['india', 'indian', 'ind',
              // States and cities that commonly appear in Gulf CVs
              'kerala', 'punjab', 'andhra', 'telangana', 'up', 'uttar pradesh',
              'bihar', 'rajasthan', 'gujarat', 'maharashtra',
              'mumbai', 'delhi', 'hyderabad', 'chennai', 'bangalore',
              'kolkata', 'kochi', 'trivandrum'],
    needsECRCheck: true,
  },
  {
    canonical: 'Pakistan',
    aliases: ['pakistan', 'pakistani', 'pak', 'lahore', 'karachi', 'islamabad', 'rawalpindi'],
    needsECRCheck: false,
  },
  {
    canonical: 'Nepal',
    aliases: ['nepal', 'nepali', 'nepalese', 'kathmandu', 'pokhara'],
    needsECRCheck: false,
  },
  {
    canonical: 'Philippines',
    aliases: ['philippines', 'filipino', 'pilipino', 'ph', 'manila', 'cebu'],
    needsECRCheck: false,
  },
  {
    canonical: 'Sri Lanka',
    aliases: ['sri lanka', 'srilankan', 'lankan', 'ceylon', 'colombo'],
    needsECRCheck: false,
  },
  {
    canonical: 'Bangladesh',
    aliases: ['bangladesh', 'bangladeshi', 'bd', 'dhaka', 'chittagong'],
    needsECRCheck: false,
  },
];

// ── GCC Experience Signal Phrases ─────────────────────────────────────────────
// When a Gulf recruiter says "gcc experience" they mean:
// "this candidate must have WORKED IN the GCC before" — not just be willing to go.
// This maps to gccMobility = GCC_CURRENT or GCC_PAST in the API.

export const GCC_EXP_PHRASES = [
  'gcc experience', 'gcc exp', 'gulf experience', 'gulf exp',
  'gcc background', 'worked in gcc', 'gcc based', 'gcc exposure',
  'middle east experience', 'me experience', 'gulf background',
  'worked in saudi', 'worked in uae', 'worked in qatar',
  'saudi experience', 'uae experience', 'qatar experience',
  'saudi arabia experience', 'gulf work experience',
];

// ── Shutdown / TAR Signal Phrases ─────────────────────────────────────────────
// "Shutdown experience" in Gulf = Turnaround/Maintenance Outage specialist.
// These candidates command higher rates and are sourced separately.
// taxanomy996 explicitly lists: "Shutdown Specialist" roles (rows 221, 756)

export const SHUTDOWN_PHRASES = [
  'shutdown', 'shutdown experience', 'shutdown specialist', 'shutdown expert',
  'turnaround', 'turn around', 'tar', 'tar experience',
  'outage', 'plant shutdown', 'refinery shutdown',
  'overhaul', 'plant overhaul',
  'maintenance shutdown', 'annual shutdown',
];

// ── Certification Index ───────────────────────────────────────────────────────

export interface CertDef {
  canonical: string;
  aliases: string[];
  /** gasKey list — narrows trade detection when cert is found */
  tradesHint: string[];
  /** This cert alone indicates PREMIUM status */
  isPremium: boolean;
}

export const CERTIFICATIONS: CertDef[] = [
  {
    canonical: 'NEBOSH IGC',
    aliases: ['nebosh', 'nebosh igc', 'nebosh diploma', 'nebosh certificate',
              'nebosh international general certificate'],
    tradesHint: ['HSE'],
    isPremium: true,
  },
  {
    canonical: 'IOSH',
    aliases: ['iosh', 'iosh managing safely', 'iosh working safely'],
    tradesHint: ['HSE'],
    isPremium: false,
  },
  {
    canonical: '6G Weld Test',
    aliases: ['6g', '6gr', '6g welder', '6gr welder', 'coded 6g', 'coded 6gr',
              '6g coded', '6gr coded', '6g certification', '6gr certification'],
    tradesHint: ['WELDER'],
    isPremium: true,
  },
  {
    canonical: 'CSWIP 3.1',
    aliases: ['cswip', 'cswip 3.1', 'cswip 3.2', 'cswip inspector'],
    tradesHint: ['QA_QC', 'WELDER'],
    isPremium: true,
  },
  {
    canonical: 'API 570',
    aliases: ['api 570', 'api570', 'api-570', 'api 510', 'api 653'],
    tradesHint: ['QA_QC'],
    isPremium: true,
  },
  {
    canonical: 'NDT Level II',
    aliases: ['ndt', 'ndt level ii', 'ndt level 2', 'ndt level iii', 'ndt level 3',
              'asnt level ii', 'asnt level iii'],
    tradesHint: ['QA_QC'],
    isPremium: false,
  },
  {
    canonical: 'Saudi Driving License',
    aliases: ['saudi license', 'saudi driving license', 'saudi dl', 'saudi lic',
              'saudi driving lic'],
    tradesHint: ['HEAVY_DRIVER', 'HEAVY_EQUIPMENT'],
    isPremium: true,
  },
  {
    canonical: 'GCC Driving License',
    aliases: ['gcc license', 'gcc driving license', 'gcc dl', 'gcc lic',
              'gulf license', 'gulf driving license'],
    tradesHint: ['HEAVY_DRIVER', 'HEAVY_EQUIPMENT'],
    isPremium: false,
  },
  {
    canonical: 'BOSIET',
    aliases: ['bosiet', 'opito bosiet', 'huet', 'offshore survival'],
    tradesHint: ['HSE'],
    isPremium: true,
  },
];

// ── Experience Extraction Patterns ───────────────────────────────────────────

export const EXP_PATTERNS = [
  /(\d+)\s*\+\s*years?\s*(?:of\s*)?(?:exp(?:erience)?|exp\.)/i,
  /(\d+)\s*years?\s*(?:of\s*)?(?:exp(?:erience)?|exp\.)/i,
  /(?:min(?:imum)?\s+)?(\d+)\s*yrs?\s*(?:exp)?/i,
  /(\d+)\s*-\s*(\d+)\s*years?\s*(?:exp(?:erience)?)?/i,  // range: 3-5 years
];

// ── Quantity Extraction Patterns ─────────────────────────────────────────────

export const QUANTITY_PATTERNS = [
  /\b(?:get|need|want|find|show|give|send)\s+(\d+)\b/i,
  /\b(\d+)\s+(?:candidates?|workers?|persons?|people|nos?\.?|heads?)\b/i,
  /\blimit[:\s]+(\d+)\b/i,
  /\b(\d+)\s+(?:welders?|fitters?|technicians?|drivers?|operators?|inspectors?|officers?)\b/i,
];
