/**
 * KAI Natural Language Search — Trade Taxonomy
 *
 * Single source of truth for all trade families, aliases, certifications,
 * location keywords, and GCC country identifiers used by the NL parser.
 *
 * Rules:
 * - Every alias is lowercase. Parser lowercases input before matching.
 * - The GAS TRADE_FAMILIES dict (Section T16.5) must stay in sync with TRADE_FAMILIES here.
 * - Add new trades here first; GAS is updated in the same PR.
 * - Canonical name is the first element of each aliases array.
 */

// ── Position Level ──────────────────────────────────────────────────────────
// Mirrors GAS getPositionLevel_() determinism. Same hierarchy, same labels.

export type PositionLevel =
  | 'WORKER'
  | 'TECHNICIAN'
  | 'FOREMAN'
  | 'SUPERVISOR'
  | 'INSPECTOR'
  | 'ENGINEER'
  | 'MANAGER';

// ── Trade Family ─────────────────────────────────────────────────────────────

export interface TradeFamilyDef {
  /** Canonical display name used in UI and API responses */
  canonical: string;
  /** GAS TRADE_FAMILIES key — must match exactly */
  gasKey: string;
  /** Default position level when no level modifier is found in the query */
  defaultLevel: PositionLevel;
  /** All lowercase aliases, abbreviations, and common misspellings */
  aliases: string[];
  /** Certifications that exclusively belong to this trade */
  certs: string[];
  /** Industry tags that strengthen this trade's relevance */
  industries: string[];
}

