/**
 * Get type 'safety' in js projects in VSCode (and other IDEs with good typescript support).
 * Why js > ts? Because it runs in browsers too and with things like `eval` (without bundling/compilation).
 * Ensure @cloudflare/workers-types is accessible. `npm i --save-dev @cloudflare/workers-types`
 */
//@ts-check
/// <reference types="@cloudflare/workers-types" />

// Sample websites to check
const EXAMPLES = [
  {
    title: "Vercel Homepage",
    url: "https://vercel.com",
  },
  {
    title: "Vercel Documentation",
    url: "https://vercel.com/docs",
  },
  {
    title: "GitHub Homepage",
    url: "https://github.com",
  },
  {
    title: "GitHub Docs",
    url: "https://docs.github.com",
  },
  {
    title: "X (Twitter) Homepage",
    url: "https://x.com",
  },
  {
    title: "X Developer Platform",
    url: "https://developer.x.com",
  },
  {
    title: "Cloudflare Homepage",
    url: "https://cloudflare.com",
  },
  {
    title: "Cloudflare Docs",
    url: "https://developers.cloudflare.com/docs",
  },
  {
    title: "Cloudflare Workers",
    url: "https://workers.cloudflare.com",
  },
  {
    title: "Next.js Homepage",
    url: "https://nextjs.org",
  },
  {
    title: "Next.js Documentation",
    url: "https://nextjs.org/docs",
  },
  {
    title: "npm Homepage",
    url: "https://www.npmjs.com",
  },
  {
    title: "Stack Overflow",
    url: "https://stackoverflow.com",
  },
  {
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
  },
  {
    title: "Netlify Homepage",
    url: "https://www.netlify.com",
  },
];

// KV key for storing example check results
const EXAMPLE_RESULTS_KEY = "example-check-results";

export default {
  /**
   * Cloudflare Worker handler function
   * @param {Request} request - The incoming request
   * @param {{ CHECKERS_KV: KVNamespace, CREDENTIALS: string }} env - Environment variables and bindings
   * @param {ExecutionContext} ctx - Execution context
   * @returns {Promise<Response>} - The response to the request
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/trigger") {
      if (
        request.headers.get("Authorization")?.slice("Basic ".length) ===
        btoa(env.CREDENTIALS)
      ) {
        await runExampleChecks(env);
        return new Response("DONE");
      } else {
        return new Response("Unauthenticated", {
          status: 401,
          headers: { "WWW-Authenticate": "Basic realm='protected'" },
        });
      }
    }
    // Handle the example-check endpoint to retrieve aggregated results from KV
    if (url.pathname === "/example-check") {
      try {
        const results = await env.CHECKERS_KV.get(EXAMPLE_RESULTS_KEY, {
          type: "json",
        });
        if (results) {
          return new Response(JSON.stringify(results, null, 2), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600", // Cache for an hour
            },
          });
        } else {
          return new Response(
            JSON.stringify({
              error: "No example check results available yet. Try again later.",
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Failed to retrieve example check results",
            details: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    // Check if the path starts with /check/
    if (!url.pathname.startsWith("/check/")) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid endpoint. Use /check/{URL} to test a URL or /example-check to see aggregated results.",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Extract the target URL from the path
    const encodedTargetUrl = url.pathname.substring(7); // Remove '/check/'
    if (!encodedTargetUrl) {
      return new Response(
        JSON.stringify({
          error: "No URL provided. Use /check/{URL} to test a URL.",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Decode the URL and parse it
    let targetUrl;
    try {
      targetUrl = new URL(decodeURIComponent(encodedTargetUrl));
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Invalid URL format. Please provide a properly encoded URL.",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Process the URL and get results
    const results = await checkUrl(targetUrl);

    return new Response(JSON.stringify(results, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  },

  /**
   * Daily scheduled function to check all example URLs
   * @param {ScheduledEvent} event - The scheduled event
   * @param {{ CHECKERS_KV: KVNamespace }} env - Environment variables and bindings
   * @param {ExecutionContext} ctx - Execution context
   */
  async scheduled(event, env, ctx) {
    // Only run on daily schedule
    if (event.cron !== "0 0 * * *") {
      return;
    }
    await runExampleChecks(env);
  },
};

/**
 *
 * @param {any} env
 */
