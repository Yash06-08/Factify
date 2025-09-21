// MisinfoGuard API Configuration
// This file contains the actual API keys for the application

const API_KEYS = {
  // Gemini AI API Key
  // Get from: https://makersuite.google.com/app/apikey
  // IMPORTANT: Replace with your actual Gemini API key
  GEMINI_API_KEY: "AIzaSyAzLVH7FTxW2hn_mwM4vSI-KI4VQp28GzQ",

  // Perplexity AI API Key
  // Get from: https://www.perplexity.ai/settings/api
  // Used for: Advanced fact-checking, chatbot, research, image analysis
  PERPLEXITY_API_KEY: "your_perplexity_api_key_here",

  // OCR.space API Key
  // Get from: https://ocr.space/ocrapi
  OCR_SPACE_API_KEY: "K88134829588957",

  // SightEngine API Credentials
  // Get from: https://sightengine.com/
  SIGHTENGINE_API_USER: "1186115535",
  SIGHTENGINE_API_SECRET: "AmaCWwAYwZ8kUjcQUEbsvntB7pPSt7ej",

  // Hugging Face API Key
  // Get from: https://huggingface.co/settings/tokens
  HUGGING_FACE_API_KEY: "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",

  // WikiFactCheck API Key (Enhanced fact-checking service)
  // Note: This is a simulated service for demonstration
  WIKIFACTCHECK_API_KEY: "demo_wikifactcheck_key_12345",
};

// Optional configuration
const CONFIG = {
  MAX_REQUESTS_PER_HOUR: 100,
  CACHE_EXPIRY_MINUTES: 30,
  DEBUG_MODE: false,
};

// Export for use in backend
if (typeof window !== "undefined") {
  window.API_KEYS = API_KEYS;
  window.CONFIG = CONFIG;
} else if (typeof module !== "undefined") {
  module.exports = { API_KEYS, CONFIG };
}
