/**
 * MemoryStore - Working memory, scratchpad, and context accumulator
 * Keeps track of current task, discoveries, trajectory, and verification receipts.
 */

const crypto = require('crypto');

class MemoryStore {
  constructor(taskDescription = '') {
    this.task = taskDescription;
    this.status = 'INITIALIZED'; // INITIALIZED, PLANNING, EXECUTING, AWAITING_APPROVAL, VERIFYING, COMPLETED, FAILED
    this.startedAt = new Date().toISOString();
    this.completedAt = null;

    // Working memory key-value scratchpad
    this.variables = {};

    // Sequential ReAct trajectory
    this.steps = [];

    // Plan phases and tracking
    this.plan = [];
    this.currentPlanStep = 0;

    // Failure tracking for self-healing
    this.failures = [];

    // Human-in-the-loop approvals
    this.approvals = [];

    // Verification and proof of work
    this.verificationProof = null;
    this.summary = '';
  }

  setGoal(goal) {
    this.task = goal;
  }

  setPlan(phases) {
    this.plan = phases.map((phase, idx) => ({
      index: idx,
      title: phase.title || phase,
      expectedOutcome: phase.expectedOutcome || '',
      completed: false,
      skipped: false
    }));
  }

  markPlanStepCompleted(index) {
    if (this.plan[index]) {
      this.plan[index].completed = true;
      this.currentPlanStep = Math.min(index + 1, this.plan.length);
    }
  }

  setVariable(key, value) {
    this.variables[key] = value;
  }

  getVariable(key) {
    return this.variables[key];
  }

  getAllVariables() {
    return { ...this.variables };
  }

  recordStep(stepData) {
    const step = {
      stepIndex: this.steps.length + 1,
      timestamp: new Date().toISOString(),
      thought: stepData.thought || '',
      action: stepData.action || null,
      args: stepData.args || {},
      observation: stepData.observation || null,
      status: stepData.status || 'SUCCESS', // SUCCESS, FAILED, RETRYING, APPROVAL_REQUIRED
      error: stepData.error || null
    };
    this.steps.push(step);
    return step;
  }

  logFailure(action, error, correctivePlan) {
    this.failures.push({
      timestamp: new Date().toISOString(),
      action,
      error: typeof error === 'object' ? error.message : String(error),
      correctivePlan,
      attemptNumber: this.failures.filter(f => f.action === action).length + 1
    });
  }

  recordApproval(token, reason, approvedBy = 'user') {
    const approval = {
      token,
      reason,
      approvedBy,
      timestamp: new Date().toISOString()
    };
    this.approvals.push(approval);
    this.setVariable('approvalToken', token);
    return approval;
  }

  setVerificationProof(proof) {
    this.verificationProof = proof;
  }

  getRecentSteps(count = 5) {
    return this.steps.slice(-count);
  }

  /**
   * Generates a tamper-evident, cryptographic Proof-of-Work receipt
   */
  generateProofOfWork() {
    const payload = {
      task: this.task,
      startedAt: this.startedAt,
      completedAt: this.completedAt || new Date().toISOString(),
      status: this.status,
      variables: this.variables,
      stepsExecuted: this.steps.length,
      approvals: this.approvals,
      verificationProof: this.verificationProof
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    return {
      receiptId: `REC-POW-${hash.substring(0, 12).toUpperCase()}`,
      signature: hash,
      verifiedAt: payload.completedAt,
      details: payload
    };
  }

  toContextSnapshot() {
    return {
      task: this.task,
      status: this.status,
      currentPlanStep: this.currentPlanStep,
      plan: this.plan,
      variables: this.variables,
      stepCount: this.steps.length,
      failuresCount: this.failures.length,
      recentSteps: this.steps.slice(-4)
    };
  }
}

module.exports = MemoryStore;
