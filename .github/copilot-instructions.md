# Chrome Table Extractor AI - Copilot Instructions

This is a Chrome Extension (Manifest V3) for AI-powered table extraction and data processing.

## Architecture Overview

**Core Components:**
- `src/background/background.js` - Service worker managing AI requests, storage, and extension lifecycle
- `src/content/content.js` - Content script for table detection, floating UI, and page interaction
- `src/popup/popup.js` - Extension popup for user interface and workflow management
- `src/options/options.js` - Options page for settings and prompt template management

**Key Utilities:**
- `src/utils/tableExtractor.js` - Multi-source table extraction (HTML, CSV, JSON, Markdown, PDF)
- `src/utils/aiService.js` - Multi-provider AI integration (OpenAI, Claude, Google AI)
- `src/utils/promptTemplates.js` - Template management system with built-in defaults
- `src/utils/dataVisualization.js` - Enhanced tables, charts, and data display

## Critical Patterns

**Chrome Extension Message Passing:**
```javascript
// Background ↔ Content communication
chrome.runtime.sendMessage({ action: 'extractTables' })
chrome.tabs.sendMessage(tabId, { action: 'showFloatingUI', data })
```

**AI Service Architecture:**
- Provider abstraction supports OpenAI, Claude, Google AI
- Thai language prompts with system messages for data analysis
- Usage statistics tracking via Chrome storage
- Error handling with provider-specific formatting

**Storage Strategy:**
- `chrome.storage.sync` - Settings, prompt templates (synced across devices)
- `chrome.storage.local` - Processing history, usage stats (device-local)
- Default templates are read-only, custom templates are user-editable

**Floating UI System:**
- Mouse-following UI with pin/unpin functionality
- Positioned via content script, controlled by popup
- Handles table selection, AI processing, and data export

## Development Workflows

**Testing Extension:**
1. Load unpacked in Chrome via `chrome://extensions/`
2. Use `tests/test-runner.html` for unit testing
3. Test on live websites for table detection

**Adding AI Providers:**
1. Extend `aiService.js` with new provider methods
2. Update `providers` config object
3. Add API key field in `options.html`
4. Test connection via options page

**Creating Prompt Templates:**
- Default templates in `promptTemplates.js` (Thai language, data-focused)
- Custom templates via options page with category system
- Use `{tableData}` placeholder for data injection
- Export/import functionality for sharing

**Table Extraction Sources:**
- HTML tables: Standard `<table>` parsing
- Grid views: `[role="grid"]`, `.data-grid` patterns
- List views: Structured `<li>` content extraction
- File uploads: CSV, JSON, Markdown, PDF support
- External APIs: Notion, Airtable integration points

## Key Files for Common Tasks

**Adding new table source:** Modify `src/utils/tableExtractor.js` extraction methods
**UI styling:** `assets/css/` - uses CSS custom properties for theming
**AI prompt engineering:** `src/utils/promptTemplates.js` default templates
**Extension permissions:** `manifest.json` - add new host_permissions for APIs
**Content script injection:** `src/background/background.js` tab update handling

## Chrome Extension Specifics

**Manifest V3 Patterns:**
- Service worker background script (not persistent)
- `chrome.scripting.executeScript()` for dynamic injection
- `chrome.action` API for popup management
- `chrome.contextMenus` for right-click integration

**Content Security:**
- All external API calls from background script
- No inline scripts, uses separate files
- Host permissions for AI providers and external data sources

**Thai Language Support:**
- All UI text in Thai
- AI prompts optimized for Thai context
- Cultural considerations in data formatting

---
# Codacy Rules
Configuration for AI behavior when interacting with Codacy's MCP Server

## After ANY successful `edit_file` or `reapply` operation
- YOU MUST IMMEDIATELY run the `codacy_cli_analyze` tool from Codacy's MCP Server for each file that was edited, with:
 - `rootPath`: set to the workspace path
 - `file`: set to the path of the edited file
 - `tool`: leave empty or unset
- If any issues are found in the new edits, propose and apply fixes for them.
- > NOTE: Failure to follow this rule is considered a critical error.

## CRITICAL: Dependencies and Security Checks
- IMMEDIATELY after ANY of these actions:
 - Running npm/yarn/pnpm install
 - Adding dependencies to package.json
 - Adding requirements to requirements.txt
 - Adding dependencies to pom.xml
 - Adding dependencies to build.gradle
 - Any other package manager operations
- You MUST run the `codacy_cli_analyze` tool with:
 - `rootPath`: set to the workspace path
 - `tool`: set to "trivy"
 - `file`: leave empty or unset
- If any vulnerabilities are found because of the newly added packages:
 - Stop all other operations
 - Propose and apply fixes for the security issues
 - Only continue with the original task after security issues are resolved
- EXAMPLE:
 - After: npm install react-markdown
 - Do: Run codacy_cli_analyze with trivy
 - Before: Continuing with any other tasks

## General
- Repeat the relevant steps for each modified file.
- "Propose fixes" means to both suggest and, if possible, automatically apply the fixes.
- You MUST NOT wait for the user to ask for analysis or remind you to run the tool.
- Do not run `codacy_cli_analyze` looking for changes in duplicated code or code complexity metrics.
- Do not run `codacy_cli_analyze` looking for changes in code coverage.
- Do not try to manually install Codacy CLI using either brew, npm, npx, or any other package manager.
- If the Codacy CLI is not installed, just run the `codacy_cli_analyze` tool from Codacy's MCP Server.
- When calling `codacy_cli_analyze`, only send provider, organization and repository if the project is a git repository.

## Whenever a call to a Codacy tool that uses `repository` or `organization` as a parameter returns a 404 error
- Offer to run the `codacy_setup_repository` tool to add the repository to Codacy
- If the user accepts, run the `codacy_setup_repository` tool
- Do not ever try to run the `codacy_setup_repository` tool on your own
- After setup, immediately retry the action that failed (only retry once)
---