#!/usr/bin/env node
/**
 * Bitkub MCP Server
 *
 * Community edition — connects directly to Bitkub API.
 *
 * Usage (stdio - for Claude Desktop / Cursor / VS Code):
 *   BITKUB_API_KEY=xxx BITKUB_SECRET_KEY=xxx npx @node2flow/bitkub-mcp
 *
 * Usage (HTTP - Streamable HTTP transport):
 *   BITKUB_API_KEY=xxx BITKUB_SECRET_KEY=xxx npx @node2flow/bitkub-mcp --http
 *
 * Note: Market data tools work without API keys (public endpoints).
 */

import { randomUUID } from 'node:crypto';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  StreamableHTTPServerTransport,
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { createServer } from './server.js';
import { TOOLS } from './tools.js';

/**
 * Read config from environment variables
 */
function getConfig() {
  const apiKey = process.env.BITKUB_API_KEY;
  const secretKey = process.env.BITKUB_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return null;
  }

  return { apiKey, secretKey };
}

/**
 * Start in stdio mode (for Claude Desktop, Cursor, VS Code)
 */
async function startStdio() {
  const config = getConfig();
  const server = createServer(config ?? undefined);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Bitkub MCP Server running on stdio');
  console.error(`API key: ${config ? '***configured***' : '(not configured — market data only)'}`);
  console.error(`Tools available: ${TOOLS.length}`);
  console.error('Ready for MCP client\n');
}

/**
 * Start in HTTP mode (Streamable HTTP transport)
 */
async function startHttp() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const app = createMcpExpressApp({ host: '0.0.0.0' });

  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.post('/mcp', async (req: any, res: any) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const qApiKey = url.searchParams.get('BITKUB_API_KEY');
    const qSecretKey = url.searchParams.get('BITKUB_SECRET_KEY');
    if (qApiKey) process.env.BITKUB_API_KEY = qApiKey;
    if (qSecretKey) process.env.BITKUB_SECRET_KEY = qSecretKey;

    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            transports[sid] = transport;
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
          }
        };

        const config = getConfig();
        const server = createServer(config ?? undefined);
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  app.delete('/mcp', async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  app.get('/', (_req: any, res: any) => {
    res.json({
      name: 'bitkub-mcp',
      version: '1.0.0',
      status: 'ok',
      tools: TOOLS.length,
      transport: 'streamable-http',
      endpoints: { mcp: '/mcp' },
    });
  });

  const config = getConfig();
  app.listen(port, () => {
    console.log(`Bitkub MCP Server (HTTP) listening on port ${port}`);
    console.log(`API key: ${config ? '***configured***' : '(not configured — market data only)'}`);
    console.log(`Tools available: ${TOOLS.length}`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    for (const sessionId in transports) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch {
        // Ignore cleanup errors
      }
    }
    process.exit(0);
  });
}

async function main() {
  const useHttp = process.argv.includes('--http');
  if (useHttp) {
    await startHttp();
  } else {
    await startStdio();
  }
}

/**
 * Smithery default export
 */
export default function createSmitheryServer(opts?: {
  config?: { BITKUB_API_KEY?: string; BITKUB_SECRET_KEY?: string };
}) {
  if (opts?.config?.BITKUB_API_KEY) process.env.BITKUB_API_KEY = opts.config.BITKUB_API_KEY;
  if (opts?.config?.BITKUB_SECRET_KEY) process.env.BITKUB_SECRET_KEY = opts.config.BITKUB_SECRET_KEY;
  const config = getConfig();
  return createServer(config ?? undefined);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
