/**
 * Web Application & API Server for Autonomous AI Task Worker
 * Built with native Node.js HTTP module for zero-dependency operation.
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const AgentCore = require('../agent/AgentCore');
const erpService = require('./erpService');

const PORT = process.env.PORT || 3000;
const UI_DIR = path.resolve(__dirname, '../ui');
const FILES_DIR = path.resolve(__dirname, '../../data/company_files');

// Active agent and SSE client tracking
let currentAgent = null;
let sseClients = [];

function broadcastSse(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch (err) {
      // client disconnected
    }
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE Stream Endpoint
  if (pathname === '/api/agent/stream' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(': connected\n\n');
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // Run Task
  if (pathname === '/api/agent/run' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const task = payload.task;
        if (!task) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Task description is required' }));
          return;
        }

        currentAgent = new AgentCore({
          filesDir: FILES_DIR,
          reasonerMode: payload.reasonerMode || 'DETERMINISTIC_REACT'
        });

        // Pipe events to SSE
        currentAgent.on('task_started', d => broadcastSse('task_started', d));
        currentAgent.on('plan_created', d => broadcastSse('plan_created', d));
        currentAgent.on('thought', d => broadcastSse('thought', d));
        currentAgent.on('action_start', d => broadcastSse('action_start', d));
        currentAgent.on('action_completed', d => broadcastSse('action_completed', d));
        currentAgent.on('action_failed', d => broadcastSse('action_failed', d));
        currentAgent.on('self_healing', d => broadcastSse('self_healing', d));
        currentAgent.on('approval_needed', d => broadcastSse('approval_needed', d));
        currentAgent.on('task_completed', d => broadcastSse('task_completed', d));
        currentAgent.on('task_failed', d => broadcastSse('task_failed', d));

        // Start in background and return immediate acknowledgement
        currentAgent.run(task).catch(err => {
          broadcastSse('task_failed', { reason: err.message });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'STARTED', task }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Human Approval Response
  if (pathname === '/api/agent/approve' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { approved, notes } = JSON.parse(body || '{}');
        if (currentAgent) {
          currentAgent.resolveHumanApproval(approved, notes);
          broadcastSse('approval_resolved', { approved, notes });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'RESOLVED', approved }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Get ERP Database State
  if (pathname === '/api/erp/state' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      invoices: erpService.getInvoices(),
      vendors: erpService.getVendors(),
      employees: erpService.employees,
      auditLogs: erpService.auditLogs
    }));
    return;
  }

  // Reset ERP State
  if (pathname === '/api/erp/reset' && method === 'POST') {
    erpService.reset();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'RESET_COMPLETED' }));
    return;
  }

  // Get Available Files
  if (pathname === '/api/files' && method === 'GET') {
    try {
      const files = await fs.readdir(FILES_DIR);
      const fileDetails = [];
      for (const f of files) {
        const stats = await fs.stat(path.join(FILES_DIR, f));
        fileDetails.push({
          name: f,
          size: stats.size,
          modified: stats.mtime
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: fileDetails }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(UI_DIR, pathname === '/' ? 'index.html' : pathname);

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };
    const contentType = mimeTypes[ext] || 'text/plain';
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

function startServer(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Autonomous AI Task Worker UI & API listening at http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };
