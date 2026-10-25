/**
 * FileTools - Autonomous filesystem search, document parsing and metadata extraction
 */

const fs = require('fs').promises;
const path = require('path');

class FileTools {
  constructor(baseDir) {
    this.baseDir = baseDir || path.resolve(__dirname, '../../data/company_files');
  }

  async searchFiles({ query, vendor, findLatest = false }) {
    try {
      const files = await fs.readdir(this.baseDir);
      let matches = [];

      const normalizedQuery = (query || vendor || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      for (const fileName of files) {
        const filePath = path.join(this.baseDir, fileName);
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;

        const cleanName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');

        let score = 0;
        if (cleanName.includes(normalizedQuery)) score += 5;
        if (fileName.toLowerCase().includes('invoice')) score += 2;
        if (fileName.toLowerCase().includes('latest')) score += 3;

        if (score > 0 || !normalizedQuery) {
          matches.push({
            fileName,
            filePath,
            sizeBytes: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            score
          });
        }
      }

      // Sort by modifiedAt / score / 'latest' keyword
      matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.modifiedAt) - new Date(a.modifiedAt);
      });

      if (findLatest && matches.length > 0) {
        return {
          totalMatches: matches.length,
          bestMatch: matches[0],
          allMatches: matches
        };
      }

      return {
        totalMatches: matches.length,
        matches
      };
    } catch (err) {
      throw new Error(`Failed to search files in "${this.baseDir}": ${err.message}`);
    }
  }

  async readAndParseFile({ filePath, fileName }) {
    const targetPath = filePath || path.join(this.baseDir, fileName);
    let rawContent;
    try {
      rawContent = await fs.readFile(targetPath, 'utf-8');
    } catch (err) {
      throw new Error(`File not found or unreadable: ${targetPath}`);
    }

    // Try parsing as JSON first
    try {
      const parsedJson = JSON.parse(rawContent);
      return {
        format: 'JSON',
        filePath: targetPath,
        data: {
          invoiceNumber: parsedJson.invoice_number || parsedJson.invoiceNumber || parsedJson.id,
          vendor: parsedJson.vendor || parsedJson.vendor_name,
          vendorId: parsedJson.vendor_id,
          amount: parsedJson.total_amount || parsedJson.amount || parsedJson.total,
          dueDate: parsedJson.due_date || parsedJson.dueDate,
          invoiceDate: parsedJson.invoice_date || parsedJson.date,
          currency: parsedJson.currency || 'USD',
          lineItems: parsedJson.line_items || [],
          requiresApproval: parsedJson.requires_executive_approval || false,
          employeeId: parsedJson.employee_id,
          fullName: parsedJson.full_name,
          department: parsedJson.department,
          role: parsedJson.role,
          requestedSystems: parsedJson.requested_systems
        },
        raw: parsedJson
      };
    } catch (jsonErr) {
      // Parse unstructured text via regex heuristics
      const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
      const extracted = {
        invoiceNumber: null,
        vendor: null,
        amount: null,
        dueDate: null,
        currency: 'USD'
      };

      for (const line of lines) {
        const vendorMatch = line.match(/^Vendor:\s*(.*)$/i);
        if (vendorMatch) extracted.vendor = vendorMatch[1].trim();

        const invMatch = line.match(/^Invoice\s*(?:Number|#)?:\s*(.*)$/i);
        if (invMatch) extracted.invoiceNumber = invMatch[1].trim();

        const dateMatch = line.match(/^Due\s*Date:\s*(.*)$/i);
        if (dateMatch) extracted.dueDate = dateMatch[1].trim();

        const amtMatch = line.match(/^Amount:\s*([$€£]?[0-9,]+(?:\.[0-9]{2})?)/i);
        if (amtMatch) {
          extracted.amount = parseFloat(amtMatch[1].replace(/[^0-9.-]/g, ''));
        }
      }

      return {
        format: 'UNSTRUCTURED_TEXT',
        filePath: targetPath,
        data: extracted,
        rawText: rawContent
      };
    }
  }
}

module.exports = FileTools;
