# MisinfoGuard - Complete Testing & Debugging Script

## 🚀 **Step-by-Step Testing Guide**

### **Phase 1: Extension Installation & Setup**

#### **1.1 Install the Extension**
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `/Users/aditya/workspace/misinfo/dist` folder
5. Verify the extension appears with no errors

#### **1.2 Check Extension Status**
```javascript
// Run in any webpage console to check extension ID
chrome.runtime.sendMessage('YOUR_EXTENSION_ID', {type: 'GET_SETTINGS'}, console.log);
```

#### **1.3 Open Developer Tools**
- Press `F12` to open DevTools
- Go to **Console** tab
- Keep this open during all testing

### **Phase 2: Context Menu Testing**

#### **2.1 Test Right-Click Text Analysis**
1. **Go to any webpage** (e.g., Wikipedia, news site)
2. **Select some text** (highlight 2-3 sentences)
3. **Right-click** on the selected text
4. **Look for**: "Fact-check Text with MisinfoGuard" in context menu

**Expected Console Logs:**
```
Creating context menus...
Context menus created successfully
```

**If context menu doesn't appear:**
- Check console for errors
- Reload the extension
- Try different websites
- Check extension permissions

#### **2.2 Test Context Menu Click**
1. Click "Fact-check Text with MisinfoGuard"
2. **Check console** for these logs:

```
Background: Context menu clicked
Background: Menu item ID: misinfoguard-analyze-text
Background: Info object: {menuItemId: "...", selectionText: "..."}
Content script received message: {type: "ANALYZE_TEXT", payload: {...}}
Content script: handleAnalyzeText called with: {...}
```

### **Phase 3: API Configuration**

#### **3.1 Configure API Keys**
1. Click the MisinfoGuard extension icon
2. Go to **Settings**
3. Add your API keys:

