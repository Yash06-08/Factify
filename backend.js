// Backend API Configuration and Services
// This file manages API keys and provides backend services for the misinformation detection platform

// API Configuration
const API_CONFIG = {
  // Gemini AI API for advanced fact-checking and content analysis
  gemini: {
    apiKey:
      process.env.GEMINI_API_KEY || "AIzaSyD5FEzRqDyZnuteVa8Y300DhjXJKq3bJ_w",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-pro",
    maxTokens: 2048,
    temperature: 0.3,
  },

  // OCR.space API for text extraction from images
  ocrSpace: {
    apiKey: process.env.OCR_SPACE_API_KEY || "K88134829588957",
    baseUrl: "https://api.ocr.space/parse/image",
    language: "eng",
    isOverlayRequired: false,
    detectOrientation: true,
    scale: true,
    isTable: false,
  },

  // SightEngine API for content moderation and image analysis
  sightEngine: {
    apiUser: process.env.SIGHTENGINE_API_USER || "1186115535",
    apiSecret:
      process.env.SIGHTENGINE_API_SECRET || "AmaCWwAYwZ8kUjcQUEbsvntB7pPSt7ej",
    baseUrl: "https://api.sightengine.com/1.0/check.json",
    models:
      "nudity,wad,offensive,face-attributes,celebrity,text-content,gore,qr-content",
  },

  // Laughing Face API (placeholder - replace with actual API if available)
  laughingFace: {
    apiKey:
      process.env.LAUGHING_FACE_API_KEY || "YOUR_LAUGHING_FACE_API_KEY_HERE",
    baseUrl: "https://api.laughingface.ai/v1",
    endpoint: "/detect-humor",
  },
};

// Utility Functions
class APIService {
  constructor() {
    this.rateLimits = new Map();
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  // Rate limiting helper
  checkRateLimit(service, limit = 100, window = 3600000) {
    // 100 requests per hour by default
    const now = Date.now();
    const key = `${service}_${Math.floor(now / window)}`;
    const current = this.rateLimits.get(key) || 0;

    if (current >= limit) {
      throw new Error(`Rate limit exceeded for ${service}. Try again later.`);
    }

    this.rateLimits.set(key, current + 1);
    return true;
  }

  // Cache helper
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Generic API request helper
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MisinfoGuard/1.0",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API Request failed:", error);
      throw error;
    }
  }
}

