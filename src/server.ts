/**
 * Shared MCP Server — used by both Node.js (index.ts) and CF Worker (worker.ts)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BitkubClient } from './bitkub-client.js';
import { TOOLS } from './tools.js';

export interface BitkubMcpConfig {
  apiKey: string;
  secretKey: string;
}

export function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  client: BitkubClient
) {
  // Strip _fields param (Smithery quality — not a Bitkub API param)
  const { _fields, ...params } = args;

  switch (toolName) {
    // ========== General / Market Data (10) ==========
    case 'btk_server_time':
      return client.getServerTime();
    case 'btk_server_status':
      return client.getServerStatus();
    case 'btk_symbols':
      return client.getSymbols();
    case 'btk_ticker':
      return client.getTicker(
        Object.keys(params).length ? (params as { sym?: string }) : undefined
      );
    case 'btk_recent_trades':
      return client.getRecentTrades(params as { sym: string; lmt?: number });
    case 'btk_bids':
      return client.getBids(params as { sym: string; lmt?: number });
    case 'btk_asks':
      return client.getAsks(params as { sym: string; lmt?: number });
    case 'btk_books':
      return client.getBooks(params as { sym: string; lmt?: number });
    case 'btk_depth':
      return client.getDepth(params as { sym: string; lmt?: number });
    case 'btk_tradingview_history':
      return client.getTradingViewHistory(
        params as { symbol: string; resolution: string; from: number; to: number }
      );

    // ========== Account (4) ==========
    case 'btk_wallet':
      return client.getWallet();
    case 'btk_balances':
      return client.getBalances();
    case 'btk_trading_credits':
      return client.getTradingCredits();
    case 'btk_user_limits':
      return client.getUserLimits();

    // ========== Orders (8) ==========
    case 'btk_place_bid':
      return client.placeBid(params);
    case 'btk_place_ask':
      return client.placeAsk(params);
    case 'btk_place_bid_test':
      return client.placeBidTest(params);
    case 'btk_place_ask_test':
      return client.placeAskTest(params);
    case 'btk_cancel_order':
      return client.cancelOrder(params);
    case 'btk_my_open_orders':
      return client.getMyOpenOrders(params);
    case 'btk_my_order_history':
      return client.getMyOrderHistory(params);
    case 'btk_order_info':
      return client.getOrderInfo(params);

    // ========== Crypto / Wallet (6) ==========
    case 'btk_crypto_addresses':
      return client.getCryptoAddresses(Object.keys(params).length ? params : undefined);
    case 'btk_crypto_withdraw':
      return client.cryptoWithdraw(params);
    case 'btk_crypto_internal_withdraw':
      return client.cryptoInternalWithdraw(params);
    case 'btk_crypto_deposit_history':
      return client.getCryptoDepositHistory(Object.keys(params).length ? params : undefined);
    case 'btk_crypto_withdraw_history':
      return client.getCryptoWithdrawHistory(Object.keys(params).length ? params : undefined);
    case 'btk_crypto_generate_address':
      return client.generateCryptoAddress(params);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export function createServer(config?: BitkubMcpConfig) {
  const server = new McpServer({
    name: 'bitkub-mcp',
    version: '1.0.0',
  });

  let client: BitkubClient | null = null;

  // Public tools that don't need API keys
  const publicTools = [
    'btk_server_time', 'btk_server_status', 'btk_symbols', 'btk_ticker',
    'btk_recent_trades', 'btk_bids', 'btk_asks', 'btk_books',
    'btk_depth', 'btk_tradingview_history',
  ];

  // Register all 28 tools with annotations
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema as any,
        annotations: tool.annotations,
      },
      async (args: Record<string, unknown>) => {
        const apiKey =
          config?.apiKey ||
          (args as Record<string, unknown>).BITKUB_API_KEY as string;
        const secretKey =
          config?.secretKey ||
          (args as Record<string, unknown>).BITKUB_SECRET_KEY as string;

        if (!publicTools.includes(tool.name) && (!apiKey || !secretKey)) {
          return {
            content: [{ type: 'text' as const, text: 'Error: BITKUB_API_KEY and BITKUB_SECRET_KEY are required for this operation. Set them as environment variables or pass via config.' }],
            isError: true,
          };
        }

        if (!client || config?.apiKey !== apiKey) {
          client = new BitkubClient({
            apiKey: apiKey || '',
            secretKey: secretKey || '',
          });
        }

        try {
          const result = await handleToolCall(tool.name, args, client);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            isError: false,
          };
        } catch (error) {
          return {
            content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }
    );
  }

  // Register prompts
  server.prompt(
    'market-data-analysis',
    'Guide for fetching and analyzing Bitkub market data',
    async () => {
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'You are a Bitkub market data analyst. Help me fetch and analyze crypto market data from Thailand\'s leading exchange.',
              '',
              'Available market tools:',
              '1. **Price check** — btk_ticker for current price, volume, 24hr change (single or all symbols)',
              '2. **Order book** — btk_bids (buy side), btk_asks (sell side), btk_books (both), btk_depth (no timestamps)',
              '3. **Recent trades** — btk_recent_trades for latest executed trades',
              '4. **Candlesticks** — btk_tradingview_history for OHLCV data (1m, 5m, 15m, 1h, 4h, 1D)',
              '5. **Symbols** — btk_symbols for all trading pairs with rules and status',
              '6. **Server** — btk_server_time for connectivity, btk_server_status for API health',
              '',
              'Tips:',
              '- Symbol format: THB_BTC, THB_ETH, THB_ADA (THB prefix with underscore)',
              '- All prices are in Thai Baht (THB)',
              '- Market data endpoints are public (no API key needed)',
              '- Use btk_symbols to check if a pair is "exchange" or "broker" type',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.prompt(
    'trading-guide',
    'Guide for placing and managing orders on Bitkub safely',
    async () => {
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'You are a Bitkub trading assistant. Help me manage orders safely.',
              '',
              'WARNING: All trading operations use REAL MONEY.',
              '',
              'Available trading tools:',
              '1. **Buy order** — btk_place_bid (limit or market)',
              '2. **Sell order** — btk_place_ask (limit or market)',
              '3. **Test buy** — btk_place_bid_test (dry run, no real money)',
              '4. **Test sell** — btk_place_ask_test (dry run, no real money)',
              '5. **Cancel order** — btk_cancel_order',
              '6. **Open orders** — btk_my_open_orders',
              '7. **Order history** — btk_my_order_history (paginated, 90-day archive)',
              '8. **Order detail** — btk_order_info (fill history, status)',
              '',
              'Account tools:',
              '- btk_wallet — available balances',
              '- btk_balances — available + reserved balances',
              '- btk_trading_credits — fee credit balance',
              '- btk_user_limits — deposit/withdrawal limits',
              '',
              'ALWAYS use test endpoints first (btk_place_bid_test / btk_place_ask_test).',
              'ALWAYS check btk_balances before placing orders.',
              'ALWAYS verify order with btk_order_info after placement.',
            ].join('\n'),
          },
        }],
      };
    },
  );

  // Register resources
  server.resource(
    'server-info',
    'bitkub://server-info',
    {
      description: 'Connection status and available tools for this Bitkub MCP server',
      mimeType: 'application/json',
    },
    async () => {
      return {
        contents: [{
          uri: 'bitkub://server-info',
          mimeType: 'application/json',
          text: JSON.stringify({
            name: 'bitkub-mcp',
            version: '1.0.0',
            connected: !!config,
            tools_available: TOOLS.length,
            tool_categories: {
              general_market_data: 10,
              account: 4,
              orders: 8,
              crypto_wallet: 6,
            },
            base_url: 'https://api.bitkub.com',
          }, null, 2),
        }],
      };
    },
  );

  // Override tools/list handler to return raw JSON Schema with property descriptions.
  (server as any).server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    })),
  }));

  return server;
}
