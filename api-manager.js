// API Manager - Centralized API Management System
// This file handles all API configurations and service integrations

class APIManager {
  constructor() {
    this.config = null;
    this.services = {};
    this.initialized = false;
    this.loadConfiguration();
  }

  // Load configuration from config.js or fallback values
  loadConfiguration() {
    try {
      // Try to load from window.API_KEYS (set by config.js)
      if (typeof window !== 'undefined' && window.API_KEYS) {
        this.config = window.API_KEYS;
        console.log('✅ Configuration loaded from config.js');
      } else {
        // Fallback configuration
        this.config = {
          GEMINI_API_KEY: 'AIzaSyD5FEzRqDyZnuteVa8Y300DhjXJKq3bJ_w',
          OCR_SPACE_API_KEY: 'K88134829588957',
          SIGHTENGINE_API_USER: '1186115535',
          SIGHTENGINE_API_SECRET: 'AmaCWwAYwZ8kUjcQUEbsvntB7pPSt7ej',
          HUGGING_FACE_API_KEY: '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'
        };
        console.log('⚠️ Using fallback configuration');
      }
      
      this.initializeServices();
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      this.config = {};
    }
  }

  // Initialize all API services
  initializeServices() {
    this.services = {
      gemini: new GeminiAPIService(this.config.GEMINI_API_KEY),
      ocr: new OCRSpaceService(this.config.OCR_SPACE_API_KEY),
      sightEngine: new SightEngineService(this.config.SIGHTENGINE_API_USER, this.config.SIGHTENGINE_API_SECRET),
      huggingFace: new HuggingFaceService(this.config.HUGGING_FACE_API_KEY)
    };
    
    this.initialized = true;
    console.log('🚀 All API services initialized');
  }

  // Check if API keys are configured
  isConfigured(service) {
    const key = this.getAPIKey(service);
    return key && key !== '' && !key.includes('your_') && !key.includes('_here');
  }

  // Get API key for a specific service
  getAPIKey(service) {
    switch (service) {
      case 'gemini':
        return this.config.GEMINI_API_KEY;
      case 'ocr':
        return this.config.OCR_SPACE_API_KEY;
      case 'sightEngine':
        return this.config.SIGHTENGINE_API_USER;
      case 'huggingFace':
        return this.config.HUGGING_FACE_API_KEY;
      default:
        return null;
    }
  }

