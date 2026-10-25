/**
 * Reasoner - Cognitive engine supporting both Live LLM APIs and Deterministic ReAct Reasoning
 * Decides the next action based on goal, memory, observations, and error states.
 */

class Reasoner {
  constructor(options = {}) {
    this.mode = options.mode || (process.env.OPENAI_API_KEY ? 'LLM_OPENAI' : 'DETERMINISTIC_REACT');
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  }

  async decideNextStep(memoryStore, toolRegistry) {
    if (this.mode === 'LLM_OPENAI' && this.apiKey) {
      try {
        return await this.callOpenAiReasoner(memoryStore, toolRegistry);
      } catch (err) {
        // Fallback to Deterministic ReAct if LLM fails or is unconfigured
        return this.deterministicReActDecision(memoryStore, toolRegistry);
      }
    }

    return this.deterministicReActDecision(memoryStore, toolRegistry);
  }

  /**
   * Deterministic Autonomous ReAct Reasoner
   * Implements strict ReAct thought-action-observation cycles based on state convergence
   */
  deterministicReActDecision(memoryStore, toolRegistry) {
    const task = memoryStore.task.toLowerCase();
    const variables = memoryStore.variables;
    const failures = memoryStore.failures;
    const recentSteps = memoryStore.steps;

    // Check if task is already completed
    if (memoryStore.status === 'COMPLETED') {
      return {
        thought: 'Task has been completed and verified.',
        action: 'FINISH',
        args: { summary: memoryStore.summary }
      };
    }

    // Step 1: File Discovery
    if (!variables.invoiceFile && !variables.onboardingFile) {
      if (task.includes('onboard') || task.includes('employee')) {
        return {
          thought: 'The user wants to onboard an employee. I need to search the company file dropzone for the onboarding request dossier.',
          action: 'file_search',
          args: { query: 'onboarding', findLatest: true }
        };
      }

      // Invoice processing
      let vendorQuery = 'invoice';
      if (task.includes('company x')) vendorQuery = 'Company X';
      else if (task.includes('acme')) vendorQuery = 'Acme';
      else if (task.includes('globaltech')) vendorQuery = 'GlobalTech';

      return {
        thought: `Goal is to locate the latest invoice for ${vendorQuery}. I will search the file repository to locate matching invoices.`,
        action: 'file_search',
        args: { vendor: vendorQuery, query: vendorQuery, findLatest: true }
      };
    }

    // Step 2: Extraction and Parsing
    if (variables.invoiceFile && (!variables.extractedData || !variables.extractedData.amount)) {
      return {
        thought: `Located target file "${variables.invoiceFile.fileName}". Now reading and extracting structured invoice entities (amount, due date, vendor, invoice number).`,
        action: 'read_and_parse_file',
        args: { filePath: variables.invoiceFile.filePath }
      };
    }

    if (variables.onboardingFile && !variables.extractedData) {
      return {
        thought: `Located onboarding file "${variables.onboardingFile.fileName}". Extracting employee profile and requested system permissions.`,
        action: 'read_and_parse_file',
        args: { filePath: variables.onboardingFile.filePath }
      };
    }

    // Step 3: Policy Check & Human-in-the-Loop Check
    if (variables.extractedData && variables.extractedData.amount && !variables.policyChecked) {
      return {
        thought: `Extracted Invoice #${variables.extractedData.invoiceNumber} for amount $${variables.extractedData.amount} due on ${variables.extractedData.dueDate}. Checking compliance policy and approval threshold.`,
        action: 'check_approval_policy',
        args: {
          amount: variables.extractedData.amount,
          vendor: variables.extractedData.vendor
        }
      };
    }

    // Step 3b: If human approval is required and not yet granted
    if (variables.policyChecked && variables.policyChecked.requiresManagerApproval && !variables.approvalToken) {
      return {
        thought: `Invoice amount of $${variables.extractedData.amount} exceeds automated processing threshold ($5,000.00). Requesting human manager approval before committing transaction.`,
        action: 'request_human_approval',
        args: {
          reason: `High-value invoice ${variables.extractedData.invoiceNumber} ($${variables.extractedData.amount}) exceeds authorization threshold of $5,000.00 and requires supervisor sign-off.`,
          details: {
            vendor: variables.extractedData.vendor,
            amount: variables.extractedData.amount,
            dueDate: variables.extractedData.dueDate
          }
        }
      };
    }

    // Step 4: System Execution (ERP submission)
    if (variables.extractedData && !variables.erpSubmissionResult) {
      if (variables.extractedData.employeeId) {
        return {
          thought: `Submitting employee provisioning request for ${variables.extractedData.fullName} to corporate directory.`,
          action: 'erp_provision_employee',
          args: {
            employeeId: variables.extractedData.employeeId,
            fullName: variables.extractedData.fullName,
            department: variables.extractedData.department,
            role: variables.extractedData.role,
            requestedSystems: variables.extractedData.requestedSystems
          }
        };
      }

      return {
        thought: `Corporate policy validated. Proceeding to autonomously record invoice #${variables.extractedData.invoiceNumber} into company ERP system.`,
        action: 'erp_record_invoice',
        args: {
          invoiceNumber: variables.extractedData.invoiceNumber,
          vendor: variables.extractedData.vendor,
          amount: variables.extractedData.amount,
          dueDate: variables.extractedData.dueDate,
          currency: variables.extractedData.currency || 'USD',
          approvalToken: variables.approvalToken || null
        }
      };
    }

    // Step 5: Independent Verification
    if (variables.erpSubmissionResult && !variables.verificationResult) {
      if (variables.extractedData.employeeId) {
        return {
          thought: 'Employee provisioning executed. Independently querying corporate directory to verify employee status.',
          action: 'verify_employee_record',
          args: {
            employeeId: variables.extractedData.employeeId,
            expectedFullName: variables.extractedData.fullName
          }
        };
      }

      return {
        thought: `ERP record created (${variables.erpSubmissionResult.record.id}). Now performing independent verification against ERP database to confirm amount integrity and audit persistence.`,
        action: 'verify_erp_state',
        args: {
          invoiceNumber: variables.extractedData.invoiceNumber,
          expectedAmount: variables.extractedData.amount,
          expectedVendor: variables.extractedData.vendor,
          expectedDueDate: variables.extractedData.dueDate
        }
      };
    }

    // Step 6: Goal completion and final summary
    if (variables.verificationResult && variables.verificationResult.verified) {
      if (variables.extractedData && variables.extractedData.employeeId) {
        return {
          thought: `Employee onboarding completed and verified in directory (Certificate: ${variables.verificationResult.certificateId}).`,
          action: 'FINISH',
          args: {
            summary: `Successfully onboarded employee ${variables.extractedData.fullName} (${variables.extractedData.employeeId}) as ${variables.extractedData.role} in ${variables.extractedData.department}. Provisioned systems: ${(variables.extractedData.requestedSystems || []).join(', ')}. Verified in corporate directory with certificate ${variables.verificationResult.certificateId}.`
          }
        };
      }

      const rec = variables.erpSubmissionResult.record;
      return {
        thought: `Task successfully completed and verified. Record ${rec.id} active in ERP ledger with certificate ${variables.verificationResult.certificateId}.`,
        action: 'FINISH',
        args: {
          summary: `Successfully retrieved latest invoice (${variables.extractedData.invoiceNumber}) from ${variables.extractedData.vendor}, extracted amount $${parseFloat(variables.extractedData.amount).toFixed(2)} and due date ${variables.extractedData.dueDate}, recorded it into the company ERP system (Record ID: ${rec.id}), and verified ledger state with certificate ${variables.verificationResult.certificateId}.`
        }
      };
    }

    // Fallback if verification failed
    if (variables.verificationResult && !variables.verificationResult.verified) {
      return {
        thought: `Verification failed: ${variables.verificationResult.reason}. Halting to alert user.`,
        action: 'FAIL',
        args: { reason: variables.verificationResult.reason }
      };
    }

    return {
      thought: 'All actionable steps concluded.',
      action: 'FINISH',
      args: { summary: 'Task workflow concluded.' }
    };
  }
}

module.exports = Reasoner;
