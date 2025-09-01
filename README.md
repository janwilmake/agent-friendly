# Principles

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

[The OpenAPI Specification](https://www.openapis.org) allows describing your entire server functionality in a discoverable static file. Here are some tips to creating a great discoverable OpenAPI.

1. Make your OpenAPI super good.

Your OpenAPI is your source of truth. Common pitfalls include:

- Missing `operationId`, `summary` and/or `description` in your operations (summary should be up to 1 sentence, description up to a paragraph)
- Unclear or vague `operationId`, `summary`, or `description`. What matters is clarity to token ratio (a.k.a. signal to noise ratio)
- Missing `servers[0].url` field.
- Missing authentication options.
- Not referencing `externalDocs.url`. Almost nobody uses this. If you do, please ensure the url provided responds with markdown by default when accessed via `curl {url}`. When browsers access it, it's fine to respond with html.

A good OpenAPI specification should allow an agent to navigate the entirety of your APIs and should be easily navigatable. To make the API more navigatable, I have developed [openapi-for-llms](https://github.com/janwilmake/openapisearch/tree/main/packages/openapi-for-llms) which collapses your OpenAPI spec into a [llms.txt](https://llmstxt.org) compatible file that can be exposed on the web or in your repo. To make this file high-quality, it's important to provide a high-level overview to the APIs on how to use them. This can either be placed in `info.description` or as part of your `tags[n].description` fields. Tags will be leveraged to structure your llms.txt better, grouping the APIs per tag.

2. Make your OpenAPI discoverable.

Unfortunately there has not been any conclusion on how OAS wants to be made discoverable still, but discussions have been plentiful. The easiest way to do make it discoverable, is redirecting to your `openapi.json` file from https://yourlanding.com/.well-known/openapi. Besides that, it's good practice to put your `openapi.json` at the root of your api tld. Read more in [openapi-discovery](openapi-discovery.md)

3. Have all your APIs documented in a single OpenAPI file

Some large APIs have different files for different parts of their API. In that case, it's best to merge it in some way, for example with [redocly](https://redocly.com/blog/combining-openapis)

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
