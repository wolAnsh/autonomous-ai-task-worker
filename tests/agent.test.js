/**
 * Unit & Integration Tests: Autonomous Agent Core Execution
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const AgentCore = require('../src/agent/AgentCore');
const erpService = require('../src/server/erpService');

test.beforeEach(() => {
  erpService.reset();
});

test('Agent Core: Autonomously executes Company X invoice extraction and ERP recording', async () => {
  const agent = new AgentCore({
    filesDir: path.resolve(__dirname, '../data/company_files')
  });

  const prompt = 'Find the latest invoice from Company X, extract the amount and due date, enter it into our internal system, and tell me once it is done.';
  const result = await agent.run(prompt);

  // Assert overall completion
  assert.strictEqual(result.success, true, 'Task should succeed');
  assert.ok(result.summary.includes('INV-88421'), 'Summary should mention extracted invoice number');
  assert.ok(result.summary.includes('4850'), 'Summary should mention extracted amount');

  // Assert memory and variables
  const variables = result.variables;
  assert.ok(variables.invoiceFile, 'Should have discovered invoice file');
  assert.strictEqual(variables.invoiceFile.fileName, 'CompanyX_Invoice_2026_02_LATEST.json');
  assert.strictEqual(variables.extractedData.amount, 4850);
  assert.strictEqual(variables.extractedData.dueDate, '2026-11-12');

  // Assert ERP persistence
  const recordedInvoice = erpService.getInvoiceByNumber('INV-88421');
  assert.ok(recordedInvoice, 'Invoice should exist in ERP database');
  assert.strictEqual(recordedInvoice.amount, 4850);
  assert.strictEqual(recordedInvoice.status, 'RECORDED');

  // Assert Proof of Work
  assert.ok(result.proof, 'Proof of work should be generated');
  assert.ok(result.proof.receiptId.startsWith('REC-POW-'));
  assert.strictEqual(typeof result.proof.signature, 'string');
  assert.strictEqual(result.proof.signature.length, 64); // SHA-256 length
});

test('Agent Core: Emits trajectory steps sequentially', async () => {
  const agent = new AgentCore({
    filesDir: path.resolve(__dirname, '../data/company_files')
  });

  const events = [];
  agent.on('thought', d => events.push({ type: 'thought', ...d }));
  agent.on('action_completed', d => events.push({ type: 'action', ...d }));

  await agent.run('Find latest invoice from Company X and record in ERP');

  assert.ok(events.length >= 4, 'Should emit multiple ReAct thoughts and actions');
  assert.strictEqual(events[0].type, 'thought');
});
