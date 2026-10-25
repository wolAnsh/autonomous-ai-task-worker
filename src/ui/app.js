/**
 * Frontend Application Controller for Autonomous AI Task Worker
 */

let eventSource = null;
let currentStepCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  setupEventSource();
  fetchErpState();
  fetchFiles();
  setupEventListeners();
});

function setupEventListeners() {
  const runBtn = document.getElementById('runTaskBtn');
  const taskInput = document.getElementById('taskInput');
  const resetBtn = document.getElementById('resetErpBtn');

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      taskInput.value = btn.getAttribute('data-task');
    });
  });

  // Run Task Button
  runBtn.addEventListener('click', async () => {
    const task = taskInput.value.trim();
    if (!task) return;

    resetFeed();
    setAgentStatus('Executing Autonomously...', 'bg-blue-400', true);
    runBtn.disabled = true;

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Failed to launch task: ' + err.error);
        runBtn.disabled = false;
        setAgentStatus('Agent Ready', 'bg-emerald-400', false);
      }
    } catch (err) {
      alert('Network error connecting to agent server: ' + err.message);
      runBtn.disabled = false;
      setAgentStatus('Agent Ready', 'bg-emerald-400', false);
    }
  });

  // Reset ERP
  resetBtn.addEventListener('click', async () => {
    await fetch('/api/erp/reset', { method: 'POST' });
    fetchErpState();
    resetFeed();
    setAgentStatus('Agent Ready', 'bg-emerald-400', false);
  });

  // Approval Modal Actions
  document.getElementById('grantApprovalBtn').addEventListener('click', () => {
    sendApprovalDecision(true, 'Authorized by user in web interface');
  });

  document.getElementById('denyApprovalBtn').addEventListener('click', () => {
    sendApprovalDecision(false, 'Denied by user in web interface');
  });

  // Tab Navigation
  setupTabs();
}

function setupTabs() {
  const tabs = [
    { btn: 'tabErpBtn', content: 'tabErpContent' },
    { btn: 'tabFilesBtn', content: 'tabFilesContent' },
    { btn: 'tabVerifyBtn', content: 'tabVerifyContent' },
    { btn: 'tabAuditBtn', content: 'tabAuditContent' }
  ];

  tabs.forEach(t => {
    const button = document.getElementById(t.btn);
    button.addEventListener('click', () => {
      tabs.forEach(other => {
        const otherBtn = document.getElementById(other.btn);
        const otherContent = document.getElementById(other.content);
        if (other.btn === t.btn) {
          otherBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white transition';
          otherContent.classList.remove('hidden');
        } else {
          otherBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition';
          otherContent.classList.add('hidden');
        }
      });
    });
  });
}

function setupEventSource() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/agent/stream');

  eventSource.addEventListener('plan_created', (e) => {
    const data = JSON.parse(e.data);
    renderPlan(data.plan);
  });

  eventSource.addEventListener('thought', (e) => {
    const data = JSON.parse(e.data);
    renderThought(data);
  });

  eventSource.addEventListener('action_start', (e) => {
    const data = JSON.parse(e.data);
    renderActionStart(data);
  });

  eventSource.addEventListener('action_completed', (e) => {
    const data = JSON.parse(e.data);
    renderActionCompleted(data);
    fetchErpState();
  });

  eventSource.addEventListener('self_healing', (e) => {
    const data = JSON.parse(e.data);
    renderSelfHealing(data);
  });

  eventSource.addEventListener('approval_needed', (e) => {
    const data = JSON.parse(e.data);
    showApprovalModal(data);
    setAgentStatus('Awaiting Manager Approval', 'bg-amber-400', true);
  });

  eventSource.addEventListener('approval_resolved', () => {
    hideApprovalModal();
    setAgentStatus('Resuming Execution...', 'bg-blue-400', true);
  });

  eventSource.addEventListener('task_completed', (e) => {
    const data = JSON.parse(e.data);
    handleTaskCompleted(data);
    fetchErpState();
  });

  eventSource.addEventListener('task_failed', (e) => {
    const data = JSON.parse(e.data);
    handleTaskFailed(data);
  });
}

function resetFeed() {
  currentStepCount = 0;
  document.getElementById('stepCounter').textContent = '0 Steps';
  document.getElementById('executionFeed').innerHTML = '';
  document.getElementById('planContainer').classList.add('hidden');
  document.getElementById('completionBanner').classList.add('hidden');
}

function setAgentStatus(text, dotColor = 'bg-emerald-400', pulse = false) {
  const badge = document.getElementById('agentStatusBadge');
  const dot = badge.querySelector('span:first-child');
  const statusText = document.getElementById('agentStatusText');

  dot.className = `w-2.5 h-2.5 rounded-full ${dotColor} ${pulse ? 'pulsing-badge' : ''}`;
  statusText.textContent = text;
}

