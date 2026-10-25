/**
 * Unit & Integration Tests: Human-in-the-Loop & Policy Gates
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const AgentCore = require('../src/agent/AgentCore');
const erpService = require('../src/server/erpService');

test.beforeEach(() => {
  erpService.reset();
});

test('HIL Approval: Pauses and requests manager approval for high-value invoice (> $5,000)', async () => {
  let approvalPromptReceived = false;

  const agent = new AgentCore({
    filesDir: path.resolve(__dirname, '../data/company_files'),
    approvalHandler: async (req) => {
      approvalPromptReceived = true;
      assert.ok(req.reason.includes('exceeds'), 'Reason should cite financial threshold');
      return {
        approved: true,
        approvalToken: 'APPR-TEST-SECURE-TOKEN-99',
        decisionNotes: 'Approved by automated unit test suite'
      };
    }
  });

  const task = 'Process latest invoice for GlobalTech and enter into internal ERP system.';
  const result = await agent.run(task);

  assert.strictEqual(approvalPromptReceived, true, 'Approval callback must have been invoked');
  assert.strictEqual(result.success, true, 'Task should succeed with approval');

  const recorded = erpService.getInvoiceByNumber('INV-GT-5091');
  assert.ok(recorded, 'GlobalTech invoice should be in ledger');
  assert.strictEqual(recorded.amount, 18500);
  assert.strictEqual(recorded.approvalStatus, 'EXECUTIVE_APPROVED');
});

test('HIL Approval: Halts transaction if human operator denies authorization', async () => {
  const agent = new AgentCore({
    filesDir: path.resolve(__dirname, '../data/company_files'),
    approvalHandler: async () => {
      return {
        approved: false,
        reason: 'Budget freeze: Rejected by financial controller'
      };
    }
  });

  const task = 'Process latest invoice for GlobalTech and enter into internal ERP system.';
  const result = await agent.run(task);

  assert.strictEqual(result.success, false, 'Task must fail when human denies approval');
  const recorded = erpService.getInvoiceByNumber('INV-GT-5091');
  assert.strictEqual(recorded, undefined, 'Rejected invoice must not be added to ERP');
});
