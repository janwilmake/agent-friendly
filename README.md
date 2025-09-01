# Principles

1. Use alternate convention:

```html
<link rel="alternate" type="text/markdown" href="docs.md" title="Docs" />
```

2. Vary on accept header or explicit extension, markdown by default

3. Create an `/llms.txt`

- see https://llmstxt.org

4. Allow any MCP client to let the user authenticate

- see https://github.com/janwilmake/universal-mcp-oauth
- see https://github.com/janwilmake/simplerauth-provider

5. Agent-Friendly Payments

6. Host an OpenAPI and link to it from https://yourapexdomain.com/.well-known/openapi

# Packages

The following is an overview of the packages in this repo, and what their purpose is.

- [getassetmanifest](packages/getassetmanifest/) - builds a `manifest.json` file compatible with cloudflare workers
- [llmstxt-generate](packages/llmstxt-generate/) - generates a llms.txt file from your `manifest.json`. Useful to make a llms.txt for static websites hosted on cloudflare workers.
