/**
 * Simulated Company Internal ERP & Database System
 * Realistic accounting and enterprise resource planning backend.
 */

const crypto = require('crypto');

class ErpService {
  constructor() {
    this.reset();
  }

  reset() {
    this.vendors = [
      { id: 'VEND-COMP-X', name: 'Company X Logistics', paymentTerms: 'Net 30', status: 'ACTIVE' },
      { id: 'VEND-ACME-01', name: 'Acme Industrial Supplies', paymentTerms: 'Net 21', status: 'ACTIVE' },
      { id: 'VEND-GTECH-99', name: 'GlobalTech Solutions International', paymentTerms: 'Immediate', status: 'ACTIVE' }
    ];

    this.invoices = [
      {
        id: 'REC-001',
        invoiceNumber: 'INV-87210',
        vendor: 'Company X Logistics',
        vendorId: 'VEND-COMP-X',
        amount: 3200.00,
        currency: 'USD',
        dueDate: '2026-01-25',
        recordedAt: '2026-01-11T09:30:00Z',
        status: 'PAID',
        approvalStatus: 'AUTO_APPROVED',
        checksum: 'sha256-init-rec-001'
      }
    ];

    this.employees = [
      { id: 'EMP-100', fullName: 'Sarah Chen', department: 'Engineering', role: 'Director', status: 'ACTIVE' }
    ];

    this.auditLogs = [
      { timestamp: new Date().toISOString(), event: 'SYSTEM_BOOT', details: 'Simulated ERP database initialized' }
    ];
  }

  logEvent(event, details) {
    this.auditLogs.unshift({
      timestamp: new Date().toISOString(),
      event,
      details
    });
  }

  getVendors() {
    return [...this.vendors];
  }

  getInvoices() {
    return [...this.invoices];
  }

  getInvoiceByNumber(invoiceNumber) {
    return this.invoices.find(inv => inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase());
  }

  recordInvoice(payload) {
    const {
      invoiceNumber,
      vendor,
      amount,
      dueDate,
      currency = 'USD',
      approvalToken = null
    } = payload;

    // Validation
    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
      throw new Error('ERP Validation Error: Missing or invalid "invoiceNumber"');
    }
    if (!vendor || typeof vendor !== 'string') {
      throw new Error('ERP Validation Error: Missing or invalid "vendor"');
    }

    const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`ERP Validation Error: Invalid amount "${amount}". Must be positive numeric.`);
    }

    if (!dueDate || !this.isValidDate(dueDate)) {
      throw new Error(`ERP Validation Error: Invalid date format for dueDate "${dueDate}". Expected YYYY-MM-DD or parseable ISO date.`);
    }

    // Duplicate check
    const existing = this.getInvoiceByNumber(invoiceNumber);
    if (existing) {
      throw new Error(`ERP Conflict Error: Invoice number "${invoiceNumber}" has already been recorded in the ledger (ID: ${existing.id}).`);
    }

    // High value threshold check (> $5,000 requires human manager approval token)
    if (numericAmount > 5000 && (!approvalToken || !approvalToken.startsWith('APPR-'))) {
      const err = new Error(`ERP Policy Violation: Transactions exceeding $5,000.00 require human manager approval. Approval token missing or invalid.`);
      err.code = 'REQUIRES_APPROVAL';
      err.threshold = 5000;
      err.amount = numericAmount;
      throw err;
    }

    // Create record
    const id = `REC-00${this.invoices.length + 1}`;
    const recordedAt = new Date().toISOString();
    const checksum = crypto.createHash('sha256')
      .update(`${id}:${invoiceNumber}:${vendor}:${numericAmount}:${dueDate}:${recordedAt}`)
      .digest('hex');

    const newRecord = {
      id,
      invoiceNumber,
      vendor,
      amount: numericAmount,
      currency,
      dueDate: this.normalizeDate(dueDate),
      recordedAt,
      status: 'RECORDED',
      approvalStatus: numericAmount > 5000 ? 'EXECUTIVE_APPROVED' : 'STANDARD_RECORDED',
      checksum
    };

    this.invoices.push(newRecord);
    this.logEvent('INVOICE_RECORDED', {
      recordId: id,
      invoiceNumber,
      amount: numericAmount,
      vendor,
      checksum
    });

    return newRecord;
  }

  provisionEmployee(payload) {
    const { employeeId, fullName, department, role, requestedSystems } = payload;
    if (!employeeId || !fullName) {
      throw new Error('Employee Provisioning Error: employeeId and fullName are mandatory');
    }

    const record = {
      id: employeeId,
      fullName,
      department,
      role,
      status: 'PROVISIONED',
      systems: requestedSystems || ['DEFAULT_PORTAL'],
      provisionedAt: new Date().toISOString()
    };
    this.employees.push(record);
    this.logEvent('EMPLOYEE_PROVISIONED', { employeeId, fullName, role });
    return record;
  }

  isValidDate(dateString) {
    const d = new Date(dateString);
    return !isNaN(d.getTime());
  }

  normalizeDate(dateString) {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = new ErpService();
