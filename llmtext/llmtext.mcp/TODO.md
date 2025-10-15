TODO:

- Turn context into one larger `llms.txt` hosted at https://docs.parallel.ai/llms.txt
- Create `llms.txt` MCP https://github.com/janwilmake/llmtext with query param `?url=` at installation set to https://llms.parallel.ai/llms.txt (just has full overview as tool description and resources with proper instructions)
- Link from docs to https://mcp.llmtext.com/mcp?url=https://llms.parallel.ai/llms.txt

# Slop guide

Create a higher level Slopguide MCP - takes in https://mcp.slopguide.com/mcp?url=https://llms.parallel.ai/llms.txt which exposes a tool that takes in an 'objective' and returns result of /chat/completions with the llms.txt MCP enabled. This tool would take a little longer but create perfect docs for a particular objective, naturally creating a 2-step flow without polluting context.

## JSON-to-JSON MCP

Takes in data, url, or MCP tool-call, and a piece of code, then returns url and shape. Can use dynamic worker loaders for this.

Task MCP Inputs should also allow link (make it clearer if needed)

Ultimate: Large 1MB CSV to CSV over 1 chat completion. Get this to work, then use grokthyself to find candidates for each Parallel position in my active network. Needs ability to retrieve all interactions per person.

## Meeting Lukas

- task mcp positioning within product
- agent-friendly
- llms.txt mcp
