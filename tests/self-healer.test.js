/**
 * Unit Tests: Self-Healing & Autonomic Error Recovery
 */

const test = require('node:test');
const assert = require('node:assert');
const SelfHealer = require('../src/agent/SelfHealer');

test('SelfHealer: Autocorrects non-standard date string to ISO-8601', () => {
  const healer = new SelfHealer();
  const diagnosis = healer.diagnose('erp_record_invoice', {
    message: 'ERP Validation Error: Invalid date format for dueDate "November 12, 2026"'
  }, {
    args: { dueDate: 'November 12, 2026', amount: 100 }
  });

  assert.strictEqual(diagnosis.strategy, 'RETRY_WITH_CORRECTED_ARGS');
  assert.ok(diagnosis.repairedArgs);
  assert.strictEqual(diagnosis.repairedArgs.dueDate, '2026-11-12');
});

test('SelfHealer: Autocorrects currency-formatted amount string into clean float', () => {
  const healer = new SelfHealer();
  const diagnosis = healer.diagnose('erp_record_invoice', {
    message: 'ERP Validation Error: Invalid amount "$4,850.00"'
  }, {
    args: { amount: '$4,850.00', dueDate: '2026-11-12' }
  });

  assert.strictEqual(diagnosis.strategy, 'RETRY_WITH_CORRECTED_ARGS');
  assert.strictEqual(diagnosis.repairedArgs.amount, 4850);
});

test('SelfHealer: Triggers approval request when financial threshold policy blocks execution', () => {
  const healer = new SelfHealer();
  const diagnosis = healer.diagnose('erp_record_invoice', {
    code: 'REQUIRES_APPROVAL',
    message: 'Transactions exceeding $5,000.00 require human manager approval'
  }, {
    pendingPayload: { amount: 18500 }
  });

  assert.strictEqual(diagnosis.strategy, 'REQUEST_APPROVAL');
  assert.strictEqual(diagnosis.suggestedAction, 'request_human_approval');
});
