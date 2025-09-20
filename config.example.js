// MisinfoGuard API Configuration Example
// Copy this file to config.js and add your actual API keys

const API_KEYS = {
    // Gemini AI API Key
    // Get from: https://makersuite.google.com/app/apikey
    GEMINI_API_KEY: 'your_gemini_api_key_here',

    // OCR.space API Key  
    // Get from: https://ocr.space/ocrapi
    OCR_SPACE_API_KEY: 'your_ocr_space_api_key_here',

    // SightEngine API Credentials
    // Get from: https://sightengine.com/
    SIGHTENGINE_API_USER: 'your_sightengine_user_here',
    SIGHTENGINE_API_SECRET: 'your_sightengine_secret_here',

    // Laughing Face API Key (placeholder)
    // Replace with actual API when available
    LAUGHING_FACE_API_KEY: 'your_laughing_face_api_key_here'
};

// Optional configuration
const CONFIG = {
    MAX_REQUESTS_PER_HOUR: 100,
    CACHE_EXPIRY_MINUTES: 30,
    DEBUG_MODE: false
};

// Export for use in backend
if (typeof window !== 'undefined') {
    window.API_KEYS = API_KEYS;
    window.CONFIG = CONFIG;
} else if (typeof module !== 'undefined') {
    module.exports = { API_KEYS, CONFIG };
}
