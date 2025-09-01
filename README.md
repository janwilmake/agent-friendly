# Principles

[Discuss](https://x.com/janwilmake/status/1931241984645103871)

## Create an `/llms.txt`

llms.txt is an increasingly adopted standard of navigation for agents.

- See https://llmstxt.org

## Adopt MCP

This specification is still in active development, but is getting a lot of adoption.

See https://modelcontextprotocol.io for more info.

For discoverability, there is no defined standard yet, but there are several competing ideas, which you could already adopt:

- [/.well-known/mcp.json](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1147)
- [discovery over DNS](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1149)

## Adopt MCP-compatible OAuth

Allow **any** MCP client to let the user authenticate. If you have protected resources in your app, a set of practices specified these listed documents allows MCP clients (and other protocols) to use your tools.

- test via https://mcp.agent-friendly.com
- see https://github.com/janwilmake/universal-mcp-oauth
- see https://github.com/janwilmake/simplerauth-provider

## Agent-Friendly Payments

There isn't one dominant strategy yet to make agents able to pay for your products, so I'll create an overview here for competing standards.

- https://www.l402.org

## Serve an OpenAPI

[The OpenAPI Specification](https://www.openapis.org) allows describing your entire server functionality in a discoverable static file. [Here are some best practices](https://github.com/janwilmake/openapisearch/tree/main/docs/best-practices.md) to creating a great discoverable OpenAPI.

## Use rel alternate

The [HTML Spec](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#alternate) specifies you can refer to alternate representations of documents using `<link rel="alternate" type="your-mime-type">`

Example:

```html
<link rel="alternate" type="text/markdown" href="docs.md" title="Docs" />
```

By adding a "text/markdown", "text/plain", or "application/json" representation to your HTML documents, you can instruct programmatic access to more token-dense and more machine-readable versions of the same document.

## Vary on accept header

Browser requests normally have `text/html` at the start of their `accept` header they send when requesting web-pages. Agents don't, yet often recieve the same HTML back on a specific address. By responding with a more machine-friendly representation of the same document if the accept header prioritizes it ([see how this works here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept)) we make it easier for agents to retrieve the content they're looking for.

# Packages

The following is an overview of the packages in this repo, and what their purpose is.

- [getassetmanifest](packages/getassetmanifest/) - builds a `manifest.json` file compatible with cloudflare workers
- [llmstxt-generate](packages/llmstxt-generate/) - generates a llms.txt file from your `manifest.json`. Useful to make a llms.txt for static websites hosted on cloudflare workers.
