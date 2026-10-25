#!/usr/bin/env node
/**
 * Autonomous AI Task Worker - Interactive CLI Runner
 * Executes autonomous agent tasks directly in the terminal with rich formatting and live progress.
 */

const readline = require('readline');
const AgentCore = require('./src/agent/AgentCore');
const erpService = require('./src/server/erpService');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  bgBlue: '\x1b[44m\x1b[37m'
};

function banner() {
  console.log(`
${colors.bright}${colors.cyan}========================================================================${colors.reset}
${colors.bright}${colors.blue}           AUTONOMOUS AI TASK WORKER - ENTERPRISE PROTOTYPE            ${colors.reset}
${colors.dim}  Self-directing agent for reading, deciding, executing & verifying work  ${colors.reset}
${colors.bright}${colors.cyan}========================================================================${colors.reset}
`);
}

async function runCli() {
  banner();

  const args = process.argv.slice(2);
  let task = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task' && args[i + 1]) {
      task = args[i + 1];
      i++;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = (query) => new Promise(resolve => rl.question(query, resolve));

  if (!task) {
    console.log(`${colors.bright}Select a benchmark task to execute autonomously:${colors.reset}`);
    console.log(`  ${colors.green}[1]${colors.reset} Company X: "Find the latest invoice from Company X, extract the amount and due date, enter it into our internal system, and tell me once it is done."`);
    console.log(`  ${colors.yellow}[2]${colors.reset} High-Value Policy / HIL: "Process latest invoice for GlobalTech and enter into ERP." (Amount exceeds $5,000 threshold)`);
    console.log(`  ${colors.magenta}[3]${colors.reset} Generalization: "Onboard new employee Elena Rostova from onboarding dossier into directory."`);
    console.log(`  ${colors.cyan}[4]${colors.reset} Custom prompt: Enter your own natural language instructions.`);
    console.log('');

    const choice = await promptUser(`${colors.bright}Choose option [1-4] (default: 1): ${colors.reset}`);

    if (choice.trim() === '2') {
      task = 'Process latest invoice for GlobalTech and enter into internal ERP system.';
    } else if (choice.trim() === '3') {
      task = 'Onboard new employee Elena Rostova from onboarding dossier into directory.';
    } else if (choice.trim() === '4') {
      task = await promptUser(`${colors.bright}Enter custom task instructions: ${colors.reset}`);
    } else {
      task = 'Find the latest invoice from Company X, extract the amount and due date, enter it into our internal system, and tell me once it is done.';
    }
  }

  console.log(`\n${colors.bright}${colors.green}>>> Goal Received:${colors.reset} "${task}"\n`);

  // Approval handler for CLI
  const approvalHandler = async (request) => {
    console.log(`\n${colors.bright}${colors.yellow}------------------------------------------------------------------------`);
    console.log(`[HUMAN-IN-THE-LOOP SAFETY CHECKPOINT]`);
    console.log(`Reason: ${request.reason}`);
    console.log(`Details: ${JSON.stringify(request.details, null, 2)}`);
    console.log(`------------------------------------------------------------------------${colors.reset}`);

    const answer = await promptUser(`Authorize this transaction? [Y/n]: `);
    const approved = answer.trim().toLowerCase() !== 'n';

    if (approved) {
      console.log(`${colors.green}Manager authorization GRANTED. Resuming autonomous agent execution...${colors.reset}\n`);
      return {
        approved: true,
        approvalToken: `APPR-CLI-${Date.now().toString(36).toUpperCase()}`,
        notes: 'Approved via CLI human checkpoint'
      };
    } else {
      console.log(`${colors.red}Manager authorization DENIED.${colors.reset}\n`);
      return {
        approved: false,
        reason: 'Rejected by CLI operator'
      };
    }
  };

  const agent = new AgentCore({
    approvalHandler
  });

  // Event stream listeners
  agent.on('plan_created', (data) => {
    console.log(`${colors.cyan}[PLAN DECOMPOSED] Identified Intent: ${colors.bright}${data.plan.intent}${colors.reset}`);
    data.plan.phases.forEach((p, idx) => {
      console.log(`   ${colors.dim}${idx + 1}.${colors.reset} [${p.phase}] ${p.title}`);
    });
    console.log('');
  });

  agent.on('thought', (data) => {
    console.log(`${colors.blue}[THOUGHT #${data.iteration}]${colors.reset} ${data.thought}`);
  });

  agent.on('action_start', (data) => {
    console.log(`  ${colors.magenta}-> Action:${colors.reset} ${data.action}(${JSON.stringify(data.args)})`);
  });

  agent.on('action_completed', (data) => {
    if (data.success) {
      console.log(`  ${colors.green}✓ Observation:${colors.reset} ${typeof data.result === 'object' ? JSON.stringify(data.result).substring(0, 120) + '...' : data.result}\n`);
    }
  });

  agent.on('action_failed', (data) => {
    console.log(`  ${colors.red}✗ Action Failed:${colors.reset} ${data.error}`);
  });

  agent.on('self_healing', (data) => {
    console.log(`  ${colors.yellow}↻ Self-Healing Strategy:${colors.reset} ${data.diagnosis.reason}\n`);
  });

  try {
    const result = await agent.run(task);

    if (result.success) {
      console.log(`\n${colors.bright}${colors.green}========================================================================${colors.reset}`);
      console.log(`${colors.bright}${colors.green}                      TASK SUCCESSFULLY COMPLETED                       ${colors.reset}`);
      console.log(`${colors.bright}${colors.green}========================================================================${colors.reset}`);
      console.log(`\n${colors.bright}Concise Summary:${colors.reset}\n${result.summary}\n`);

      console.log(`${colors.bright}Verifiable Proof of Work:${colors.reset}`);
      console.log(`  ${colors.dim}Receipt ID:${colors.reset} ${result.proof.receiptId}`);
      console.log(`  ${colors.dim}SHA-256 Signature:${colors.reset} ${result.proof.signature}`);
      console.log(`  ${colors.dim}Verified At:${colors.reset} ${result.proof.verifiedAt}`);
      console.log(`  ${colors.dim}Total Steps Executed:${colors.reset} ${result.steps.length}`);

      if (result.variables.verificationResult) {
        console.log(`\n${colors.bright}Verification Certificate:${colors.reset}`);
        if (result.variables.verificationResult.checks) {
          console.log(`  ${colors.green}✓ All ${result.variables.verificationResult.checks.length} Ground-Truth Assertions Passed${colors.reset}`);
          result.variables.verificationResult.checks.forEach(c => {
            console.log(`    - ${c.check}: ${colors.green}PASS${colors.reset} (${c.details})`);
          });
        } else {
          console.log(`  ${colors.green}✓ ${result.variables.verificationResult.summary}${colors.reset}`);
        }
      }

      console.log(`\n${colors.bright}Current ERP Ledger State:${colors.reset}`);
      console.table(erpService.getInvoices().map(inv => ({
        ID: inv.id,
        Invoice: inv.invoiceNumber,
        Vendor: inv.vendor,
        Amount: `$${inv.amount.toFixed(2)}`,
        DueDate: inv.dueDate,
        Status: inv.status
      })));
    } else {
      console.log(`\n${colors.bright}${colors.red}TASK EXECUTION FAILED:${colors.reset} ${result.error}`);
    }
  } catch (err) {
    console.error(`Unexpected runner error:`, err);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { runCli };
