/// <reference types="@cloudflare/workers-types" />
import { DurableObject } from "cloudflare:workers";
import { withSimplerAuth, UserContext } from "./simplerauth-client";
//@ts-ignore
import html from "./html.html";
import { convertRestToMcp } from "rest-mcp";

export interface Env {
  HISTORY_DO: DurableObjectNamespace<HistoryDO>;
  PORT?: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  verified?: boolean;
}

const LEADERBOARD_MD = `# MCP URL Fetcher Leaderboard

Welcome to the MCP URL Fetcher! This service helps you fetch content from URLs and tracks usage statistics.

## How to Install

1. Get your access token from this page after logging in
2. Install the MCP inspector: \`npx @modelcontextprotocol/inspector\`
3. Connect to: \`https://your-worker-domain.com/mcp\`
4. Use the Authorization header: \`Bearer YOUR_ACCESS_TOKEN\`

## Available Tools

- **get**: Fetch content from any URL (returns plain text)
- **usage**: View your personal usage statistics
- **leaderboard**: View global usage statistics

## Top Users and Servers shown below...
`;

async function countTokens(text: string): Promise<number> {
  // Simple token estimation: roughly 5 characters per token
  return Math.ceil(text.length / 5);
}

async function fetchUrlContent(url: string): Promise<{
  content: string;
  contentType: string;
  responseTime: number;
  tokens: number;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MCP-URL-Fetcher/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "unknown";
    const content = await response.text();
    const responseTime = Date.now() - startTime;
    const tokens = await countTokens(content);

    return { content, contentType, responseTime, tokens };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorContent = `Error fetching ${url}: ${error.message}`;
    const tokens = await countTokens(errorContent);

    return {
      content: errorContent,
      contentType: "text/plain",
      responseTime,
      tokens,
    };
  }
}

