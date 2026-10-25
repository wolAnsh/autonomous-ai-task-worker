/**
 * ApprovalTools - Corporate Governance, Compliance Policy, and Human-in-the-Loop Gate
 */

const crypto = require('crypto');

class ApprovalTools {
  constructor() {
    this.threshold = 5000.00;
  }

  async checkApprovalPolicy({ amount, vendor, category }) {
    const numericAmount = parseFloat(amount);
    const requiresManagerApproval = numericAmount > this.threshold;

    return {
      compliant: !requiresManagerApproval,
      threshold: this.threshold,
      amount: numericAmount,
      requiresManagerApproval,
      reason: requiresManagerApproval
        ? `Invoice total of $${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} exceeds the automated authorization threshold of $${this.threshold.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
        : 'Invoice total is within automated processing threshold.'
    };
  }

  async requestHumanApproval({ reason, details, approvalCallback }) {
    const approvalId = `REQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const approvalPayload = {
      approvalId,
      timestamp: new Date().toISOString(),
      reason,
      details,
      status: 'PENDING'
    };

    if (approvalCallback && typeof approvalCallback === 'function') {
      const decision = await approvalCallback(approvalPayload);
      if (decision.approved) {
        const token = `APPR-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        return {
          approved: true,
          approvalToken: token,
          decisionNotes: decision.notes || 'Approved by user'
        };
      } else {
        return {
          approved: false,
          rejectionReason: decision.reason || 'Operation rejected by human supervisor'
        };
      }
    }

    return {
      pending: true,
      approvalId,
      message: 'Approval request queued for human supervisor.'
    };
  }
}

module.exports = ApprovalTools;
