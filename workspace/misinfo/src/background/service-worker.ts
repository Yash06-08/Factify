import { ExtensionMessage, ExtensionResponse } from '../types';
import { StorageService } from '../services/storage';
import { NLPService } from '../services/nlp';

// Context menu setup
const CONTEXT_MENU_ID = 'misinfoguard-analyze-image';
const TEXT_CONTEXT_MENU_ID = 'misinfoguard-analyze-text';

// Check if Chrome APIs are available (not in dev server)
const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

// Initialize extension
if (isChromeExtension) {
  // Create context menus immediately
  try {
    console.log('Creating context menus...');
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Analyze Image with MisinfoGuard',
      contexts: ['image'],
    });

    chrome.contextMenus.create({
      id: TEXT_CONTEXT_MENU_ID,
      title: 'Fact-check Text with MisinfoGuard',
      contexts: ['selection'],
    });
    console.log('Context menus created successfully');
  } catch (error) {
    console.error('Failed to create context menus:', error);
  }

  chrome.runtime.onInstalled.addListener(async () => {
    // Set default settings if not exists
    try {
      const settings = await StorageService.getSettings();
      console.log('Extension installed, settings loaded:', settings);
      if (!settings.apiConfig.ocrSpaceKey && !settings.apiConfig.sightEngineUser) {
        await StorageService.saveSettings({
          apiConfig: {
            ocrSpaceKey: '',
            sightEngineUser: '',
            sightEngineSecret: '',
            huggingFaceKey: '',
            geminiKey: '',
          },
          theme: 'system',
          autoAnalyze: true,
          showConfidenceScores: true,
          saveHistory: true,
          notifications: true,
          popupSize: 'normal',
        });
        console.log('Default settings initialized.');
      }
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  });

  // Handle context menu clicks
  chrome.contextMenus?.onClicked?.addListener(async (info, tab) => {
    console.log('Background: Context menu clicked');
    console.log('Background: Menu item ID:', info.menuItemId);
    console.log('Background: Info object:', info);
    console.log('Background: Tab object:', tab);

    if (info.menuItemId === CONTEXT_MENU_ID && info.srcUrl && tab?.id) {
      try {
        // Get user settings
        const settings = await StorageService.getSettings();
        
        if (!settings.apiConfig.ocrSpaceKey || !settings.apiConfig.sightEngineUser || !settings.apiConfig.sightEngineSecret) {
          // Show notification to configure APIs
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: 'MisinfoGuard',
            message: 'Please configure your API keys in the extension settings first.',
          });
          
          // Open popup
          chrome.action.openPopup();
          return;
        }

        // Inject content script if needed and send analysis request
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/content-script.js'],
        });

        // Send message to content script
        chrome.tabs.sendMessage(tab.id, {
          type: 'ANALYZE_IMAGE_FROM_CONTEXT_MENU',
          payload: {
            imageUrl: info.srcUrl,
            autoAnalyze: settings.autoAnalyze,
          },
        });

        // Show notification if enabled
        if (settings.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: 'MisinfoGuard',
            message: 'Starting image analysis...',
          });
        }
      } catch (error) {
        console.error('Context menu error:', error);
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'MisinfoGuard Error',
          message: 'Failed to analyze image. Please try again.',
        });
      }
    }
    
    // Handle text analysis
    if (info.menuItemId === TEXT_CONTEXT_MENU_ID && info.selectionText && tab?.id) {
      try {
        // Get user settings
        const settings = await StorageService.getSettings();
        
        if (!settings.apiConfig.huggingFaceKey && !settings.apiConfig.geminiKey) {
          // Show notification to configure APIs
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: 'MisinfoGuard',
            message: 'Please configure your NLP API keys in the extension settings first.',
          });
          
          // Open popup
          chrome.action.openPopup();
          return;
        }

        // Inject content script if needed and send analysis request
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/content-script.js'],
        });

        // Send message to content script
        chrome.tabs.sendMessage(tab.id, {
          type: 'ANALYZE_TEXT',
          payload: {
            text: info.selectionText,
            autoAnalyze: settings.autoAnalyze,
          },
        });

        // Show notification if enabled
        if (settings.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: 'MisinfoGuard',
            message: 'Starting text analysis and fact-checking...',
          });
        }
      } catch (error) {
        console.error('Text analysis error:', error);
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'MisinfoGuard Error',
          message: 'Failed to analyze text. Please try again.',
        });
      }
    }
  });

  // Handle messages from popup and content scripts
  chrome.runtime?.onMessage?.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      handleMessage(message, _sender)
        .then(response => sendResponse(response))
        .catch(error => {
          console.error('Message handling error:', error);
          sendResponse({
            success: false,
            error: error.message || 'Unknown error occurred',
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    }
  );

  // Handle extension icon clicks
  chrome.action?.onClicked?.addListener(async (tab) => {
    // This will open the popup automatically due to the manifest configuration
    // But we can add additional logic here if needed
    console.log('Extension icon clicked', tab);
  });

  // Handle notifications clicks
  chrome.notifications?.onClicked?.addListener((notificationId) => {
    // Open popup when notification is clicked
    chrome.action?.openPopup();
    chrome.notifications?.clear(notificationId);
  });

  // Handle extension updates
  chrome.runtime?.onUpdateAvailable?.addListener(() => {
    console.log('Extension update available');
    // Could show a notification to restart the extension
  });

  // Clean up on extension shutdown
  chrome.runtime?.onSuspend?.addListener(() => {
    console.log('Extension suspending');
    // Clean up any ongoing operations
  });

} // End of isChromeExtension check

// Message handler function (available in both dev and extension modes)
async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'GET_SETTINGS':
      try {
        const settings = await StorageService.getSettings();
        return { success: true, data: settings };
      } catch (error) {
        console.error('Failed to get settings:', error);
        return { success: false, error: 'Failed to retrieve settings.' };
      }

    case 'SAVE_SETTINGS':
      try {
        const { settings } = message.payload;
        await StorageService.saveSettings(settings);
        return { success: true, data: settings };
      } catch (error) {
        console.error('Failed to save settings:', error);
        return { success: false, error: 'Failed to save settings.' };
      }

    case 'ANALYZE_TEXT':
      try {
        const { text } = message.payload;
        const settings = await StorageService.getSettings();
        
        if (!settings.apiConfig.huggingFaceKey && !settings.apiConfig.geminiKey) {
          return { success: false, error: 'NLP API keys not configured. Please add Hugging Face and/or Gemini API keys in settings.' };
        }
        
        const nlpService = new NLPService(settings.apiConfig);
        const result = await nlpService.analyzeText(text);
        
        return { success: true, data: result };
      } catch (error) {
        console.error('Text analysis failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Text analysis failed.' };
      }

    case 'DETECT_QR_CODE':
      try {
        const { imageUrl: _imageUrl } = message.payload;
        // QR code detection would be implemented here
        return { success: true, data: null };
      } catch (error) {
        console.error('QR code detection failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'QR code detection failed.' };
      }

    case 'GET_ANALYSIS_HISTORY':
    case 'GET_HISTORY':
      try {
        const history = await StorageService.getHistory();
        return { success: true, data: history };
      } catch (error) {
        console.error('Failed to get analysis history:', error);
        return { success: false, error: 'Failed to retrieve analysis history.' };
      }

    case 'CLEAR_ANALYSIS_HISTORY':
    case 'CLEAR_HISTORY':
      try {
        await StorageService.clearHistory();
        return { success: true, data: null };
      } catch (error) {
        console.error('Failed to clear analysis history:', error);
        return { success: false, error: 'Failed to clear analysis history.' };
      }

    default:
      return {
        success: false,
        error: `Unknown message type: ${message.type}`
      };
  }
}

// For development mode, provide a fallback
if (!isChromeExtension) {
  console.log('MisinfoGuard: Running in development mode without Chrome APIs');
}

// Export for testing (if needed)
export { handleMessage };