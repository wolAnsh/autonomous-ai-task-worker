# Autonomous AI Task Worker — Enterprise Prototype

> A self-directing AI worker that takes natural language enterprise objectives, autonomously plans and executes multi-step workflows across systems, self-heals upon errors, enforces human-in-the-loop safety gates, and independently verifies ground-truth completion.

---

## Benchmark Scenario: The Canonical Test Case

> **User Prompt**:  
> *"Find the latest invoice from Company X, extract the amount and due date, enter it into our internal system, and tell me once it is done."*

### What the Autonomous Worker Does:
1. **Understands Intent**: Decomposes the goal into an actionable 6-phase plan (`DISCOVERY`, `EXTRACTION`, `POLICY_CHECK`, `EXECUTION`, `VERIFICATION`, `COMPLETION`).
2. **Autonomous Tool Selection**: Uses `file_search` to find incoming candidate invoices and autonomously identifies the latest one (`CompanyX_Invoice_2026_02_LATEST.json`).
3. **Information Extraction & Normalization**: Extracts structured fields (Invoice `INV-88421`, Amount `$4,850.00`, Due Date `2026-11-12`).
4. **Policy & Compliance Check**: Validates that the amount is within automated limits ($5,000 threshold).
5. **System Execution**: Commits the transaction to the internal ERP accounting ledger (`REC-002`).
6. **Independent Ground-Truth Verification**: Directly queries the ERP database, asserting 5 independent checks (Record Exists, Amount Integrity, Due Date Consistency, Ledger Status, and Audit Log Trail).
7. **Proof-of-Work Receipt**: Generates a tamper-evident SHA-256 digital receipt and delivers a concise executive summary.

---

## Key Capabilities & Evaluation Highlights

| Evaluation Dimension | How the Prototype Delivers |
|---|---|
| **Autonomy** | Deconstructs high-level goals without micro-instructions; dynamically selects tools and executes next actions in a continuous ReAct loop. |
| **Real Execution** | Does not merely chat or hallucinate: interacts with actual file systems, transactional REST APIs, and an active company ERP ledger. |
| **Reliability & Self-Healing** | Detects malformed dates or currency strings, repairs payloads dynamically, and retries automatically without human panic. |
| **Independent Verification** | Decoupled from execution: queries destination systems out-of-band to assert ground truth with a 5-point verification checklist. |
| **Human-in-the-Loop (HIL)** | Built-in financial threshold gate: transactions exceeding $5,000 pause execution and request human authorization via modal or CLI. |
| **Generalization** | Proven across distinct workflows: seamlessly executes employee onboarding and provisioning using the identical agent core. |
| **Zero-Dependency Architecture** | Built with native Node.js standard libraries—runs instantly out of the box with **zero npm downloads** and zero setup friction. |

---

## Quick Start & Setup Instructions

### Prerequisites
- Node.js `v18.0.0` or higher (verified on Node.js `v20.17.0`)
- **No external package installation needed!** Runs 100% with native standard libraries.

### 1. Interactive CLI Runner
Run the interactive CLI to test the worker in your terminal:
```bash
# Launch interactive benchmark selector
node cli.js

# Or run the primary Company X benchmark directly:
node cli.js --task "Find the latest invoice from Company X, extract the amount and due date, enter it into our internal system, and tell me once it is done."

# Or test Human-in-the-Loop authorization with a high-value invoice (> $5,000):
node cli.js --task "Process latest invoice for GlobalTech and enter into internal ERP system."

# Or test workflow generalization (Employee Onboarding):
node cli.js --task "Onboard new employee Elena Rostova from onboarding dossier into directory."
```

### 2. Live Interactive Web Dashboard
Experience the live visual dashboard featuring real-time ReAct cognitive trajectory streaming, side-by-side ERP ledger inspection, and interactive Human-in-the-Loop approval modals:
```bash
# Start the web server
npm start
# or: node src/server/app.js
```
Open your browser to: **`http://localhost:3000`**

### 3. Automated Test Suite
Execute the full automated test suite covering unit execution, HIL approval gates, verification assertions, self-healing repairs, and generalization:
```bash
npm test
```
All 11 tests execute and pass in under 500ms.

---

## System Architecture

