# Autonomous AI Task Worker — Architecture Specification

## 1. System Overview

The **Autonomous AI Task Worker** is a self-directing cognitive agent engineered to interpret high-level natural language objectives, autonomously plan and execute multi-step workflows across enterprise tools and APIs, self-heal upon encountering unexpected errors, and independently verify that business outcomes were truthfully achieved.

```
                           +----------------------------------------+
                           |        Natural Language Goal           |
                           +----------------------------------------+
                                              |
                                              v
                           +----------------------------------------+
                           |           Planner & Decomposer         |
                           |  (Intent, Phased Plan, Success Criteria)|
                           +----------------------------------------+
                                              |
                                              v
                +-------------------------------------------------------------+
                |                    ReAct Cognitive Engine                   |
                |                                                             |
                |   +-------------------+              +------------------+   |
                |   |   Thought Phase   |<-------------|  Working Memory  |   |
                |   +-------------------+              |  & Scratchpad    |   |
                |             |                        +------------------+   |
                |             v                                 ^             |
                |   +-------------------+                       |             |
                |   |   Action Phase    |                       | (Updates)   |
                |   +-------------------+                       |             |
                |             |                                 |             |
                |             v                                 |             |
                |   +-------------------+              +------------------+   |
                |   | Tool Execution /  |------------->|  Observation &   |   |
                |   |  External World   |              |  Self-Healing    |   |
                |   +-------------------+              +------------------+   |
                +-------------------------------------------------------------+
                                              |
                                              v
                           +----------------------------------------+
                           |     Independent Verification Engine    |
                           |  (Direct Database & Audit Assertions)  |
                           +----------------------------------------+
                                              |
                                              v
                           +----------------------------------------+
                           |  Cryptographic Proof-of-Work Receipt   |
                           |          & Concise Summary             |
                           +----------------------------------------+
```

---

## 2. Core Architectural Components

### 2.1 Planner & Goal Decomposer (`src/agent/Planner.js`)
- **Intent Classifier**: Parses free-form user instructions to determine task archetype (`INVOICE_PROCESSING`, `EMPLOYEE_ONBOARDING`, `FINANCIAL_RECONCILIATION`, `GENERIC_AUTOMATION`).
- **Entity Extraction**: Isolates key nouns, vendors, dates, and destination systems.
- **Hierarchical Phase Generation**: Establishes milestones:
  1. `DISCOVERY`: Resource and file location.
  2. `EXTRACTION`: Document normalization and data extraction.
  3. `POLICY_CHECK`: Governance and authorization verification.
  4. `EXECUTION`: Mutation in destination application / ERP.
  5. `VERIFICATION`: Independent validation against source of truth.
  6. `COMPLETION`: Summary formulation and cryptographic signing.

### 2.2 Working Memory & Scratchpad (`src/agent/MemoryStore.js`)
- **State Accumulator**: Tracks discoveries across turns (e.g. `invoiceFile`, `extractedData`, `approvalToken`, `erpSubmissionResult`).
- **Sequential Trajectory**: Records every Thought-Action-Observation step with millisecond timestamps and success indicators.
- **Error & Failure Ledger**: Logs tool failures, diagnostic reasons, and remediation attempts.
- **Cryptographic Receipt Generator**: Signs the completed execution context with SHA-256 to ensure tamper-evident auditability.

### 2.3 Reasoner (`src/agent/Reasoner.js`)
- **Dual-Engine Architecture**:
  - **Deterministic ReAct Reasoner**: State-machine driven reasoning loop that requires **zero API keys** and zero external network access. It allows 100% reproducible testing, offline evaluation, and zero-latency benchmarks.
  - **Live LLM Adapter**: Supports OpenAI, Anthropic, Gemini, or local Ollama endpoints for dynamic prompt reasoning and open-domain generalization.

### 2.4 Self-Healer & Autonomic Recovery (`src/agent/SelfHealer.js`)
- **Failure Classification**: Distinguishes between transient network errors, data validation discrepancies, and policy violations.
- **Autonomic Heuristics**:
  - *Date Normalization*: Converts arbitrary strings (e.g., `"November 12, 2026"`, `"12-11-2026"`) into standardized ISO-8601 (`"2026-11-12"`).
  - *Currency Cleansing*: Strips currency symbols, formatting commas, and whitespace into standard IEEE floating-point numbers.
  - *Fuzzy Search Expansion*: Relaxes search filters when strict filename matching yields no matches.
  - *HIL Triggering*: Translates policy threshold exceptions into Human-in-the-Loop approval requests.

### 2.5 Tool Registry (`src/tools/ToolRegistry.js`)
Provides strongly-typed schemas and execution sandboxing for:
- `file_search`: Autonomous file system navigation and sorting by timestamp / relevance.
- `read_and_parse_file`: Multi-format parsing (JSON, plain text, structured forms).
- `check_approval_policy`: Governance policy checking against financial limits.
- `request_human_approval`: Interactive human authorization prompt.
- `erp_record_invoice`: Transactional ERP accounting ledger insertion.
- `verify_erp_state`: Ground-truth assertion validator.
- `erp_provision_employee`: Corporate identity directory provisioning.
- `verify_employee_record`: Identity directory state verifier.

### 2.6 Independent Verifier (`src/agent/Verifier.js`)
Crucially decoupled from execution:
- Performs an out-of-band audit query to verify:
  1. Record exists in database.
  2. Amount matches extracted value ($0.00 tolerance).
  3. Due date matches extracted value.
  4. Vendor identity matches.
  5. Ledger status is valid (`RECORDED` or `PAID`).
  6. Audit trail contains cryptographic log entry.
- Issues a signed `VerificationCertificate` (`V-CERT-XXXXXXXXXX`).

---

## 3. Human-in-the-Loop (HIL) Safety Architecture

When an action meets any high-risk threshold (e.g., transaction amount > $5,000.00 or deletion actions):
1. The agent intercepts the action before execution.
2. The agent transitions status to `AWAITING_APPROVAL`.
3. An `approval_needed` event is emitted containing the justification and pending payload.
4. The user approves or denies via Web Modal or Interactive CLI.
5. If approved, an immutable token (`APPR-XXXXX`) is attached to working memory, allowing execution to safely proceed.
6. If denied, the agent gracefully aborts without corrupting enterprise state.
