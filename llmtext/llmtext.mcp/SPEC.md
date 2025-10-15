# TODO

Idea:

Use this to fetch `llms.txt` - https://claude.ai/share/6231d6c7-9b22-4689-a6e5-387d9a2afd87 (https://smithery.ai/server/@jiankaitian/servers)

- Consider what's a better name: `llms.txt MCP` or `curl MCP`? They're both good.
  - **llms.txt Explorer MCP** Sounds great for reading docs. Will click with people already familiar with it. May be able to be promoted on official llmstxt.org or mintlify/docs resources. DOMAIN: https://llmtext.com
  - **openapi-mcp-server** gets a llms.txt for any openapi, so this is great for APIs that have an openapi but not an `llms.txt`
  - **CURL MCP** will be great for raw API testing. If we just ask users to pass the API key, the AI can test any API themselves.

Let's do all of them, and write a blog about AI assisted coding. Since we just allow for authless GET requests, the llms.txt MCP outputs can be made public, which is super beneficial for shareability. This is not the case for curl MCP.

We need to implement all of them before september 7, and try to self-host as well as list them in different directories.

Is X OAuth + a leaderboard good? I think yes, this is great.

- Users can get context of their `history` via additional tool: recent and top llms.txt sites used.
- Users can be ratelimited to prevent abuse.

# SPEC:

- https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/refs/heads/main/schema/draft/schema.ts
- Use https://uithub.com/janwilmake/simplerauth-provider
- Use https://uithub.com/janwilmake/with-mcp
- https://flaredream.com/system-ts.md
- When visiting `GET /` should show login if not logged in, and auth token after login, with instructions how to install. Also inject leaderboard md and render here.
- When visting `GET /llms.txt` same as above but in plain text
- Main tool: `/get/{url}` should return text content
  - Store all fetches into central DO with `history { username, hostname, is_llms_txt, content_type, url, tokens, response_time }`
  - Proper warning if URL responds with non-plaintext or contains too many tokens with recommendation to use other HTML to Markdown MCP
- Secondary tool: `/usage` (authorized) that returns YOUR top `/llms.txt` URLs with count of total history on this hostname.
- Third tool (public): `GET /leaderboard[/{hostname}]` should return a text file (max-age 1h) showing:
  - top total users (https://x.com/username) with total count
  - top MCP servers across users with total usage count

# TODO:

- ✅ Build this out from spec, see if that works out.
- ✅ Fix CORS issues in `simplerauth-client`
- ✅ Fix CORS for login.wilmake.com and deploy and publish
- ✅ test with `npx @modelcontextprotocol/inspector`
- ✅ Error connecting to LLMs.txt. Please confirm that you have permission to access the service, that you’re using the correct credentials, and that your server handles auth correctly.
- ✅ Bring simplerauth-client and with-mcp to the packages again
- CRAZY ONE SHOT, almost got it right! LETS IMPROVE THE withMcp docs to clarify that auth should be in the handler already (show example) https://letmeprompt.com/httpsflaredream-q4xf1v0
- ❌ Login was successful, but after that, login isnt' found.
- I'm getting a strange oauth error to the twitter oauth; potentially it has never worked if not directly done at login.wilmake.com and not logged yet!!!
- Use it for https://docs.parallel.ai/llms.txt and make video about this
- If it works out, advocate to use this in parallel-cookbook. People without X account can use alternative: https://smithery.ai/server/@jiankaitian/servers

I didn't have enough time for this. Let's speedrun this later, but first, focus on shipping cookbook with https://smithery.ai/server/@jiankaitian/servers
