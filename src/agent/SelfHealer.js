/**
 * SelfHealer - Error detection, retry strategies, and autonomic recovery
 * Diagnoses failures and plans corrective actions without human micro-management.
 */

class SelfHealer {
  constructor() {
    this.maxRetries = 3;
  }

  diagnose(action, error, context = {}) {
    let errorMsg = '';
    let code = 'UNKNOWN_ERROR';

    if (typeof error === 'object' && error !== null) {
      errorMsg = error.error || error.message || '';
      code = error.errorCode || error.code || 'UNKNOWN_ERROR';
    } else {
      errorMsg = String(error || '');
    }

    // 1. High value approval needed
    if (code === 'REQUIRES_APPROVAL' || errorMsg.includes('exceeding $5,000.00 require human manager approval')) {
      return {
        strategy: 'REQUEST_APPROVAL',
        reason: 'Action was blocked by financial safety policy. Requesting human authorization.',
        suggestedAction: 'request_human_approval',
        suggestedArgs: {
          reason: 'Invoice amount exceeds automated limit of $5,000.00',
          details: context.pendingPayload || {}
        }
      };
    }

    // 2. Date format normalization error
    if (errorMsg.includes('Invalid date format') || errorMsg.includes('dueDate')) {
      const rawDate = context.rawDate || (context.args && context.args.dueDate);
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, '0');
          const day = String(parsed.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          return {
            strategy: 'RETRY_WITH_CORRECTED_ARGS',
            reason: `Self-healing date format: Converting "${rawDate}" to ISO-8601 "${formattedDate}"`,
            repairedArgs: { ...context.args, dueDate: formattedDate }
          };
        }
      }
    }

    // 3. Amount parsing error
    if (errorMsg.includes('Invalid amount') || errorMsg.includes('amount')) {
      const rawAmount = context.args && context.args.amount;
      if (rawAmount) {
        const cleaned = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
        if (!isNaN(cleaned)) {
          return {
            strategy: 'RETRY_WITH_CORRECTED_ARGS',
            reason: `Self-healing amount format: Cleaned "${rawAmount}" into numeric float ${cleaned}`,
            repairedArgs: { ...context.args, amount: cleaned }
          };
        }
      }
    }

    // 4. File search no matches
    if (action === 'file_search' || errorMsg.includes('File not found')) {
      return {
        strategy: 'BROADEN_SEARCH',
        reason: 'Exact filename query produced no results. Broadening search query to match vendor or file dropzone.',
        repairedArgs: { query: 'invoice', findLatest: true }
      };
    }

    // 5. Default retry with backoff
    return {
      strategy: 'RETRY_WITH_BACKOFF',
      reason: `Transient error encountered: ${errorMsg}. Retrying action.`
    };
  }
}

module.exports = SelfHealer;