export const TRADE_FAMILIES: TradeFamilyDef[] = [
  {
    canonical: 'Welder',
    gasKey: 'WELDER',
    defaultLevel: 'WORKER',
    aliases: [
      'welder', 'welding', 'tig', 'arc welder', 'mig', 'pipe welder',
      'structural welder', '6g', '6gr', 'smaw', 'gtaw', 'gmaw', 'fcaw',
      'coded welder', 'tig/mig', 'tig & arc', 'stick welder', 'pressure welder',
      'aluminium welder', 'ss welder', 'stainless welder', 'weld',
      'argon welder', 'co2 welder', 'combo welder', 'multi-process welder',
      'underwater welder', '3g', '5g',
    ],
    certs: ['6g', '6gr', '3g', '5g', 'cswip 3.1', 'aws d1.1', 'asme ix'],
    industries: ['oil & gas', 'construction', 'fabrication', 'shipbuilding'],
  },
  {
    canonical: 'Pipe Fitter',
    gasKey: 'PIPEFITTER',
    defaultLevel: 'WORKER',
    aliases: [
      'pipe fitter', 'pipefitter', 'pipe layer', 'pipe erector', 'piping',
      'pipe fabricator', 'piping erector', 'pipe mechanic', 'pipeline',
      'pipe fitting', 'piping fitter', 'pipe work', 'mechanical fitter',
    ],
    certs: [],
    industries: ['oil & gas', 'construction', 'petrochemical'],
  },
  {
    canonical: 'HVAC Technician',
    gasKey: 'HVAC',
    defaultLevel: 'TECHNICIAN',
    aliases: [
      'hvac', 'air conditioning', 'refrigeration', 'chiller', 'ac technician',
      'hvac engineer', 'hvac/r', 'hvac technician', 'ductwork', 'ventilation',
      'heating cooling', 'air handling', 'vrf', 'vrv', 'ac mechanic',
      'split unit', 'central ac',
    ],
    certs: ['f-gas', 'refrigerant handling', 'ashrae'],
    industries: ['construction', 'facilities management', 'real estate'],
  },
  {
    canonical: 'Electrician',
    gasKey: 'ELECTRICIAN',
    defaultLevel: 'WORKER',
    aliases: [
      'electrician', 'electrical technician', 'electrical engineer',
      'electrical fitter', 'instrumentation electrician', 'hv electrician',
      'lv electrician', 'electrical & instrumentation', 'e&i', 'ei technician',
      'mv electrician', 'power electrician', 'industrial electrician',
      'auto electrician', 'maintenance electrician',
    ],
    certs: ['city & guilds', 'btec electrical'],
    industries: ['oil & gas', 'construction', 'power', 'manufacturing'],
  },
  {
    canonical: 'Instrument Technician',
    gasKey: 'INSTRUMENTATION',
    defaultLevel: 'TECHNICIAN',
    aliases: [
      'instrumentation', 'instrument technician', 'instrument engineer',
      'control & instrumentation', 'process control', 'dcs', 'plc', 'scada',
      'instrumentation & control', 'i&c', 'field instrument', 'instrument fitter',
      'calibration', 'metering', 'telemetry', 'bms', 'ems',
      'control systems', 'field instruments',
    ],
    certs: ['emerson certification', 'honeywell dcs', 'siemens plc'],
    industries: ['oil & gas', 'petrochemical', 'manufacturing'],
  },
  {
    canonical: 'QA/QC Inspector',
    gasKey: 'QA_QC',
    defaultLevel: 'INSPECTOR',
    aliases: [
      'qa/qc', 'quality control', 'quality assurance', 'quality inspector',
      'qc inspector', 'qa inspector', 'qc engineer', 'qa engineer',
      'qc supervisor', 'qa supervisor', 'qa/qc engineer', 'qa/qc supervisor',
      'qc civil', 'qc mechanical', 'qc electrical', 'qc piping', 'qc welding',
      'welding inspector', 'piping inspector', 'mechanical inspector',
      'coating inspector', 'civil inspector', 'structural inspector',
      'dimensional inspection', 'visual inspection', 'ndt', 'ndt technician',
      'ndt inspector', 'cswip', 'asnt', 'radiographic testing',
      'ultrasonic testing', 'magnetic particle testing', 'dye penetrant testing',
      'rt technician', 'ut technician', 'mt technician', 'pt technician',
      'quality', 'inspector', 'inspection', 'aws',
    ],
    certs: [
      'cswip 3.1', 'cswip 3.2', 'api 510', 'api 570', 'api 653',
      'ndt level ii', 'ndt level iii', 'asnt level ii', 'asnt level iii',
      'iso 9001', 'aws cwi',
    ],
    industries: ['oil & gas', 'construction', 'fabrication'],
  },
  {
    canonical: 'HSE Officer',
    gasKey: 'HSE',
    defaultLevel: 'WORKER',
    aliases: [
      'hse', 'safety', 'health safety', 'safety officer', 'safety engineer',
      'fire safety', 'environmental', 'ehs', 'ohs', 'occupational health',
      'safety supervisor', 'nebosh', 'iosh', 'fire warden', 'safety inspector',
      'loss prevention', 'safety coordinator', 'ems coordinator',
      'health safety environment', 'hsse', 'process safety',
    ],
    certs: ['nebosh igc', 'nebosh diploma', 'iosh managing safely', 'iosh working safely', 'nebosh'],
    industries: ['oil & gas', 'construction', 'manufacturing'],
  },
  {
    canonical: 'Rigger',
    gasKey: 'RIGGER',
    defaultLevel: 'WORKER',
    aliases: [
      'rigger', 'rigging', 'lifting', 'banksman', 'slinger', 'rigger banksman',
      'lift supervisor', 'lifting supervisor', 'crane banksman',
    ],
    certs: ['opito rigger', 'leea', 'lifting operations'],
    industries: ['oil & gas', 'construction', 'offshore'],
  },
  {
    canonical: 'Crane Operator',
    gasKey: 'CRANE_OPERATOR',
    defaultLevel: 'WORKER',
    aliases: [
      'crane operator', 'mobile crane', 'tower crane', 'overhead crane',
      'crawler crane', 'rough terrain crane', 'all terrain crane', 'lattice crane',
      'heavy lift', 'hydraulic crane',
    ],
    certs: ['npors crane', 'cpcs crane', 'opito crane'],
    industries: ['construction', 'oil & gas', 'offshore'],
  },
  {
    canonical: 'Scaffolder',
    gasKey: 'SCAFFOLDER',
    defaultLevel: 'WORKER',
    aliases: [
      'scaffolder', 'scaffolding', 'scaffold erector', 'scaffold inspector',
      'scaffold supervisor', 'tube and fitting', 'system scaffold',
    ],
    certs: ['pasma', 'cisrs', 'nasc'],
    industries: ['construction', 'oil & gas'],
  },
  {
    canonical: 'Mechanical Technician',
    gasKey: 'MECHANICAL',
    defaultLevel: 'TECHNICIAN',
    aliases: [
      'mechanical', 'mechanical technician', 'mechanical engineer',
      'rotating equipment', 'static equipment', 'mechanical supervisor',
      'maintenance technician', 'machinery', 'pump', 'compressor', 'turbine',
      'heat exchanger', 'vessel', 'plant maintenance',
    ],
    certs: [],
    industries: ['oil & gas', 'manufacturing', 'petrochemical'],
  },
  {
    canonical: 'Civil Engineer',
    gasKey: 'CIVIL',
    defaultLevel: 'WORKER',
    aliases: [
      'civil', 'civil engineer', 'structural', 'mason', 'carpenter', 'formwork',
      'civil technician', 'surveyor', 'civil supervisor', 'shuttering', 'concrete',
      'reinforced concrete', 'piling', 'foundation', 'civil works',
      'block layer', 'bricklayer',
    ],
    certs: [],
    industries: ['construction', 'infrastructure'],
  },
  {
    canonical: 'Rebar Man',
    gasKey: 'REBARMAN',
    defaultLevel: 'WORKER',
    aliases: [
      'rebar', 'rebarman', 'bar bender', 'steel fixer', 'iron worker',
      'rebaring', 'bar bending', 'reinforcement', 'rod buster',
    ],
    certs: [],
    industries: ['construction'],
  },
  {
    canonical: 'Industrial Painter',
    gasKey: 'PAINTER',
    defaultLevel: 'WORKER',
    aliases: [
      'painter', 'painting', 'coating', 'blaster', 'sandblaster',
      'surface treatment', 'industrial painter', 'coating applicator',
      'abrasive blasting', 'spray painter', 'protective coating', 'anti-corrosion',
    ],
    certs: ['nace coating inspector', 'sspc'],
    industries: ['oil & gas', 'construction', 'fabrication'],
  },
  {
    canonical: 'Equipment Operator',
    gasKey: 'HEAVY_EQUIPMENT',
    defaultLevel: 'WORKER',
    aliases: [
      'heavy equipment', 'equipment operator', 'forklift', 'excavator',
      'bulldozer', 'grader', 'loader', 'backhoe', 'compactor', 'roller',
      'heavy plant', 'plant operator', 'machinery operator',
      'heavy driver', 'hgv', 'lgv', 'dump truck', 'tipper', 'trailer driver',
    ],
    certs: ['saudi driving license', 'gcc driving license', 'hgv license', 'forklift license'],
    industries: ['construction', 'logistics', 'oil & gas'],
  },
  {
    canonical: 'Supervisor',
    gasKey: 'SUPERVISOR',
    defaultLevel: 'SUPERVISOR',
    aliases: [
      'supervisor', 'foreman', 'site supervisor', 'construction supervisor',
      'mechanical supervisor', 'electrical supervisor', 'piping supervisor',
      'welding supervisor', 'civil supervisor', 'project supervisor', 'gang leader',
    ],
    certs: [],
    industries: ['construction', 'oil & gas', 'manufacturing'],
  },
  {
    canonical: 'Project Manager',
    gasKey: 'MANAGER',
    defaultLevel: 'MANAGER',
    aliases: [
      'manager', 'project manager', 'construction manager', 'site manager',
      'operations manager', 'maintenance manager', 'procurement manager',
      'contracts manager', 'project engineer', 'site engineer',
    ],
    certs: ['pmp', 'prince2'],
    industries: ['construction', 'oil & gas'],
  },
];