function renderPlan(plan) {
  const container = document.getElementById('planContainer');
  const stepsList = document.getElementById('planStepsList');
  const intentBadge = document.getElementById('planIntentBadge');

  intentBadge.textContent = plan.intent;
  stepsList.innerHTML = '';

  plan.phases.forEach((phase, idx) => {
    const div = document.createElement('div');
    div.className = 'bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs space-y-1';
    div.innerHTML = `
      <div class="flex items-center gap-1.5 text-slate-400 font-medium">
        <span class="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300">${idx + 1}</span>
        <span class="text-cyan-400">${phase.phase}</span>
      </div>
      <p class="text-slate-300 font-medium text-[11px] leading-tight">${phase.title}</p>
    `;
    stepsList.appendChild(div);
  });

  container.classList.remove('hidden');
}

function renderThought(data) {
  currentStepCount++;
  document.getElementById('stepCounter').textContent = `${currentStepCount} Steps`;

  const feed = document.getElementById('executionFeed');
  const card = document.createElement('div');
  card.className = 'step-card bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2';
  card.id = `step-iter-${data.iteration}`;

  card.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <span class="font-semibold text-blue-400 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        ReAct Thought #${data.iteration}
      </span>
      <span class="text-[11px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
    </div>
    <p class="text-xs text-slate-300 leading-relaxed">${data.thought}</p>
    <div class="action-slot pt-1"></div>
  `;

  feed.appendChild(card);
  feed.scrollTop = feed.scrollHeight;
}

function renderActionStart(data) {
  const feed = document.getElementById('executionFeed');
  const lastCard = feed.lastElementChild;
  if (!lastCard) return;

  const actionSlot = lastCard.querySelector('.action-slot');
  if (!actionSlot) return;

  const actionDiv = document.createElement('div');
  actionDiv.className = 'flex items-center gap-2 text-xs bg-slate-900 border border-slate-800/80 rounded-lg p-2 font-mono text-purple-300';
  actionDiv.innerHTML = `
    <span class="text-purple-400 font-semibold">-> Tool:</span>
    <span class="text-slate-200">${data.action}</span>
    <span class="text-slate-500 text-[11px] truncate">${JSON.stringify(data.args)}</span>
  `;
  actionSlot.appendChild(actionDiv);
  feed.scrollTop = feed.scrollHeight;
}

function renderActionCompleted(data) {
  const feed = document.getElementById('executionFeed');
  const lastCard = feed.lastElementChild;
  if (!lastCard) return;

  const obsDiv = document.createElement('div');
  obsDiv.className = `mt-2 text-xs rounded-lg p-2.5 font-mono ${data.success ? 'bg-emerald-950/20 border border-emerald-800/40 text-emerald-300' : 'bg-red-950/20 border border-red-800/40 text-red-300'}`;
  
  const displayData = typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : data.result;
  obsDiv.innerHTML = `
    <div class="flex items-center justify-between text-[11px] font-sans font-semibold mb-1">
      <span class="${data.success ? 'text-emerald-400' : 'text-red-400'}">✓ Observation Outcome</span>
    </div>
    <pre class="text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">${displayData}</pre>
  `;
  lastCard.appendChild(obsDiv);
  feed.scrollTop = feed.scrollHeight;
}

function renderSelfHealing(data) {
  const feed = document.getElementById('executionFeed');
  const lastCard = feed.lastElementChild;
  if (!lastCard) return;

  const healDiv = document.createElement('div');
  healDiv.className = 'mt-2 text-xs rounded-lg p-2.5 bg-amber-950/30 border border-amber-800/50 text-amber-300 space-y-1';
  healDiv.innerHTML = `
    <div class="font-bold flex items-center gap-1.5 text-amber-400">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Autonomous Self-Healing Active
    </div>
    <p class="text-[11px] text-amber-200">${data.diagnosis.reason}</p>
  `;
  lastCard.appendChild(healDiv);
  feed.scrollTop = feed.scrollHeight;
}

function showApprovalModal(data) {
  const modal = document.getElementById('approvalModal');
  const reasonText = document.getElementById('approvalReasonText');
  const detailsContainer = document.getElementById('approvalDetailsContainer');

  reasonText.textContent = data.reason;
  detailsContainer.innerHTML = '';

  if (data.details) {
    Object.entries(data.details).forEach(([key, val]) => {
      const line = document.createElement('div');
      line.textContent = `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`;
      detailsContainer.appendChild(line);
    });
  }

  modal.classList.remove('hidden');
}

function hideApprovalModal() {
  document.getElementById('approvalModal').classList.add('hidden');
}

async function sendApprovalDecision(approved, notes) {
  await fetch('/api/agent/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, notes })
  });
  hideApprovalModal();
}

function handleTaskCompleted(data) {
  document.getElementById('runTaskBtn').disabled = false;
  setAgentStatus('Task Verified & Done', 'bg-emerald-400', false);

  const banner = document.getElementById('completionBanner');
  const summaryText = document.getElementById('completionSummaryText');
  summaryText.textContent = data.summary;
  banner.classList.remove('hidden');

  renderProofOfWork(data.proof);
}

function handleTaskFailed(data) {
  document.getElementById('runTaskBtn').disabled = false;
  setAgentStatus('Task Failed', 'bg-red-400', false);
  alert('Agent encountered unrecoverable state: ' + data.reason);
}

function renderProofOfWork(proof) {
  const container = document.getElementById('proofOfWorkContainer');
  if (!proof) return;

  container.innerHTML = `
    <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <span class="text-emerald-400 font-bold font-sans">Tamper-Evident Proof of Work</span>
        <span class="text-slate-400">${proof.receiptId}</span>
      </div>
      <div>
        <span class="text-slate-500">SHA-256 Signature:</span>
        <div class="text-[11px] text-cyan-300 break-all select-all">${proof.signature}</div>
      </div>
      <div class="grid grid-cols-2 gap-2 text-slate-300">
        <div><span class="text-slate-500">Verified At:</span> ${proof.verifiedAt}</div>
        <div><span class="text-slate-500">Steps Executed:</span> ${proof.details.stepsExecuted}</div>
      </div>
      ${proof.details.verificationProof ? `
        <div class="pt-2 border-t border-slate-800 space-y-1">
          <span class="text-slate-400 font-sans font-semibold">Independent Verification Assertions:</span>
          ${(proof.details.verificationProof.checks || []).map(c => `
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-300">${c.check}</span>
              <span class="text-emerald-400 font-bold">PASS (${c.details})</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

async function fetchErpState() {
  try {
    const res = await fetch('/api/erp/state');
    const data = await res.json();

    // Render Invoices Table
    const tbody = document.getElementById('erpInvoicesTableBody');
    tbody.innerHTML = '';
    document.getElementById('erpRecordCount').textContent = `${data.invoices.length} records`;

    data.invoices.forEach(inv => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition';
      tr.innerHTML = `
        <td class="p-2 font-mono text-slate-400">${inv.id}</td>
        <td class="p-2 font-semibold text-slate-200">${inv.invoiceNumber}</td>
        <td class="p-2 text-slate-300">${inv.vendor}</td>
        <td class="p-2 text-right font-mono text-cyan-400">$${parseFloat(inv.amount).toFixed(2)}</td>
        <td class="p-2 text-slate-400 font-mono">${inv.dueDate}</td>
        <td class="p-2">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.status === 'PAID' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'}">
            ${inv.status}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Render Employee Table
    const empTbody = document.getElementById('erpEmployeesTableBody');
    empTbody.innerHTML = '';
    (data.employees || []).forEach(emp => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition';
      tr.innerHTML = `
        <td class="p-2 font-mono text-slate-400">${emp.id}</td>
        <td class="p-2 font-semibold text-slate-200">${emp.fullName}</td>
        <td class="p-2 text-slate-300">${emp.department || 'N/A'}</td>
        <td class="p-2">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/50">
            ${emp.status}
          </span>
        </td>
      `;
      empTbody.appendChild(tr);
    });

    // Render Audit Logs
    const auditContainer = document.getElementById('auditLogsContainer');
    auditContainer.innerHTML = '';
    data.auditLogs.slice(0, 15).forEach(log => {
      const div = document.createElement('div');
      div.className = 'bg-slate-950/60 p-2 rounded border border-slate-800/80 text-[11px] text-slate-300';
      div.innerHTML = `
        <div class="flex items-center justify-between text-slate-500 text-[10px]">
          <span>${log.timestamp}</span>
          <span class="text-cyan-400">${log.event}</span>
        </div>
        <p class="text-slate-400 mt-1">${typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</p>
      `;
      auditContainer.appendChild(div);
    });
  } catch (err) {
    console.error('Failed to fetch ERP state:', err);
  }
}

async function fetchFiles() {
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    const container = document.getElementById('filesListContainer');
    container.innerHTML = '';

    data.files.forEach(f => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs hover:border-slate-700 transition';
      div.innerHTML = `
        <div class="flex items-center gap-2 text-slate-300">
          <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span class="font-medium">${f.name}</span>
        </div>
        <span class="text-[11px] text-slate-500 font-mono">${(f.size / 1024).toFixed(1)} KB</span>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Failed to fetch file list:', err);
  }
}