const runExampleChecks = async (env) => {
  console.log("Starting scheduled example checks");

  // Process all examples
  const results = {
    timestamp: new Date().toISOString(),
    examples: [],
  };

  // Process examples in batches to avoid overloading
  const BATCH_SIZE = 3; // Process 3 at a time to stay within CPU limits

  for (let i = 0; i < EXAMPLES.length; i += BATCH_SIZE) {
    const batch = EXAMPLES.slice(i, i + BATCH_SIZE);

    // Process this batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (example) => {
        try {
          const targetUrl = new URL(example.url);
          const checkResult = await checkUrl(targetUrl);

          return {
            title: example.title,
            url: example.url,
            result: checkResult,
          };
        } catch (error) {
          return {
            title: example.title,
            url: example.url,
            error: error.message,
          };
        }
      }),
    );

    // Add batch results to the collection
    // @ts-ignore
    results.examples.push(...batchResults);

    // Small pause between batches to avoid rate limiting
    if (i + BATCH_SIZE < EXAMPLES.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Store results in KV
  await env.CHECKERS_KV.put(EXAMPLE_RESULTS_KEY, JSON.stringify(results));

  console.log(
    `Completed example checks. Processed ${results.examples.length} URLs.`,
  );
};
/**
 * Check a URL for User-Agent Router pattern implementation
 * @param {URL} targetUrl - The URL to check
 * @returns {Promise<Object>} - The check results
 */
