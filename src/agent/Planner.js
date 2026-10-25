/**
 * Planner - Goal understanding and hierarchical task decomposition
 * Deconstructs natural language tasks into actionable phases with clear completion criteria.
 */

class Planner {
  constructor() {
    this.templatePlans = {
      INVOICE_PROCESSING: [
        {
          phase: 'DISCOVERY',
          title: 'Discover and locate vendor invoice files',
          toolHint: 'file_search',
          expectedOutcome: 'Locate file path for the vendor, identifying the latest invoice if multiple exist.'
        },
        {
          phase: 'EXTRACTION',
          title: 'Extract and normalize invoice details',
          toolHint: 'read_and_parse_file',
          expectedOutcome: 'Structured extraction of invoiceNumber, amount, dueDate, vendor, and line items.'
        },
        {
          phase: 'POLICY_CHECK',
          title: 'Evaluate corporate compliance & approval threshold',
          toolHint: 'check_approval_policy',
          expectedOutcome: 'Determine if high-value approval (> $5,000) or missing parameters require human-in-the-loop.'
        },
        {
          phase: 'EXECUTION',
          title: 'Execute transaction in internal ERP system',
          toolHint: 'erp_record_invoice',
          expectedOutcome: 'HTTP 201 submission to ERP ledger, receiving transaction confirmation ID.'
        },
        {
          phase: 'VERIFICATION',
          title: 'Perform independent verification check',
          toolHint: 'verify_erp_state',
          expectedOutcome: 'Direct database lookup confirming record persistence, correct amount, and SHA-256 hash.'
        },
        {
          phase: 'COMPLETION',
          title: 'Generate summary and proof of completion',
          toolHint: 'summarize_outcome',
          expectedOutcome: 'Present audit receipt and concise summary to the user.'
        }
      ],
      EMPLOYEE_ONBOARDING: [
        {
          phase: 'DISCOVERY',
          title: 'Locate onboarding ticket and employee dossier',
          toolHint: 'file_search',
          expectedOutcome: 'Find onboarding request file with candidate details.'
        },
        {
          phase: 'EXTRACTION',
          title: 'Extract candidate role and system permissions',
          toolHint: 'read_and_parse_file',
          expectedOutcome: 'Extract employee ID, name, role, department, and systems to provision.'
        },
        {
          phase: 'EXECUTION',
          title: 'Provision accounts in internal directory',
          toolHint: 'erp_provision_employee',
          expectedOutcome: 'Record employee in corporate identity ledger.'
        },
        {
          phase: 'VERIFICATION',
          title: 'Verify active employee record',
          toolHint: 'verify_employee_record',
          expectedOutcome: 'Confirm identity directory reflects active status.'
        },
        {
          phase: 'COMPLETION',
          title: 'Generate onboarding confirmation receipt',
          toolHint: 'summarize_outcome',
          expectedOutcome: 'Present completion proof to hiring manager.'
        }
      ],
      GENERIC_AUTOMATION: [
        {
          phase: 'DISCOVERY',
          title: 'Analyze environment and target resources',
          toolHint: 'file_search',
          expectedOutcome: 'Locate relevant data sources.'
        },
        {
          phase: 'EXECUTION',
          title: 'Execute requested automated steps',
          toolHint: 'generic_action',
          expectedOutcome: 'Perform operations toward goal.'
        },
        {
          phase: 'VERIFICATION',
          title: 'Verify state changes',
          toolHint: 'verify_state',
          expectedOutcome: 'Ensure goal criteria are satisfied.'
        },
        {
          phase: 'COMPLETION',
          title: 'Summarize work and evidence',
          toolHint: 'summarize_outcome',
          expectedOutcome: 'Audit log and completion message.'
        }
      ]
    };
  }

  /**
   * Parses natural language goal into structured intent and execution plan
   */
  createPlan(taskText) {
    const textLower = taskText.toLowerCase();

    // Intent detection
    let planType = 'GENERIC_AUTOMATION';
    let targetEntity = 'General';
    let vendorMatch = null;

    if (textLower.includes('invoice') || textLower.includes('bill') || textLower.includes('payment') || textLower.includes('erp')) {
      planType = 'INVOICE_PROCESSING';

      // Detect vendor name
      if (textLower.includes('company x')) vendorMatch = 'Company X';
      else if (textLower.includes('acme')) vendorMatch = 'Acme Corp';
      else if (textLower.includes('globaltech')) vendorMatch = 'GlobalTech';
      else {
        const vendorRegex = /(?:from|for)\s+([a-zA-Z0-9_\-\s]+?)(?:,|$|\.|\sand\s)/i;
        const match = taskText.match(vendorRegex);
        if (match && match[1]) vendorMatch = match[1].trim();
      }
      targetEntity = vendorMatch || 'Vendor';
    } else if (textLower.includes('onboard') || textLower.includes('employee') || textLower.includes('hire')) {
      planType = 'EMPLOYEE_ONBOARDING';
      targetEntity = 'Employee';
    }

    const phases = this.templatePlans[planType].map(step => ({ ...step }));

    return {
      intent: planType,
      targetEntity,
      vendor: vendorMatch,
      phases,
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = Planner;