  // Health check for all services
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      services: {},
      summary: '',
      status: 'checking'
    };

    // Check each service
    for (const [serviceName, service] of Object.entries(this.services)) {
      try {
        results.services[serviceName] = await this.checkService(serviceName, service);
      } catch (error) {
        results.services[serviceName] = {
          status: 'error',
          message: `Health check failed: ${error.message}`,
          lastTest: new Date().toISOString()
        };
      }
    }

    // Calculate overall status
    const statuses = Object.values(results.services).map(s => s.status);
    const connectedCount = statuses.filter(s => s === 'connected').length;
    const totalCount = statuses.length;

    if (connectedCount === totalCount) {
      results.status = 'all_connected';
    } else if (connectedCount > 0) {
      results.status = 'partial';
    } else {
      results.status = 'down';
    }

    results.summary = `${connectedCount}/${totalCount} services connected`;
    
    return results;
  }

  // Check individual service
  async checkService(serviceName, service) {
    const isConfigured = this.isConfigured(serviceName);
    
    if (!isConfigured) {
      return {
        status: 'not_configured',
        message: 'API key not configured or using placeholder value',
        lastTest: new Date().toISOString()
      };
    }

    try {
      // Test the service
      const testResult = await service.testConnection();
      return {
        status: testResult.success ? 'connected' : 'error',
        message: testResult.message || (testResult.success ? 'Service is working' : 'Service test failed'),
        lastTest: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Connection test failed: ${error.message}`,
        lastTest: new Date().toISOString()
      };
    }
  }

  // Analyze content using available services
  async analyzeContent(content, type = 'text') {
    const results = {
      timestamp: new Date().toISOString(),
      contentType: type,
      analysis: {},
      success: false
    };

    try {
      // Gemini AI analysis
      if (this.isConfigured('gemini')) {
        try {
          results.analysis.factCheck = await this.services.gemini.analyzeContent(content);
          results.success = true;
        } catch (error) {
          console.warn('Gemini analysis failed:', error.message);
          results.analysis.factCheck = { error: error.message };
        }
      }

      // Hugging Face analysis
      if (this.isConfigured('huggingFace')) {
        try {
          results.analysis.sentiment = await this.services.huggingFace.analyzeSentiment(content);
          results.analysis.classification = await this.services.huggingFace.classifyText(content);
        } catch (error) {
          console.warn('Hugging Face analysis failed:', error.message);
        }
      }

      return results;
    } catch (error) {
      console.error('Content analysis failed:', error);
      return {
        ...results,
        error: error.message,
        success: false
      };
    }
  }
}

// Individual API Service Classes
class GeminiAPIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test connection'
            }]
          }]
        })
      });

      if (response.ok) {
        return { success: true, message: 'Gemini AI connected successfully' };
      } else {
        const error = await response.text();
        return { success: false, message: `Gemini API error: ${response.status} - ${error}` };
      }
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  async analyzeContent(content) {
    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this content for misinformation and provide a credibility score (0-100): "${content}"`
            }]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
        
        // Extract credibility score (simple pattern matching)
        const scoreMatch = text.match(/(\d+)(?:%|\s*(?:out of|\/)\s*100)/i);
        const credibilityScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;
        
        return {
          success: true,
          credibilityScore,
          analysis: text,
          confidence: credibilityScore / 100
        };
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Gemini analysis failed: ${error.message}`);
    }
  }
}

class OCRSpaceService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.ocr.space/parse/image';
  }

  async testConnection() {
    // OCR.space doesn't have a dedicated test endpoint, so we check if API key is valid format
    if (this.apiKey && this.apiKey.length > 10 && !this.apiKey.includes('your_')) {
      return { success: true, message: 'OCR.space API key configured' };
    }
    return { success: false, message: 'OCR.space API key not properly configured' };
  }

  async extractText(imageFile) {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('apikey', this.apiKey);
      formData.append('language', 'eng');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.IsErroredOnProcessing) {
        throw new Error(data.ErrorMessage || 'OCR processing failed');
      }

      return {
        success: true,
        text: data.ParsedResults?.[0]?.ParsedText || '',
        confidence: 0.8
      };
    } catch (error) {
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }
}

class SightEngineService {
  constructor(apiUser, apiSecret) {
    this.apiUser = apiUser;
    this.apiSecret = apiSecret;
    this.baseUrl = 'https://api.sightengine.com/1.0/check.json';
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}?models=nudity&api_user=${this.apiUser}&api_secret=${this.apiSecret}&url=https://example.com/test.jpg`);
      
      if (response.ok) {
        return { success: true, message: 'SightEngine connected successfully' };
      } else {
        return { success: false, message: `SightEngine API error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  async analyzeImage(imageUrl) {
    try {
      const response = await fetch(`${this.baseUrl}?models=nudity,wad,offensive&api_user=${this.apiUser}&api_secret=${this.apiSecret}&url=${encodeURIComponent(imageUrl)}`);
      
      const data = await response.json();
      
      return {
        success: true,
        moderation: data,
        safe: data.nudity?.safe === true && data.wad?.safe === true
      };
    } catch (error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }
}

class HuggingFaceService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api-inference.huggingface.co/models';
  }

  async testConnection() {
    try {
      const response = await this.analyzeSentiment('Test message');
      return { success: true, message: 'Hugging Face connected successfully' };
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  async analyzeSentiment(content) {
    try {
      const response = await fetch(`${this.baseUrl}/cardiffnlp/twitter-roberta-base-sentiment-latest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: content
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          sentiment: data[0]?.label || 'NEUTRAL',
          confidence: data[0]?.score || 0.5,
          allScores: data
        };
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      // Fallback sentiment analysis
      return this.fallbackSentiment(content);
    }
  }

  async classifyText(content) {
    try {
      const response = await fetch(`${this.baseUrl}/facebook/bart-large-mnli`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: content,
          parameters: {
            candidate_labels: ['factual', 'opinion', 'misleading']
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          classification: data.labels?.[0] || 'unknown',
          confidence: data.scores?.[0] || 0.5,
          allResults: data
        };
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      // Fallback classification
      return this.fallbackClassification(content);
    }
  }

  fallbackSentiment(content) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate'];
    
    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    
    let sentiment = 'NEUTRAL';
    let confidence = 0.5;
    
    if (positiveCount > negativeCount) {
      sentiment = 'POSITIVE';
      confidence = 0.6 + (positiveCount * 0.1);
    } else if (negativeCount > positiveCount) {
      sentiment = 'NEGATIVE';
      confidence = 0.6 + (negativeCount * 0.1);
    }
    
    return {
      success: true,
      sentiment,
      confidence: Math.min(confidence, 0.9),
      allScores: [{ label: sentiment, score: confidence }]
    };
  }

  fallbackClassification(content) {
    const factualIndicators = ['study', 'research', 'data', 'according to'];
    const opinionIndicators = ['i think', 'believe', 'opinion', 'personally'];
    const misleadingIndicators = ['shocking', 'secret', 'they don\'t want you to know'];
    
    const lowerContent = content.toLowerCase();
    
    if (misleadingIndicators.some(indicator => lowerContent.includes(indicator))) {
      return { success: true, classification: 'misleading', confidence: 0.7 };
    } else if (opinionIndicators.some(indicator => lowerContent.includes(indicator))) {
      return { success: true, classification: 'opinion', confidence: 0.6 };
    } else if (factualIndicators.some(indicator => lowerContent.includes(indicator))) {
      return { success: true, classification: 'factual', confidence: 0.6 };
    }
    
    return { success: true, classification: 'factual', confidence: 0.5 };
  }
}

// Initialize global API manager
let apiManager;

function initializeAPIManager() {
  try {
    apiManager = new APIManager();
    
    // Make it globally available
    if (typeof window !== 'undefined') {
      window.apiManager = apiManager;
    }
    
    console.log('🎉 API Manager initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize API Manager:', error);
    return false;
  }
}

// Export for browser and Node.js
if (typeof window !== 'undefined') {
  window.APIManager = APIManager;
  window.initializeAPIManager = initializeAPIManager;
} else if (typeof module !== 'undefined') {
  module.exports = { APIManager, initializeAPIManager };
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAPIManager);
  } else {
    initializeAPIManager();
  }
}
