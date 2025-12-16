# Chrome Extension Development Reference Index

This document serves as a comprehensive reference index for Chrome Extension development, including official documentation links, best practices, and common patterns. Use this when debugging or developing Chrome extension code.

## Table of Contents

1. [Official Documentation](#official-documentation)
2. [Manifest V3](#manifest-v3)
3. [Chrome APIs](#chrome-apis)
4. [Security Best Practices](#security-best-practices)
5. [Architecture Patterns](#architecture-patterns)
6. [Performance Optimization](#performance-optimization)
7. [UI and User Experience](#ui-and-user-experience)
8. [Internationalization](#internationalization)
9. [Accessibility](#accessibility)
10. [Testing & Debugging](#testing--debugging)
11. [Publishing Guidelines](#publishing-guidelines)
12. [Code Style Guidelines](#code-style-guidelines)
13. [Common Patterns & Solutions](#common-patterns--solutions)
14. [Quick Reference Links](#quick-reference-links)
15. [Troubleshooting Common Issues](#troubleshooting-common-issues)

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

**Migration Steps from Background Pages**:

1. **Update manifest.json**:
   ```json
   {
     "background": {
       "service_worker": "service_worker.js",
       "type": "module"
     }
   }
   ```
   - Replace `"background.scripts"` with `"background.service_worker"`
   - Remove `"background.persistent"`
   - Include `"type": "module"` for ES modules

2. **Handle DOM and window Object Access**:
   - Use Offscreen API for DOM operations:
   ```typescript
   await chrome.offscreen.createDocument({
     url: chrome.runtime.getURL('offscreen.html'),
     reasons: ['CLIPBOARD'],
     justification: 'Accessing clipboard data',
   });
   ```

3. **Replace localStorage**:
   - Use `chrome.storage.local` instead:
   ```typescript
   await chrome.storage.local.set({ key: value });
   ```

4. **Register Event Listeners Synchronously**:
   - Register at top level of service worker:
   ```typescript
   chrome.action.onClicked.addListener(handleActionClick);
   ```

5. **Replace XMLHttpRequest with fetch**:
   ```typescript
   const response = await fetch('https://api.example.com/data');
   const data = await response.json();
   ```

6. **Use Alarms for Timers**:
   - Service workers can be terminated, so use alarms:
   ```typescript
   chrome.alarms.create('myAlarm', { delayInMinutes: 1 });
   chrome.alarms.onAlarm.addListener((alarm) => {
     if (alarm.name === 'myAlarm') {
       // Perform action
     }
   });
   ```

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

### chrome.action

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/action

**Unified API**: Replaces `browserAction` and `pageAction` from Manifest V2

**Key Features**:
- Toolbar icon management
- Popup definition
- Badge text and colors
- Click event handling

**Manifest Configuration**:
```json
{
  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png"
    },
    "default_popup": "popup.html"
  }
}
```

**Usage Examples**:
```typescript
// Set icon dynamically
await chrome.action.setIcon({ path: 'icons/new-icon.png' });

// Set popup dynamically
await chrome.action.setPopup({ popup: 'new-popup.html' });

// Set badge text
await chrome.action.setBadgeText({ text: 'NEW' });
await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

// Handle click events (when no popup defined)
chrome.action.onClicked.addListener((tab) => {
  // Perform action when icon is clicked
});
```

**Migration from V2**:
- Replace `browser_action` or `page_action` with `action` in manifest
- Replace `chrome.browserAction` or `chrome.pageAction` API calls with `chrome.action`

### chrome.alarms

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/alarms

**Key Features**:
- Schedule tasks at specific times or intervals
- Event-driven execution
- Persistence across sessions (may be cleared on browser restart)
- Minimum interval: 30 seconds (Chrome 120+)
- Maximum active alarms: 500 (Chrome 117+)

**Usage Example**:
```typescript
// Create periodic alarm
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('myAlarm', {
    periodInMinutes: 1  // or 0.5 for 30 seconds
  });
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'myAlarm') {
    // Perform periodic task
    console.log('Alarm triggered!');
  }
});

// Create one-time alarm
chrome.alarms.create('oneTime', {
  when: Date.now() + 60000  // 1 minute from now
});
```

**Important Considerations**:
- Alarms continue to run while device is sleeping
- Alarms will not wake up a device
- When device wakes up, missed alarms will fire
- Always check if alarm exists when service worker starts

### chrome.offscreen

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/offscreen

**Purpose**: Access DOM without visible window (for service workers)

**Usage**:
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

**Reasons**:
- `DOM_SCRAPING`: Scraping DOM content
- `DOM_PARSER`: Parsing DOM
- `BLOBS`: Creating blobs
- `AUDIO_PLAYBACK`: Audio playback
- `CLIPBOARD`: Clipboard access

---

## Security Best Practices

### Content Security Policy (CSP)

**Documentation**: https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy

**Default CSP**:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

**Best Practices**:
1. **Strict CSP**: Always define explicit CSP in manifest.json
2. **No unsafe directives**: Avoid `'unsafe-inline'` and `'unsafe-eval'`
3. **Self-only scripts**: Use `script-src 'self'` to restrict script sources
4. **Separate files**: Include all scripts as separate files, not inline
5. **Trusted sources only**: Only include trusted external sources if needed

**Custom CSP Example**:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' https://trusted-source.com; object-src 'self';"
  }
}
```

**Avoid Unsafe Practices**:
- Don't use `'unsafe-eval'` - use `JSON.parse()` instead of `eval()`
- Don't use `'unsafe-inline'` - use separate script files
- Regularly review and update CSP to match current functionality

### web_accessible_resources

**Documentation**: https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources

**Best Practices**:
1. **Limit Exposure**: Only declare resources as web-accessible if absolutely necessary
2. **Specific Matches**: Use precise match patterns:
   ```json
   {
     "web_accessible_resources": [
       {
         "resources": ["images/icon.png"],
         "matches": ["https://example.com/*"]
       }
     ]
   }
   ```
3. **Dynamic URLs**: Use `use_dynamic_url: true` in MV3 for enhanced security
4. **Avoid Exposing Scripts**: Be cautious when making scripts web-accessible

**Example with Dynamic URLs**:
```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*"],
      "matches": ["https://example.com/*"],
      "use_dynamic_url": true
    }
  ]
}
```

### Security Guidelines

1. **Principle of Least Privilege**: Request only necessary permissions
2. **Input Sanitization**: Always validate and sanitize user inputs
3. **Secure Messaging**: Use secure message passing between components
4. **Data Encryption**: Encrypt sensitive user data
5. **Regular Updates**: Keep dependencies updated to patch vulnerabilities
6. **Security Audits**: Perform regular code reviews and security audits

### XSS Prevention

**Best Practices**:
1. **Sanitize Inputs**: Always sanitize and validate user inputs
2. **Avoid innerHTML**: Use `textContent` instead:
   ```typescript
   // Safe
   outputElement.textContent = userInput;
   
   // Unsafe
   outputElement.innerHTML = userInput;  // Can execute scripts
   ```
3. **Use DOMPurify**: For HTML content, use libraries like DOMPurify
4. **Avoid Dangerous APIs**: Don't use `eval()`, `document.write()`, etc.
5. **Use JSON.parse()**: Instead of `eval()` for parsing JSON

### Cross-Origin Requests

**Best Practices**:
1. **Request Necessary Permissions**: Specify host permissions in manifest:
   ```json
   {
     "host_permissions": [
       "https://api.example.com/"
     ]
   }
   ```
2. **Avoid Arbitrary URL Fetching**: Don't allow content scripts to request arbitrary URLs
3. **Define Specific Endpoints**: Only allow access to specific, defined endpoints
4. **Validate Origins**: Always validate message origins in message handlers

**Additional Resources**:
- Security Best Practices: https://developer.chrome.com/docs/extensions/mv2/security/
- Secure Extension Development: https://reintech.io/blog/securing-chrome-extensions-against-vulnerabilities
- XSS Prevention: https://reintech.io/blog/protect-chrome-extensions-using-csp

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

1. **Event-Driven Background Scripts**: Use event-driven service workers (can reduce CPU usage by up to 60%)
2. **Lazy Loading**: Delay loading heavy scripts until needed
3. **Minimize Permissions**: Fewer permissions = faster loading
4. **Optimize DOM Manipulations**: Batch DOM changes, use virtual DOM libraries
5. **Manage Event Listeners**: Remove listeners when no longer needed
6. **Profile Memory Usage**: Use Chrome DevTools to monitor heap size and DOM nodes
7. **Optimize Network Requests**: Cache data locally, debounce frequent requests
8. **Efficient Storage**: Use IndexedDB for larger datasets

### Service Worker Optimization

- Keep service workers event-driven
- Avoid long-running operations
- Use `chrome.alarms` for scheduled tasks instead of `setInterval`
- Store data in `chrome.storage` instead of global variables
- Load content scripts programmatically when needed:
  ```typescript
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-script.js']
  });
  ```

### Memory Leak Prevention

**Common Causes**:
- Unmanaged event listeners
- Unclosed timers/intervals
- DOM references not cleaned up
- Circular references

**Best Practices**:
```typescript
// Clean up event listeners
function setupListener() {
  const handler = () => { /* ... */ };
  chrome.storage.onChanged.addListener(handler);
  
  // Store handler for cleanup
  return () => chrome.storage.onChanged.removeListener(handler);
}

// Clear timers
const timerId = setInterval(() => {}, 1000);
// Always clear when done
clearInterval(timerId);

// Use alarms instead of intervals in service workers
chrome.alarms.create('periodic', { periodInMinutes: 1 });
```

### Caching Strategies

```typescript
// Cache API responses
async function getCachedData(key: string) {
  const cached = await chrome.storage.local.get([key]);
  if (cached[key] && Date.now() - cached[key].timestamp < 3600000) {
    return cached[key].data;
  }
  
  const fresh = await fetchData();
  await chrome.storage.local.set({
    [key]: { data: fresh, timestamp: Date.now() }
  });
  return fresh;
}
```

---

## Testing & Debugging

### Chrome DevTools

- **Service Worker Debugging**: chrome://serviceworker-internals
- **Extension Reload**: chrome://extensions (enable Developer mode)
- **Console Logging**: Use `console.log`, `console.error` in service workers
- **Network Tab**: Monitor fetch requests
- **Performance Tab**: Profile extension performance

### Debugging Different Components

**Popup Debugging**:
1. Open the popup
2. Right-click inside the popup
3. Select "Inspect"
4. DevTools opens attached to the popup

**Background Scripts (Service Workers)**:
1. Navigate to `chrome://extensions/`
2. Find your extension
3. Click "background page" link under "Inspect views"
4. DevTools opens connected to the service worker

**Content Scripts**:
1. Open the target web page
2. Launch DevTools
3. Select your extension's content script from the context menu
4. Debug as it interacts with the web page

### Unit Testing

**For Non-Chrome API Code**:
- Use standard JavaScript testing frameworks (Jest, Mocha, etc.)
- Test individual components in isolation

**For Chrome API Code**:
- Create mocks for Chrome APIs
- Use dependency injection to decouple from `chrome` namespace
- Example with Jest:
  ```typescript
  jest.mock('chrome', () => ({
    tabs: {
      query: jest.fn(() => Promise.resolve([{ id: 1 }]))
    }
  }));
  ```

### Integration Testing

**Using Puppeteer**:
- Automate browser actions
- Load extension into test browser instance
- Simulate user interactions
- Verify end-to-end functionality

### Common Debugging Steps

1. Check service worker status in chrome://serviceworker-internals
2. Review console logs in service worker context
3. Verify permissions in manifest.json
4. Test message passing between components
5. Check storage values in chrome.storage API
6. Monitor network requests in DevTools
7. Profile performance to identify bottlenecks

### Testing Checklist

- [ ] Test in different Chrome versions
- [ ] Test with different permission levels
- [ ] Test offline functionality
- [ ] Test error scenarios
- [ ] Test cross-browser compatibility (if applicable)
- [ ] Monitor performance metrics
- [ ] Test with screen readers
- [ ] Test keyboard-only navigation
- [ ] Test in different locales

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
- **Screenshots**: 
  - Minimum: 1 screenshot
  - Maximum: 5 screenshots
  - Size: 1280x800 or 640x400 pixels
  - Format: Square corners, no padding (full bleed)
  - Quality: Clear, properly oriented, no blur
  - Content: Accurately represent user experience, highlight core features
- **Icon**: 128x128 pixel icon
- **Privacy Policy**: 
  - **Required** if collecting any user data
  - Must clearly detail data collection, use, and sharing
  - Must be accessible via link in Developer Dashboard
  - Must disclose all parties with whom data is shared
- **Support URL**: Contact information for support
- **Consistent Branding**: Maintain consistency across screenshots and promotional materials

### Review Process

- **Documentation**: https://developer.chrome.com/docs/webstore/review-process/
- **Typical Review Time**: 1-3 business days
- **Common Rejection Reasons**: 
  - Policy violations
  - Security issues
  - Misleading descriptions
  - Missing privacy policy (when required)
  - Poor quality screenshots
  - Inaccurate store listing

### Privacy Policy Requirements

**Mandatory When**:
- Extension handles any user data
- Extension collects, uses, or shares user data

**Must Include**:
- How data is collected
- How data is used
- How data is shared
- All parties with whom data is shared
- Data retention policies
- User rights regarding their data

**Accessibility**:
- Must be accessible via link in Chrome Web Store Developer Dashboard
- Should be publicly accessible URL

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

## UI and User Experience

### Material Design Guidelines

**Popup Dimensions**:
- **Width**: 320-400 pixels (optimal)
- **Height**: 350-600 pixels (optimal)
- Exceeding these can decrease action rates by up to 23%

**Touch Targets**:
- Minimum size: 48x48 dp (Material Design standard)
- Reduces mis-taps and enhances accuracy

**Visual Hierarchy**:
- **Contrast Ratio**: Minimum 4.5:1 for text and interactive elements
- **Navigation Options**: Limit to 3 core options to prevent clutter
- **Spacing**: Use 8pt spacing system for consistency

**Responsive Design**:
- Use media queries for different screen resolutions
- Use flexible containers with `min-width` and `max-width`
- Prevent element overlap on various screen sizes

**Performance Optimization**:
- Disable distracting animations (static transitions have 15-22% higher satisfaction)
- Provide immediate inline error messages (decreases task failure by 41%)
- Display core actions above the fold

**Content Layout**:
- Primary actions visible immediately
- Apply 8pt spacing system
- Maintain visual consistency

### User Feedback

- Provide clear loading states
- Show immediate error messages inline
- Guide correction visually
- Support keyboard navigation
- Ensure proper focus management

---

## Internationalization

### chrome.i18n API

**Documentation**: https://developer.chrome.com/docs/extensions/reference/api/i18n

**Directory Structure**:
```
_locales/
├── en/
│   └── messages.json
├── es/
│   └── messages.json
├── ar/
│   └── messages.json
└── he/
    └── messages.json
```

**messages.json Format**:
```json
{
  "appName": {
    "message": "My Extension"
  },
  "appDescription": {
    "message": "This extension does something great."
  }
}
```

**Manifest Configuration**:
```json
{
  "name": "__MSG_appName__",
  "description": "__MSG_appDescription__",
  "default_locale": "en"
}
```

**Usage in Code**:
```typescript
// Get message
const message = chrome.i18n.getMessage('appName');

// Get message with placeholders
const greeting = chrome.i18n.getMessage('greeting', ['John']);
```

**Usage in HTML**:
```html
<span data-i18n="appName"></span>
```

### RTL Language Support

**Detect Text Direction**:
```typescript
// In JavaScript
document.documentElement.setAttribute('dir', chrome.i18n.getMessage('@@bidi_dir'));
```

**CSS for RTL**:
```css
body {
  direction: __MSG_@@bidi_dir__;
}

.content {
  padding-__MSG_@@bidi_start_edge__: 10px;
  padding-__MSG_@@bidi_end_edge__: 20px;
}
```

**Predefined Messages**:
- `@@bidi_dir`: Text direction (ltr or rtl)
- `@@bidi_start_edge`: Start edge (left for LTR, right for RTL)
- `@@bidi_end_edge`: End edge (right for LTR, left for RTL)

---

## Accessibility

### Best Practices

- Implement ARIA labels for interactive elements
- Ensure sufficient color contrast (WCAG AA minimum - 4.5:1 for text)
- Support screen readers with proper semantic HTML
- Add keyboard shortcuts for common actions
- Test with keyboard-only navigation

### ARIA Implementation

**Roles and Labels**:
```html
<div role="toolbar" tabindex="0" aria-activedescendant="button1">
  <img src="buttoncut.png" role="button" alt="cut" id="button1">
  <img src="buttoncopy.png" role="button" alt="copy" id="button2">
  <img src="buttonpaste.png" role="button" alt="paste" id="button3">
</div>
```

**Keyboard Navigation**:
```typescript
function optionKeyEvent(event: KeyboardEvent) {
  const ENTER_KEYCODE = 13;
  const RIGHT_KEYCODE = 39;
  const LEFT_KEYCODE = 37;

  if (event.type === "keydown") {
    if (event.keyCode === ENTER_KEYCODE) {
      ExecuteButtonAction(getCurrentButtonID());
    } else if (event.keyCode === RIGHT_KEYCODE) {
      const buttonid = getNextButtonID();
      event.target.setAttribute("aria-activedescendant", buttonid);
    } else if (event.keyCode === LEFT_KEYCODE) {
      const buttonid = getPrevButtonID();
      event.target.setAttribute("aria-activedescendant", buttonid);
    }
  }
}
```

### Standard HTML Controls

- Use native HTML elements (`<button>`, `<input>`, `<select>`) when possible
- These elements have built-in accessibility features
- Reduces need for additional ARIA attributes

### Testing Tools

- **ARIA DevTools**: Chrome extension for finding missing ARIA labels
- **Accessibility Insights for Web**: Helps find and fix accessibility issues
- **Chrome DevTools**: Built-in accessibility inspection

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
