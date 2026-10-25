# Known Limitations

While this prototype demonstrates autonomous planning, execution, self-healing, human-in-the-loop governance, and independent verification, the following limitations exist in this prototype:

### 1. Document Format Scope
- **Current State**: Parses structured JSON, semi-structured plain-text invoices, and normalized transaction reports.
- **Limitation**: Does not include native Optical Character Recognition (OCR) or computer-vision based layout models (e.g. LayoutLM / Tesseract) for scanned paper PDFs or handwritten documents.

### 2. Browser & GUI Interaction
- **Current State**: Interacts with the simulated enterprise applications through direct API and document abstraction layers, accompanied by a live visual Web Dashboard.
- **Limitation**: Does not include arbitrary headless Chromium browser automation (e.g., Playwright/Puppeteer) or OS-level mouse/keyboard automation (e.g. PyAutoGUI) for legacy Windows desktop applications.

### 3. In-Memory Database Persistence
- **Current State**: The simulated ERP system and company ledger persist state in-memory during server lifecycle, with reset capabilities for repeatable demonstrations.
- **Limitation**: Not backed by a production relational database (PostgreSQL/Oracle) or distributed ACID ledger.

### 4. Concurrent Task Execution
- **Current State**: Runs tasks sequentially per agent instance with single-stream trajectory tracking.
- **Limitation**: Does not currently orchestrate multiple distributed agents running concurrently against conflicting database locks.

### 5. Multi-Lingual / International Currencies
- **Current State**: Optimized for standard USD financial conventions ($ and Net 30/60 terms) and English corporate terminology.
- **Limitation**: Currency conversions across foreign exchange (FX) rates require manual configuration.
