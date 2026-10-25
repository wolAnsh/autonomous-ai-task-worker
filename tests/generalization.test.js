/**
 * Unit & Integration Tests: System Generalization
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const AgentCore = require('../src/agent/AgentCore');
const erpService = require('../src/server/erpService');

test.beforeEach(() => {
  erpService.reset();
});

test('Generalization: Onboards employee and provisions directory without changing core agent', async () => {
  const agent = new AgentCore({
    filesDir: path.resolve(__dirname, '../data/company_files')
  });

  const task = 'Onboard new employee Elena Rostova from onboarding dossier into directory.';
  const result = await agent.run(task);

  assert.strictEqual(result.success, true);
  assert.ok(result.summary.includes('Elena Rostova'));
  assert.ok(result.summary.includes('EMP-2026-441'));

  // Verify in corporate directory
  const emp = erpService.employees.find(e => e.id === 'EMP-2026-441');
  assert.ok(emp, 'Employee should exist in directory');
  assert.strictEqual(emp.status, 'PROVISIONED');
  assert.ok(emp.systems.includes('GITHUB_ENTERPRISE'));
});
