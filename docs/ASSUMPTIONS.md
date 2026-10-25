# Assumptions Made During Solution Design

During the design and implementation of the Autonomous AI Task Worker prototype, the following key assumptions were made:

1. **Simulated Enterprise Ecosystem**:
   - The environment provides a file repository representing incoming company documents (`data/company_files/`) and an internal ERP backend service (`src/server/erpService.js`).
   - Corporate files follow conventional vendor identification keywords (e.g. `CompanyX`, `Acme`, `GlobalTech`) and document types (`Invoice`, `Onboarding`).

2. **Policy Thresholds & Human Governance**:
   - Automated transactions up to **$5,000.00** are authorized for autonomous recording without human intervention.
   - Any transaction exceeding **$5,000.00** represents material financial liability and strictly mandates human supervisor authorization before ledger commitment.

3. **Ground Truth & Verification**:
   - The internal ERP database is considered the primary system of record for accounting entries.
   - Verification is defined as independent assertion against the persisted ledger state, rather than trusting client HTTP response status codes alone.

4. **Runtime Environment**:
   - Evaluator machines have Node.js 18+ installed.
   - Built to run completely offline with **zero npm dependencies required**, while providing full support for external LLM API keys (`OPENAI_API_KEY` / `GEMINI_API_KEY`) when available.
