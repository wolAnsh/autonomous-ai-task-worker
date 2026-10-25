# What We Would Build Next (Roadmap)

If given additional time and resources, we would extend the Autonomous AI Task Worker prototype with the following production-grade capabilities:

### 1. Vision-Based GUI & Desktop Automation
- Integrate **Playwright** and **OS-level accessibility trees (UI Automation / AppleScript)** to enable the agent to navigate arbitrary legacy desktop applications (e.g. SAP GUI, AS400 terminal emulators, Excel) through computer vision and screen coordinate clicking.
- Add multimodal visual grounding models (e.g., Gemini Flash / Claude Sonnet vision) to visually recognize input fields and buttons without brittle DOM selectors.

### 2. Multi-Modal Document Extraction with OCR
- Incorporate specialized document vision models (LayoutLMv3, AWS Textract, or Google Cloud Document AI) to parse scanned paper invoices, handwritten receipts, bills of lading, and multi-page tax forms with 99.9% accuracy.

### 3. Persistent Vector Memory & Enterprise Knowledge Graph
- Replace the in-memory scratchpad with a persistent vector store (e.g., ChromaDB, pgvector) to enable long-term episodic memory:
  - Remembering past vendor exceptions (e.g., *"Vendor X always puts the PO number in line 4 of the comments section"*).
  - Learning from previous human corrections.

### 4. Distributed Multi-Agent Orchestration
- Implement a hierarchical agent topology:
  - **Supervisor Agent**: Decomposes high-level company initiatives and delegates sub-goals.
  - **Specialist Worker Agents**: Dedicated agents for Document Extraction, Accounting Ledger Entry, Compliance & Risk Auditing, and Verification.

### 5. Enterprise Authentication & Role-Based Access Control (RBAC)
- Integrate OAuth2 / SAML / OIDC authentication with fine-grained credential vaulting (HashiCorp Vault / AWS Secrets Manager) so the agent never handles plain-text credentials.
- Add biometric approval prompts for executive financial authorization.