async function handleMcp(
  request: Request,
  env: Env,
  ctx: UserContext
): Promise<Response> {
  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, MCP-Protocol-Version",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method === "GET") {
    return new Response("Only Streamable HTTP is supported", {
      status: 405,
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, MCP-Protocol-Version",
  };

  try {
    const message: any = await request.json();

    console.log({ message, auth: ctx.authenticated });
    const historyDO = env.HISTORY_DO.get(env.HISTORY_DO.idFromName("history"));

    // Handle ping
    if (message.method === "ping") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          result: {},
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Handle initialize
    if (message.method === "initialize") {
      if (!ctx.authenticated) {
        const url = new URL(request.url);
        const resourceMetadataUrl = `${url.origin}/.well-known/oauth-protected-resource/mcp`;

        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32001, message: "Unauthorized" },
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": `Bearer realm="main", resource_metadata="${resourceMetadataUrl}"`,
              ...corsHeaders,
            },
          }
        );
      }

      const initializeResult = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "llms.txt MCP",
            version: "1.0.0",
          },
          instructions: "Fetch content from URLs and track usage statistics.",
        },
      };

      return new Response(JSON.stringify(initializeResult, undefined, 2), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Handle initialized notification
    if (message.method === "notifications/initialized") {
      return new Response(null, {
        status: 202,
        headers: corsHeaders,
      });
    }

    if (message.method === "prompts/list") {
      return new Response(
        JSON.stringify(
          {
            jsonrpc: "2.0",
            id: message.id,
            result: { prompts: [] },
          },
          undefined,
          2
        ),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (message.method === "resources/list") {
      return new Response(
        JSON.stringify(
          {
            jsonrpc: "2.0",
            id: message.id,
            result: { resources: [] },
          },
          undefined,
          2
        ),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (message.method === "resources/read") {
      const { uri } = message.params;
      return new Response(
        JSON.stringify(
          {
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32602, message: `Resource not found: ${uri}` },
          },
          undefined,
          2
        ),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle tools/list
    if (message.method === "tools/list") {
      if (!ctx.authenticated) {
        const url = new URL(request.url);
        const resourceMetadataUrl = `${url.origin}/.well-known/oauth-protected-resource/mcp`;

        return new Response(
          JSON.stringify(
            {
              jsonrpc: "2.0",
              id: message.id,
              error: { code: -32001, message: "Unauthorized" },
            },
            undefined,
            2
          ),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": `Bearer realm="main", resource_metadata="${resourceMetadataUrl}"`,
              ...corsHeaders,
            },
          }
        );
      }

      const tools = [
        {
          name: "get",
          title: "Fetch URL content",
          description: "Fetch content from any URL and return it as plain text",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The URL to fetch content from",
              },
            },
            required: ["url"],
          },
        },
        {
          name: "usage",
          title: "Get personal usage statistics",
          description: "View your personal usage statistics",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "leaderboard",
          title: "Get leaderboard",
          description: "View global usage statistics and leaderboard",
          inputSchema: {
            type: "object",
            properties: {
              hostname: {
                type: "string",
                description:
                  "Optional hostname to filter leaderboard by specific server",
              },
            },
          },
        },
      ];

      return new Response(
        JSON.stringify(
          {
            jsonrpc: "2.0",
            id: message.id,
            result: { tools },
          },
          undefined,
          2
        ),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Handle tools/call
    if (message.method === "tools/call") {
      if (!ctx.authenticated) {
        const url = new URL(request.url);
        const resourceMetadataUrl = `${url.origin}/.well-known/oauth-protected-resource/mcp`;

        return new Response(
          JSON.stringify(
            {
              jsonrpc: "2.0",
              id: message.id,
              error: { code: -32001, message: "Unauthorized" },
            },
            undefined,
            2
          ),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": `Bearer realm="main", resource_metadata="${resourceMetadataUrl}"`,
              ...corsHeaders,
            },
          }
        );
      }

      const { name, arguments: args } = message.params as {
        name: string;
        arguments: { [key: string]: any } | undefined;
      };

      try {
        let result: string = "";
        let isError = false;

        if (name === "get") {
          const url = args?.url;

          if (!url) {
            result = "Error: URL parameter is required";
            isError = true;
          } else {
            try {
              new URL(url); // Validate URL

              const fetchResult = await fetchUrlContent(url);
              const hostname = new URL(url).hostname;
              const isLlmsTxt = url.endsWith("/llms.txt");

              // Store in history
              await historyDO.addHistory({
                username: ctx.user!.username,
                hostname,
                is_llms_txt: isLlmsTxt,
                content_type: fetchResult.contentType,
                url: url,
                tokens: fetchResult.tokens,
                response_time: fetchResult.responseTime,
              });

              // Check if content is non-plaintext or has too many tokens
              const isPlainText =
                fetchResult.contentType.includes("text/") ||
                fetchResult.contentType.includes("application/json") ||
                fetchResult.contentType === "unknown";

              let warning = "";
              if (!isPlainText) {
                warning = `⚠️  Warning: Content-Type is ${fetchResult.contentType}, which may not be plain text. Consider using an HTML-to-Markdown MCP for better results.\n\n`;
              } else if (fetchResult.tokens > 10000) {
                warning = `⚠️  Warning: Content is very large (${fetchResult.tokens} tokens). Consider using an HTML-to-Markdown MCP for better processing.\n\n`;
              }

              result = warning + fetchResult.content;
            } catch (urlError) {
              result = "Error: Invalid URL";
              isError = true;
            }
          }
        } else if (name === "usage") {
          const stats = await historyDO.getPersonalStats(ctx.user!.username);
          result = JSON.stringify(stats, null, 2);
        } else if (name === "leaderboard") {
          const { hostname } = args || {};
          const leaderboard = await historyDO.getLeaderboard(hostname);

          let content = hostname
            ? `Leaderboard for ${hostname}\n${"=".repeat(
                20 + hostname.length
              )}\n\n`
            : `Global Leaderboard\n==================\n\n`;

          content += `Top Users:\n`;
          leaderboard.users.slice(0, 20).forEach((user: any, i: number) => {
            content += `${i + 1}. x.com/${user.username}: ${
              user.total_requests
            } requests\n`;
          });

          if (!hostname) {
            content += `\nTop MCP Servers:\n`;
            leaderboard.servers
              .slice(0, 20)
              .forEach((server: any, i: number) => {
                content += `${i + 1}. ${server.hostname}: ${
                  server.total_requests
                } requests\n`;
              });
          }

          result = content;
        } else {
          result = `Error: Unknown tool: ${name}`;
          isError = true;
        }

        return new Response(
          JSON.stringify(
            {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                content: [{ type: "text", text: result }],
                isError,
              },
            },
            undefined,
            2
          ),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify(
            {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: `Error executing tool: ${error.message}`,
                  },
                ],
                isError: true,
              },
            },
            undefined,
            2
          ),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Method not found
    return new Response(
      JSON.stringify(
        {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`,
          },
        },
        undefined,
        2
      ),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}

const mainHandler = async (
  request: Request,
  env: Env,
  ctx: UserContext
): Promise<Response> => {
  // Validate required env
  if (!env.HISTORY_DO) {
    return new Response("HISTORY_DO binding not configured", { status: 500 });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Handle MCP endpoint
  if (path === "/mcp") {
    return handleMcp(request, env, ctx);
  }

  // Get DO instance
  const historyDO = env.HISTORY_DO.get(env.HISTORY_DO.idFromName("history"));

  if (path === "/") {
    if (ctx.authenticated) {
      const stats = await historyDO.getPersonalStats(ctx.user!.username);
      const leaderboard = await historyDO.getLeaderboard(undefined, 10);

      const data = {
        user: ctx.user,
        accessToken: ctx.accessToken,
        stats,
        leaderboard,
        leaderboardMd: LEADERBOARD_MD,
      };

      return new Response(
        html.replace(
          "</head>",
          `<script>window.data = ${JSON.stringify(data)}</script></head>`
        ),
        { headers: { "Content-Type": "text/html" } }
      );
    } else {
      const data = { leaderboardMd: LEADERBOARD_MD };
      return new Response(
        html.replace(
          "</head>",
          `<script>window.data = ${JSON.stringify(data)}</script></head>`
        ),
        { headers: { "Content-Type": "text/html" } }
      );
    }
  }

  if (path === "/llms.txt") {
    if (ctx.authenticated) {
      const stats = await historyDO.getPersonalStats(ctx.user!.username);
      const leaderboard = await historyDO.getLeaderboard();

      let content = `MCP URL Fetcher - llms.txt\n`;
      content += `================================\n\n`;
      content += `Access Token: ${ctx.accessToken}\n\n`;
      content += `Your Stats:\n`;
      content += `- Total requests: ${stats.totalRequests}\n`;
      content += `- Total tokens: ${stats.totalTokens}\n`;
      content += `- Top URLs:\n`;
      stats.topUrls.forEach((item: any) => {
        content += `  - ${item.url} (${item.count} requests)\n`;
      });

      content += `\nTop Users:\n`;
      leaderboard.users.slice(0, 10).forEach((user: any) => {
        content += `- ${user.username}: ${user.total_requests} requests\n`;
      });

      content += `\nTop MCP Servers:\n`;
      leaderboard.servers.slice(0, 10).forEach((server: any) => {
        content += `- ${server.hostname}: ${server.total_requests} requests\n`;
      });

      return new Response(content, {
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      return new Response(
        `MCP URL Fetcher - Please login first at ${url.origin}/`,
        { headers: { "Content-Type": "text/plain" } }
      );
    }
  }

  try {
    // Handle rest over mcp
    const mcpRequest = await convertRestToMcp(request);
    if (!mcpRequest) {
      return new Response("Method not found", { status: 404 });
    }
    return handleMcp(mcpRequest, env, ctx);
  } catch (error) {
    return new Response(error.message, { status: 400 });
  }
};

export default {
  fetch: withSimplerAuth(mainHandler, { isLoginRequired: false }),
};

export class HistoryDO extends DurableObject<Env> {
  sql: SqlStorage;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.sql = state.storage.sql;

    // Initialize tables
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        hostname TEXT NOT NULL,
        is_llms_txt BOOLEAN NOT NULL,
        content_type TEXT NOT NULL,
        url TEXT NOT NULL,
        tokens INTEGER NOT NULL,
        response_time INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_username ON history(username);
      CREATE INDEX IF NOT EXISTS idx_hostname ON history(hostname);
      CREATE INDEX IF NOT EXISTS idx_created_at ON history(created_at);
    `);
  }

  async addHistory(data: {
    username: string;
    hostname: string;
    is_llms_txt: boolean;
    content_type: string;
    url: string;
    tokens: number;
    response_time: number;
  }) {
    this.sql.exec(
      `INSERT INTO history (username, hostname, is_llms_txt, content_type, url, tokens, response_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      data.username,
      data.hostname,
      data.is_llms_txt,
      data.content_type,
      data.url,
      data.tokens,
      data.response_time
    );
  }

  async getPersonalStats(username: string) {
    const totalStats = this.sql
      .exec(
        `SELECT COUNT(*) as total_requests, SUM(tokens) as total_tokens
       FROM history WHERE username = ?`,
        username
      )
      .toArray()[0] as any;

    const topUrls = this.sql
      .exec(
        `SELECT url, COUNT(*) as count
       FROM history 
       WHERE username = ?
       GROUP BY url
       ORDER BY count DESC
       LIMIT 10`,
        username
      )
      .toArray();

    const llmsTxtUrls = this.sql
      .exec(
        `SELECT DISTINCT hostname, url
       FROM history
       WHERE username = ? AND is_llms_txt = 1
       ORDER BY hostname`,
        username
      )
      .toArray();

    return {
      totalRequests: totalStats.total_requests || 0,
      totalTokens: totalStats.total_tokens || 0,
      topUrls,
      llmsTxtUrls,
    };
  }

  async getLeaderboard(hostname?: string, limit?: number) {
    let userQuery = `
      SELECT username, COUNT(*) as total_requests, SUM(tokens) as total_tokens
      FROM history
    `;
    let serverQuery = `
      SELECT hostname, COUNT(*) as total_requests, SUM(tokens) as total_tokens
      FROM history
      GROUP BY hostname
      ORDER BY total_requests DESC
    `;

    const params = [];
    if (hostname) {
      userQuery += ` WHERE hostname = ?`;
      params.push(hostname);
    }

    userQuery += ` GROUP BY username ORDER BY total_requests DESC`;

    if (limit) {
      serverQuery += ` LIMIT 0,${limit}`;
      userQuery += ` LIMIT 0,${limit}`;
    }

    const users = this.sql.exec(userQuery, ...params).toArray();
    const servers = hostname ? [] : this.sql.exec(serverQuery).toArray();

    return { users, servers };
  }
}
