# Chrome Extension Development Reference Index

This document serves as a comprehensive reference index for Chrome Extension development, including official documentation links, best practices, and common patterns. Use this when debugging or developing Chrome extension code.

## Table of Contents

1. [Official Documentation](#official-documentation)
2. [Manifest V3](#manifest-v3)
3. [Chrome APIs](#chrome-apis)
4. [Security Best Practices](#security-best-practices)
5. [Architecture Patterns](#architecture-patterns)
6. [Performance Optimization](#performance-optimization)
7. [Testing & Debugging](#testing--debugging)
8. [Publishing Guidelines](#publishing-guidelines)

---

## Official Documentation

### Primary Resources

- **Chrome Extensions Documentation**: https://developer.chrome.com/docs/extensions/
- **Chrome Extension API Reference**: https://developer.chrome.com/docs/extensions/reference/
- **Chrome Developers YouTube**: https://www.youtube.com/@ChromeDevelopers

### Key Documentation Pages

- **Introduction to Manifest V3**: https://chrome.jscn.org/docs/extensions/mv3/intro/
- **Manifest File Format**: https://chrome.jscn.org/docs/extensions/mv3/manifest/
- **Migrating to Manifest V3**: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3

---

## Manifest V3

### Core Requirements

- **Service Workers**: Background scripts replaced by service workers
- **Stricter CSP**: Enhanced Content Security Policy enforcement
- **No Remote Code**: Cannot execute remotely hosted code
- **No eval()**: `eval()` and similar functions are prohibited

### Manifest.json Structure

```json
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "permissions": [],
  "host_permissions": [],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

### Service Worker Configuration

- **Documentation**: https://developer.chrome.com/docs/extensions/reference/manifest/background
- **Migration Guide**: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers

**Key Points**:
- Event-driven and stateless
- Terminated when idle
- No DOM access (use offscreen documents if needed)
- Use `fetch` API instead of `XMLHttpRequest`
- Store state in `chrome.storage` APIs

---

## Chrome APIs

### chrome.storage

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/storage

**Storage Areas**:
- `chrome.storage.local`: Local device storage
- `chrome.storage.sync`: Cross-device sync (when logged into Chrome)
- `chrome.storage.session`: Session-only memory storage
- `chrome.storage.managed`: Enterprise policy storage (read-only)

**Permission**: `"storage"`

**Usage Example**:
```typescript
// Save data
await chrome.storage.local.set({ key: 'value' });

// Retrieve data
const result = await chrome.storage.local.get(['key']);

// Listen for changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  // Handle changes
});
```

### chrome.tabs

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/tabs

**Key Functions**:
- `chrome.tabs.create()`: Create new tabs
- `chrome.tabs.update()`: Update existing tabs
- `chrome.tabs.query()`: Query tabs
- `chrome.tabs.remove()`: Close tabs

**Permissions**:
- Basic operations: No permission needed
- Access `url`, `title`, `favIconUrl`: Requires `"tabs"` permission or host permissions

**Usage Example**:
```typescript
// Create a new tab
const tab = await chrome.tabs.create({ url: 'https://example.com' });

// Query tabs
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

// Update tab
await chrome.tabs.update(tabId, { url: 'https://newurl.com' });
```

### chrome.runtime

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/runtime

**Key Features**:
- Message passing between extension components
- Extension metadata and lifecycle management
- Installation, startup, and uninstallation events

**Usage Example**:
```typescript
// Send message
chrome.runtime.sendMessage({ action: 'doSomething' }, (response) => {
  // Handle response
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message
  sendResponse({ success: true });
});

// Get extension URL
const url = chrome.runtime.getURL('popup.html');
```

### Other Important APIs

- **chrome.action**: Browser action (replaces chrome.browserAction in MV3)
  - Documentation: https://developer.chrome.com/docs/extensions/reference/api/action

- **chrome.alarms**: Scheduled tasks
  - Documentation: https://developer.chrome.com/docs/extensions/reference/api/alarms

- **chrome.offscreen**: DOM access without visible window
  - Documentation: https://developer.chrome.com/docs/extensions/reference/api/offscreen

---

## Security Best Practices

### Content Security Policy (CSP)

**Documentation**: https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy

**Best Practices**:
1. **Strict CSP**: Always define explicit CSP in manifest.json
2. **No unsafe directives**: Avoid `'unsafe-inline'` and `'unsafe-eval'`
3. **Self-only scripts**: Use `script-src 'self'` to restrict script sources
4. **Separate files**: Include all scripts as separate files, not inline

**Example CSP**:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

### Security Guidelines

1. **Principle of Least Privilege**: Request only necessary permissions
2. **Input Sanitization**: Always validate and sanitize user inputs
3. **Secure Messaging**: Use secure message passing between components
4. **Data Encryption**: Encrypt sensitive user data
5. **Regular Updates**: Keep dependencies updated to patch vulnerabilities
6. **Security Audits**: Perform regular code reviews and security audits

**Additional Resources**:
- Security Best Practices: https://developer.chrome.com/docs/extensions/mv2/security/
- Secure Extension Development: https://reintech.io/blog/securing-chrome-extensions-against-vulnerabilities

---

## Architecture Patterns

### Component Structure

```
extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   └── content-script.js
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── options/
│   ├── options.html
│   └── options.ts
└── utils/
    └── helpers.ts
```

### Message Passing

**Background ↔ Content Script**:
```typescript
// From content script
chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
  console.log(response);
});

// In service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    sendResponse({ data: 'value' });
  }
});
```

**Background ↔ Popup**:
```typescript
// From popup
chrome.runtime.sendMessage({ action: 'update' });

// In service worker
chrome.runtime.onMessage.addListener((message) => {
  // Handle message
});
```

### State Management

**Use chrome.storage for persistence**:
```typescript
// Save state
async function saveState(state: AppState) {
  await chrome.storage.local.set({ appState: state });
}

// Load state
async function loadState(): Promise<AppState> {
  const result = await chrome.storage.local.get(['appState']);
  return result.appState || defaultState;
}
```

---

## Performance Optimization

### Best Practices

1. **Minimize Resource Usage**: Keep service workers lightweight
2. **Avoid Memory Leaks**: Clean up listeners and timers
3. **Efficient Caching**: Implement proper caching mechanisms
4. **Async Operations**: Use async/await for all async operations
5. **Monitor Usage**: Track CPU/memory usage with Chrome DevTools

### Service Worker Optimization

- Keep service workers event-driven
- Avoid long-running operations
- Use `chrome.alarms` for scheduled tasks instead of `setInterval`
- Store data in `chrome.storage` instead of global variables

---

## Testing & Debugging

### Chrome DevTools

- **Service Worker Debugging**: chrome://serviceworker-internals
- **Extension Reload**: chrome://extensions (enable Developer mode)
- **Console Logging**: Use `console.log`, `console.error` in service workers
- **Network Tab**: Monitor fetch requests
- **Performance Tab**: Profile extension performance

### Common Debugging Steps

1. Check service worker status in chrome://serviceworker-internals
2. Review console logs in service worker context
3. Verify permissions in manifest.json
4. Test message passing between components
5. Check storage values in chrome.storage API

### Testing Checklist

- [ ] Test in different Chrome versions
- [ ] Test with different permission levels
- [ ] Test offline functionality
- [ ] Test error scenarios
- [ ] Test cross-browser compatibility (if applicable)
- [ ] Monitor performance metrics

---

## Publishing Guidelines

### Chrome Web Store Requirements

**Documentation**: https://developer.chrome.com/docs/webstore/

**Key Requirements**:
1. **Developer Registration**: $5 USD one-time fee
2. **Extension Packaging**: Include manifest.json and 128x128 icon
3. **Program Policies Compliance**: Follow Chrome Web Store Developer Program Policies
4. **Single Purpose**: Extension should serve a narrow, clear purpose
5. **User Data Disclosure**: Clearly disclose data collection and usage
6. **Accurate Listing**: Provide detailed description and quality images
7. **Quality Assurance**: Thoroughly test before submission

### Store Listing Requirements

- **Name**: Clear, descriptive name
- **Description**: Detailed functionality description
- **Screenshots**: High-quality images (1280x800 or 640x400)
- **Icon**: 128x128 pixel icon
- **Privacy Policy**: Required if collecting user data
- **Support URL**: Contact information for support

### Review Process

- **Documentation**: https://developer.chrome.com/docs/webstore/review-process/
- Typical review time: 1-3 business days
- Common rejection reasons: Policy violations, security issues, misleading descriptions

---

## Code Style Guidelines

### TypeScript Best Practices

- Use clear, modular TypeScript code with proper type definitions
- Follow functional programming patterns; avoid classes
- Use descriptive variable names (e.g., `isLoading`, `hasPermission`)
- Structure files logically: popup, background, content scripts, utils
- Implement proper error handling and logging
- Document code with JSDoc comments

### Example Structure

```typescript
/**
 * Handles extension initialization
 */
async function initializeExtension(): Promise<void> {
  try {
    const state = await loadState();
    await setupListeners();
    console.log('Extension initialized');
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

/**
 * Loads extension state from storage
 */
async function loadState(): Promise<AppState> {
  const result = await chrome.storage.local.get(['appState']);
  return result.appState || getDefaultState();
}
```

---

## Internationalization

### chrome.i18n API

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/i18n

**Structure**:
```
_locales/
├── en/
│   └── messages.json
├── es/
│   └── messages.json
└── fr/
    └── messages.json
```

**Usage**:
```typescript
// In code
const message = chrome.i18n.getMessage('hello');

// In HTML
<span data-i18n="hello"></span>
```

---

## Accessibility

### Best Practices

- Implement ARIA labels for interactive elements
- Ensure sufficient color contrast (WCAG AA minimum)
- Support screen readers with proper semantic HTML
- Add keyboard shortcuts for common actions
- Test with keyboard-only navigation

---

## Common Patterns & Solutions

### Scheduled Tasks

```typescript
// Create alarm
chrome.alarms.create('myAlarm', { delayInMinutes: 60 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'myAlarm') {
    // Handle scheduled task
  }
});
```

### Offscreen Documents (for DOM access)

```typescript
// Create offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['DOM_SCRAPING'],
  justification: 'Need DOM access for content extraction'
});

