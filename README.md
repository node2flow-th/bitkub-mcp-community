# Bitkub MCP Server

[![smithery badge](https://smithery.ai/badge/node2flow/bitkub)](https://smithery.ai/server/node2flow/bitkub)
[![npm version](https://img.shields.io/npm/v/@node2flow/bitkub-mcp.svg)](https://www.npmjs.com/package/@node2flow/bitkub-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP (Model Context Protocol) server for Bitkub API — Thailand's leading cryptocurrency exchange. Market data, trading, orders, wallet, and crypto management through 28 tools.

Works with Claude Desktop, Cursor, VS Code, and any MCP client.

> **WARNING**: This package interacts with a real cryptocurrency exchange. All trading and withdrawal operations use **real money**. Use with caution.

---

## Quick Start

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bitkub": {
      "command": "npx",
      "args": ["-y", "@node2flow/bitkub-mcp"],
      "env": {
        "BITKUB_API_KEY": "your-api-key",
        "BITKUB_SECRET_KEY": "your-secret-key"
      }
    }
  }
}
```

### Cursor / VS Code

Add to MCP settings:

```json
{
  "mcpServers": {
    "bitkub": {
      "command": "npx",
      "args": ["-y", "@node2flow/bitkub-mcp"],
      "env": {
        "BITKUB_API_KEY": "your-api-key",
        "BITKUB_SECRET_KEY": "your-secret-key"
      }
    }
  }
}
```

### Market Data Only (No API Key)

Market data tools (10 tools) work without API keys:

```json
{
  "mcpServers": {
    "bitkub": {
      "command": "npx",
      "args": ["-y", "@node2flow/bitkub-mcp"]
    }
  }
}
```

### HTTP Mode (Streamable HTTP)

```bash
BITKUB_API_KEY=xxx BITKUB_SECRET_KEY=xxx npx @node2flow/bitkub-mcp --http
```

Server starts on port 3000 (configurable via `PORT` env var). MCP endpoint: `http://localhost:3000/mcp`

---

## Configuration

| Environment Variable | Required | Description |
|---|---|---|
| `BITKUB_API_KEY` | For trading | API key from Bitkub |
| `BITKUB_SECRET_KEY` | For trading | Secret key for HMAC signing |
| `PORT` | No | Port for HTTP server (default: `3000`, only with `--http`) |

---

## All Tools (28 tools)

### General / Market Data (10 tools) — No API key needed

| Tool | Description |
|---|---|
| `btk_server_time` | Get server time (for timestamp sync) |
| `btk_server_status` | Get API server status |
| `btk_symbols` | List all trading symbols with rules |
| `btk_ticker` | Get 24-hour ticker (price, volume, change) |
| `btk_recent_trades` | Get recent trades for a symbol |
| `btk_bids` | Get buy-side order book |
| `btk_asks` | Get sell-side order book |
| `btk_books` | Get complete order book (bids + asks) |
| `btk_depth` | Get market depth |
| `btk_tradingview_history` | Get OHLCV candlestick data |

### Account (4 tools)

| Tool | Description |
|---|---|
| `btk_wallet` | Get available balances |
| `btk_balances` | Get full balances (available + reserved) |
| `btk_trading_credits` | Get trading credit balance |
| `btk_user_limits` | Get deposit/withdrawal limits |

### Orders (8 tools)

| Tool | Description |
|---|---|
| `btk_place_bid` | Place a buy order (LIMIT or MARKET) |
| `btk_place_ask` | Place a sell order (LIMIT or MARKET) |
| `btk_place_bid_test` | Test buy order (dry run, no real money) |
| `btk_place_ask_test` | Test sell order (dry run, no real money) |
| `btk_cancel_order` | Cancel a specific order |
| `btk_my_open_orders` | Get all open/pending orders |
| `btk_my_order_history` | Get order history (paginated) |
| `btk_order_info` | Get detailed order info with fill history |

### Crypto / Wallet (6 tools)

| Tool | Description |
|---|---|
| `btk_crypto_addresses` | List crypto deposit addresses |
| `btk_crypto_withdraw` | Withdraw crypto (IRREVERSIBLE) |
| `btk_crypto_internal_withdraw` | Transfer to Bitkub user (IRREVERSIBLE) |
| `btk_crypto_deposit_history` | Get deposit history |
| `btk_crypto_withdraw_history` | Get withdrawal history |
| `btk_crypto_generate_address` | Generate new deposit address |

---

## Test Endpoints

Bitkub provides test (dry run) endpoints for order placement. **Always test before placing real orders:**

```
btk_place_bid_test  — Validate buy order without spending money
btk_place_ask_test  — Validate sell order without spending money
```

These endpoints check parameters, balance, and trading rules, then return what the order would look like — without executing it.

---

## Requirements

- **Node.js** 18+
- **Bitkub account** with API keys (for trading operations)

### How to Get API Keys

1. Go to [bitkub.com](https://www.bitkub.com) and log in
2. Navigate to **API Management** in account settings
3. Create a new API key
4. Set permissions: Read, Trade, Withdraw, Deposit
5. Copy both the **API Key** and **Secret Key**
6. Set up **IP whitelist** for security

### Security Best Practices

- **Never share** API keys or secret keys
- **Use IP whitelist** in API key settings
- **Restrict permissions** to only what you need
- **Read-only keys** for market data monitoring
- **Store secrets in environment variables**, never in code
- **Rotate keys regularly**

---

## Risk Warning

- All operations execute on the **real exchange** with **real money**
- **Withdrawals are irreversible** — double-check addresses and amounts
- **Rate limits** — exceeding limits blocks for 30 seconds (HTTP 429)
- **Market risk** — cryptocurrency prices are highly volatile
- **Order history** older than 90 days is archived
- Always use **test endpoints** before placing real orders

---

## For Developers

```bash
git clone https://github.com/node2flow-th/bitkub-mcp-community.git
cd bitkub-mcp-community
npm install
npm run build

# Run in stdio mode (market data only)
npm start

# Run with full access
BITKUB_API_KEY=xxx BITKUB_SECRET_KEY=xxx npm start

# Run in HTTP mode
BITKUB_API_KEY=xxx BITKUB_SECRET_KEY=xxx npm start -- --http
```

---

## License

MIT License - see [LICENSE](LICENSE)

Copyright (c) 2026 [Node2Flow](https://node2flow.net)

## Links

- [npm Package](https://www.npmjs.com/package/@node2flow/bitkub-mcp)
- [Bitkub API Docs](https://github.com/bitkub/bitkub-official-api-docs)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Node2Flow](https://node2flow.net)
