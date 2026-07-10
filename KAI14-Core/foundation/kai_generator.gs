/**
 * KAI14-Core · foundation/kai_generator.gs   (Deliverable 6: KAI Generation)
 * LAYER OWNER: Foundation (owns truth / identity)
 * ───────────────────────────────────────────────────────────────────
 * THE SINGLE WRITER. This is the ONLY function in KAI14 that increments the
 * KAI counter. Format: AYE-KAI-YYYY-NNNNNN. Immutable once issued.
 *
 * Concurrency: the PropertiesService read-modify-write is serialized by
 * LockService. Two concurrent executions can never read the same counter
 * value. If the lock cannot be acquired, we REFUSE to mint (throw) rather
 * than risk a collision.
 *
 * Test isolation: opts.testMode mints from a SEPARATE counter
 * (kai14_counter_test) with a TEST-KAI prefix — synthetic runs consume
 * ZERO production numbers.
 *
 * @param {object} [opts] - { lockHeld:true } caller already owns the script
 *                          lock (e.g. candidateCreate_); { testMode:true }.
 * @returns {string} e.g. 'AYE-KAI-2026-000001'
 */
function kaiMint_(opts) {
  opts = opts || {};
  var isTest     = opts.testMode === true;
  var counterKey = isTest ? K14.kai.testCounterKey : K14.kai.counterKey;
  var prefix     = isTest ? K14.kai.testPrefix     : K14.kai.prefix;

  function mint_() {
    var props   = PropertiesService.getScriptProperties();
    var counter = parseInt(props.getProperty(counterKey) || '0', 10) + 1;
    props.setProperty(counterKey, String(counter));
    return prefix + '-' + new Date().getFullYear() + '-' +
           ('000000' + counter).slice(-6);
  }

  if (opts.lockHeld === true) return mint_();   // caller owns the critical section

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(K14.lockWaitMs)) {
    throw new Error('kaiMint_: could not acquire script lock — KAI not issued (collision guard).');
  }
  try { return mint_(); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

/** Validate a KAI number's format (used by acceptance checks). */
function kaiIsValid_(kai) {
  return /^(AYE|TEST)-KAI-\d{4}-\d{6}$/.test(String(kai || ''));
}