// ── Location Intelligence ────────────────────────────────────────────────────

export interface CountryDef {
  canonical: string;
  /** GCC = recruitable-to destination; SOURCE = supply country */
  type: 'GCC' | 'SOURCE';
  aliases: string[];
}

export const COUNTRIES: CountryDef[] = [
  // GCC destinations
  { canonical: 'Saudi Arabia', type: 'GCC',    aliases: ['saudi', 'saudi arabia', 'ksa', 'kingdom'] },
  { canonical: 'UAE',          type: 'GCC',    aliases: ['uae', 'emirates', 'dubai', 'abu dhabi', 'sharjah', 'ajman', 'ras al khaimah', 'fujairah'] },
  { canonical: 'Qatar',        type: 'GCC',    aliases: ['qatar', 'doha', 'qatarenergy'] },
  { canonical: 'Kuwait',       type: 'GCC',    aliases: ['kuwait', 'kuwaiti'] },
  { canonical: 'Bahrain',      type: 'GCC',    aliases: ['bahrain', 'manama'] },
  { canonical: 'Oman',         type: 'GCC',    aliases: ['oman', 'muscat', 'salalah'] },
  // Common source countries
  { canonical: 'India',        type: 'SOURCE', aliases: ['india', 'indian', 'ind', 'bharat', 'kerala', 'punjab', 'andhra', 'telangana', 'up', 'bihar', 'rajasthan', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'bangalore'] },
  { canonical: 'Pakistan',     type: 'SOURCE', aliases: ['pakistan', 'pakistani', 'pak', 'lahore', 'karachi', 'islamabad'] },
  { canonical: 'Nepal',        type: 'SOURCE', aliases: ['nepal', 'nepali', 'nepalese', 'kathmandu'] },
  { canonical: 'Philippines',  type: 'SOURCE', aliases: ['philippines', 'filipino', 'ph', 'manila'] },
  { canonical: 'Sri Lanka',    type: 'SOURCE', aliases: ['sri lanka', 'srilankan', 'ceylon', 'colombo'] },
  { canonical: 'Bangladesh',   type: 'SOURCE', aliases: ['bangladesh', 'bangladeshi', 'dhaka'] },
];

