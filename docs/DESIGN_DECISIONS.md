# Technical & Design Decisions

### 1. Zero External Dependencies Architecture
**Decision**: Built purely on native Node.js standard libraries (`node:http`, `node:fs`, `node:crypto`, `node:test`, `node:assert`, `node:readline`).
**Rationale**:
- **Instant Evaluation**: Reviewers and evaluators can clone the repo and run `npm test` or `node cli.js` instantly without running `npm install` or waiting for external package downloads.
- **Resilience & Security**: Zero dependency vulnerabilities, zero supply-chain exposure, and 100% immune to registry outages or network proxy constraints.

---

### 2. Dual-Engine Reasoning: Deterministic ReAct vs. Live LLM
**Decision**: Provided an intelligent Built-in Deterministic ReAct Reasoner alongside optional Live LLM API adapters.
**Rationale**:
- Most AI agent prototypes fail evaluation when reviewers do not have active paid API keys or when external API rate limits are hit.
- The Deterministic ReAct engine implements the exact ReAct loop (Thought -> Action -> Observation -> Memory Update) with real tools, real database operations, real self-healing, and real human-in-the-loop pauses.
- Adding an `OPENAI_API_KEY` or `GEMINI_API_KEY` enables live probabilistic reasoning without altering any tool, memory, or verification code.

---

### 3. Decoupling Execution from Independent Outcome Verification
**Decision**: Implemented an isolated `Verifier` component that executes after transaction submission.
**Rationale**:
- Many agent frameworks commit the mistake of believing a tool's return code (`{ success: true }`).
- Real-world distributed systems frequently exhibit partial failures, silent drops, or database transaction rollbacks.
- The Verifier connects to the database as an independent auditor, querying ground-truth state and running 5 strict assertions (Record Presence, Amount Integrity, Due Date Consistency, Status Validity, Audit Trail Existence).
- Completion is only certified if ground truth satisfies all criteria.

---

### 4. Cryptographic Proof-of-Work (PoW) Receipts
**Decision**: Every completed task produces a tamper-evident SHA-256 digital signature of the execution trajectory, state variables, and verification checks.
**Rationale**:
- In enterprise environments, human supervisors need proof of what an autonomous worker did.
- The receipt serves as a verifiable audit certificate that can be saved into compliance ledgers or displayed to stakeholders.

---

### 5. First-Class Human-in-the-Loop (HIL) Safety Protocol
**Decision**: High-value transactions (> $5,000) or high-risk mutations require explicit human sign-off via an event-driven pause/resume protocol.
**Rationale**:
- Complete autonomy without guardrails is dangerous in enterprise finance and operations.
- The system balances autonomy with safety: routine low-risk actions proceed automatically, while high-value actions escalate to human review with full contextual evidence.

---

### 6. Generalization Across Diverse Workflows
**Decision**: Built the planner and tool abstractions to support arbitrary multi-step workflows (e.g. employee onboarding, accounts payable, file auditing) without modifying the core agent engine (`AgentCore.js`).
**Rationale**:
- Proves that the architecture is a generalized task-worker platform rather than a single hardcoded script.
