/**
 * ErpTools - Interfaces for interacting with corporate ERP system & Ledgers
 */

const erpService = require('../server/erpService');

class ErpTools {
  constructor(serviceInstance) {
    this.service = serviceInstance || erpService;
  }

  async recordInvoice({ invoiceNumber, vendor, amount, dueDate, currency, approvalToken }) {
    try {
      const record = this.service.recordInvoice({
        invoiceNumber,
        vendor,
        amount,
        dueDate,
        currency,
        approvalToken
      });
      return {
        status: 'SUCCESS',
        action: 'RECORDED',
        record
      };
    } catch (err) {
      if (err.code === 'REQUIRES_APPROVAL') {
        const error = new Error(err.message);
        error.code = 'REQUIRES_APPROVAL';
        error.amount = err.amount;
        error.threshold = err.threshold;
        throw error;
      }
      throw err;
    }
  }

  async getInvoice({ invoiceNumber }) {
    const record = this.service.getInvoiceByNumber(invoiceNumber);
    if (!record) {
      return { found: false, invoiceNumber };
    }
    return {
      found: true,
      record
    };
  }

  async listInvoices() {
    const invoices = this.service.getInvoices();
    return {
      total: invoices.length,
      invoices
    };
  }

  async provisionEmployee({ employeeId, fullName, department, role, requestedSystems }) {
    const record = this.service.provisionEmployee({
      employeeId,
      fullName,
      department,
      role,
      requestedSystems
    });
    return {
      status: 'SUCCESS',
      record
    };
  }
}

module.exports = ErpTools;
