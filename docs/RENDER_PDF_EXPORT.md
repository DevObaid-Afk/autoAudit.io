# Server-Side PDF Export On Render

AutoAudit.ai generates saved report PDFs with `puppeteer-core` and `@sparticuz/chromium`.

## Dependencies

Install the PDF runtime packages:

```bash
npm install puppeteer-core @sparticuz/chromium
```

`puppeteer-core` is used instead of `puppeteer` so the app does not download a bundled Chromium binary during install. `@sparticuz/chromium` provides a Chromium build that works better in serverless and container environments.

## Render Configuration

Render runs the app in a Linux container. The PDF service launches Chromium with:

- `--no-sandbox`
- `--disable-setuid-sandbox`
- `--disable-dev-shm-usage`

These are required because hosted containers usually do not expose the same sandbox and shared-memory behavior as a local desktop.

No extra environment variable is required on Render when `@sparticuz/chromium` is installed. The service calls:

```js
await chromium.executablePath()
```

For local development, if Chromium cannot be found, set:

```bash
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

On Windows, this is usually similar to:

```powershell
$env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

## Endpoint

Saved reports can be exported with:

```http
POST /api/reports/:id/export-pdf
```

The response is binary PDF data with:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="autoaudit-report-[date].pdf"
```

## Operational Note

PDF generation usually takes 2-5 seconds because Chromium has to start, render the HTML, and print the page. If export traffic grows, move PDF generation into a queued background job and store generated PDFs in object storage.
