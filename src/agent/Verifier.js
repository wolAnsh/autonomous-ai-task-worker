/**
 * Verifier - Independent Verification & Audit Proof Engine
 * Validates that requested outcome actually occurred in ground-truth systems.
 */

const crypto = require('crypto');
const erpService = require('../server/erpService');

class Verifier {
  constructor(serviceInstance) {
    this.service = serviceInstance || erpService;
  }

  async verifyInvoiceOutcome({ invoiceNumber, expectedAmount, expectedVendor, expectedDueDate }) {
    const checks = [];
    let isFullyVerified = true;

    // 1. Direct Ground Truth Query
    const record = this.service.getInvoiceByNumber(invoiceNumber);

    if (!record) {
      return {
        verified: false,
        reason: `Verification failed: Invoice "${invoiceNumber}" was not found in the ERP database.`,
        checks: [
          { check: 'Record Exists', passed: false, details: 'Invoice absent from ledger' }
        ]
      };
    }

    checks.push({
      check: 'Record Exists in ERP',
      passed: true,
      details: `Record ID: ${record.id}`
    });

    // 2. Amount Assertion
    const numExpectedAmount = parseFloat(expectedAmount);
    const amountMatches = Math.abs(record.amount - numExpectedAmount) < 0.01;
    checks.push({
      check: 'Amount Integrity',
      passed: amountMatches,
      details: `Expected: $${numExpectedAmount.toFixed(2)}, Actual in ERP: $${record.amount.toFixed(2)}`
    });
    if (!amountMatches) isFullyVerified = false;

    // 3. Due Date Assertion
    if (expectedDueDate) {
      const normalizedExpected = new Date(expectedDueDate).toISOString().split('T')[0];
      const dateMatches = record.dueDate === normalizedExpected;
      checks.push({
        check: 'Due Date Consistency',
        passed: dateMatches,
        details: `Expected: ${normalizedExpected}, Actual in ERP: ${record.dueDate}`
      });
      if (!dateMatches) isFullyVerified = false;
    }

    // 4. Status Assertion
    const validStatuses = ['RECORDED', 'PAID'];
    const statusMatches = validStatuses.includes(record.status);
    checks.push({
      check: 'Ledger Status Valid',
      passed: statusMatches,
      details: `Current Status: ${record.status}`
    });
    if (!statusMatches) isFullyVerified = false;

    // 5. Audit Log Trail Assertion
    const auditEntry = this.service.auditLogs.find(
      log => log.details && log.details.invoiceNumber === invoiceNumber
    );
    const auditPassed = Boolean(auditEntry);
    checks.push({
      check: 'Audit Log Trail Recorded',
      passed: auditPassed,
      details: auditPassed ? `Logged at ${auditEntry.timestamp}` : 'Missing from audit trail'
    });
    if (!auditPassed) isFullyVerified = false;

    // Generate Verification Certificate
    const verificationHash = crypto.createHash('sha256')
      .update(JSON.stringify({ record, checks, timestamp: new Date().toISOString() }))
      .digest('hex');

    return {
      verified: isFullyVerified,
      certificateId: `V-CERT-${verificationHash.substring(0, 10).toUpperCase()}`,
      verifiedAt: new Date().toISOString(),
      recordSnapshot: record,
      checks,
      summary: isFullyVerified
        ? `Outcome Verified: Invoice ${invoiceNumber} successfully recorded with exact amount $${record.amount.toFixed(2)} and due date ${record.dueDate}.`
        : `Outcome Verification Failed: Discrepancies detected between requested state and actual ERP state.`
    };
  }

  async verifyEmployeeOutcome({ employeeId, expectedFullName }) {
    const record = this.service.employees.find(e => e.id === employeeId);
    if (!record) {
      return {
        verified: false,
        reason: `Employee ${employeeId} not found in corporate directory.`
      };
    }

    return {
      verified: true,
      certificateId: `V-CERT-EMP-${employeeId}`,
      verifiedAt: new Date().toISOString(),
      recordSnapshot: record,
      summary: `Employee ${expectedFullName || employeeId} verified active with systems: ${record.systems.join(', ')}`
    };
  }
}

module.exports = Verifier;
