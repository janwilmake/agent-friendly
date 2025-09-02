[What would make a website agent-friendly?](https://x.com/janwilmake/status/1931241984645103871)

# Requirements

1. checks url to be either https://b[adge].agent-friendly.com/owner/repo or https://b[adge].agent-friendly.com/domain.tld
2. checks for principles the repo/website must have to be considered agent-friendly
3. returns badge with score and/or checkmark
4. should link to https://agent-friendly.com/owner/repo or https://agent-friendly.com/domain.tld

# Measurables that make a URL agent-friendly

- doesn NOT serve an 'im not a robot' page
- vary: accept, user-agent to retrieve text/plain or text/markdown by default unless text/html is preferred.
- low token count response
- linked urls are also agent-friendly

# How to check if a website is agent-friendly

- `robots.txt` should be permissive
- `llms.txt` / `llms-full.txt` at root or well-known (see https://llmstxt.org)
- `openapi.json` at root or well-known
- discoverable MCP
- machine-friendly auth: if there is oauth and/or monetisation, needs dynamic client registration (https://tools.ietf.org/rfc/rfc7591.txt) at `/.well-known/openid_configuration` or `/.well-known/oauth-authorization-server`
- machine-friendly payments

# Implementation

The above requirements should all be implemented in a modular way using only Web-Standard Typescript.

This can be distributed as a package "agent-friendly" as well as an endpoint/tool hosted on Cloudflare.
