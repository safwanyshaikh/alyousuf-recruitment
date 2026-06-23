/**
 * KAI14-Core · k14/taxonomy.gs   (Deliverable: Trade Taxonomy)
 * LAYER OWNER: K14 (intelligence)
 * ─────────────────────────────────────────────────────────────
 * Role family lookup. matchRequirement uses getTradeFamily_ so that
 * Piping Draftsman matches a Piping Engineer requirement, QAQC Inspector
 * matches a QAQC Engineer requirement, etc. Parser titles are stored verbatim;
 * role families are resolved at match time, never at parse time.
 */

var K14_TRADE_FAMILIES = {
  'PIPING':             ['piping engineer','piping designer','piping draftsman',
                         'piping supervisor','piping inspector','piping coordinator',
                         'pipe fitter','pipefitter','pipe supervisor'],
  'QAQC':               ['qaqc engineer','qa/qc engineer','qaqc inspector',
                         'quality engineer','quality inspector','qa inspector',
                         'qc inspector','quality control engineer',
                         'quality assurance engineer','civil qa/qc engineer'],
  'MECHANICAL':         ['mechanical engineer','mechanical technician',
                         'static mechanical technician','mechanical supervisor',
                         'mechanical inspector','mechanical foreman','mechanical fitter',
                         'rotating equipment engineer'],
  'CIVIL':              ['civil engineer','civil supervisor','civil inspector',
                         'structural engineer','site engineer','civil site engineer'],
  'HSE':                ['hse manager','hse officer','hse engineer','hse coordinator',
                         'safety officer','safety manager','safety engineer',
                         'ehs officer','ehs manager','fire safety officer'],
  'WELDING':            ['welder','welding supervisor','welding inspector',
                         'welding engineer','coded welder','tig welder','mig welder'],
  'ELECTRICAL':         ['electrical engineer','electrician','electrical supervisor',
                         'electrical technician','electrical inspector'],
  'SURVEYING':          ['land surveyor','sr. land surveyor','survey engineer',
                         'quantity surveyor','qs engineer'],
  'PAINTING_BLASTING':  ['painting supervisor','blasting supervisor',
                         'painting and blasting supervisor',
                         'blasting and painting supervisor',
                         'painting & blasting supervisor',
                         'coating inspector','surface treatment supervisor'],
  'PROCUREMENT':        ['procurement engineer','procurement civil engineer',
                         'material engineer','purchasing engineer','procurement officer',
                         'material/civil procurement engineer','civil procurement engineer'],
  'PROJECT_MANAGEMENT': ['project manager','project manager-civil','construction manager',
                         'project coordinator','senior project manager'],
  'CATERING':           ['chef','cook','chief cook','camp boss','compound boss',
                         'comp boss','catering supervisor','catering manager','ch.cook'],
  'FINANCE':            ['accountant','finance officer','finance manager',
                         'accounts executive','accounts officer']
};

/**
 * getTradeFamily_ — return the role family key for a trade title, or null.
 * Match logic: exact member, member-in-trade, or trade-in-member.
 * @param {string} trade
 * @returns {string|null}
 */
function getTradeFamily_(trade) {
  if (!trade) return null;
  var t = trade.toLowerCase().trim();
  var keys = Object.keys(K14_TRADE_FAMILIES);
  for (var i = 0; i < keys.length; i++) {
    var members = K14_TRADE_FAMILIES[keys[i]];
    for (var j = 0; j < members.length; j++) {
      var m = members[j];
      if (t === m || t.indexOf(m) >= 0 || m.indexOf(t) >= 0) return keys[i];
    }
  }
  return null;
}
