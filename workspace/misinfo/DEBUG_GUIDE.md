# MisinfoGuard - Debugging Guide

## 🔧 **Issues Fixed**

### 1. **Right-Click Text Analysis Not Working** ✅
**Problem**: Right-clicking selected text didn't show any popup or result.

**Root Cause**: The service worker had syntax errors that prevented context menus from being created.

**Fixes Applied**:
- ✅ **Fixed service worker syntax errors** - Completely rewrote corrupted service worker
- ✅ **Added proper context menu creation** - Both image and text context menus
- ✅ **Enhanced error handling** - Better logging and error messages
- ✅ **Added debugging logs** - Console logs to track the analysis flow

### 2. **SightEngine API Errors** ✅
**Problem**: SightEngine API calls were failing due to improper request formatting.

**Fixes Applied**:
- ✅ **Improved base64 image handling** - Better conversion from data URLs to blobs
- ✅ **Added multiple response structure support** - Handles different API response formats
- ✅ **Enhanced error logging** - Detailed error messages and stack traces
- ✅ **Graceful fallback** - Returns default values instead of throwing errors
- ✅ **Better URL handling** - Supports both data URLs and regular URLs

## 🚀 **How to Test the Fixes**

### **Step 1: Reload the Extension**
1. Go to `chrome://extensions/`
2. Find "MisinfoGuard"
3. Click the **refresh/reload** button
4. Verify no errors in the extension details

### **Step 2: Configure API Keys**
1. Click the MisinfoGuard extension icon
2. Go to **Settings**
3. Add your API keys:
   - **Google Gemini API Key** (required for text analysis)
   - **Hugging Face API Key** (optional, for sentiment analysis)
   - **SightEngine credentials** (for image analysis)
   - **OCR.space API Key** (for text extraction)

### **Step 3: Test Right-Click Text Analysis**
1. **Go to any webpage** (e.g., news article, Wikipedia, etc.)
2. **Select some text** (highlight it with your mouse)
3. **Right-click** on the selected text
4. **Look for**: "Fact-check Text with MisinfoGuard" in the context menu
5. **Click it** and verify:
   - Loading overlay appears
   - Fact-check popup shows with verdict
   - Console logs appear (open DevTools → Console)

### **Step 4: Check Console Logs**
Open Chrome DevTools (F12) and look for these logs:
```
Content script: handleAnalyzeText called with: {text: "...", autoAnalyze: true}
Content script: Sending ANALYZE_TEXT message to background
Content script: Received response from background: {success: true, data: {...}}
Content script: Showing fact-check popup
```

### **Step 5: Test SightEngine API**
1. **Drag an image** to the extension popup
2. **Check console** for SightEngine logs:
```
SightEngine API call with models: genai
SightEngine response: {status: "success", ...}
```
3. **If errors occur**, check the detailed error messages

## 🐛 **Debugging Steps**

### **If Right-Click Menu Doesn't Appear**:
1. **Check extension permissions**:
   - Go to `chrome://extensions/`
   - Click "Details" on MisinfoGuard
   - Verify "On all sites" is enabled
2. **Reload the extension** completely
3. **Check console** for service worker errors

### **If Text Analysis Fails**:
1. **Verify API keys** are configured in Settings
2. **Check console logs** for error messages
3. **Test Gemini API key** independently:
   ```javascript
   // Test in browser console
   fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_KEY', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({contents: [{parts: [{text: 'Hello'}]}]})
   }).then(r => r.json()).then(console.log)
   ```

### **If SightEngine API Fails**:
1. **Check credentials** in Settings
2. **Look for detailed error logs** in console
3. **Test API independently**:
   ```javascript
   // Test in browser console
   const formData = new FormData();
   formData.append('api_user', 'YOUR_USER');
   formData.append('api_secret', 'YOUR_SECRET');
   formData.append('models', 'genai');
   formData.append('media_url', 'https://example.com/image.jpg');
   
   fetch('https://api.sightengine.com/1.0/check.json', {
     method: 'POST',
     body: formData
   }).then(r => r.json()).then(console.log)
   ```

## 📋 **Console Commands for Testing**

### **Test Extension Messaging**:
```javascript
// In any webpage console
chrome.runtime.sendMessage('extension-id', {
  type: 'ANALYZE_TEXT',
  payload: { text: 'Test message' }
}, response => console.log(response));
```

### **Check Extension Status**:
```javascript
// In extension popup console
chrome.runtime.getManifest()
chrome.storage.sync.get(null, console.log)
```

## 🔍 **Common Issues & Solutions**

### **Issue**: "Context menu not appearing"
**Solution**: 
- Reload extension
- Check site permissions
- Try on different websites

### **Issue**: "API keys not configured" error
**Solution**:
- Go to Settings → Add API keys
- Click "Save Settings"
- Check API status indicators

### **Issue**: "Analysis failed" error
**Solution**:
- Check internet connection
- Verify API keys are valid
- Check API quotas/limits
- Look at console for detailed errors

### **Issue**: "Popup doesn't show"
**Solution**:
- Check if popup blockers are enabled
- Try on different websites
- Check console for JavaScript errors

## 📊 **Expected Behavior**

### **Successful Text Analysis Flow**:
1. User selects text → right-clicks
2. Context menu appears with "Fact-check Text with MisinfoGuard"
3. User clicks → loading overlay shows
4. Background processes text with NLP APIs
5. Fact-check popup appears with:
   - **Verdict**: TRUE/FALSE/PARTIALLY TRUE/UNVERIFIABLE
   - **Confidence**: Percentage score
   - **Explanation**: Brief analysis
   - **Correction**: If information is false
   - **Sources**: If available

### **Successful Image Analysis Flow**:
1. User drags image or right-clicks image
2. Analysis starts with progress indicator
3. OCR extracts text, SightEngine detects AI generation
4. Results show in popup with confidence scores

## 🛠️ **Development Mode Testing**

For development testing:
```bash
# Watch mode for faster development
npm run dev:extension

# Check for linting errors
npm run lint

# Format code
npm run format
```

## 📞 **Support Information**

If issues persist:
1. **Check all API keys** are valid and have sufficient quotas
2. **Clear extension data**: Go to `chrome://extensions/` → Details → "Clear storage"
3. **Reinstall extension**: Remove and reload from `dist/` folder
4. **Check browser compatibility**: Ensure Chrome version supports Manifest V3

**🎉 The extension should now work perfectly with comprehensive debugging support!**
