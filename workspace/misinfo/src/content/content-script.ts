import { ExtensionMessage } from '../types';

// Content script for MisinfoGuard extension
console.log('MisinfoGuard content script loaded');

// Track if overlay is currently shown
let overlayVisible = false;
let currentOverlay: HTMLElement | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  console.log('Content script received message:', message);
  console.log('Message type:', message.type);
  console.log('Message payload:', message.payload);
  console.log('Sender:', sender);

  switch (message.type) {
    case 'ANALYZE_IMAGE':
      console.log('Handling image analysis request');
      handleAnalyzeImage(message.payload);
      sendResponse({ success: true });
      break;

    case 'ANALYZE_TEXT':
      console.log('Handling text analysis request');
      handleAnalyzeText(message.payload);
      sendResponse({ success: true });
      break;

    case 'ANALYZE_IMAGE_FROM_CONTEXT_MENU':
      console.log('Handling image analysis from context menu');
      handleAnalyzeImage(message.payload);
      sendResponse({ success: true });
      break;

    default:
      console.error('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

// Handle image analysis request
async function handleAnalyzeImage(payload: { imageUrl: string; autoAnalyze: boolean }) {
  try {
    const { imageUrl, autoAnalyze } = payload;
    
    if (autoAnalyze) {
      // Show loading overlay
      showAnalysisOverlay(imageUrl);
      
      // In a real implementation, we would:
      // 1. Fetch the image
      // 2. Send it to our analysis APIs
      // 3. Show results in overlay
      
      // For now, simulate analysis
      setTimeout(() => {
        hideAnalysisOverlay();
        showResultsNotification();
      }, 3000);
    } else {
      // Just open the popup for manual analysis
      chrome.runtime.sendMessage({
        type: 'OPEN_POPUP',
        payload: { imageUrl }
      });
    }
  } catch (error) {
    console.error('Analysis error:', error);
    hideAnalysisOverlay();
  }
}

// Handle text analysis request
async function handleAnalyzeText(payload: { text: string; autoAnalyze: boolean }) {
  console.log('Content script: handleAnalyzeText called with:', payload);
  console.log('Content script: Text to analyze:', payload.text);
  console.log('Content script: Auto analyze:', payload.autoAnalyze);

  try {
    const { text, autoAnalyze } = payload;

    if (autoAnalyze) {
      // Show loading overlay for text analysis
      console.log('Content script: Showing text analysis overlay');
      showTextAnalysisOverlay(text);

      // Perform actual fact-checking
      try {
        console.log('Content script: Sending ANALYZE_TEXT message to background');
        const response = await chrome.runtime.sendMessage({
          type: 'ANALYZE_TEXT',
          payload: { text }
        });

        console.log('Content script: Received response from background:', response);
        hideAnalysisOverlay();

        if (response.success && response.data) {
          console.log('Content script: Showing fact-check popup');
          showFactCheckPopup(text, response.data);
        } else {
          console.error('Content script: Analysis failed:', response.error);
          showTextResultsNotification(text, response.error || 'Analysis failed. Please check your API configuration.');
        }
      } catch (error) {
        console.error('Content script: Error during analysis:', error);
        hideAnalysisOverlay();
        showTextResultsNotification(text, 'Analysis failed. Please try again.');
      }
    } else {
      // Just open the popup for manual analysis
      console.log('Content script: Opening popup for manual analysis');
      chrome.runtime.sendMessage({
        type: 'OPEN_POPUP',
        payload: { text }
      });
    }
  } catch (error) {
    console.error('Text analysis error:', error);
    hideAnalysisOverlay();
  }
}

// Show text analysis overlay
function showTextAnalysisOverlay(text: string) {
  if (overlayVisible) return;
  
  overlayVisible = true;
  
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'misinfoguard-text-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  // Create content container
  const container = document.createElement('div');
  container.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    text-align: center;
  `;
  
  // Add content
  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="width: 48px; height: 48px; margin: 0 auto 16px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      </div>
      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
        Analyzing Text
      </h3>
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
        Fact-checking and analyzing selected text...
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 12px; margin-bottom: 16px; max-height: 100px; overflow-y: auto; text-align: left;">
        <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.4;">
          "${text.length > 200 ? text.substring(0, 200) + '...' : text}"
        </p>
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
        <div id="text-progress-bar" style="width: 0%; height: 100%; background: #10b981; border-radius: 2px; transition: width 0.3s ease;"></div>
      </div>
    </div>
    
    <button id="cancel-text-analysis" style="
      background: #f3f4f6;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      color: #374151;
      cursor: pointer;
      transition: background-color 0.2s;
    ">
      Cancel
    </button>
  `;
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  currentOverlay = overlay;
  
  // Animate progress bar
  const progressBar = container.querySelector('#text-progress-bar') as HTMLElement;
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) {
      progress = 90;
      clearInterval(progressInterval);
    }
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }, 200);
  
  // Handle cancel button
  const cancelButton = container.querySelector('#cancel-text-analysis');
  cancelButton?.addEventListener('click', () => {
    clearInterval(progressInterval);
    hideAnalysisOverlay();
  });
  
  // Handle overlay click (close)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      clearInterval(progressInterval);
      hideAnalysisOverlay();
    }
  });
}

