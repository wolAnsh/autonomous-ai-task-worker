/**
 * Unit Tests: Independent Verification Engine
 */

const test = require('node:test');
const assert = require('node:assert');
const Verifier = require('../src/agent/Verifier');
const erpService = require('../src/server/erpService');

test.beforeEach(() => {
  erpService.reset();
});

test('Verifier: Validates true outcome with full assertion pass', async () => {
  // Pre-seed an invoice
  erpService.recordInvoice({
    invoiceNumber: 'INV-TEST-001',
    vendor: 'Acme Test Corp',
    amount: 1500.00,
    dueDate: '2026-11-20'
  });

  const verifier = new Verifier(erpService);
  const outcome = await verifier.verifyInvoiceOutcome({
    invoiceNumber: 'INV-TEST-001',
    expectedAmount: 1500.00,
    expectedVendor: 'Acme Test Corp',
    expectedDueDate: '2026-11-20'
  });

  assert.strictEqual(outcome.verified, true);
  assert.strictEqual(outcome.checks.length, 5);
  outcome.checks.forEach(c => assert.strictEqual(c.passed, true, `Check "${c.check}" should pass`));
  assert.ok(outcome.certificateId.startsWith('V-CERT-'));
});

test('Verifier: Detects amount tampering or discrepancy', async () => {
  erpService.recordInvoice({
    invoiceNumber: 'INV-TEST-002',
    vendor: 'Acme Test Corp',
    amount: 1500.00,
    dueDate: '2026-11-20'
  });

  const verifier = new Verifier(erpService);
  const outcome = await verifier.verifyInvoiceOutcome({
    invoiceNumber: 'INV-TEST-002',
    expectedAmount: 1999.00, // Discrepancy!
    expectedVendor: 'Acme Test Corp',
    expectedDueDate: '2026-11-20'
  });

  assert.strictEqual(outcome.verified, false, 'Outcome must fail when amount differs');
  const amountCheck = outcome.checks.find(c => c.check === 'Amount Integrity');
  assert.strictEqual(amountCheck.passed, false);
});

test('Verifier: Detects non-existent invoice', async () => {
  const verifier = new Verifier(erpService);
  const outcome = await verifier.verifyInvoiceOutcome({
    invoiceNumber: 'INV-NON-EXISTENT',
    expectedAmount: 100,
    expectedVendor: 'Ghost Co'
  });

  assert.strictEqual(outcome.verified, false);
  assert.ok(outcome.reason.includes('not found in the ERP database'));
});