**Required for Text Analysis:**
- **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Hugging Face API Key**: Get from [Hugging Face](https://huggingface.co/settings/tokens)

**Required for Image Analysis:**
- **SightEngine User & Secret**: Get from [SightEngine](https://sightengine.com)
- **OCR.space API Key**: Get from [OCR.space](https://ocr.space/ocrapi)

#### **3.2 Test API Status**
1. After adding keys, check the **API Status** section
2. Click the refresh button
3. Verify status indicators show "Connected"

**Expected Console Logs:**
```
SightEngine API call with models: ai-generated
FormData contents: {models: "ai-generated", api_user: "...", api_secret: "***", hasMedia: true}
SightEngine response: {status: "success", ...}
```

### **Phase 4: Text Analysis Testing**

#### **4.1 Full Text Analysis Flow**
1. Select text: "The Earth is flat and NASA is hiding the truth"
2. Right-click → "Fact-check Text with MisinfoGuard"
3. **Expected behavior:**
   - Loading overlay appears
   - Fact-check popup shows after 3-5 seconds
   - Verdict: "FALSE" with red styling
   - Correction information displayed

**Expected Console Logs:**
```
Content script: Showing text analysis overlay
Content script: Sending ANALYZE_TEXT message to background
Content script: Received response from background: {success: true, data: {...}}
Content script: Showing fact-check popup
```

#### **4.2 Test Different Text Types**
Try these examples:

**True Statement:**
- Text: "Water boils at 100 degrees Celsius at sea level"
- Expected: GREEN verdict "TRUE"

**False Statement:**
- Text: "The moon landing was filmed in a studio"
- Expected: RED verdict "FALSE" with correction

**Unverifiable Statement:**
- Text: "Aliens visited Earth last Tuesday"
- Expected: GRAY verdict "UNVERIFIABLE"

### **Phase 5: SightEngine API Testing**

#### **5.1 Test Image Analysis**
1. Find an image online or drag one to the extension
2. **Check console** for SightEngine logs:

```
SightEngine API call with models: ai-generated
Added media URL to form data: https://...
FormData contents: {models: "ai-generated", api_user: "...", hasMedia: true}
SightEngine response: {status: "success", type: {...}}
```

#### **5.2 Debug SightEngine Errors**
If you see errors, check:

**Common Error Messages:**
- `"Invalid credentials"` → Check user/secret in settings
- `"Insufficient credits"` → Check your SightEngine account balance
- `"Invalid model"` → Should use "ai-generated" model
- `"Media not found"` → Image URL/file issue

**Debug Commands:**
```javascript
// Test SightEngine API directly in console
const formData = new FormData();
formData.append('api_user', 'YOUR_USER');
formData.append('api_secret', 'YOUR_SECRET');
formData.append('models', 'ai-generated');
formData.append('media_url', 'https://example.com/image.jpg');

fetch('https://api.sightengine.com/1.0/check.json', {
  method: 'POST',
  body: formData
}).then(r => r.json()).then(console.log);
```

### **Phase 6: Troubleshooting Common Issues**

#### **6.1 Context Menu Not Appearing**
**Symptoms:** Right-click doesn't show MisinfoGuard option

**Solutions:**
1. **Reload extension**: Go to `chrome://extensions/` → click reload
2. **Check permissions**: Extension details → "On all sites" enabled
3. **Try different sites**: Some sites block context menus
4. **Check console**: Look for context menu creation errors

**Debug Commands:**
```javascript
// Check if extension is loaded
chrome.runtime.getManifest()

// Check context menus
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: 'test-menu',
    title: 'Test Menu',
    contexts: ['selection']
  });
});
```

#### **6.2 Text Analysis Fails**
**Symptoms:** Loading overlay appears but no popup shows

**Solutions:**
1. **Check API keys**: Settings → verify Gemini key is valid
2. **Check console**: Look for error messages
3. **Test API directly**: Use debug commands below
4. **Check quotas**: Verify API limits not exceeded

**Debug Commands:**
```javascript
// Test Gemini API directly
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_KEY', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    contents: [{parts: [{text: 'Hello, please respond with "API working"'}]}]
  })
}).then(r => r.json()).then(console.log);
```

#### **6.3 SightEngine API Errors**
**Symptoms:** Image analysis fails with API errors

**Solutions:**
1. **Verify credentials**: Check user/secret in settings
2. **Check model name**: Should be "ai-generated"
3. **Test with simple image**: Use a basic JPEG/PNG
4. **Check account**: Verify SightEngine account has credits

### **Phase 7: Performance Testing**

#### **7.1 Response Time Testing**
- **Text Analysis**: Should complete in 3-10 seconds
- **Image Analysis**: Should complete in 5-15 seconds
- **API Status Check**: Should complete in 2-5 seconds

#### **7.2 Memory Usage**
- Extension should use < 50MB RAM
- No memory leaks after multiple analyses
- Popup should close cleanly

### **Phase 8: Final Verification**

#### **8.1 Complete Workflow Test**
1. ✅ Extension loads without errors
2. ✅ Context menus appear on right-click
3. ✅ Text analysis shows loading overlay
4. ✅ Fact-check popup appears with verdict
5. ✅ Image analysis processes correctly
6. ✅ API status indicators work
7. ✅ Settings save properly
8. ✅ No console errors during normal use

#### **8.2 Cross-Site Testing**
Test on multiple websites:
- ✅ Wikipedia
- ✅ News sites (CNN, BBC, etc.)
- ✅ Social media (Twitter, Facebook)
- ✅ Blogs and forums
- ✅ E-commerce sites

## 🐛 **Emergency Debugging**

### **If Nothing Works:**
1. **Clear extension data**: `chrome://extensions/` → Details → "Clear storage"
2. **Reinstall extension**: Remove and reload from dist folder
3. **Check Chrome version**: Ensure supports Manifest V3
4. **Disable other extensions**: Check for conflicts
5. **Try incognito mode**: Test without other extensions

### **Console Commands for Deep Debugging:**
```javascript
// Check extension messages
chrome.runtime.onMessage.addListener(console.log);

// Test storage
chrome.storage.sync.get(null, console.log);

// Check permissions
chrome.permissions.getAll(console.log);

// Test context menus
chrome.contextMenus.removeAll();
chrome.contextMenus.create({
  id: 'debug-menu',
  title: 'Debug Menu',
  contexts: ['selection']
});
```

## 📊 **Success Criteria**

The extension is working correctly when:
- ✅ Right-click context menu appears consistently
- ✅ Text analysis completes with visual popup
- ✅ Verdicts are accurate and well-formatted
- ✅ SightEngine API processes images without errors
- ✅ All console logs show expected flow
- ✅ No JavaScript errors in console
- ✅ Extension works across different websites

**🎉 If all tests pass, MisinfoGuard is fully functional!**