// Show fact-check popup with detailed results
function showFactCheckPopup(text: string, analysisResult: any) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.id = 'misinfoguard-factcheck-popup';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const factCheck = analysisResult.factCheck || {};
  const verdict = factCheck.verdict || 'UNVERIFIABLE';
  const confidence = Math.round((factCheck.confidence || 0) * 100);
  
  // Determine colors based on verdict
  let verdictColor = '#6b7280'; // gray for unverifiable
  let verdictBg = '#f3f4f6';
  let borderColor = '#d1d5db';
  
  if (verdict === 'TRUE') {
    verdictColor = '#059669';
    verdictBg = '#d1fae5';
    borderColor = '#10b981';
  } else if (verdict === 'FALSE') {
    verdictColor = '#dc2626';
    verdictBg = '#fee2e2';
    borderColor = '#ef4444';
  } else if (verdict === 'PARTIALLY TRUE') {
    verdictColor = '#d97706';
    verdictBg = '#fef3c7';
    borderColor = '#f59e0b';
  }
  
  // Create content container
  const container = document.createElement('div');
  container.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 2px solid ${borderColor};
  `;
  
  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: ${verdictBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid ${borderColor};">
        ${verdict === 'TRUE' ? 
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + verdictColor + '" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' :
          verdict === 'FALSE' ?
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + verdictColor + '" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' :
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + verdictColor + '" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        }
      </div>
      <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${verdictColor};">
        ${verdict}
      </h2>
      <div style="background: ${verdictBg}; color: ${verdictColor}; padding: 6px 12px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: 600;">
        ${confidence}% Confidence
      </div>
    </div>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">
        Analyzed Text:
      </h4>
      <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5; font-style: italic;">
        "${text.length > 200 ? text.substring(0, 200) + '...' : text}"
      </p>
    </div>
    
    ${factCheck.explanation ? `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
          Explanation
        </h4>
        <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
          ${factCheck.explanation}
        </p>
      </div>
    ` : ''}
    
    ${factCheck.correction ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #dc2626; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
          Correction
        </h4>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6;">
          ${factCheck.correction}
        </p>
      </div>
    ` : ''}
    
    ${factCheck.sources && factCheck.sources.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
          Sources
        </h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
          ${factCheck.sources.map((source: string) => `<li style="margin-bottom: 4px;">${source}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="close-factcheck" style="
        background: #6b7280;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
      ">
        Close
      </button>
      <button id="open-extension" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
      ">
        View in Extension
      </button>
    </div>
  `;
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // Handle close button
  const closeButton = container.querySelector('#close-factcheck');
  closeButton?.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  // Handle extension button
  const extensionButton = container.querySelector('#open-extension');
  extensionButton?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    document.body.removeChild(overlay);
  });
  
  // Handle overlay click (close)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
  
  // Handle escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Show text analysis results notification
function showTextResultsNotification(text: string, message?: string) {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 10001;
    max-width: 350px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border-left: 4px solid #10b981;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="width: 20px; height: 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
          ${message ? 'Analysis Error' : 'Text Analysis Complete'}
        </h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
          "${text.length > 50 ? text.substring(0, 50) + '...' : text}"
        </p>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
          ${message || 'Click the extension icon to view detailed results'}
        </p>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 12px;
          color: #3b82f6;
          cursor: pointer;
          padding: 0;
        ">
          Dismiss
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 7 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 7000);
}