// ── GCC Experience Qualifiers ────────────────────────────────────────────────

/** Phrases that indicate the candidate has GCC work experience */
export const GCC_EXP_PHRASES = [
  'gcc experience', 'gcc exp', 'gulf experience', 'gulf exp',
  'gcc background', 'worked in gcc', 'gcc based', 'gcc exposure',
  'middle east experience', 'me experience',
  'saudi experience', 'uae experience', 'qatar experience', 'kuwait experience',
];

// ── Certification Aliases ────────────────────────────────────────────────────

export interface CertDef {
  canonical: string;
  aliases: string[];
  tradesHint: string[]; // gasKey list — which trades this cert narrows to
}

export const CERTIFICATIONS: CertDef[] = [
  {
    canonical: 'NEBOSH IGC',
    aliases: ['nebosh', 'nebosh igc', 'nebosh diploma', 'nebosh certificate'],
    tradesHint: ['HSE'],
  },
  {
    canonical: 'IOSH',
    aliases: ['iosh', 'iosh managing safely', 'iosh working safely'],
    tradesHint: ['HSE'],
  },
  {
    canonical: '6G Weld Test',
    aliases: ['6g', '6gr', '6g coded', 'coded 6g'],
    tradesHint: ['WELDER'],
  },
  {
    canonical: 'CSWIP 3.1',
    aliases: ['cswip', 'cswip 3.1', 'cswip 3.2'],
    tradesHint: ['QA_QC', 'WELDER'],
  },
  {
    canonical: 'API 570',
    aliases: ['api 570', 'api570', 'api-570'],
    tradesHint: ['QA_QC'],
  },
  {
    canonical: 'Saudi Driving License',
    aliases: ['saudi license', 'saudi driving license', 'saudi dl', 'saudi lic'],
    tradesHint: ['HEAVY_EQUIPMENT'],
  },
  {
    canonical: 'GCC Driving License',
    aliases: ['gcc license', 'gcc driving license', 'gcc dl', 'gcc lic', 'gulf license'],
    tradesHint: ['HEAVY_EQUIPMENT'],
  },
  {
    canonical: 'NDT Level II',
    aliases: ['ndt', 'ndt level ii', 'ndt level 2', 'ndt level iii', 'ndt level 3'],
    tradesHint: ['QA_QC'],
  },
];

// ── Quantity Extraction Patterns ─────────────────────────────────────────────

/** Pattern to extract numeric demand from query (e.g. "get 6 welders", "need 25") */
export const QUANTITY_PATTERNS = [
  /\b(?:get|need|want|find|show|give)\s+(\d+)\b/i,
  /\b(\d+)\s+(?:candidates?|workers?|persons?|people|nos?\.?)\b/i,
  /\blimit[:\s]+(\d+)\b/i,
];

// ── Experience Extraction Patterns ───────────────────────────────────────────

export const EXP_PATTERNS = [
  /(\d+)\s*(?:\+|plus)?\s*years?\s*(?:of\s*)?(?:exp(?:erience)?|exp\.)/i,
  /(?:min(?:imum)?\s+)?(\d+)\s*yrs?\s*(?:exp)?/i,
  /(\d+)\s*-\s*(\d+)\s*years?\s*(?:exp(?:erience)?)?/i,  // range: 3-5 years
];
