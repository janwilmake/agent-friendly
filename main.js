// main.js
import indexHTML from "./main.html";

const markdownContent = `# Agent-Friendly Web

Building the web for AI agents and humans alike

## Core Principles

✓ Vary on accept header or explicit extension, markdown by default  
✓ Programmatic auth (with simplerauth)  
✓ Agent-friendly monetisation (L402)  

[Read more →](https://github.com/janwilmake/agent-friendly)

## Agent-Friendly Replacements

### Available Services

**Google → [GoogLLM.com](https://googllm.com)**  
Status: ✅ Available

**X/Twitter → [MarkdownFeed.com](https://markdownfeed.com)**  
Status: ✅ Available

### Coming Soon

**Y Combinator → Coming Soon**  
Status: 🚧 Coming Soon

**GitHub → Coming Soon**  
Status: 🚧 Coming Soon

---

*View source: [GitHub Repository](https://github.com/janwilmake/agent-friendly)*
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const acceptHeader = request.headers.get("Accept") || "";

    // Check for explicit extension
    const isMarkdownExtension =
      url.pathname.endsWith(".md") || url.pathname.endsWith(".markdown");
    const isHTMLExtension =
      url.pathname.endsWith(".html") || url.pathname.endsWith(".htm");

    // Determine content type preference
    const prefersMarkdown =
      acceptHeader.includes("text/markdown") ||
      acceptHeader.includes("text/plain") ||
      acceptHeader.includes("text/*") ||
      isMarkdownExtension ||
      (!isHTMLExtension && !acceptHeader.includes("text/html"));

    if (prefersMarkdown) {
      return new Response(markdownContent, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } else {
      return new Response(indexHTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  },
};