// Close when done
await chrome.offscreen.closeDocument();
```

### Error Handling

```typescript
async function safeOperation<T>(
  operation: () => Promise<T>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error('Operation failed:', error);
    // Log to error tracking service
    return null;
  }
}
```

---

## Quick Reference Links

- **Main Documentation**: https://developer.chrome.com/docs/extensions/
- **API Reference**: https://developer.chrome.com/docs/extensions/reference/
- **Manifest V3 Guide**: https://developer.chrome.com/docs/extensions/mv3/
- **Migration Guide**: https://developer.chrome.com/docs/extensions/develop/migrate/
- **Web Store**: https://developer.chrome.com/docs/webstore/
- **Policies**: https://developer.chrome.com/docs/webstore/program-policies/

---

## Troubleshooting Common Issues

### Service Worker Not Running

- Check chrome://serviceworker-internals
- Verify manifest.json has correct `background.service_worker` path
- Check for syntax errors in service worker file
- Ensure service worker file is included in extension package

### Messages Not Received

- Verify `chrome.runtime.onMessage` listener is registered
- Check that sender has proper permissions
- Ensure message format matches expected structure
- Use `sendResponse` for synchronous responses

### Storage Not Persisting

- Verify `"storage"` permission in manifest.json
- Check storage quota limits
- Use appropriate storage area (local vs sync)
- Handle storage errors gracefully

### Permission Errors

- Review requested permissions in manifest.json
- Request only necessary permissions
- Use optional permissions for runtime requests
- Provide clear justification for permission requests

---

*Last Updated: 2024*
*This reference index is maintained for Chrome Extension development best practices and troubleshooting.*