// Gemini AI Service for advanced fact-checking
class GeminiService extends APIService {
  async analyzeContent(content, type = "text") {
    this.checkRateLimit("gemini", 50); // 50 requests per hour

    const cacheKey = `gemini_${type}_${this.hashString(content)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prompt = this.buildFactCheckPrompt(content, type);

    try {
      const response = await this.makeRequest(
        `${API_CONFIG.gemini.baseUrl}/models/${API_CONFIG.gemini.model}:generateContent`,
        {
          headers: {
            "x-goog-api-key": API_CONFIG.gemini.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: API_CONFIG.gemini.temperature,
              maxOutputTokens: API_CONFIG.gemini.maxTokens,
            },
          }),
        }
      );

      const result = this.parseGeminiResponse(response);
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.getFallbackAnalysis(content);
    }
  }

  buildFactCheckPrompt(content, type) {
    return `As an expert fact-checker, analyze the following ${type} content for misinformation, bias, and credibility. Provide a detailed analysis including:

1. Credibility Score (0-100)
2. Key Claims Identified
3. Fact-Check Results
4. Source Reliability Assessment
5. Potential Red Flags
6. Recommendations

Content to analyze:
${content}

Please respond in JSON format with the following structure:
{
    "credibilityScore": number,
    "verdict": "credible|questionable|false",
    "keyClaims": [array of claims],
    "factCheckResults": [array of fact-check results],
    "sourceReliability": "high|medium|low",
    "redFlags": [array of concerns],
    "recommendations": [array of recommendations],
    "explanation": "detailed explanation"
}`;
  }

  parseGeminiResponse(response) {
    try {
      const content = response.candidates[0].content.parts[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        // Fallback parsing if JSON is not properly formatted
        return this.extractAnalysisFromText(content);
      }
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      return this.getFallbackAnalysis();
    }
  }

  extractAnalysisFromText(text) {
    // Extract key information from unstructured text response
    const credibilityMatch = text.match(/credibility.*?(\d+)/i);
    const verdictMatch = text.match(/verdict.*?(credible|questionable|false)/i);

    return {
      credibilityScore: credibilityMatch ? parseInt(credibilityMatch[1]) : 50,
      verdict: verdictMatch ? verdictMatch[1].toLowerCase() : "questionable",
      explanation: text.substring(0, 500) + "...",
      keyClaims: [],
      factCheckResults: [],
      sourceReliability: "medium",
      redFlags: [],
      recommendations: [
        "Verify with additional sources",
        "Check original source credibility",
      ],
    };
  }

  getFallbackAnalysis(content = "") {
    // Provide basic analysis when API is unavailable
    const hasScamKeywords =
      /urgent|winner|lottery|free money|limited time|click here/i.test(content);
    const hasHealthClaims = /cure|miracle|treatment|covid|vaccine/i.test(
      content
    );

    if (hasScamKeywords) {
      return {
        credibilityScore: 15,
        verdict: "false",
        explanation:
          "Content contains common scam indicators and urgency tactics.",
        keyClaims: [
          "Contains urgency tactics",
          "Suspicious promotional language",
        ],
        factCheckResults: ["High probability of fraudulent content"],
        sourceReliability: "low",
        redFlags: ["Urgency tactics", "Suspicious claims"],
        recommendations: [
          "Do not engage",
          "Report as spam",
          "Verify through official channels",
        ],
      };
    } else if (hasHealthClaims) {
      return {
        credibilityScore: 35,
        verdict: "questionable",
        explanation:
          "Content contains health claims that require medical verification.",
        keyClaims: ["Medical/health claims present"],
        factCheckResults: ["Requires professional medical verification"],
        sourceReliability: "medium",
        redFlags: ["Unverified health claims"],
        recommendations: [
          "Consult healthcare professionals",
          "Check with WHO/CDC",
          "Verify with peer-reviewed studies",
        ],
      };
    } else {
      return {
        credibilityScore: 70,
        verdict: "credible",
        explanation:
          "Content appears legitimate but always verify important information.",
        keyClaims: [],
        factCheckResults: ["No obvious red flags detected"],
        sourceReliability: "medium",
        redFlags: [],
        recommendations: [
          "Cross-reference with multiple sources",
          "Check publication date",
          "Verify author credentials",
        ],
      };
    }
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

// OCR.space Service for image text extraction
class OCRService extends APIService {
  async extractTextFromImage(imageFile) {
    this.checkRateLimit("ocr", 25); // 25 requests per hour

    try {
      const formData = new FormData();
      formData.append("apikey", API_CONFIG.ocrSpace.apiKey);
      formData.append("language", API_CONFIG.ocrSpace.language);
      formData.append(
        "isOverlayRequired",
        API_CONFIG.ocrSpace.isOverlayRequired
      );
      formData.append(
        "detectOrientation",
        API_CONFIG.ocrSpace.detectOrientation
      );
      formData.append("scale", API_CONFIG.ocrSpace.scale);
      formData.append("isTable", API_CONFIG.ocrSpace.isTable);
      formData.append("file", imageFile);

      const response = await fetch(API_CONFIG.ocrSpace.baseUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage || "OCR processing failed");
      }

      return {
        success: true,
        text: result.ParsedResults[0]?.ParsedText || "",
        confidence: result.ParsedResults[0]?.TextOverlay?.HasOverlay
          ? "high"
          : "medium",
      };
    } catch (error) {
      console.error("OCR Service error:", error);
      return {
        success: false,
        text: "",
        error: error.message,
      };
    }
  }
}

// SightEngine Service for content moderation
class SightEngineService extends APIService {
  async analyzeImage(imageUrl) {
    this.checkRateLimit("sightengine", 100); // 100 requests per hour

    try {
      const params = new URLSearchParams({
        models: API_CONFIG.sightEngine.models,
        api_user: API_CONFIG.sightEngine.apiUser,
        api_secret: API_CONFIG.sightEngine.apiSecret,
        url: imageUrl,
      });

      const response = await fetch(
        `${API_CONFIG.sightEngine.baseUrl}?${params}`
      );
      const result = await response.json();

      return {
        success: true,
        moderation: {
          nudity: result.nudity?.safe || 1,
          violence: result.gore?.prob || 0,
          offensive: result.offensive?.prob || 0,
          faces: result.faces || [],
          text: result.text || {},
          celebrities: result.celebrity || [],
        },
        safe: this.calculateSafetyScore(result),
      };
    } catch (error) {
      console.error("SightEngine Service error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  calculateSafetyScore(result) {
    let score = 100;

    if (result.nudity && result.nudity.safe < 0.8) score -= 30;
    if (result.gore && result.gore.prob > 0.3) score -= 40;
    if (result.offensive && result.offensive.prob > 0.5) score -= 25;

    return Math.max(0, score);
  }
}

// Laughing Face Service (placeholder implementation)
class LaughingFaceService extends APIService {
  async detectHumor(content) {
    this.checkRateLimit("laughingface", 50); // 50 requests per hour

    try {
      // This is a placeholder implementation
      // Replace with actual Laughing Face API calls when available
      const response = await this.makeRequest(
        `${API_CONFIG.laughingFace.baseUrl}${API_CONFIG.laughingFace.endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${API_CONFIG.laughingFace.apiKey}`,
          },
          body: JSON.stringify({
            content: content,
            analysis_type: "humor_detection",
          }),
        }
      );

      return {
        success: true,
        humorScore: response.humor_score || 0,
        humorType: response.humor_type || "none",
        confidence: response.confidence || 0,
      };
    } catch (error) {
      console.error("Laughing Face Service error:", error);
      // Fallback humor detection
      return this.fallbackHumorDetection(content);
    }
  }

  fallbackHumorDetection(content) {
    const humorKeywords = [
      "joke",
      "funny",
      "lol",
      "haha",
      "humor",
      "comedy",
      "laugh",
      "amusing",
    ];
    const sarcasmKeywords = ["obviously", "sure", "yeah right", "totally"];

    let humorScore = 0;
    let humorType = "none";

    const lowerContent = content.toLowerCase();

    humorKeywords.forEach((keyword) => {
      if (lowerContent.includes(keyword)) humorScore += 10;
    });

    sarcasmKeywords.forEach((keyword) => {
      if (lowerContent.includes(keyword)) {
        humorScore += 15;
        humorType = "sarcasm";
      }
    });

    if (humorScore > 20) humorType = "humor";

    return {
      success: true,
      humorScore: Math.min(100, humorScore),
      humorType,
      confidence: humorScore > 0 ? 0.6 : 0.3,
    };
  }
}

// Main Backend Service Class
class BackendService {
  constructor() {
    this.gemini = new GeminiService();
    this.ocr = new OCRService();
    this.sightEngine = new SightEngineService();
    this.laughingFace = new LaughingFaceService();
  }

  // Comprehensive content analysis
  async analyzeContent(content, type = "text", imageFile = null) {
    const results = {
      timestamp: new Date().toISOString(),
      contentType: type,
      analysis: {},
    };

    try {
      // Text analysis with Gemini
      if (content) {
        results.analysis.factCheck = await this.gemini.analyzeContent(
          content,
          type
        );
        results.analysis.humor = await this.laughingFace.detectHumor(content);
      }

      // Image analysis
      if (imageFile && type === "image") {
        // Extract text from image
        const ocrResult = await this.ocr.extractTextFromImage(imageFile);
        if (ocrResult.success && ocrResult.text) {
          results.analysis.extractedText = ocrResult.text;
          results.analysis.factCheck = await this.gemini.analyzeContent(
            ocrResult.text,
            "extracted_text"
          );
        }

        // Content moderation
        if (imageFile instanceof File) {
          const imageUrl = URL.createObjectURL(imageFile);
          results.analysis.moderation = await this.sightEngine.analyzeImage(
            imageUrl
          );
        }
      }

      return results;
    } catch (error) {
      console.error("Backend analysis error:", error);
      return {
        ...results,
        error: error.message,
        analysis: {
          factCheck: this.gemini.getFallbackAnalysis(content),
        },
      };
    }
  }

  // Health check for all services
  async healthCheck() {
    const services = {
      gemini: false,
      ocr: false,
      sightEngine: false,
      laughingFace: false,
    };

    // Test each service with minimal requests
    try {
      await this.gemini.analyzeContent("test", "text");
      services.gemini = true;
    } catch (e) {
      console.warn("Gemini service unavailable");
    }

    // Add health checks for other services as needed

    return {
      status: Object.values(services).some((s) => s) ? "partial" : "down",
      services,
      timestamp: new Date().toISOString(),
    };
  }

  // Configuration management
  updateConfig(service, config) {
    if (API_CONFIG[service]) {
      Object.assign(API_CONFIG[service], config);
      return true;
    }
    return false;
  }

  getConfig(service) {
    if (service) {
      return API_CONFIG[service]
        ? { ...API_CONFIG[service], apiKey: "***" }
        : null;
    }
    return Object.keys(API_CONFIG).reduce((acc, key) => {
      acc[key] = { ...API_CONFIG[key], apiKey: "***" };
      return acc;
    }, {});
  }
}

// Export for use in frontend
if (typeof window !== "undefined") {
  window.BackendService = BackendService;
  window.API_CONFIG = API_CONFIG;
} else if (typeof module !== "undefined") {
  module.exports = { BackendService, API_CONFIG };
}

// Initialize global backend service
const backendService = new BackendService();

// Environment setup instructions
console.log(`
🔧 Backend Service Initialized

To use all features, set these environment variables:
- GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey
- OCR_SPACE_API_KEY: Get from https://ocr.space/ocrapi
- SIGHTENGINE_API_USER & SIGHTENGINE_API_SECRET: Get from https://sightengine.com/
- LAUGHING_FACE_API_KEY: Replace with actual API when available

Current status: ${Object.keys(API_CONFIG).length} services configured
`);