async function checkUrl(targetUrl) {
  // Remove any extension from the pathname
  const pathWithoutExtension = targetUrl.pathname.replace(
    /\.(md|txt|json|yaml|html)$/,
    "",
  );
  targetUrl.pathname = pathWithoutExtension;

  // Define extensions to test
  const extensions = ["", "md", "txt", "json", "yaml", "html"];

  // Define Accept headers to test
  const acceptHeaders = {
    default: "",
    html: "text/html",
    markdown: "text/markdown",
    json: "application/json",
    yaml: "application/yaml",
    text: "text/plain",
  };

  // Define User-Agent strings to test
  const userAgents = {
    default: "",
    browser:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    bot: "Googlebot/2.1 (+http://www.google.com/bot.html)",
    agent: "AgentPlatform/1.0",
    api: "APIClient/1.0",
  };

  // Create OpenAPI check URLs
  const openApiUrls = [
    new URL("/openapi.json", targetUrl.origin),
    new URL("/.well-known/openapi.json", targetUrl.origin),
  ];

  // Store results
  const results = {
    targetUrl: targetUrl.toString(),
    pathWithoutExtension,
    extensionTests: {},
    acceptHeaderTests: {},
    userAgentTests: {},
    varyHeaderPresent: false,
    varyAccept: false,
    varyUserAgent: false,
    /** @type string|null */
    defaultContentType: null,
    contentTypeVariations: {},
    supportsUserAgentRouting: false,
    hasOpenApi: false,
    openApiLocation: null,
    summary: "",
  };

  // Create all the requests we'll need to make
  const requests = [];

  // Extension test requests
  for (const ext of extensions) {
    const testUrl = new URL(targetUrl.toString());
    if (ext) {
      testUrl.pathname = `${pathWithoutExtension}.${ext}`;
    }

    requests.push({
      type: "extension",
      key: ext || "default",
      url: testUrl.toString(),
      options: {},
    });
  }

  // Accept header test requests
  for (const [key, acceptHeader] of Object.entries(acceptHeaders)) {
    /**
     * @type {any}
     */
    const options = {
      headers: {},
    };

    if (acceptHeader) {
      options.headers["Accept"] = acceptHeader;
    }

    requests.push({
      type: "accept",
      key,
      url: targetUrl.toString(),
      options,
    });
  }

  // User-Agent test requests
  for (const [key, userAgent] of Object.entries(userAgents)) {
    /**
     * @type {any}
     */
    const options = {
      headers: {},
    };

    if (userAgent) {
      options.headers["User-Agent"] = userAgent;
    }

    requests.push({
      type: "userAgent",
      key,
      url: targetUrl.toString(),
      options,
    });
  }

  // OpenAPI check requests
  for (const openApiUrl of openApiUrls) {
    requests.push({
      type: "openApi",
      key: openApiUrl.pathname,
      url: openApiUrl.toString(),
      options: {
        headers: {
          Accept: "application/json",
        },
      },
    });
  }

  // Execute all requests in parallel
  /** @type any */
  const responses = await Promise.allSettled(
    requests.map((req) =>
      fetch(req.url, req.options)
        .then((response) => ({
          req,
          response,
          error: null,
        }))
        .catch((error) => ({
          req,
          response: null,
          error: error.message,
        })),
    ),
  );

  // Process the responses
  for (const result of responses) {
    if (result.status === "fulfilled") {
      const { req, response, error } = result.value;

      if (error) {
        // Handle error case
        if (req.type === "extension") {
          results.extensionTests[req.key] = { error };
        } else if (req.type === "accept") {
          results.acceptHeaderTests[req.key] = { error };
        } else if (req.type === "userAgent") {
          results.userAgentTests[req.key] = { error };
        }
        continue;
      }

      // Process successful response
      if (req.type === "extension") {
        results.extensionTests[req.key] = {
          status: response.status,
          contentType: response.headers.get("Content-Type"),
          varyHeader: response.headers.get("Vary"),
        };
      } else if (req.type === "accept") {
        results.acceptHeaderTests[req.key] = {
          status: response.status,
          contentType: response.headers.get("Content-Type"),
          varyHeader: response.headers.get("Vary"),
        };

        // Record the default content type
        if (req.key === "default") {
          results.defaultContentType = response.headers.get("Content-Type");
        }

        // Record content type variations
        const contentType = response.headers.get("Content-Type");
        if (contentType) {
          results.contentTypeVariations[req.key] = contentType;
        }

        // Check for Vary header
        const varyHeader = response.headers.get("Vary");
        if (varyHeader) {
          results.varyHeaderPresent = true;

          // Parse the Vary header into an array of values
          const varyValues = varyHeader
            .split(",")
            .map((v) => v.trim().toLowerCase());

          // Check for exact match of "accept" in the Vary header
          results.varyAccept = varyValues.includes("accept");
          results.varyUserAgent = varyValues.includes("user-agent");
        }
      } else if (req.type === "userAgent") {
        results.userAgentTests[req.key] = {
          status: response.status,
          contentType: response.headers.get("Content-Type"),
          varyHeader: response.headers.get("Vary"),
        };
      } else if (req.type === "openApi") {
        // Check if this is a valid OpenAPI response
        const isSuccess = response.status >= 200 && response.status < 300;
        const contentType = response.headers.get("Content-Type");
        const isJson = contentType && contentType.includes("application/json");
        const isYaml =
          contentType &&
          (contentType.includes("application/yaml") ||
            contentType.includes("text/yaml") ||
            contentType.includes("text/x-yaml"));

        if (isSuccess && (isJson || isYaml)) {
          try {
            if (isJson) {
              // Verify it's valid JSON
              const json = await response.json();
              if (json?.openapi) {
                results.hasOpenApi = true;
                results.openApiLocation = req.key;
              }
            } else if (isYaml) {
              // For YAML, we at least check that we can get text content
              // A full implementation would parse this as YAML, but that would require a YAML parser
              const textContent = await response.text();
              if (textContent && textContent.trim().length > 0) {
                results.hasOpenApi = true;
                results.openApiLocation = req.key;
              }
            }
          } catch (e) {
            // Invalid document format, not an OpenAPI document
          }
        }
      }
    }
  }

  // Analyze results to determine if User-Agent Router pattern is implemented
  const hasExtensionVariation =
    Object.values(results.extensionTests)
      .filter((test) => !test.error)
      .map((test) => test.contentType)
      .filter((value, index, self) => self.indexOf(value) === index).length > 1;

  const hasAcceptHeaderVariation =
    Object.values(results.acceptHeaderTests)
      .filter((test) => !test.error)
      .map((test) => test.contentType)
      .filter((value, index, self) => self.indexOf(value) === index).length > 1;

  const hasUserAgentVariation =
    Object.values(results.userAgentTests)
      .filter((test) => !test.error)
      .map((test) => test.contentType)
      .filter((value, index, self) => self.indexOf(value) === index).length > 1;

  results.supportsUserAgentRouting =
    (hasExtensionVariation ||
      hasAcceptHeaderVariation ||
      hasUserAgentVariation) &&
    (results.varyAccept || results.varyUserAgent);

  // Generate summary
  if (results.supportsUserAgentRouting) {
    results.summary =
      "This URL appears to implement User-Agent Router pattern.";

    if (hasExtensionVariation) {
      results.summary +=
        " It responds with different content types based on URL extensions.";
    }

    if (hasAcceptHeaderVariation) {
      results.summary += " It responds to different Accept headers.";
    }

    if (hasUserAgentVariation) {
      results.summary += " It varies responses based on User-Agent.";
    }

    if (results.varyHeaderPresent) {
      results.summary +=
        " The server correctly uses the Vary header to indicate content negotiation.";
    }
  } else {
    results.summary =
      "This URL doesn't appear to implement the User-Agent Router pattern.";

    if (
      !hasExtensionVariation &&
      !hasAcceptHeaderVariation &&
      !hasUserAgentVariation
    ) {
      results.summary +=
        " The server returns the same content type regardless of request variations.";
    } else if (!results.varyHeaderPresent) {
      results.summary +=
        " While content varies, the server doesn't use the Vary header for proper cache control.";
    }
  }

  // Add OpenAPI info to summary
  if (results.hasOpenApi) {
    results.summary += ` The site provides OpenAPI documentation at ${results.openApiLocation}.`;
  }

  return results;
}
