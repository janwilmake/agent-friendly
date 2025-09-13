# Agent-Friendly Website Checker

[![janwilmake/agent-friendly context](https://badge.forgithub.com/janwilmake/agent-friendly)](https://uithub.com/janwilmake/agent-friendly)

Welcome to the Agent-Friendly Website Checker. This service helps humans and AI agents evaluate websites for agent-friendly implementation patterns.

## Navigation Links

- [Home Page](https://agent-friendly.com/)
- [Check a Website](https://agent-friendly.com/check)
- [View Example Websites](https://agent-friendly.com/examples)
- [API Documentation](https://agent-friendly.com/api-docs)
- [About the Project](https://agent-friendly.com/about)

## API Endpoints

The service provides REST API endpoints that you can use directly:

- Check a specific URL: `GET /check/{encodedUrl}`
  - Example: `https://agent-friendly.com/check/example.com%2Fapi`
- Get pre-checked example results: `GET /example-check`
  - Example: `https://agent-friendly.com/example-check`

## What This Service Checks

Our service evaluates websites for the following agent-friendly patterns:

1. **Content Negotiation**: Does the website serve different formats based on request parameters?

   - Extension-based (.html, .json, etc.)
   - Accept header-based
   - User-Agent header-based

2. **Proper HTTP Headers**:

   - Vary header usage
   - Content-Type declaration

3. **API Documentation**:
   - OpenAPI/Swagger documentation availability

## How to Use This Service as an Agent

### Direct API Access

As an AI agent, you can directly access our API endpoints to check websites:

```
GET https://agent-friendly.com/check/example.com%2Fapi
```

The response will be JSON-formatted data containing detailed information about the website's agent-friendliness.

### Request Parameters

When checking a URL, make sure to:

- URL-encode the target URL (without the protocol prefix)
- Example: To check `https://example.com/api/docs`, use `example.com%2Fapi%2Fdocs`

### Response Format

The API returns JSON data with the following key information:

- `targetUrl`: The URL that was checked
- `supportsUserAgentRouting`: Boolean indicating if the site implements User-Agent routing
- `hasOpenApi`: Boolean indicating if OpenAPI documentation is available
- `varyHeaderPresent`, `varyAccept`, `varyUserAgent`: Header usage information
- `summary`: Human-readable summary of findings

### Example JSON Response

```json
{
  "targetUrl": "https://example.com/api",
  "pathWithoutExtension": "/api",
  "extensionTests": {
    ".json": {
      "status": 200,
      "contentType": "application/json"
    },
    ".html": {
      "status": 200,
      "contentType": "text/html"
    }
  },
  "acceptHeaderTests": {
    "application/json": {
      "status": 200,
      "contentType": "application/json",
      "varyHeader": "Accept"
    }
  },
  "varyHeaderPresent": true,
  "varyAccept": true,
  "varyUserAgent": false,
  "supportsUserAgentRouting": true,
  "hasOpenApi": true,
  "openApiLocation": "/api/openapi.json",
  "summary": "This website implements the User-Agent Router pattern."
}
```

## Example Websites

You can view pre-checked example websites at `https://agent-friendly.com/example-check`. This endpoint provides a list of popular websites and their agent-friendliness scores.

## About User-Agent Router Pattern

The User-Agent Router pattern is a web architecture approach that enables websites to serve different content based on the client making the request. This allows for:

- Providing machine-readable data for AI agents
- Serving human-friendly interfaces for browsers
- Optimizing content for different device types

Properly implemented, this pattern helps both humans and AI agents interact with the same URL but receive appropriately formatted content.

## Project Information

This project is maintained by [OpenAPI Search](https://openapisearch.com) and [Jan Wilmake](https://x.com/janwilmake).

The code is open source and available on [GitHub](https://github.com/janwilmake/agent-friendly).

Built using Cloudflare.