// Show analysis overlay on the page
function showAnalysisOverlay(_imageUrl: string) {
  if (overlayVisible) return;
  
  overlayVisible = true;
  
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'misinfoguard-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  // Create content container
  const container = document.createElement('div');
  container.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    text-align: center;
  `;
  
  // Add content
  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div style="width: 48px; height: 48px; margin: 0 auto 16px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M9 12l2 2 4-4"/>
          <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
          <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
        </svg>
      </div>
      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
        Analyzing Image
      </h3>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        Checking for AI-generated content and extracting text...
      </p>
    </div>
    
    <div style="margin-bottom: 16px;">
      <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
        <div id="progress-bar" style="width: 0%; height: 100%; background: #3b82f6; border-radius: 2px; transition: width 0.3s ease;"></div>
      </div>
    </div>
    
    <button id="cancel-analysis" style="
      background: #f3f4f6;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      color: #374151;
      cursor: pointer;
      transition: background-color 0.2s;
    ">
      Cancel
    </button>
  `;
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  currentOverlay = overlay;
  
  // Animate progress bar
  const progressBar = container.querySelector('#progress-bar') as HTMLElement;
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) {
      progress = 90;
      clearInterval(progressInterval);
    }
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }, 200);
  
  // Handle cancel button
  const cancelButton = container.querySelector('#cancel-analysis');
  cancelButton?.addEventListener('click', () => {
    clearInterval(progressInterval);
    hideAnalysisOverlay();
  });
  
  // Handle overlay click (close)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      clearInterval(progressInterval);
      hideAnalysisOverlay();
    }
  });
}

// Hide analysis overlay
function hideAnalysisOverlay() {
  if (!overlayVisible || !currentOverlay) return;
  
  overlayVisible = false;
  
  // Fade out animation
  currentOverlay.style.opacity = '0';
  currentOverlay.style.transition = 'opacity 0.3s ease';
  
  setTimeout(() => {
    if (currentOverlay && currentOverlay.parentNode) {
      currentOverlay.parentNode.removeChild(currentOverlay);
    }
    currentOverlay = null;
  }, 300);
}

// Show results notification
function showResultsNotification() {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 10001;
    max-width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border-left: 4px solid #10b981;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="width: 20px; height: 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
          Analysis Complete
        </h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
          Click the extension icon to view detailed results
        </p>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 12px;
          color: #3b82f6;
          cursor: pointer;
          padding: 0;
        ">
          Dismiss
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}

// Handle drag and drop on the page (optional enhancement)
let dragCounter = 0;

document.addEventListener('dragenter', (e) => {
  dragCounter++;
  
  // Check if dragged items include images
  const items = e.dataTransfer?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        showDragOverlay();
        break;
      }
    }
  }
});

document.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter === 0) {
    hideDragOverlay();
  }
});

document.addEventListener('drop', (e) => {
  dragCounter = 0;
  hideDragOverlay();
  
  // Handle dropped images
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        e.preventDefault();
        // Open extension popup for dropped images
        chrome.runtime.sendMessage({
          type: 'OPEN_POPUP',
          payload: { droppedFiles: Array.from(files) }
        });
        break;
      }
    }
  }
});

let dragOverlay: HTMLElement | null = null;

function showDragOverlay() {
  if (dragOverlay) return;
  
  dragOverlay = document.createElement('div');
  dragOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(59, 130, 246, 0.1);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
  `;
  
  dragOverlay.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      border: 2px dashed #3b82f6;
    ">
      <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1f2937;">
        Drop images here
      </h3>
      <p style="margin: 0; color: #6b7280;">
        Release to analyze with MisinfoGuard
      </p>
    </div>
  `;
  
  document.body.appendChild(dragOverlay);
}

function hideDragOverlay() {
  if (dragOverlay) {
    dragOverlay.style.opacity = '0';
    dragOverlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
      if (dragOverlay && dragOverlay.parentNode) {
        dragOverlay.parentNode.removeChild(dragOverlay);
      }
      dragOverlay = null;
    }, 200);
  }
}

// Prevent default drag behavior for images
document.addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault();
  }
});

export {};
