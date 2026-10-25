/**
 * AgentCore - Autonomous AI Task Worker Orchestration Engine
 * Implements the full ReAct (Reasoning + Acting) loop with working memory,
 * self-healing, human-in-the-loop gating, and independent outcome verification.
 */

const { EventEmitter } = require('events');
const MemoryStore = require('./MemoryStore');
const Planner = require('./Planner');
const Reasoner = require('./Reasoner');
const SelfHealer = require('./SelfHealer');
const Verifier = require('./Verifier');
const ToolRegistry = require('../tools/ToolRegistry');
const FileTools = require('../tools/FileTools');
const ErpTools = require('../tools/ErpTools');
const ApprovalTools = require('../tools/ApprovalTools');

class AgentCore extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.maxIterations = options.maxIterations || 15;

    // Component instances
    this.memory = new MemoryStore();
    this.planner = new Planner();
    this.reasoner = new Reasoner({ mode: options.reasonerMode });
    this.healer = new SelfHealer();
    this.verifier = new Verifier();
    this.toolRegistry = new ToolRegistry();

    // Tools setup
    this.fileTools = new FileTools(options.filesDir);
    this.erpTools = new ErpTools();
    this.approvalTools = new ApprovalTools();

    this.setupTools();
    this.humanApprovalResolver = null;
  }

  setupTools() {
    // 1. file_search
    this.toolRegistry.registerTool(
      'file_search',
      { description: 'Search local company repository for vendor documents or invoices' },
      async (args) => {
        return await this.fileTools.searchFiles(args);
      }
    );

    // 2. read_and_parse_file
    this.toolRegistry.registerTool(
      'read_and_parse_file',
      { description: 'Read document content and extract structured fields' },
      async (args) => {
        return await this.fileTools.readAndParseFile(args);
      }
    );

    // 3. check_approval_policy
    this.toolRegistry.registerTool(
      'check_approval_policy',
      { description: 'Check financial limits and compliance rules' },
      async (args) => {
        return await this.approvalTools.checkApprovalPolicy(args);
      }
    );

    // 4. request_human_approval
    this.toolRegistry.registerTool(
      'request_human_approval',
      { description: 'Pause execution and request explicit authorization from human user' },
      async (args, context) => {
        this.memory.status = 'AWAITING_APPROVAL';
        this.emit('approval_needed', {
          reason: args.reason,
          details: args.details
        });

        if (this.options.approvalHandler) {
          const decision = await this.options.approvalHandler(args);
          return decision;
        }

        // Wait for external resolveHumanApproval call
        return new Promise((resolve) => {
          this.humanApprovalResolver = resolve;
        });
      }
    );

    // 5. erp_record_invoice
    this.toolRegistry.registerTool(
      'erp_record_invoice',
      { description: 'Submit invoice entry to company internal ERP ledger' },
      async (args) => {
        return await this.erpTools.recordInvoice(args);
      }
    );

    // 6. verify_erp_state
    this.toolRegistry.registerTool(
      'verify_erp_state',
      { description: 'Independently inspect ERP database to verify invoice state' },
      async (args) => {
        return await this.verifier.verifyInvoiceOutcome(args);
      }
    );

    // 7. erp_provision_employee
    this.toolRegistry.registerTool(
      'erp_provision_employee',
      { description: 'Provision employee in identity directory' },
      async (args) => {
        return await this.erpTools.provisionEmployee(args);
      }
    );

    // 8. verify_employee_record
    this.toolRegistry.registerTool(
      'verify_employee_record',
      { description: 'Independently verify employee provisioning status' },
      async (args) => {
        return await this.verifier.verifyEmployeeOutcome(args);
      }
    );
  }

  resolveHumanApproval(approved = true, notes = '') {
    if (this.humanApprovalResolver) {
      const token = approved ? `APPR-MAN-${Date.now().toString(36).toUpperCase()}` : null;
      this.humanApprovalResolver({
        approved,
        approvalToken: token,
        decisionNotes: notes || (approved ? 'Authorized by operator' : 'Rejected by operator')
      });
      this.humanApprovalResolver = null;
    }
  }

  async run(taskDescription) {
    this.memory = new MemoryStore(taskDescription);
    this.memory.status = 'PLANNING';

    this.emit('task_started', { task: taskDescription });

    // Step 0: Goal understanding & decomposition
    const plan = this.planner.createPlan(taskDescription);
    this.memory.setPlan(plan.phases);
    this.memory.setVariable('planIntent', plan.intent);
    this.memory.setVariable('targetEntity', plan.targetEntity);

    this.emit('plan_created', { plan });

    this.memory.status = 'EXECUTING';
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      // 1. REASON: Decide next step
      const decision = await this.reasoner.decideNextStep(this.memory, this.toolRegistry);

      this.emit('thought', {
        iteration,
        thought: decision.thought,
        action: decision.action
      });

      // Check for completion action
      if (decision.action === 'FINISH') {
        this.memory.status = 'COMPLETED';
        this.memory.summary = decision.args.summary || 'Task completed successfully.';
        this.memory.completedAt = new Date().toISOString();
        const proof = this.memory.generateProofOfWork();

        this.emit('task_completed', {
          summary: this.memory.summary,
          proof,
          steps: this.memory.steps
        });

        return {
          success: true,
          summary: this.memory.summary,
          proof,
          steps: this.memory.steps,
          variables: this.memory.getAllVariables()
        };
      }

      if (decision.action === 'FAIL') {
        this.memory.status = 'FAILED';
        const failureReason = decision.args.reason || 'Task failed to satisfy verification criteria.';
        this.memory.completedAt = new Date().toISOString();

        this.emit('task_failed', { reason: failureReason });
        return {
          success: false,
          error: failureReason,
          steps: this.memory.steps
        };
      }

      // 2. ACT: Execute tool
      this.emit('action_start', {
        action: decision.action,
        args: decision.args
      });

      let executionResult = await this.toolRegistry.executeTool(
        decision.action,
        decision.args,
        { memory: this.memory }
      );

      // 3. OBSERVE & SELF-HEAL
      if (!executionResult.success) {
        this.emit('action_failed', {
          action: decision.action,
          error: executionResult.error
        });

        // Diagnose failure and plan recovery
        const diagnosis = this.healer.diagnose(decision.action, executionResult, {
          args: decision.args
        });

        this.memory.logFailure(decision.action, executionResult.error, diagnosis.reason);

        this.emit('self_healing', {
          action: decision.action,
          diagnosis
        });

        // Apply automatic repair if suggested
        if (diagnosis.strategy === 'RETRY_WITH_CORRECTED_ARGS' && diagnosis.repairedArgs) {
          executionResult = await this.toolRegistry.executeTool(
            decision.action,
            diagnosis.repairedArgs,
            { memory: this.memory }
          );
        } else if (diagnosis.strategy === 'REQUEST_APPROVAL') {
          // Trigger approval action
          const approvalResult = await this.toolRegistry.executeTool(
            'request_human_approval',
            diagnosis.suggestedArgs,
            { memory: this.memory }
          );

          if (approvalResult.success && approvalResult.data.approved) {
            this.memory.recordApproval(approvalResult.data.approvalToken, 'Manager approval granted');
            // Retry the original action with approval token
            executionResult = await this.toolRegistry.executeTool(
              decision.action,
              { ...decision.args, approvalToken: approvalResult.data.approvalToken },
              { memory: this.memory }
            );
          }
        }
      }

      // 4. UPDATE MEMORY
      this.memory.recordStep({
        thought: decision.thought,
        action: decision.action,
        args: decision.args,
        observation: executionResult.data,
        status: executionResult.success ? 'SUCCESS' : 'FAILED',
        error: executionResult.error
      });

      this.emit('action_completed', {
        action: decision.action,
        result: executionResult.data,
        success: executionResult.success
      });

      // Update state variables based on tool outputs
      this.syncMemoryVariables(decision.action, executionResult);
    }

    this.memory.status = 'FAILED';
    const maxIterationError = `Maximum reasoning iterations (${this.maxIterations}) exceeded without converging.`;
    this.emit('task_failed', { reason: maxIterationError });
    return {
      success: false,
      error: maxIterationError,
      steps: this.memory.steps
    };
  }

  syncMemoryVariables(action, result) {
    if (!result.success || !result.data) return;

    if (action === 'file_search') {
      if (result.data.bestMatch) {
        if (result.data.bestMatch.fileName.toLowerCase().includes('onboard')) {
          this.memory.setVariable('onboardingFile', result.data.bestMatch);
        } else {
          this.memory.setVariable('invoiceFile', result.data.bestMatch);
        }
      }
    } else if (action === 'read_and_parse_file') {
      this.memory.setVariable('extractedData', result.data.data);
    } else if (action === 'check_approval_policy') {
      this.memory.setVariable('policyChecked', result.data);
    } else if (action === 'request_human_approval') {
      if (result.data.approved) {
        this.memory.recordApproval(result.data.approvalToken, result.data.decisionNotes);
      }
    } else if (action === 'erp_record_invoice' || action === 'erp_provision_employee') {
      this.memory.setVariable('erpSubmissionResult', result.data);
    } else if (action === 'verify_erp_state' || action === 'verify_employee_record') {
      this.memory.setVariable('verificationResult', result.data);
      this.memory.setVerificationProof(result.data);
    }
  }
}

module.exports = AgentCore;