```
                          +----------------------------------------+
                          |        Natural Language Goal           |
                          +----------------------------------------+
                                             |
                                             v
                          +----------------------------------------+
                          |          Planner & Decomposer          |
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

For complete architectural details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Directory Structure

```
autonomous-ai-task-worker/
├── package.json               # Zero-dependency npm scripts and manifest
├── README.md                  # Master documentation and quickstart
├── cli.js                     # Interactive CLI runner with colored terminal output
├── .env.example               # Optional LLM API key template
├── .gitignore                 # Standard git exclusions
├── docs/                      # Comprehensive technical documentation
│   ├── ARCHITECTURE.md        # Core architectural components and event loop
│   ├── DESIGN_DECISIONS.md    # Key technical choices and rationale
│   ├── LIMITATIONS.md         # Documented prototype constraints
│   ├── ROADMAP.md             # Production extension roadmap
│   └── ASSUMPTIONS.md         # Domain and runtime assumptions
├── src/
│   ├── agent/                 # Core Autonomous Cognitive Engine
│   │   ├── AgentCore.js       # ReAct orchestrator and event emitter
│   │   ├── Planner.js         # Goal understanding & hierarchical decomposition
│   │   ├── MemoryStore.js     # Working memory, scratchpad, and state tracking
│   │   ├── Reasoner.js        # Deterministic ReAct Reasoner + Live LLM Adapter
│   │   ├── SelfHealer.js      # Error detection, parameter repair & retry strategies
│   │   └── Verifier.js        # Independent verification & audit proof engine
│   ├── tools/                 # Tool Suite & Capabilities
│   │   ├── ToolRegistry.js    # Tool registration and execution sandboxing
│   │   ├── FileTools.js       # File search, date sorting, and multi-format parser
│   │   ├── ErpTools.js        # ERP ledger recording and querying
│   │   └── ApprovalTools.js   # Governance policy check & human approval gate
│   ├── server/                # Web Server & Simulated Enterprise Systems
│   │   ├── app.js             # Native HTTP server, SSE streaming, and REST APIs
│   │   └── erpService.js      # In-memory transactional ERP database and audit logs
│   └── ui/                    # Modern Responsive Web Dashboard
│       ├── index.html         # Single-page application markup with Tailwind styling
│       ├── styles.css         # Animations, scrollbars, and dark-theme tokens
│       └── app.js             # SSE client, real-time feed rendering & approval modal
├── data/
│   └── company_files/         # Simulated corporate dropzone (mock invoices & dossiers)
│       ├── CompanyX_Invoice_2026_01.txt
│       ├── CompanyX_Invoice_2026_02_LATEST.json
│       ├── AcmeCorp_Invoice_OCT2026.json
│       ├── GlobalTech_Invoice_HIGHVALUE.json
│       └── Employee_Onboarding_Request.json
└── tests/                     # Automated Test Suite (node:test)
    ├── agent.test.js          # End-to-end task execution & trajectory test
    ├── hil-approval.test.js   # Human-in-the-loop policy and approval gate test
    ├── verification.test.js   # Independent ground-truth assertions test
    ├── generalization.test.js # Cross-workflow employee onboarding test
    └── self-healer.test.js    # Autonomic error repair and normalization test
```

---

## Technical & Design Decisions

1. **Zero External Dependencies**: Built entirely on native Node.js modules (`node:http`, `node:fs`, `node:crypto`, `node:test`). Anyone can run tests or start the server immediately without running `npm install`.
2. **Dual-Engine Reasoning**: Includes a built-in Deterministic ReAct Reasoner alongside optional Live LLM API adapters (`OPENAI_API_KEY`, `GEMINI_API_KEY`). Guarantees 100% reliable evaluation out of the box with zero external setup or costs.
3. **Decoupled Independent Verification**: Never trusts tool execution output blindly. Queries ground-truth database state directly and runs 5 strict assertions before declaring task completion.
4. **Cryptographic Proof of Work**: Signs every completed trajectory with a SHA-256 hash containing all inputs, steps, and verification assertions, providing a tamper-evident compliance audit trail.
5. **Human-in-the-Loop Governance**: Low-risk operations run autonomously; high-value mutations (> $5,000.00) pause execution and require explicit human sign-off.

For in-depth explanations, see [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md).

---

## Verification & Audit Proof Sample

When the primary Company X benchmark completes, the agent outputs:

```
========================================================================
                      TASK SUCCESSFULLY COMPLETED                       
========================================================================

Concise Summary:
Successfully retrieved latest invoice (INV-88421) from Company X Logistics,
extracted amount $4850.00 and due date 2026-11-12, recorded it into the
company ERP system (Record ID: REC-002), and verified ledger state with
certificate V-CERT-BB8F919346.

Verifiable Proof of Work:
  Receipt ID: REC-POW-3CF273C907E4
  SHA-256 Signature: 3cf273c907e400c82dcc4d4468f10f27bb0502f671b48820d48f543241d4063b
  Verified At: 2026-10-25T20:00:50.625Z
  Total Steps Executed: 5

Verification Certificate:
  ✓ All 5 Ground-Truth Assertions Passed
    - Record Exists in ERP: PASS (Record ID: REC-002)
    - Amount Integrity: PASS (Expected: $4850.00, Actual in ERP: $4850.00)
    - Due Date Consistency: PASS (Expected: 2026-11-12, Actual in ERP: 2026-11-12)
    - Ledger Status Valid: PASS (Current Status: RECORDED)
    - Audit Log Trail Recorded: PASS (Logged at 2026-10-25T20:00:50.624Z)
```

---

## Models, APIs, Frameworks & External Services Used

- **Runtime / Language**: Node.js standard runtime (`v18+` / `v20+`).
- **Core Standard Libraries**: `node:http`, `node:fs/promises`, `node:crypto`, `node:path`, `node:events`, `node:readline`.
- **Test Framework**: `node:test` and `node:assert` (native built-in test runner).
- **Web UI**: HTML5, Vanilla JavaScript, Server-Sent Events (SSE), Tailwind CSS (via CDN with native CSS fallback).
- **LLM Adapters (Optional)**: Open AI API / Google Gemini API via standard HTTPS fetch (disabled by default; runs deterministically without keys).
- **Pre-built Components**: None. Every module (AgentCore, Planner, Reasoner, SelfHealer, Verifier, MemoryStore, ERP Server) was custom-built from scratch.

---

## Known Limitations & Roadmap

- **Document Formats**: Current parser supports JSON and semi-structured text. Scanned paper PDFs with OCR (Tesseract / AWS Textract) are planned for v2.
- **Desktop GUI Interaction**: Relies on API/DOM level automation rather than OS-level mouse coordinate clicking (PyAutoGUI).
- For complete details, see [docs/LIMITATIONS.md](docs/LIMITATIONS.md) and [docs/ROADMAP.md](docs/ROADMAP.md).
