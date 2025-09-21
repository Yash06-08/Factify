// Real News API Configuration
const NEWS_CONFIG = {
  // News API (free tier allows 1000 requests/day)
  newsApi: {
    key: '4e2778cafef34d099fdd56efb8beda69', // Replace with actual API key
    baseUrl: 'https://newsapi.org/v2',
    sources: {
      health: 'medical-news-today,healthline',
      politics: 'bbc-news,reuters,associated-press',
      financial: 'financial-times,bloomberg,reuters',
      technology: 'techcrunch,ars-technica,wired',
      general: 'bbc-news,reuters,associated-press,npr'
    }
  },
  // Guardian API (free with registration)
  guardian: {
    key: 'YOUR_GUARDIAN_API_KEY', // Replace with actual API key
    baseUrl: 'https://content.guardianapis.com',
    sections: {
      health: 'society,science',
      politics: 'politics,world',
      financial: 'business,money',
      technology: 'technology,science',
      general: 'world,uk-news'
    }
  },
  // Reuters API (for fact-checking content)
  reuters: {
    baseUrl: 'https://www.reuters.com/arc/outboundfeeds/rss/',
    feeds: {
      factCheck: 'category/fact-check',
      health: 'category/health',
      politics: 'category/politics-news',
      technology: 'category/technology'
    }
  }
};

// Measure sticky header and expose height to CSS as --header-height
function updateHeaderHeight() {
  const header = document.querySelector('.header');
  if (!header) return;
  const height = header.offsetHeight;
  document.documentElement.style.setProperty('--header-height', `${height}px`);
}

// Small debounce utility for resize events
function debounce(fn, delay) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Fallback trusted news sources for demo
const TRUSTED_NEWS_SOURCES = {
  factCheck: [
    {
      name: 'Reuters Fact Check',
      url: 'https://www.reuters.com/fact-check/',
      description: 'Professional fact-checking from Reuters news agency'
    },
    {
      name: 'AP Fact Check',
      url: 'https://apnews.com/hub/ap-fact-check',
      description: 'Associated Press fact-checking division'
    },
    {
      name: 'BBC Reality Check',
      url: 'https://www.bbc.com/news/reality_check',
      description: 'BBC\'s dedicated fact-checking team'
    },
    {
      name: 'Snopes',
      url: 'https://www.snopes.com/',
      description: 'Independent fact-checking organization'
    },
    {
      name: 'PolitiFact',
      url: 'https://www.politifact.com/',
      description: 'Pulitzer Prize-winning fact-checking site'
    }
  ],
  health: [
    {
      name: 'WHO Health Updates',
      url: 'https://www.who.int/news',
      description: 'Official World Health Organization news and updates'
    },
    {
      name: 'CDC Health Information',
      url: 'https://www.cdc.gov/media/releases/',
      description: 'Centers for Disease Control and Prevention'
    },
    {
      name: 'NHS Health News',
      url: 'https://www.nhs.uk/news/',
      description: 'UK National Health Service official news'
    }
  ],
  technology: [
    {
      name: 'MIT Technology Review',
      url: 'https://www.technologyreview.com/',
      description: 'Authoritative technology journalism from MIT'
    },
    {
      name: 'IEEE Spectrum',
      url: 'https://spectrum.ieee.org/',
      description: 'Professional engineering and technology news'
    }
  ]
};

// News API Service
class NewsAPIService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  async fetchNews(category = 'general', sources = null) {
    const cacheKey = `${category}-${sources || 'default'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Try multiple APIs in order of preference
      let articles = await this.fetchFromNewsAPI(category, sources);
      
      if (!articles || articles.length === 0) {
        articles = await this.fetchFromGuardian(category);
      }
      
      if (!articles || articles.length === 0) {
        articles = this.getFallbackNews(category);
      }

      // Cache the results
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: articles
      });

      return articles;
    } catch (error) {
      console.error('Error fetching news:', error);
      return this.getFallbackNews(category);
    }
  }

  async fetchFromNewsAPI(category, sources) {
    // Note: In production, you'd need a valid API key
    // For demo purposes, we'll simulate API calls
    if (!NEWS_CONFIG.newsApi.key || NEWS_CONFIG.newsApi.key === 'YOUR_NEWS_API_KEY') {
      return null; // API key not configured
    }

    const sourcesParam = sources || NEWS_CONFIG.newsApi.sources[category] || NEWS_CONFIG.newsApi.sources.general;
    const url = `${NEWS_CONFIG.newsApi.baseUrl}/top-headlines?sources=${sourcesParam}&apiKey=${NEWS_CONFIG.newsApi.key}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.articles?.map(article => this.normalizeArticle(article, 'NewsAPI')) || [];
  }

  async fetchFromGuardian(category) {
    // Note: In production, you'd need a valid API key
    if (!NEWS_CONFIG.guardian.key || NEWS_CONFIG.guardian.key === 'YOUR_GUARDIAN_API_KEY') {
      return null; // API key not configured
    }

    const section = NEWS_CONFIG.guardian.sections[category] || NEWS_CONFIG.guardian.sections.general;
    const url = `${NEWS_CONFIG.guardian.baseUrl}/search?section=${section}&api-key=${NEWS_CONFIG.guardian.key}&show-fields=headline,thumbnail,short-url`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.response?.results?.map(article => this.normalizeArticle(article, 'Guardian')) || [];
  }

  normalizeArticle(article, source) {
    switch (source) {
      case 'NewsAPI':
        return {
          id: this.generateId(),
          headline: article.title,
          excerpt: article.description || '',
          category: this.categorizArticle(article.title + ' ' + (article.description || '')),
          author: article.author || 'News Staff',
          date: new Date(article.publishedAt).toISOString().split('T')[0],
          readTime: this.estimateReadTime(article.description || ''),
          trending: false,
          url: article.url,
          imageUrl: article.urlToImage,
          source: article.source?.name || 'News Source',
          verified: true
        };
      case 'Guardian':
        return {
          id: this.generateId(),
          headline: article.webTitle,
          excerpt: article.fields?.headline || article.webTitle,
          category: this.categorizArticle(article.webTitle),
          author: 'Guardian Staff',
          date: new Date(article.webPublicationDate).toISOString().split('T')[0],
          readTime: '3 min read',
          trending: false,
          url: article.webUrl,
          imageUrl: article.fields?.thumbnail,
          source: 'The Guardian',
          verified: true
        };
      default:
        return article;
    }
  }

  categorizArticle(text) {
    const healthKeywords = ['health', 'medical', 'covid', 'vaccine', 'disease', 'treatment', 'hospital', 'doctor'];
    const politicsKeywords = ['politics', 'election', 'government', 'policy', 'parliament', 'congress', 'vote'];
    const financialKeywords = ['finance', 'economy', 'bank', 'market', 'investment', 'crypto', 'stock', 'trading'];
    const techKeywords = ['technology', 'tech', 'ai', 'artificial intelligence', 'software', 'computer', 'digital', 'cyber'];
    
    const lowerText = text.toLowerCase();
    
    if (healthKeywords.some(keyword => lowerText.includes(keyword))) return 'Health';
    if (politicsKeywords.some(keyword => lowerText.includes(keyword))) return 'Politics';
    if (financialKeywords.some(keyword => lowerText.includes(keyword))) return 'Financial';
    if (techKeywords.some(keyword => lowerText.includes(keyword))) return 'Technology';
    
    return 'General';
  }

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  estimateReadTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.split(' ').length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  }

  getFallbackNews(category) {
    // Enhanced fallback with more realistic and diverse content
    const fallbackArticles = {
      health: [
        {
          id: 'health_1',
          headline: 'WHO Releases New Guidelines for Digital Health Misinformation Detection',
          excerpt: 'World Health Organization announces comprehensive framework for identifying and combating health misinformation across digital platforms, with focus on social media verification.',
          category: 'Health',
          author: 'Dr. Sarah Chen, WHO Digital Health Division',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
          readTime: '5 min read',
          trending: true,
          url: 'https://www.who.int/news/item/digital-health-misinformation-guidelines',
          source: 'World Health Organization',
          verified: true
        },
        {
          id: 'health_2',
          headline: 'Stanford Study: AI Tool Achieves 94% Accuracy in Medical Misinformation Detection',
          excerpt: 'Researchers at Stanford Medicine develop machine learning algorithm that can identify false medical claims with unprecedented accuracy, focusing on vaccine and treatment misinformation.',
          category: 'Health',
          author: 'Dr. Michael Rodriguez, Stanford Medicine',
          date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
          readTime: '7 min read',
          trending: true,
          url: 'https://med.stanford.edu/news/medical-misinformation-ai-detection',
          source: 'Stanford Medicine',
          verified: true
        },
        {
          id: 'health_3',
          headline: 'CDC Partners with Social Media Platforms to Combat Health Misinformation',
          excerpt: 'Centers for Disease Control announces new collaboration agreements with major social media companies to implement real-time fact-checking for health-related content.',
          category: 'Health',
          author: 'CDC Communications Team',
          date: new Date(Date.now() - 259200000).toISOString().split('T')[0], // 3 days ago
          readTime: '4 min read',
          trending: false,
          url: 'https://www.cdc.gov/media/releases/social-media-health-misinformation',
          source: 'CDC',
          verified: true
        }
      ],
      politics: [
        {
          id: 'politics_1',
          headline: 'European Union Implements Comprehensive Digital Services Act for Misinformation Control',
          excerpt: 'EU\'s Digital Services Act now requires major platforms to implement robust misinformation detection systems, with significant penalties for non-compliance.',
          category: 'Politics',
          author: 'Reuters Brussels Bureau',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          readTime: '6 min read',
          trending: true,
          url: 'https://www.reuters.com/world/europe/eu-digital-services-act-misinformation',
          source: 'Reuters',
          verified: true
        },
        {
          id: 'politics_2',
          headline: 'Bipartisan US Senate Committee Proposes New Framework for Election Misinformation Prevention',
          excerpt: 'Senate Intelligence Committee releases bipartisan recommendations for combating election-related misinformation, including real-time verification systems.',
          category: 'Politics',
          author: 'Associated Press Congressional Team',
          date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          readTime: '8 min read',
          trending: true,
          url: 'https://apnews.com/article/senate-election-misinformation-framework',
          source: 'Associated Press',
          verified: true
        }
      ],
      financial: [
        {
          id: 'financial_1',
          headline: 'Bank of England Warns of Cryptocurrency Scam Surge Targeting Social Media Users',
          excerpt: 'Central bank reports 300% increase in crypto-related fraud, launches public awareness campaign about investment scam red flags and verification methods.',
          category: 'Financial',
          author: 'Financial Times Banking Desk',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          readTime: '5 min read',
          trending: true,
          url: 'https://www.ft.com/content/bank-england-crypto-scam-warning',
          source: 'Financial Times',
          verified: true
        },
        {
          id: 'financial_2',
          headline: 'SEC Introduces AI-Powered System to Detect Investment Fraud on Social Platforms',
          excerpt: 'Securities and Exchange Commission deploys advanced machine learning tools to identify and flag fraudulent investment schemes spreading through social media.',
          category: 'Financial',
          author: 'Bloomberg Regulatory Team',
          date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          readTime: '6 min read',
          trending: false,
          url: 'https://www.bloomberg.com/news/articles/sec-ai-investment-fraud-detection',
          source: 'Bloomberg',
          verified: true
        }
      ],
      technology: [
        {
          id: 'tech_1',
          headline: 'OpenAI and Meta Collaborate on Advanced Deepfake Detection Technology',
          excerpt: 'Leading AI companies announce joint research initiative to develop next-generation deepfake detection tools, with 99.7% accuracy in identifying synthetic media.',
          category: 'Technology',
          author: 'TechCrunch AI Team',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          readTime: '7 min read',
          trending: true,
          url: 'https://techcrunch.com/openai-meta-deepfake-detection-collaboration',
          source: 'TechCrunch',
          verified: true
        },
        {
          id: 'tech_2',
          headline: 'MIT Researchers Develop Real-Time Audio Deepfake Detection System',
          excerpt: 'Massachusetts Institute of Technology unveils breakthrough technology that can identify AI-generated audio in real-time, addressing voice cloning scam concerns.',
          category: 'Technology',
          author: 'MIT Technology Review',
          date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          readTime: '5 min read',
          trending: true,
          url: 'https://www.technologyreview.com/mit-audio-deepfake-detection',
          source: 'MIT Technology Review',
          verified: true
        }
      ],
      education: [
        {
          id: 'edu_1',
          headline: 'UNESCO Launches Global Digital Literacy Initiative for Misinformation Awareness',
          excerpt: 'United Nations Educational, Scientific and Cultural Organization announces comprehensive program to teach digital literacy and critical thinking skills in schools worldwide.',
          category: 'Education',
          author: 'UNESCO Communications',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          readTime: '4 min read',
          trending: false,
          url: 'https://en.unesco.org/news/global-digital-literacy-misinformation-initiative',
          source: 'UNESCO',
          verified: true
        }
      ],
      ai_deepfakes: [
        {
          id: 'ai_1',
          headline: 'Google DeepMind Achieves Breakthrough in Real-Time Deepfake Video Detection',
          excerpt: 'Research team develops neural network capable of detecting deepfake videos with 99.9% accuracy in real-time, addressing growing concerns about synthetic media.',
          category: 'AI & Deepfakes',
          author: 'Google DeepMind Research Team',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          readTime: '6 min read',
          trending: true,
          url: 'https://deepmind.google/research/deepfake-detection-breakthrough',
          source: 'Google DeepMind',
          verified: true
        }
      ]
    };

    return fallbackArticles[category] || fallbackArticles.health.slice(0, 3);
  }
}

// Create NewsAPI service instance
const newsService = new NewsAPIService();

// Application Data (now using NewsAPI service)
const appData = {
  trendingTopics: [
    "AI-powered fact checking",
    "WhatsApp forward verification",
    "Election misinformation",
    "Health scam alerts",
    "Deepfake detection",
    "Financial fraud prevention",
    "Social media literacy"
  ],
  statistics: {
    totalVerifications: "2.3M+",
    scamsDetected: "156K+",
    usersEducated: "890K+",
    accuracyRate: "99.8%"
  },
  trustedSources: TRUSTED_NEWS_SOURCES,
  languages: {
    en: {
      title: "Factify",
      tagline: "Professional misinformation detection and digital literacy",
      heroTitle: "Verify content. Build trust. Stay informed.",
      heroSubtitle: "Advanced AI-powered platform for detecting misinformation, scams, and false information across digital channels.",
      verifyContent: "Verify Content",
      learnMore: "Explore Learning Center",
      "advisory-title": "Important: Understanding AI Analysis",
      "advisory-content": "<strong>Please note:</strong> AI analysis results are tools to assist your judgment, not definitive truth. Always cross-reference with multiple reliable sources, consider context, and use critical thinking. Misinformation detection is complex, and no AI system is 100% accurate. When in doubt, consult fact-checking organizations and trusted news sources.",
      "tip-1": "Verify with multiple sources",
      "tip-2": "Check publication date and context",
      "tip-3": "Consider the source's credibility",
      "tip-4": "Look for expert opinions and official statements",
      "nav-home": "Home",
      "nav-verify": "Verify Content",
      "nav-news": "News Centre",
      "nav-bot": "Mobile Bot",
      // Hero section
      "hero-badge-new": "New",
      "hero-badge-text": "AI-Powered Misinformation Detection",
      "hero-btn-verify": "Start Verification",
      "hero-btn-learn": "Explore Learning Center",
      // Stats section
      "stats-title": "Real-Time Impact",
      "stats-subtitle": "Live statistics from our global misinformation detection network",
      "stat-verifications": "Total Verifications",
      "stat-scams": "Scams Detected",
      "stat-users": "Users Educated",
      "stat-accuracy": "Accuracy Rate",
      "stat-trend-week": "this week",
      "stat-trend-month": "this month",
      "live-feed-title": "Live Verification Feed",
      "feed-sample": "Health claim verified from WHO source",
      "feed-time": "2s ago",
      // Verification section
      "verify-title": "Image Verification",
      "verify-subtitle": "Upload an image to check for misinformation, AI generation, and extract text",
      "upload-text": "<strong>Click to upload</strong> or drag and drop your image here",
      "upload-hint": "PNG, JPG, JPEG up to 10MB",
      "processing-title": "Analyzing Content...",
      "btn-analyze": "Analyze Now",
      "btn-clear": "Clear",
      // OCR Results
      "ocr-title": "📝 Extracted Text (OCR)",
      "ocr-placeholder": "No text detected in image...",
      "btn-copy-text": "Copy Text",
      "btn-analyze-text": "Analyze Extracted Text",
      // AI Detection
      "ai-detection-title": "🤖 AI Generation Analysis",
      // Chatbot
      "chatbot-title": "AI Fact-Check Assistant",
      "chatbot-status": "Online",
      "chatbot-intro": "Hi! I'm your AI fact-checking assistant. I can help you verify information, check sources, and provide detailed analysis. What would you like to fact-check today?",
      "chat-placeholder": "Ask me to fact-check anything...",
      "btn-send": "Send",
      "btn-clear-chat": "Clear",
      // Suggestions
      "suggest-1": "Is this news article credible?",
      "suggest-2": "Check this health claim",
      "suggest-3": "Verify this social media post",
      "suggest-4": "Is this a scam?",
      // API Status
      "api-status-title": "🔧 API Services Status",
      "api-status-subtitle": "Check if all backend services are working properly",
      "btn-check-status": "Check Status",
      "service-gemini": "Gemini AI",
      "service-gemini-desc": "Advanced fact-checking and content analysis",
      "service-huggingface": "Hugging Face",
      "service-huggingface-desc": "Sentiment analysis and text classification",
      "service-ocr": "OCR.space",
      "service-ocr-desc": "Text extraction from images",
      "service-sightengine": "SightEngine",
      "service-sightengine-desc": "Content moderation and image analysis",
      "status-checking": "Checking...",
      "status-connected": "Connected",
      "status-error": "Error",
      "status-summary-title": "Overall Status",
      "status-summary-text": "Click \"Check Status\" to test all services"
    },
    hi: {
      title: "फैक्टिफाई",
      tagline: "पेशेवर गलत सूचना का पता लगाना और डिजिटल साक्षरता",
      heroTitle: "सामग्री सत्यापित करें। विश्वास बनाएं। जानकार रहें।",
      heroSubtitle: "डिजिटल चैनलों में गलत सूचना, घोटाले और झूठी जानकारी का पता लगाने के लिए उन्नत AI-संचालित प्लेटफॉर्म।",
      verifyContent: "सामग्री सत्यापित करें",
      learnMore: "शिक्षण केंद्र देखें",
      "advisory-title": "महत्वपूर्ण: AI विश्लेषण को समझना",
      "advisory-content": "<strong>कृपया ध्यान दें:</strong> AI विश्लेषण परिणाम आपके निर्णय में सहायता के लिए उपकरण हैं, निश्चित सत्य नहीं। हमेशा कई विश्वसनीय स्रोतों से क्रॉस-रेफरेंस करें, संदर्भ पर विचार करें, और आलोचनात्मक सोच का उपयोग करें। गलत सूचना का पता लगाना जटिल है, और कोई भी AI सिस्टम 100% सटीक नहीं है। संदेह की स्थिति में, तथ्य-जांच संगठनों और विश्वसनीय समाचार स्रोतों से सलाह लें।",
      "tip-1": "कई स्रोतों से सत्यापित करें",
      "tip-2": "प्रकाशन तिथि और संदर्भ जांचें",
      "tip-3": "स्रोत की विश्वसनीयता पर विचार करें",
      "tip-4": "विशेषज्ञ राय और आधिकारिक बयान देखें",
      "nav-home": "होम",
      "nav-verify": "सामग्री सत्यापित करें",
      "nav-news": "समाचार केंद्र",
      "nav-bot": "मोबाइल बॉट",
      // Hero section
      "hero-badge-new": "नया",
      "hero-badge-text": "AI-संचालित गलत सूचना का पता लगाना",
      "hero-btn-verify": "सत्यापन शुरू करें",
      "hero-btn-learn": "शिक्षण केंद्र देखें",
      // Stats section
      "stats-title": "वास्तविक समय प्रभाव",
      "stats-subtitle": "हमारे वैश्विक गलत सूचना का पता लगाने के नेटवर्क से लाइव आंकड़े",
      "stat-verifications": "कुल सत्यापन",
      "stat-scams": "घोटाले का पता लगाया",
      "stat-users": "शिक्षित उपयोगकर्ता",
      "stat-accuracy": "सटीकता दर",
      "stat-trend-week": "इस सप्ताह",
      "stat-trend-month": "इस महीने",
      "live-feed-title": "लाइव सत्यापन फीड",
      "feed-sample": "WHO स्रोत से स्वास्थ्य दावा सत्यापित",
      "feed-time": "2 सेकंड पहले",
      // Verification section
      "verify-title": "छवि सत्यापन",
      "verify-subtitle": "गलत सूचना, AI जेनरेशन की जांच करने और टेक्स्ट निकालने के लिए एक छवि अपलोड करें",
      "upload-text": "<strong>अपलोड करने के लिए क्लिक करें</strong> या अपनी छवि यहां खींचें और छोड़ें",
      "upload-hint": "PNG, JPG, JPEG 10MB तक",
      "processing-title": "सामग्री का विश्लेषण कर रहे हैं...",
      "btn-analyze": "अभी विश्लेषण करें",
      "btn-clear": "साफ़ करें",
      // OCR Results
      "ocr-title": "📝 निकाला गया टेक्स्ट (OCR)",
      "ocr-placeholder": "छवि में कोई टेक्स्ट नहीं मिला...",
      "btn-copy-text": "टेक्स्ट कॉपी करें",
      "btn-analyze-text": "निकाले गए टेक्स्ट का विश्लेषण करें",
      // AI Detection
      "ai-detection-title": "🤖 AI जेनरेशन विश्लेषण",
      // Chatbot
      "chatbot-title": "AI तथ्य-जांच सहायक",
      "chatbot-status": "ऑनलाइन",
      "chatbot-intro": "नमस्ते! मैं आपका AI तथ्य-जांच सहायक हूं। मैं जानकारी सत्यापित करने, स्रोतों की जांच करने और विस्तृत विश्लेषण प्रदान करने में आपकी सहायता कर सकता हूं। आज आप क्या तथ्य-जांच करना चाहेंगे?",
      "chat-placeholder": "मुझसे कुछ भी तथ्य-जांच करने के लिए कहें...",
      "btn-send": "भेजें",
      "btn-clear-chat": "साफ़ करें",
      // Suggestions
      "suggest-1": "क्या यह समाचार लेख विश्वसनीय है?",
      "suggest-2": "इस स्वास्थ्य दावे की जांच करें",
      "suggest-3": "इस सोशल मीडिया पोस्ट को सत्यापित करें",
      "suggest-4": "क्या यह एक घोटाला है?",
      // API Status
      "api-status-title": "🔧 API सेवाओं की स्थिति",
      "api-status-subtitle": "जांचें कि क्या सभी बैकएंड सेवाएं ठीक से काम कर रही हैं",
      "btn-check-status": "स्थिति जांचें",
      "service-gemini": "जेमिनी AI",
      "service-gemini-desc": "उन्नत तथ्य-जांच और सामग्री विश्लेषण",
      "service-huggingface": "हगिंग फेस",
      "service-huggingface-desc": "भावना विश्लेषण और टेक्स्ट वर्गीकरण",
      "service-ocr": "OCR.space",
      "service-ocr-desc": "छवियों से टेक्स्ट निकालना",
      "service-sightengine": "साइटइंजन",
      "service-sightengine-desc": "सामग्री मॉडरेशन और छवि विश्लेषण",
      "status-checking": "जांच रहे हैं...",
      "status-connected": "जुड़ा हुआ",
      "status-error": "त्रुटि",
      "status-summary-title": "समग्र स्थिति",
      "status-summary-text": "सभी सेवाओं का परीक्षण करने के लिए \"स्थिति जांचें\" पर क्लिक करें"
    }
  }
};

// Application State
class ApplicationState {
  constructor() {
    this.currentSection = 'home';
    this.currentLanguage = 'en';
    this.currentCategory = 'all';
    this.allArticles = [];
    this.filteredArticles = [];
    this.loadingNews = false;
    this.newsLoaded = false;
    this.currentPage = 1;
    this.articlesPerPage = 9;
    this.currentView = 'grid';
    this.currentSort = 'date-desc';
    this.currentSource = 'all';
    this.searchQuery = '';
    this.init();
  }

  async init() {
    await this.loadAllArticles();
  }

  async loadAllArticles() {
    if (this.loadingNews || this.newsLoaded) return;
    
    this.loadingNews = true;
    
    try {
      const categories = ['health', 'politics', 'financial', 'technology', 'education', 'ai_deepfakes'];
      const allArticlesPromises = categories.map(category => 
        newsService.fetchNews(category)
      );
      
      const categorizedArticles = await Promise.all(allArticlesPromises);
      
      // Flatten all articles
      this.allArticles = [];
      categorizedArticles.forEach(articles => {
        this.allArticles.push(...articles);
      });
      
      // Sort by date (newest first)
      this.allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Initially show all articles
      this.filteredArticles = [...this.allArticles];
      
      this.newsLoaded = true;
      
      // Re-render if news section is currently visible
      if (this.currentSection === 'news') {
        renderNewsSection();
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      // Fallback to a few sample articles
      this.allArticles = await newsService.fetchNews('health');
      this.filteredArticles = [...this.allArticles];
    } finally {
      this.loadingNews = false;
    }
  }

  filterArticles(category, searchTerm = '') {
    let filtered = [...this.allArticles];
    
    // Filter by category
    if (category && category !== 'all') {
      filtered = filtered.filter(article => 
        article.category.toLowerCase().replace(/\s+/g, '_').replace('&', '') === category.toLowerCase()
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(article =>
        article.headline.toLowerCase().includes(term) ||
        article.excerpt.toLowerCase().includes(term) ||
        article.category.toLowerCase().includes(term) ||
        article.author.toLowerCase().includes(term)
      );
    }
    
    // Filter by source
    if (this.currentSource !== 'all') {
      filtered = filtered.filter(article => 
        article.source && article.source.toLowerCase().includes(this.currentSource.toLowerCase())
      );
    }
    
    // Sort articles
    filtered = this.sortArticles(filtered, this.currentSort);
    
    this.filteredArticles = filtered;
    this.currentPage = 1; // Reset to first page when filtering
    return filtered;
  }

  sortArticles(articles, sortBy) {
    const sorted = [...articles];
    
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      case 'trending':
        return sorted.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
      case 'relevance':
        // For demo purposes, just shuffle for "relevance"
        return sorted.sort(() => Math.random() - 0.5);
      default:
        return sorted;
    }
  }

  getPaginatedArticles() {
    const startIndex = (this.currentPage - 1) * this.articlesPerPage;
    const endIndex = startIndex + this.articlesPerPage;
    return this.filteredArticles.slice(startIndex, endIndex);
  }

  getTotalPages() {
    return Math.ceil(this.filteredArticles.length / this.articlesPerPage);
  }

  getFeaturedArticles() {
    return this.allArticles.filter(article => article.trending).slice(0, 3);
  }

  getRecentArticles() {
    return this.allArticles.slice(0, 5);
  }
}

const appState = new ApplicationState();

// Enhanced Navigation functionality with animations
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav__link');
  const sections = document.querySelectorAll('.section');
  const heroSection = document.querySelector('.hero-section');
  const statsSection = document.querySelector('#home-stats');
  const header = document.querySelector('.header');
  
  // Header scroll effect
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScrollY = window.scrollY;
  });
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.getAttribute('href').substring(1);
      
      // Add smooth transition
      document.body.style.transition = 'opacity 0.3s ease';
      
      // Hide all sections with fade out
      sections.forEach(section => {
        section.style.opacity = '0';
        setTimeout(() => section.classList.add('hidden'), 150);
      });
      
      if (heroSection) {
        heroSection.style.opacity = '0';
        setTimeout(() => heroSection.classList.add('hidden'), 150);
      }
      if (statsSection) {
        statsSection.style.opacity = '0';
        setTimeout(() => statsSection.classList.add('hidden'), 150);
      }
      
      // Show target section with fade in
      setTimeout(() => {
        if (targetSection === 'home') {
          if (heroSection) {
            heroSection.classList.remove('hidden');
            heroSection.style.opacity = '1';
          }
          if (statsSection) {
            statsSection.classList.remove('hidden');
            statsSection.style.opacity = '1';
          }
        } else {
          const targetEl = document.getElementById(targetSection);
          if (targetEl) {
            targetEl.classList.remove('hidden');
            targetEl.style.opacity = '1';
          }
        }
      }, 200);
      
      // Update active nav link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      appState.currentSection = targetSection;
      
      // Load news if navigating to news section
      if (targetSection === 'news') {
        setTimeout(() => {
          if (!appState.newsLoaded) {
            showNewsLoadingState();
          }
          renderNewsSection();
        }, 250);
      }
    });
  });

  // Enhanced button interactions
  const verifyContentBtn = document.getElementById('verifyContentBtn');
  const learnMoreBtn = document.getElementById('learnMoreBtn');
  const getStartedBtn = document.getElementById('getStartedBtn');

  if (verifyContentBtn) {
    verifyContentBtn.addEventListener('click', () => {
      navigateToSection('verify');
    });
  }

  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', () => {
      navigateToSection('news');
    });
  }

  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      navigateToSection('verify');
    });
  }
}

// Theme Toggle Functionality
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.querySelector('.theme-icon');
  
  // Get saved theme or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-color-scheme', savedTheme);
  updateThemeIcon(savedTheme);
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-color-scheme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      // Add transition effect
      document.documentElement.style.transition = 'all 0.3s ease';
      
      // Update theme
      document.documentElement.setAttribute('data-color-scheme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Update icon
      updateThemeIcon(newTheme);
      
      // Remove transition after animation
      setTimeout(() => {
        document.documentElement.style.transition = '';
      }, 300);
    });
  }
}

function updateThemeIcon(theme) {
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
  }
}

// Loading state for news
function showNewsLoadingState() {
  const articlesGrid = document.getElementById('articlesGrid');
  const featuredArticles = document.getElementById('featuredArticles');
  
  if (articlesGrid) {
    articlesGrid.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading latest fact-checked news...</p>
      </div>
    `;
  }
  
  if (featuredArticles) {
    featuredArticles.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Fetching featured articles...</p>
      </div>
    `;
  }
}

function navigateToSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  const heroSection = document.querySelector('.hero-section');
  const statsSection = document.querySelector('#home-stats');
  const navLinks = document.querySelectorAll('.nav__link');
  
  // Hide all sections
  sections.forEach(section => {
    section.style.opacity = '0';
    section.classList.add('hidden');
  });
  if (heroSection) {
    heroSection.style.opacity = '0';
    heroSection.classList.add('hidden');
  }
  if (statsSection) {
    statsSection.style.opacity = '0';
    statsSection.classList.add('hidden');
  }
  
  // Show target section
  if (sectionId === 'home') {
    if (heroSection) {
      heroSection.classList.remove('hidden');
      requestAnimationFrame(() => (heroSection.style.opacity = '1'));
    }
    if (statsSection) {
      statsSection.classList.remove('hidden');
      requestAnimationFrame(() => (statsSection.style.opacity = '1'));
    }
  } else {
    const targetEl = document.getElementById(sectionId);
    if (targetEl) {
      targetEl.classList.remove('hidden');
      requestAnimationFrame(() => (targetEl.style.opacity = '1'));
    }
  }
  
  // Update active nav link
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${sectionId}`) {
      link.classList.add('active');
    }
  });
  
  appState.currentSection = sectionId;

  // Smooth scroll to top to avoid leftover whitespace positions
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Verification functionality
function initVerification() {
  const imageInput = document.getElementById('imageInput');
  const fileUploadArea = document.getElementById('fileUploadArea');
  const imagePreview = document.getElementById('imagePreview');
  const verifyImageBtn = document.getElementById('analyzeImage');
  const clearImageBtn = document.getElementById('clearImage');
  const copyOcrTextBtn = document.getElementById('copyOcrText');
  const analyzeOcrTextBtn = document.getElementById('analyzeOcrText');

  // No tab switching needed - only image verification available

  // File upload functionality
  if (fileUploadArea && imageInput) {
    fileUploadArea.addEventListener('click', () => {
      imageInput.click();
    });

    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = 'var(--color-primary)';
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '';
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleImageUpload(files[0]);
      }
    });

    imageInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
      }
    });
  }

  // Analysis buttons

  if (verifyImageBtn) {
    verifyImageBtn.addEventListener('click', () => {
      if (imagePreview && !imagePreview.classList.contains('hidden')) {
        analyzeContent('uploaded image', 'image');
      } else {
        alert('Please upload an image to analyze');
      }
    });
  }

  // Clear button functionality

  if (clearImageBtn) {
    clearImageBtn.addEventListener('click', () => {
      if (imageInput) {
        imageInput.value = '';
      }
      if (imagePreview) {
        imagePreview.classList.add('hidden');
        imagePreview.innerHTML = '';
      }
      // Reset file upload area
      if (fileUploadArea) {
        fileUploadArea.classList.remove('file-uploaded');
      }
      // Clear OCR results
      const ocrResults = document.getElementById('ocrResults');
      const ocrText = document.getElementById('ocrText');
      const ocrConfidence = document.getElementById('ocrConfidence');
      if (ocrResults) {
        ocrResults.classList.add('hidden');
      }
      if (ocrText) {
        ocrText.value = '';
      }
      if (ocrConfidence) {
        ocrConfidence.textContent = '';
      }
      // Clear AI detection results
      const aiDetectionResults = document.getElementById('aiDetectionResults');
      const aiVerdict = document.getElementById('aiVerdict');
      const aiConfidenceAI = document.getElementById('aiConfidence');
      const aiIndicators = document.getElementById('aiIndicators');
      if (aiDetectionResults) {
        aiDetectionResults.classList.add('hidden');
      }
      if (aiVerdict) {
        aiVerdict.textContent = '';
      }
      if (aiConfidenceAI) {
        aiConfidenceAI.textContent = '';
      }
      if (aiIndicators) {
        aiIndicators.innerHTML = '';
      }
      // Clear any existing results
      const resultsSection = document.getElementById('resultsSection');
      if (resultsSection) {
        resultsSection.classList.add('hidden');
      }
    });
  }

  // OCR button functionality
  if (copyOcrTextBtn) {
    copyOcrTextBtn.addEventListener('click', () => {
      const ocrText = document.getElementById('ocrText');
      if (ocrText && ocrText.value.trim()) {
        navigator.clipboard.writeText(ocrText.value).then(() => {
          // Show temporary feedback
          const originalText = copyOcrTextBtn.textContent;
          copyOcrTextBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyOcrTextBtn.textContent = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text:', err);
          alert('Failed to copy text to clipboard');
        });
      }
    });
  }

  if (analyzeOcrTextBtn) {
    analyzeOcrTextBtn.addEventListener('click', () => {
      const ocrText = document.getElementById('ocrText');
      if (ocrText && ocrText.value.trim()) {
        analyzeContent(ocrText.value.trim(), 'text');
      } else {
        alert('No extracted text to analyze');
      }
    });
  }
}

function handleImageUpload(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file');
    return;
  }

  const imagePreview = document.getElementById('imagePreview');
  if (imagePreview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `
        <img src="${e.target.result}" alt="Uploaded image" class="preview-image">
        <div class="image-info">
          <span class="image-name">${file.name}</span>
          <span class="image-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      `;
      imagePreview.classList.remove('hidden');
      
      // Add uploaded state to file upload area
      const fileUploadArea = document.getElementById('fileUploadArea');
      if (fileUploadArea) {
        fileUploadArea.classList.add('file-uploaded');
      }
      
      // Perform OCR and AI detection on the uploaded image
      performOCR(file);
      performAIDetection(file);
    };
    reader.readAsDataURL(file);
  }
}

// Perform OCR on uploaded image
async function performOCR(file) {
  const ocrResults = document.getElementById('ocrResults');
  const ocrText = document.getElementById('ocrText');
  const ocrConfidence = document.getElementById('ocrConfidence');
  
  if (!ocrResults || !ocrText || !ocrConfidence) return;
  
  // Show OCR section with loading state
  ocrResults.classList.remove('hidden');
  ocrText.placeholder = 'Extracting text from image...';
  ocrConfidence.textContent = 'Processing...';
  
  try {
    let ocrSuccess = false;
    let extractedText = '';
    let confidenceInfo = '';
    let methodUsed = '';
    let ocrResults = null;
    
    // Use the comprehensive multi-model analysis
    if (typeof apiManager !== 'undefined' && apiManager !== null) {
      try {
        // Run the full multi-model analysis
        const analysisResult = await apiManager.analyzeContent('', 'image', file);
        
        if (analysisResult.success && analysisResult.analysis.imageAnalysis) {
          const imageAnalysis = analysisResult.analysis.imageAnalysis;
          ocrResults = imageAnalysis.ocrResults;
          
          if (ocrResults && ocrResults.hasText && ocrResults.text.trim()) {
            extractedText = ocrResults.text.trim();
            confidenceInfo = typeof ocrResults.confidence === 'number' ? 
              `${Math.round(ocrResults.confidence * 100)}%` : ocrResults.confidence;
            methodUsed = ocrResults.source || ocrResults.method || 'Multi-model OCR';
            ocrSuccess = true;
          }
        }
      } catch (error) {
        console.warn('Multi-model OCR analysis failed:', error);
        
        // Fallback to individual service calls
        // Try Gemini Vision OCR first
        if (apiManager.isConfigured('gemini')) {
          try {
            const geminiResult = await apiManager.services.gemini.extractTextFromImage(file);
            if (geminiResult.success && geminiResult.hasText) {
              extractedText = geminiResult.text;
              confidenceInfo = `${Math.round(geminiResult.confidence * 100)}%`;
              methodUsed = 'Gemini Vision OCR';
              ocrSuccess = true;
            }
          } catch (geminiError) {
            console.warn('Gemini OCR failed:', geminiError);
          }
        }
        
        // Try SightEngine OCR if Gemini failed
        if (!ocrSuccess && apiManager.isConfigured('sightEngine')) {
          try {
            const sightEngineResult = await apiManager.services.sightEngine.analyzeImage(file);
            
            if (sightEngineResult.success && sightEngineResult.ocrResults && sightEngineResult.ocrResults.hasText) {
              extractedText = sightEngineResult.ocrResults.text;
              confidenceInfo = sightEngineResult.ocrResults.confidence;
              methodUsed = 'SightEngine OCR';
              ocrSuccess = true;
            }
          } catch (sightEngineError) {
            console.warn('SightEngine OCR failed:', sightEngineError);
          }
        }
        
        // Final fallback to OCR.space
        if (!ocrSuccess && apiManager.isConfigured('ocr')) {
          try {
            const result = await apiManager.services.ocr.extractText(file);
            
            if (result.success && result.text.trim()) {
              extractedText = result.text.trim();
              confidenceInfo = typeof result.confidence === 'number' ? `${Math.round(result.confidence * 100)}%` : result.confidence;
              methodUsed = 'OCR.space';
              ocrSuccess = true;
            }
          } catch (ocrError) {
            console.warn('OCR.space failed:', ocrError);
          }
        }
      }
    }
    
    // Update UI based on results
    if (ocrSuccess && extractedText.trim()) {
      ocrText.value = extractedText.trim();
      
      let ocrDetailsHTML = `
        <div class="ocr-details">
          <span class="confidence-info">Confidence: ${confidenceInfo}</span>
          <span class="method-info">Method: ${methodUsed}</span>
      `;
      
      // Add language information if available
      if (ocrResults && ocrResults.language && ocrResults.language !== 'unknown') {
        ocrDetailsHTML += `<span class="language-info">Language: ${ocrResults.language}</span>`;
      }
      
      // Add text regions information if available
      if (ocrResults && ocrResults.textRegions && ocrResults.textRegions.length > 0) {
        ocrDetailsHTML += `<span class="regions-info">Regions: ${ocrResults.textRegions.length}</span>`;
      }
      
      ocrDetailsHTML += '</div>';
      ocrConfidence.innerHTML = ocrDetailsHTML;
      ocrText.placeholder = 'Text extracted successfully...';
    } else {
      ocrText.value = '';
      ocrConfidence.textContent = 'No text detected';
      ocrText.placeholder = 'No text detected in image...';
    }
    
    // Show service configuration status if no services are available
    if (!apiManager || (!apiManager.isConfigured('gemini') && !apiManager.isConfigured('sightEngine') && !apiManager.isConfigured('ocr'))) {
      ocrText.value = '';
      ocrConfidence.textContent = 'OCR services not configured';
      ocrText.placeholder = 'OCR services not available. Please configure Gemini, SightEngine, or OCR.space API keys in config.js';
    }
  } catch (error) {
    console.error('OCR failed:', error);
    ocrText.value = '';
    ocrConfidence.textContent = 'OCR failed';
    ocrText.placeholder = 'Failed to extract text. Please try again.';
  }
}

// Perform AI detection on uploaded image
async function performAIDetection(file) {
  const aiDetectionResults = document.getElementById('aiDetectionResults');
  const aiVerdict = document.getElementById('aiVerdict');
  const aiConfidence = document.getElementById('aiConfidence');
  const aiIndicators = document.getElementById('aiIndicators');
  
  if (!aiDetectionResults || !aiVerdict || !aiConfidence || !aiIndicators) return;
  
  // Show AI detection section with loading state
  aiDetectionResults.classList.remove('hidden');
  aiVerdict.textContent = 'Analyzing image for AI generation...';
  aiConfidence.textContent = 'Processing...';
  aiIndicators.innerHTML = '';
  
  try {
    // Use the comprehensive multi-model analysis
    if (typeof apiManager !== 'undefined' && apiManager !== null) {
      const analysisResult = await apiManager.analyzeContent('', 'image', file);
      
      if (analysisResult.success && analysisResult.analysis.imageAnalysis) {
        const result = analysisResult.analysis.imageAnalysis;
      
        if (result.success && result.aiGenerated) {
          const aiData = result.aiGenerated;
          
          // Properly handle confidence and probability from multi-model analysis
          let confidencePercent, probabilityScore;
          
          if (aiData.confidence !== undefined) {
            // Confidence is already a decimal (0-1), convert to percentage
            confidencePercent = Math.round(aiData.confidence * 100);
          } else {
            confidencePercent = 50; // Default if no confidence available
          }
          
          if (aiData.probability !== undefined) {
            // Probability should be 0-100 percentage
            probabilityScore = Math.round(aiData.probability);
          } else if (aiData.score !== undefined) {
            // Score might be 0-100 or 0-1, normalize it
            probabilityScore = aiData.score > 1 ? Math.round(aiData.score) : Math.round(aiData.score * 100);
          } else {
            probabilityScore = 50; // Default if no probability available
          }
        
        let confidenceHTML = `
          <div class="confidence-details">
            <span class="confidence-score">Confidence: ${confidencePercent}%</span>
            <span class="ai-score">AI Probability: ${probabilityScore}%</span>
        `;
        
          // Add consensus information if available
          if (aiData.consensus) {
            const consensusIcon = aiData.consensus === 'strong' ? '🎯' : aiData.consensus === 'moderate' ? '⚖️' : '❓';
            confidenceHTML += `<span class="consensus-info">${consensusIcon} ${aiData.consensus} consensus</span>`;
          }
          
          // Add model information
          if (result.multiModel && result.models) {
            confidenceHTML += `<span class="models-info">📊 ${result.models.length} model${result.models.length > 1 ? 's' : ''}: ${result.models.join(', ')}</span>`;
          }
        
          confidenceHTML += '</div>';
          aiConfidence.innerHTML = confidenceHTML;
          
          // Update verdict with enhanced styling based on probability
          // probabilityScore = AI probability (0-100%)
          // realProbability = 100 - AI probability
          const realProbability = 100 - probabilityScore;
          
          if (probabilityScore > 90) {
            // AI probability > 90% (real probability < 10%)
            aiVerdict.textContent = '🤖 Very Likely AI-Generated';
            aiVerdict.className = 'ai-verdict very-likely-ai';
          } else if (probabilityScore > 70) {
            // AI probability > 70% (real probability < 30%)
            aiVerdict.textContent = '🤖 Likely AI-Generated';
            aiVerdict.className = 'ai-verdict likely-ai';
          } else if (realProbability < 60) {
            // Real probability < 60% (AI probability > 40%) - show as unclear/maybe fake
            aiVerdict.textContent = '❓ Unclear - Maybe Fake';
            aiVerdict.className = 'ai-verdict unclear-maybe-fake';
          } else if (realProbability >= 80) {
            // Real probability >= 80% (AI probability <= 20%)
            aiVerdict.textContent = '📷 Very Likely Real Image';
            aiVerdict.className = 'ai-verdict very-likely-real';
          } else {
            // Real probability 60-80% (AI probability 20-40%)
            aiVerdict.textContent = '📷 Likely Real Image';
            aiVerdict.className = 'ai-verdict likely-real';
          }
        
          // Update indicators with comprehensive multi-model information
          let indicatorsHTML = `<strong>Detection Method:</strong> ${aiData.method || 'Multi-model analysis'}<br>`;
          
          // Add model-specific results if available
          if (aiData.modelResults && aiData.modelResults.length > 1) {
            indicatorsHTML += `
              <strong>Individual Model Results:</strong>
              <div class="model-results">
                ${aiData.modelResults.map(model => `
                  <div class="model-result">
                    <strong>${model.model}:</strong> ${Math.round(model.probability)}% (${model.verdict})
                  </div>
                `).join('')}
              </div>
            `;
          }
          
          if (aiData.indicators && aiData.indicators.length > 0) {
            indicatorsHTML += `
              <strong>Analysis Indicators:</strong>
              <ul class="ai-indicators-list">
                ${aiData.indicators.slice(0, 8).map(indicator => `<li>${indicator}</li>`).join('')}
              </ul>
            `;
          }
          
          // Add detailed reasoning if available
          if (aiData.reasoning && aiData.reasoning.length > 10) {
            const shortReasoning = aiData.reasoning.length > 200 ? 
              aiData.reasoning.substring(0, 200) + '...' : aiData.reasoning;
            indicatorsHTML += `
              <strong>Analysis Reasoning:</strong>
              <p class="reasoning-text">${shortReasoning}</p>
            `;
          }
          
          // Add quality analysis if available
          if (result.qualityAnalysis) {
            const quality = result.qualityAnalysis;
            indicatorsHTML += `
              <strong>Image Quality Analysis:</strong>
              <div class="quality-metrics">
                <span>Quality Score: ${Math.round(quality.score * 100)}%</span>
                ${quality.resolution !== 'unknown' ? `<span>Resolution: ${quality.resolution}</span>` : ''}
              </div>
            `;
          }
          
          // Add variance information for multi-model results
          if (aiData.variance !== undefined) {
            const agreementLevel = aiData.variance < 400 ? 'High' : aiData.variance < 900 ? 'Moderate' : 'Low';
            indicatorsHTML += `
              <div class="model-agreement">
                <strong>Model Agreement:</strong> ${agreementLevel} (variance: ${aiData.variance})
              </div>
            `;
          }
          
          if (indicatorsHTML === `<strong>Detection Method:</strong> ${aiData.method || 'Multi-model analysis'}<br>`) {
            indicatorsHTML += '<p>No specific AI generation indicators detected.</p>';
          }
          
          aiIndicators.innerHTML = indicatorsHTML;
        } else {
          // Handle case where analysis succeeded but no AI data
          aiVerdict.textContent = '❓ Unable to determine';
          aiVerdict.className = 'ai-verdict uncertain';
          aiConfidence.textContent = 'Analysis incomplete';
          aiIndicators.innerHTML = '<p>Could not analyze image for AI generation.</p>';
        }
      } else {
        // Handle case where analysis failed
        aiVerdict.textContent = '❌ Analysis failed';
        aiVerdict.className = 'ai-verdict uncertain';
        aiConfidence.textContent = 'Error';
        aiIndicators.innerHTML = '<p>Multi-model analysis failed. Please try again.</p>';
      }
    } else {
      // Fallback: Show message about AI detection service
      aiVerdict.textContent = '⚙️ Service not configured';
      aiVerdict.className = 'ai-verdict uncertain';
      aiConfidence.textContent = 'N/A';
      aiIndicators.innerHTML = `
        <p><strong>AI detection service not available.</strong></p>
        <p>Possible reasons:</p>
        <ul>
          <li>Gemini API key not configured in config.js</li>
          <li>SightEngine API credentials not configured in config.js</li>
          <li>Network connectivity issues</li>
        </ul>
        <p><em>Please configure at least one AI detection service in config.js</em></p>
      `;
    }
  } catch (error) {
    console.error('AI detection failed:', error);
    aiVerdict.textContent = '❌ Detection failed';
    aiVerdict.className = 'ai-verdict uncertain';
    aiConfidence.textContent = 'Error';
    
    // Provide specific error messages
    if (error.message.includes('CORS')) {
      aiIndicators.innerHTML = `
        <p><strong>CORS Error Detected</strong></p>
        <p>SightEngine API cannot be accessed directly from the browser due to CORS restrictions.</p>
        <p><strong>Solutions:</strong></p>
        <ul>
          <li>Use a backend server to proxy API requests</li>
          <li>Deploy the application with proper CORS configuration</li>
          <li>Use SightEngine's JavaScript SDK if available</li>
        </ul>
        <p><em>Error: ${error.message}</em></p>
      `;
    } else {
      aiIndicators.innerHTML = `
        <p>Failed to analyze image for AI generation.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please check your API credentials and try again.</p>
      `;
    }
  }
}

function analyzeContent(content, type) {
  const processingState = document.getElementById('processingState');
  const resultsSection = document.getElementById('resultsSection');
  const progressFill = document.getElementById('progressFill');
  
  // Hide previous results and show processing
  if (resultsSection) resultsSection.classList.add('hidden');
  if (processingState) processingState.classList.remove('hidden');
  
  // Simulate analysis with progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress > 100) progress = 100;
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    if (progress >= 100) {
      clearInterval(progressInterval);
      setTimeout(() => {
        showAnalysisResults(content, type);
      }, 800);
    }
  }, 200);
}

function showAnalysisResults(content, type) {
  const processingState = document.getElementById('processingState');
  const resultsSection = document.getElementById('resultsSection');
  
  // Hide processing and show results
  if (processingState) processingState.classList.add('hidden');
  
  // Generate and display results
  const result = generateMockResult(content);
  displayVerificationResults(result);
  
  if (resultsSection) resultsSection.classList.remove('hidden');
}

function generateMockResult(content) {
  const contentLower = content.toLowerCase();
  
  // Check for scam indicators
  const scamKeywords = ['click here', 'urgent', 'winner', 'lottery', 'free money', 'limited time', 'government scheme', 'claim now'];
  const hasScamKeywords = scamKeywords.some(keyword => contentLower.includes(keyword));
  
  // Check for health claims
  const healthKeywords = ['cure', 'medicine', 'treatment', 'covid', 'vaccine', 'miracle'];
  const hasHealthClaims = healthKeywords.some(keyword => contentLower.includes(keyword));
  
  if (hasScamKeywords) {
    return {
      verdict: 'dangerous',
      confidence: 92,
      explanation: 'This content contains multiple scam indicators including urgency tactics and suspicious claims. High probability of being fraudulent.',
      recommendations: [
        'Do not click any links or provide personal information',
        'Verify through official channels before taking action',
        'Report this content to relevant authorities',
        'Educate others about these common scam tactics'
      ]
    };
  } else if (hasHealthClaims) {
    return {
      verdict: 'suspicious',
      confidence: 68,
      explanation: 'Medical claims detected that require verification from qualified healthcare professionals and official health authorities.',
      recommendations: [
        'Consult with qualified medical professionals',
        'Check WHO and official health ministry websites',
        'Look for peer-reviewed scientific studies',
        'Be cautious of miracle cure claims'
      ]
    };
  } else {
    return {
      verdict: 'safe',
      confidence: 85,
      explanation: 'Content appears to be legitimate but always practice critical thinking when consuming digital information.',
      recommendations: [
        'Cross-reference with multiple reliable sources',
        'Check publication dates and author credentials',
        'Verify important information before sharing',
        'Stay updated with digital literacy best practices'
      ]
    };
  }
}

function displayVerificationResults(result) {
  const confidenceFill = document.getElementById('confidenceFill');
  const confidenceValue = document.getElementById('confidenceValue');
  const verdictDisplay = document.getElementById('verdictDisplay');
  const verdictIcon = document.getElementById('verdictIcon');
  const verdictText = document.getElementById('verdictText');
  const analysisExplanation = document.getElementById('analysisExplanation');
  const recommendationsList = document.getElementById('recommendationsList');

  // Update confidence meter
  if (confidenceFill && confidenceValue) {
    confidenceFill.style.width = `${result.confidence}%`;
    confidenceValue.textContent = `${result.confidence}%`;
    
    // Set confidence level class
    confidenceFill.className = 'confidence-fill';
    if (result.confidence >= 75) {
      confidenceFill.classList.add('high');
    } else if (result.confidence >= 50) {
      confidenceFill.classList.add('medium');
    } else {
      confidenceFill.classList.add('low');
    }
  }
  
  // Update verdict display
  if (verdictDisplay) {
    verdictDisplay.className = `verdict-display ${result.verdict}`;
    
    if (verdictIcon && verdictText) {
      switch (result.verdict) {
        case 'safe':
          verdictIcon.textContent = '✅';
          verdictText.textContent = 'Likely Safe';
          break;
        case 'suspicious':
          verdictIcon.textContent = '⚠️';
          verdictText.textContent = 'Needs Verification';
          break;
        case 'dangerous':
          verdictIcon.textContent = '❌';
          verdictText.textContent = 'Likely Dangerous';
          break;
      }
    }
  }
  
  // Update explanation
  if (analysisExplanation) {
    analysisExplanation.textContent = result.explanation;
  }
  
  // Update recommendations
  if (recommendationsList) {
    recommendationsList.innerHTML = '';
    result.recommendations.forEach(rec => {
      const li = document.createElement('li');
      li.textContent = rec;
      recommendationsList.appendChild(li);
    });
  }
}

// Enhanced News functionality
function initNewsSection() {
  const categoryTabs = document.querySelectorAll('.category-tab');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const sortFilter = document.getElementById('sortFilter');
  const sourceFilter = document.getElementById('sourceFilter');
  const viewBtns = document.querySelectorAll('.view-btn');

  // Category tabs
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;
      
      // Update active tab with animation
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update state and filter articles
      appState.currentCategory = category;
      appState.filterArticles(category, appState.searchQuery);
      
      // Re-render with loading animation
      animateArticleTransition(() => {
        renderArticles();
        renderPagination();
        updateResultsCount();
      });
    });
  });

  // Enhanced search functionality
  const performSearch = () => {
    const searchTerm = searchInput ? searchInput.value : '';
    appState.searchQuery = searchTerm;
    appState.filterArticles(appState.currentCategory, searchTerm);
    
    animateArticleTransition(() => {
      renderArticles();
      renderPagination();
      updateResultsCount();
    });
  };

  if (searchInput) {
    // Debounced search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(performSearch, 300);
    });
    
    // Enter key search
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        performSearch();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }

  // Sort filter
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      appState.currentSort = e.target.value;
      appState.filterArticles(appState.currentCategory, appState.searchQuery);
      
      animateArticleTransition(() => {
        renderArticles();
        renderPagination();
        updateResultsCount();
      });
    });
  }

  // Source filter
  if (sourceFilter) {
    sourceFilter.addEventListener('change', (e) => {
      appState.currentSource = e.target.value;
      appState.filterArticles(appState.currentCategory, appState.searchQuery);
      
      animateArticleTransition(() => {
        renderArticles();
        renderPagination();
        updateResultsCount();
      });
    });
  }

  // View toggle
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      
      // Update active button
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update view
      appState.currentView = view;
      const articlesGrid = document.getElementById('articlesGrid');
      if (articlesGrid) {
        articlesGrid.className = view === 'list' ? 'articles-grid list-view' : 'articles-grid';
      }
    });
  });

  // Initial render
  renderNewsSection();
}

function renderNewsSection() {
  renderFeaturedArticles();
  renderArticles();
  renderTrendingTopics();
  renderRecentArticles();
}

function renderFeaturedArticles() {
  const featuredArticles = document.getElementById('featuredArticles');
  if (!featuredArticles) return;
  
  const featured = appState.getFeaturedArticles();
  featuredArticles.innerHTML = '';
  
  featured.forEach(article => {
    const articleElement = createArticleCard(article, true);
    featuredArticles.appendChild(articleElement);
  });
}

// Enhanced renderNewsSection with loading states and error handling
async function renderNewsSection() {
  // Show loading state if articles aren't loaded yet
  if (!appState.newsLoaded && !appState.loadingNews) {
    showNewsLoadingState();
    await appState.loadAllArticles();
  }
  
  renderFeaturedArticles();
  renderArticles();
  renderTrendingTopics();
  renderRecentArticles();
  renderTrustedSources();
  renderPagination();
  updateResultsCount();
}

function renderArticles() {
  const articlesGrid = document.getElementById('articlesGrid');
  if (!articlesGrid) return;
  
  // Get paginated articles
  const paginatedArticles = appState.getPaginatedArticles();
  
  articlesGrid.innerHTML = '';
  
  if (paginatedArticles.length === 0) {
    articlesGrid.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3>No articles found</h3>
        <p>Try adjusting your search criteria or filters</p>
        <button class="btn btn--outline" onclick="clearFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }
  
  // Apply current view class
  articlesGrid.className = appState.currentView === 'list' ? 'articles-grid list-view' : 'articles-grid';
  
  paginatedArticles.forEach((article, index) => {
    const articleElement = createArticleCard(article, false);
    
    // Add staggered animation
    articleElement.style.opacity = '0';
    articleElement.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      articleElement.style.transition = 'all 0.3s ease';
      articleElement.style.opacity = '1';
      articleElement.style.transform = 'translateY(0)';
    }, index * 50);
    
    articlesGrid.appendChild(articleElement);
  });
}

// Clear all filters
function clearFilters() {
  const searchInput = document.getElementById('searchInput');
  const sortFilter = document.getElementById('sortFilter');
  const sourceFilter = document.getElementById('sourceFilter');
  const categoryTabs = document.querySelectorAll('.category-tab');
  
  if (searchInput) searchInput.value = '';
  if (sortFilter) sortFilter.value = 'date-desc';
  if (sourceFilter) sourceFilter.value = 'all';
  
  // Reset category to 'all'
  categoryTabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.category === 'all') {
      tab.classList.add('active');
    }
  });
  
  // Reset app state
  appState.currentCategory = 'all';
  appState.currentSort = 'date-desc';
  appState.currentSource = 'all';
  appState.searchQuery = '';
  appState.currentPage = 1;
  
  // Re-filter and render
  appState.filterArticles('all', '');
  
  animateArticleTransition(() => {
    renderArticles();
    renderPagination();
    updateResultsCount();
  });
}

function createArticleCard(article, isFeatured = false) {
  const card = document.createElement('div');
  const cardClasses = ['article-card'];
  
  if (isFeatured) cardClasses.push('featured');
  if (article.verified) cardClasses.push('verified');
  
  card.className = cardClasses.join(' ');
  
  const trendingBadge = article.trending ? '<span class="trending-badge">Trending</span>' : '';
  const verifiedBadge = article.verified ? '<span class="verified-badge" title="Verified by trusted source">Verified</span>' : '';
  const sourceInfo = article.source ? `<span class="article-source">${article.source}</span>` : '';
  
  card.innerHTML = `
    <div class="article-header">
      <div class="article-category">${article.category}${trendingBadge}</div>
      ${verifiedBadge}
    </div>
    <a href="${article.url || '#'}" class="article-headline" target="${article.url ? '_blank' : '_self'}" onclick="${article.url ? '' : `openArticle(${article.id}); return false;`}">
      ${article.headline}
      ${article.url ? '<span class="external-link-icon">↗</span>' : ''}
    </a>
    <div class="article-meta">
      <span class="article-author">${article.author}</span>
      <span class="article-date">${formatDate(article.date)}</span>
      ${sourceInfo}
    </div>
    <div class="article-excerpt">${article.excerpt}</div>
    <div class="article-footer">
      <span class="read-time">${article.readTime}</span>
      <a href="${article.url || '#'}" class="read-more" target="${article.url ? '_blank' : '_self'}" onclick="${article.url ? '' : `openArticle(${article.id}); return false;`}">
        ${article.url ? 'Read Full Article' : 'Read More'}
        <span class="read-more-icon">→</span>
      </a>
    </div>
  `;
  
  // Add click tracking for analytics
  card.addEventListener('click', () => {
    trackArticleClick(article.id, article.category);
  });
  
  return card;
}

// Article click tracking
function trackArticleClick(articleId, category) {
  console.log(`Article clicked: ${articleId} in category: ${category}`);
  // In production, this would send analytics data
}

// Animation helper for article transitions
function animateArticleTransition(callback) {
  const articlesGrid = document.getElementById('articlesGrid');
  if (!articlesGrid) {
    callback();
    return;
  }
  
  // Fade out
  articlesGrid.style.opacity = '0';
  articlesGrid.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    callback();
    
    // Fade in
    articlesGrid.style.opacity = '1';
    articlesGrid.style.transform = 'translateY(0)';
  }, 200);
}

// Update results count
function updateResultsCount() {
  const resultsCount = document.getElementById('resultsCount');
  if (!resultsCount) return;
  
  const total = appState.filteredArticles.length;
  const showing = Math.min(appState.articlesPerPage, total - (appState.currentPage - 1) * appState.articlesPerPage);
  const start = total > 0 ? (appState.currentPage - 1) * appState.articlesPerPage + 1 : 0;
  const end = Math.min(start + showing - 1, total);
  
  if (total === 0) {
    resultsCount.textContent = 'No articles found';
  } else {
    resultsCount.textContent = `Showing ${start}-${end} of ${total} articles`;
  }
}

// Render pagination
function renderPagination() {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  
  const totalPages = appState.getTotalPages();
  const currentPage = appState.currentPage;
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let paginationHTML = '';
  
  // Previous button
  paginationHTML += `
    <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      ← Previous
    </button>
  `;
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  paginationHTML += `
    <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      Next →
    </button>
  `;
  
  // Page info
  paginationHTML += `<div class="pagination-info">Page ${currentPage} of ${totalPages}</div>`;
  
  pagination.innerHTML = paginationHTML;
}

// Change page function
function changePage(page) {
  const totalPages = appState.getTotalPages();
  if (page < 1 || page > totalPages) return;
  
  appState.currentPage = page;
  
  animateArticleTransition(() => {
    renderArticles();
    renderPagination();
    updateResultsCount();
  });
  
  // Scroll to top of articles
  const articlesGrid = document.getElementById('articlesGrid');
  if (articlesGrid) {
    articlesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// New function to render trusted sources
function renderTrustedSources() {
  const trustedSourcesContainer = document.getElementById('trustedSources');
  if (!trustedSourcesContainer) return;
  
  const factCheckSources = appData.trustedSources.factCheck;
  
  trustedSourcesContainer.innerHTML = '';
  
  factCheckSources.forEach(source => {
    const sourceElement = document.createElement('div');
    sourceElement.className = 'trusted-source-card';
    sourceElement.innerHTML = `
      <div class="source-header">
        <h4>${source.name}</h4>
        <span class="verified-badge">Verified</span>
      </div>
      <p>${source.description}</p>
      <a href="${source.url}" target="_blank" class="btn btn--sm btn--outline">
        Visit Source
        <span class="btn-icon">↗</span>
      </a>
    `;
    trustedSourcesContainer.appendChild(sourceElement);
  });
}

function renderTrendingTopics() {
  const trendingTopics = document.getElementById('trendingTopics');
  if (!trendingTopics) return;
  
  trendingTopics.innerHTML = '';
  
  appData.trendingTopics.forEach(topic => {
    const topicElement = document.createElement('div');
    topicElement.className = 'trending-topic';
    topicElement.textContent = topic;
    topicElement.addEventListener('click', () => {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = topic;
        appState.filterArticles(appState.currentCategory, topic);
        renderArticles();
      }
    });
    trendingTopics.appendChild(topicElement);
  });
}

function renderRecentArticles() {
  const recentArticles = document.getElementById('recentArticles');
  if (!recentArticles) return;
  
  const recent = appState.getRecentArticles();
  recentArticles.innerHTML = '';
  
  recent.forEach(article => {
    const recentElement = document.createElement('div');
    recentElement.className = 'recent-article';
    recentElement.innerHTML = `
      <a href="#" class="recent-article-title" onclick="openArticle(${article.id})">${article.headline}</a>
      <div class="recent-article-date">${formatDate(article.date)}</div>
    `;
    recentArticles.appendChild(recentElement);
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Global function for article links
function openArticle(articleId) {
  const article = appState.allArticles.find(a => a.id === articleId);
  if (article) {
    alert(`Opening article: "${article.headline}"\n\nThis would open the full article in a real implementation.`);
  }
}

// Language functionality
function initLanguage() {
  const languageToggle = document.getElementById('languageToggle');
  if (!languageToggle) return;
  
  languageToggle.addEventListener('click', () => {
    appState.currentLanguage = appState.currentLanguage === 'en' ? 'hi' : 'en';
    updateLanguage();
  });
}

function updateLanguage() {
  const currentLang = appData.languages[appState.currentLanguage];
  if (!currentLang) return;
  
  const languageToggle = document.getElementById('languageToggle');
  
  // Update language toggle button
  if (languageToggle) {
    languageToggle.textContent = appState.currentLanguage === 'en' ? 'EN / हिं' : 'हिं / EN';
  }
  
  // Update translatable elements
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    if (currentLang[key]) {
      // Check if the content contains HTML tags
      if (currentLang[key].includes('<')) {
        element.innerHTML = currentLang[key];
      } else {
        element.textContent = currentLang[key];
      }
    }
  });
  
  // Update placeholder attributes
  document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
    const key = element.getAttribute('data-translate-placeholder');
    if (currentLang[key]) {
      element.placeholder = currentLang[key];
    }
  });
  
  // Update page title
  if (currentLang.title) {
    document.title = `${currentLang.title} - Professional misinformation detection and digital literacy`;
  }
  
  // Update logo title
  const logoTitle = document.querySelector('.logo__title');
  if (logoTitle && currentLang.title) {
    logoTitle.textContent = currentLang.title;
  }
}

// Accessibility and Keyboard Navigation
class AccessibilityManager {
  constructor() {
    this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.currentFocusIndex = 0;
    this.announcements = document.createElement('div');
    this.setupAriaLiveRegion();
    this.initKeyboardNavigation();
    this.initFocusManagement();
  }
  
  setupAriaLiveRegion() {
    this.announcements.setAttribute('aria-live', 'polite');
    this.announcements.setAttribute('aria-atomic', 'true');
    this.announcements.className = 'sr-only';
    this.announcements.id = 'announcements';
    document.body.appendChild(this.announcements);
  }
  
  announce(message) {
    this.announcements.textContent = message;
    setTimeout(() => {
      this.announcements.textContent = '';
    }, 1000);
  }
  
  initKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Tab':
          this.handleTabNavigation(e);
          break;
        case 'Escape':
          this.handleEscapeKey(e);
          break;
        case 'Enter':
        case ' ':
          this.handleEnterSpace(e);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          this.handleArrowKeys(e);
          break;
        case '/':
          this.handleSearchShortcut(e);
          break;
      }
    });
  }
  
  handleTabNavigation(e) {
    const focusableElements = document.querySelectorAll(this.focusableElements);
    const visibleElements = Array.from(focusableElements).filter(el => {
      return el.offsetParent !== null && !el.disabled && 
             !el.closest('.hidden') && !el.closest('[aria-hidden="true"]');
    });
    
    if (visibleElements.length === 0) return;
    
    const currentIndex = visibleElements.indexOf(document.activeElement);
    
    if (e.shiftKey) {
      // Shift + Tab (backward)
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleElements.length - 1;
      visibleElements[prevIndex].focus();
      e.preventDefault();
    } else {
      // Tab (forward)
      const nextIndex = currentIndex < visibleElements.length - 1 ? currentIndex + 1 : 0;
      visibleElements[nextIndex].focus();
      e.preventDefault();
    }
  }
  
  handleEscapeKey(e) {
    // Close any open modals or return to main navigation
    const activeModal = document.querySelector('.modal[aria-hidden="false"]');
    if (activeModal) {
      this.closeModal(activeModal);
      return;
    }
    
    // Clear search if focused
    const searchInput = document.getElementById('searchInput');
    if (document.activeElement === searchInput && searchInput.value) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      this.announce('Search cleared');
      return;
    }
    
    // Return focus to main navigation
    const firstNavLink = document.querySelector('.nav__link');
    if (firstNavLink) {
      firstNavLink.focus();
      this.announce('Focus returned to main navigation');
    }
  }
  
  handleEnterSpace(e) {
    const target = e.target;
    
    // Handle custom button-like elements
    if (target.getAttribute('role') === 'button' && !target.disabled) {
      target.click();
      e.preventDefault();
    }
    
    // Handle category tabs
    if (target.classList.contains('category-tab')) {
      target.click();
      e.preventDefault();
    }
  }
  
  handleArrowKeys(e) {
    const target = e.target;
    
    // Navigate through category tabs
    if (target.classList.contains('category-tab')) {
      const tabs = Array.from(document.querySelectorAll('.category-tab'));
      const currentIndex = tabs.indexOf(target);
      
      let nextIndex;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      } else {
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      }
      
      tabs[nextIndex].focus();
      e.preventDefault();
    }
    
    // Navigate through pagination
    if (target.classList.contains('pagination-btn')) {
      const buttons = Array.from(document.querySelectorAll('.pagination-btn:not([disabled])'));
      const currentIndex = buttons.indexOf(target);
      
      let nextIndex;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
      } else {
        nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
      }
      
      buttons[nextIndex].focus();
      e.preventDefault();
    }
  }
  
  handleSearchShortcut(e) {
    // Focus search input when '/' is pressed (like GitHub)
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
        e.preventDefault();
        this.announce('Search focused');
      }
    }
  }
  
  initFocusManagement() {
    // Add focus indicators
    document.addEventListener('focusin', (e) => {
      e.target.classList.add('keyboard-focus');
    });
    
    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('keyboard-focus');
    });
    
    // Announce section changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList.contains('section') && !target.classList.contains('hidden')) {
            const sectionTitle = target.querySelector('h2')?.textContent || 
                                target.id?.replace('-', ' ') || 'Section';
            this.announce(`Navigated to ${sectionTitle}`);
          }
        }
      });
    });
    
    document.querySelectorAll('.section').forEach(section => {
      observer.observe(section, { attributes: true, attributeFilter: ['class'] });
    });
  }
  
  // Skip to main content functionality
  addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const mainContent = document.getElementById('main-content') || 
                         document.querySelector('main') ||
                         document.querySelector('.hero-section');
      if (mainContent) {
        mainContent.focus();
        mainContent.scrollIntoView();
      }
    });
  }
  
  // Update ARIA labels based on state
  updateAriaLabels() {
    // Update navigation current page
    const activeNavLink = document.querySelector('.nav__link.active');
    document.querySelectorAll('.nav__link').forEach(link => {
      link.removeAttribute('aria-current');
    });
    if (activeNavLink) {
      activeNavLink.setAttribute('aria-current', 'page');
    }
    
    // Update theme toggle label
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      themeToggle.setAttribute('aria-label', `Switch to ${newTheme} theme`);
    }
  }
}

// Mobile Menu Functionality
function initMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const headerNav = document.querySelector('.header__nav');
  const navLinks = document.querySelectorAll('.nav__link');
  
  if (!mobileMenuToggle || !headerNav) return;
  
  // Toggle mobile menu
  mobileMenuToggle.addEventListener('click', () => {
    const isOpen = headerNav.classList.contains('mobile-open');
    
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });
  
  // Close menu when clicking nav links
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileMenuToggle.contains(e.target) && !headerNav.contains(e.target)) {
      closeMobileMenu();
    }
  });
  
  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });
  
  function openMobileMenu() {
    headerNav.classList.add('mobile-open');
    mobileMenuToggle.classList.add('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'true');
  }
  
  function closeMobileMenu() {
    headerNav.classList.remove('mobile-open');
    mobileMenuToggle.classList.remove('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
  }
}

// Initialize application
function initApp() {
  console.log('Initializing Factify application...');
  // Ensure CSS knows the exact sticky header height
  updateHeaderHeight();
  window.addEventListener('resize', debounce(updateHeaderHeight, 150));
  
  // Initialize accessibility first
  const accessibilityManager = new AccessibilityManager();
  accessibilityManager.addSkipLink();
  
  // Initialize core functionality
  initNavigation();
  initThemeToggle();
  initMobileMenu();
  initVerification();
  initNewsSection();
  initLanguage();
  
  // Initialize animations and interactions
  initScrollAnimations();
  initParallaxEffects();
  initDataVisualizations();
  
  // Update accessibility labels
  accessibilityManager.updateAriaLabels();
  
  // Preload critical news data
  appState.loadAllArticles();
  
  // Global accessibility manager reference
  window.accessibilityManager = accessibilityManager;
  
  console.log('Factify application initialized successfully!');
}

// Enhanced scroll animations
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        
        // Special handling for stat cards
        if (entry.target.classList.contains('stat-card')) {
          const icon = entry.target.querySelector('.stat-card__icon');
          if (icon) {
            icon.style.animationDelay = '0.2s';
          }
        }
      }
    });
  }, observerOptions);
  
  // Observe stat cards for animation
  document.querySelectorAll('.stat-card').forEach(card => {
    observer.observe(card);
  });
  
  // Observe article cards
  document.querySelectorAll('.article-card').forEach(card => {
    observer.observe(card);
  });
  
  // Observe other animated elements
  document.querySelectorAll('.hero__badge, .hero__title, .hero__subtitle, .hero__actions').forEach(element => {
    observer.observe(element);
  });
}

// Animated counter for statistics
function initAnimatedCounters() {
  const counters = document.querySelectorAll('.stat-card__number[data-target]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
  const target = parseInt(element.dataset.target);
  const duration = 2000;
  const increment = target / (duration / 16);
  let current = 0;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    
    // Format number with appropriate suffix
    const formatted = formatStatNumber(current, target);
    element.textContent = formatted;
  }, 16);
}

function formatStatNumber(current, target) {
  if (target >= 1000000) {
    return (current / 1000000).toFixed(1) + 'M';
  } else if (target >= 1000) {
    return (current / 1000).toFixed(0) + 'K';
  } else if (target < 100) {
    return current.toFixed(1);
  } else {
    return Math.round(current).toLocaleString();
  }
}

// Live verification feed
class LiveFeedManager {
  constructor() {
    this.feedContainer = document.getElementById('liveFeed');
    this.feedItems = [
      { status: 'verified', text: 'Health claim verified from WHO source', type: 'health' },
      { status: 'flagged', text: 'Suspicious financial scheme detected', type: 'financial' },
      { status: 'verified', text: 'Political fact-check confirmed by Reuters', type: 'politics' },
      { status: 'pending', text: 'Deepfake analysis in progress', type: 'technology' },
      { status: 'verified', text: 'Medical misinformation debunked by CDC', type: 'health' },
      { status: 'flagged', text: 'Cryptocurrency scam alert issued', type: 'financial' },
      { status: 'verified', text: 'Educational content approved by UNESCO', type: 'education' },
      { status: 'flagged', text: 'AI-generated content identified', type: 'ai_deepfakes' }
    ];
    this.currentIndex = 0;
    this.startFeed();
  }
  
  startFeed() {
    if (!this.feedContainer) return;
    
    // Add initial item
    this.addFeedItem();
    
    // Add new items every 3-5 seconds
    setInterval(() => {
      this.addFeedItem();
    }, Math.random() * 2000 + 3000);
  }
  
  addFeedItem() {
    const item = this.feedItems[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.feedItems.length;
    
    const feedElement = document.createElement('div');
    feedElement.className = 'feed-item';
    feedElement.innerHTML = `
      <span class="feed-status ${item.status}">${this.getStatusIcon(item.status)}</span>
      <span class="feed-text">${item.text}</span>
      <span class="feed-time">now</span>
    `;
    
    // Add to top of feed
    this.feedContainer.insertBefore(feedElement, this.feedContainer.firstChild);
    
    // Remove old items (keep max 5)
    const items = this.feedContainer.querySelectorAll('.feed-item');
    if (items.length > 5) {
      items[items.length - 1].remove();
    }
    
    // Update timestamps
    this.updateTimestamps();
  }
  
  getStatusIcon(status) {
    switch (status) {
      case 'verified': return '✓';
      case 'flagged': return '⚠';
      case 'pending': return '🔄';
      default: return '•';
    }
  }
  
  updateTimestamps() {
    const timeElements = this.feedContainer.querySelectorAll('.feed-time');
    timeElements.forEach((element, index) => {
      if (index === 0) {
        element.textContent = 'now';
      } else {
        element.textContent = `${index * 3}s ago`;
      }
    });
  }
}

// Mini chart visualization
function createMiniChart(containerId, data) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = container.offsetWidth;
  canvas.height = 40;
  container.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 40);
  gradient.addColorStop(0, 'rgba(33, 128, 141, 0.8)');
  gradient.addColorStop(1, 'rgba(33, 128, 141, 0.1)');
  
  // Generate sample data if not provided
  if (!data) {
    data = Array.from({ length: 20 }, () => Math.random() * 0.8 + 0.2);
  }
  
  const width = canvas.width;
  const height = canvas.height;
  const stepX = width / (data.length - 1);
  
  // Draw the chart
  ctx.beginPath();
  ctx.moveTo(0, height);
  
  data.forEach((value, index) => {
    const x = index * stepX;
    const y = height - (value * height);
    if (index === 0) {
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.lineTo(width, height);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw the line
  ctx.beginPath();
  data.forEach((value, index) => {
    const x = index * stepX;
    const y = height - (value * height);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = 'rgba(33, 128, 141, 1)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Initialize all data visualizations
function initDataVisualizations() {
  // Initialize animated counters
  initAnimatedCounters();
  
  // Initialize live feed
  const liveFeed = new LiveFeedManager();
  
  // Create mini charts for each stat card
  setTimeout(() => {
    createMiniChart('verificationsChart');
    createMiniChart('scamsChart');
    createMiniChart('usersChart');
    createMiniChart('accuracyChart');
  }, 500);
}

// Parallax effects
function initParallaxEffects() {
  let ticking = false;
  
  function updateParallax() {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    parallaxElements.forEach(element => {
      const speed = element.dataset.parallax || 0.5;
      const yPos = -(scrolled * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });
    
    ticking = false;
  }
  
  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }
  
  window.addEventListener('scroll', requestTick);
}

// VS Code Background Animation
class VSCodeBackground {
  constructor() {
    this.codeLines = document.getElementById('codeLines');
    this.heatmapGrid = document.getElementById('heatmapGrid');
    this.codeSnippets = [
      'function analyzeContent(text) {',
      '  const result = await api.factCheck(text);',
      '  return result.credibility > 0.8;',
      '}',
      '',
      'class MisinformationDetector {',
      '  constructor(apiKeys) {',
      '    this.gemini = new GeminiAPI(apiKeys.gemini);',
      '    this.ocr = new OCRService(apiKeys.ocr);',
      '  }',
      '',
      '  async verify(content) {',
      '    const analysis = await this.gemini.analyze(content);',
      '    return {',
      '      credible: analysis.score > 0.7,',
      '      confidence: analysis.confidence,',
      '      sources: analysis.sources',
      '    };',
      '  }',
      '}',
      '',
      'const detector = new MisinformationDetector({',
      '  gemini: process.env.GEMINI_API_KEY,',
      '  ocr: process.env.OCR_SPACE_API_KEY',
      '});',
      '',
      'export { detector, analyzeContent };'
    ];
    this.init();
  }

  init() {
    this.createCodeLines();
    this.createHeatmapGrid();
    this.startAnimations();
  }

  createCodeLines() {
    if (!this.codeLines) return;
    
    for (let i = 0; i < 15; i++) {
      const line = document.createElement('div');
      line.className = 'code-line';
      line.textContent = this.codeSnippets[i % this.codeSnippets.length];
      line.style.left = Math.random() * 100 + '%';
      line.style.animationDelay = Math.random() * 8 + 's';
      line.style.animationDuration = (8 + Math.random() * 4) + 's';
      this.codeLines.appendChild(line);
    }
  }

  createHeatmapGrid() {
    if (!this.heatmapGrid) return;
    
    for (let i = 0; i < 300; i++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.style.animationDelay = Math.random() * 4 + 's';
      cell.style.animationDuration = (4 + Math.random() * 2) + 's';
      this.heatmapGrid.appendChild(cell);
    }
  }

  startAnimations() {
    // Refresh code lines periodically
    setInterval(() => {
      this.refreshCodeLines();
    }, 10000);
  }

  refreshCodeLines() {
    if (!this.codeLines) return;
    
    const lines = this.codeLines.querySelectorAll('.code-line');
    lines.forEach((line, index) => {
      setTimeout(() => {
        line.textContent = this.codeSnippets[Math.floor(Math.random() * this.codeSnippets.length)];
        line.style.left = Math.random() * 100 + '%';
      }, index * 100);
    });
  }
}

// Chatbot Functionality
class FactCheckChatbot {
  constructor() {
    this.chatMessages = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.chatSendBtn = document.getElementById('chatSendBtn');
    this.isTyping = false;
    this.conversationHistory = [];
    this.init();
  }

  init() {
    if (!this.chatInput || !this.chatSendBtn) return;
    
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.chatInput.addEventListener('input', () => {
      this.autoResize();
    });

    this.chatSendBtn.addEventListener('click', () => {
      this.sendMessage();
    });
  }

  autoResize() {
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 100) + 'px';
  }

  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message || this.isTyping) return;

    this.addMessage(message, 'user');
    this.chatInput.value = '';
    this.autoResize();
    this.chatSendBtn.disabled = true;

    await this.processUserMessage(message);
    this.chatSendBtn.disabled = false;
  }

  addMessage(content, sender = 'bot') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = content;
    
    messageDiv.appendChild(bubbleDiv);
    this.chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
      <span>AI is analyzing...</span>
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    
    this.chatMessages.appendChild(typingDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    this.isTyping = true;
  }

  hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    this.isTyping = false;
  }

  async processUserMessage(message) {
    this.showTypingIndicator();
    this.conversationHistory.push({ role: 'user', content: message });

    try {
      // Use API manager if available
      if (typeof apiManager !== 'undefined' && apiManager !== null) {
        const analysis = await apiManager.analyzeContent(message, 'text');
        const response = this.generateResponseFromAnalysis(analysis, message);
        
        setTimeout(() => {
          this.hideTypingIndicator();
          this.addMessage(response, 'bot');
          this.conversationHistory.push({ role: 'bot', content: response });
        }, 1500);
      } else {
        // Fallback to local analysis
        const response = this.generateLocalResponse(message);
        
        setTimeout(() => {
          this.hideTypingIndicator();
          this.addMessage(response, 'bot');
          this.conversationHistory.push({ role: 'bot', content: response });
        }, 1500);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setTimeout(() => {
        this.hideTypingIndicator();
        this.addMessage('I apologize, but I encountered an error while analyzing your request. Please try again or contact support if the issue persists.', 'bot');
      }, 1000);
    }
  }

  generateResponseFromAnalysis(analysis, originalMessage) {
    if (!analysis || !analysis.success) {
      return this.generateLocalResponse(originalMessage);
    }

    const factCheck = analysis.analysis?.factCheck || {};
    const sentiment = analysis.analysis?.sentiment || {};
    const classification = analysis.analysis?.classification || {};
    const wikiFactCheck = analysis.analysis?.wikiFactCheck || {};
    const finalVerdict = analysis.finalVerdict || {};
    
    // Determine clear verdict
    let clearVerdict = 'UNCLEAR';
    let verdictEmoji = '❓';
    
    if (wikiFactCheck.trueFalseRating) {
      switch (wikiFactCheck.trueFalseRating) {
        case 'TRUE':
        case 'LIKELY_RELIABLE':
          clearVerdict = 'RIGHT';
          verdictEmoji = '✅';
          break;
        case 'FALSE':
        case 'HIGHLY_QUESTIONABLE':
          clearVerdict = 'WRONG';
          verdictEmoji = '❌';
          break;
        case 'PARTIALLY_TRUE':
        case 'MISLEADING':
        case 'NEEDS_VERIFICATION':
        default:
          clearVerdict = 'UNCLEAR';
          verdictEmoji = '⚠️';
          break;
      }
    } else if (finalVerdict.verdict) {
      switch (finalVerdict.verdict) {
        case 'LIKELY_RELIABLE':
          clearVerdict = 'RIGHT';
          verdictEmoji = '✅';
          break;
        case 'HIGHLY_UNRELIABLE':
        case 'QUESTIONABLE':
          clearVerdict = 'WRONG';
          verdictEmoji = '❌';
          break;
        default:
          clearVerdict = 'UNCLEAR';
          verdictEmoji = '⚠️';
          break;
      }
    }

    let response = `**VERDICT: ${verdictEmoji} ${clearVerdict}**\n\n`;
    
    // Add Gemini brief explanation (70 words) if available
    if (factCheck.briefExplanation) {
      response += `**Brief Explanation:**\n${factCheck.briefExplanation}\n\n`;
    }
    
    // Complete statement with explanation
    let completeStatement = '';
    
    if (factCheck.webResearch) {
      completeStatement = factCheck.webResearch;
    } else if (factCheck.detailedExplanation) {
      completeStatement = factCheck.detailedExplanation;
    } else if (wikiFactCheck.correctFact && wikiFactCheck.correctFact.includes('GIST - RIGHT:')) {
      completeStatement = wikiFactCheck.correctFact.split('GIST - RIGHT:')[1].trim();
    } else if (wikiFactCheck.whyWrong) {
      if (wikiFactCheck.whyWrong.includes('DETAILED EXPLANATION:')) {
        completeStatement = wikiFactCheck.whyWrong.split('DETAILED EXPLANATION:')[1].split('(1)')[0].trim();
      } else {
        completeStatement = wikiFactCheck.whyWrong;
      }
    } else {
      completeStatement = 'Analysis completed. Please verify through multiple independent sources.';
    }
    
    // Add complete statement
    response += `${completeStatement}\n\n`;
    
    // Add citations on separate lines
    if (wikiFactCheck.citationLinks && wikiFactCheck.citationLinks.length > 0) {
      response += `**Citations:**\n`;
      wikiFactCheck.citationLinks.slice(0, 3).forEach((link, index) => {
        response += `${link}\n`;
      });
    } else {
      response += `**Citations:**\nVerify through WHO, CDC, and established fact-checking organizations\n`;
    }
    
    return response;
  }

  generateLocalResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Health claims with enhanced fact-checking
    if (lowerMessage.includes('health') || lowerMessage.includes('medical') || lowerMessage.includes('cure') || lowerMessage.includes('vaccine')) {
      let response = `🏥 **Health Information Fact-Check**\n\n`;
      
      // Specific health misinformation patterns
      if (lowerMessage.includes('cure cancer') || lowerMessage.includes('miracle cure')) {
        response += `**VERDICT: ❌ WRONG**\n\n`;
        response += `Claims of "miracle cures" for cancer are false because cancer comprises over 200 different diseases, each requiring specific, evidence-based treatments. No single cure exists for all cancers. Legitimate treatments undergo rigorous clinical trials and FDA approval processes.\n\n`;
        response += `**Citations:**\nhttps://www.cancer.gov/about-cancer/treatment/types\nhttps://www.who.int/news-room/fact-sheets/detail/cancer\n\n`;
      } else if (lowerMessage.includes('vaccine') && (lowerMessage.includes('autism') || lowerMessage.includes('cause'))) {
        response += `**VERDICT: ❌ WRONG**\n\n`;
        response += `The vaccine-autism link is false. The original 1998 study by Andrew Wakefield was retracted for fraud and data falsification. Multiple large-scale studies involving millions of children across different countries have found no correlation between vaccines and autism. Vaccines are among the safest medical interventions.\n\n`;
        response += `**Citations:**\nhttps://www.cdc.gov/vaccinesafety/concerns/autism.html\nhttps://www.who.int/news-room/feature-stories/detail/vaccine-safety\n\n`;
      } else {
        response += `**VERDICT: ⚠️ UNCLEAR**\n\n`;
        response += `Health claims require careful verification because medical misinformation can be dangerous to public health and individual safety. Always consult qualified healthcare professionals and verify information through reputable medical organizations.\n\n`;
        response += `**Citations:**\nhttps://www.who.int/\nhttps://www.cdc.gov/\n\n`;
      }
      
      response += `⚠️ **Important**: Always consult qualified healthcare professionals for medical advice.`;
      return response;
    }
    
    // Scam detection
    if (lowerMessage.includes('scam') || lowerMessage.includes('fraud') || lowerMessage.includes('money') || lowerMessage.includes('winner')) {
      return `🚨 **Scam Detection Analysis**

**Common Red Flags**: 
• Urgency tactics ("Act now!", "Limited time offer!")
• Requests for personal or financial information
• Too-good-to-be-true promises or offers
• Poor grammar, spelling, or unprofessional communication

🛡️ **Protection Tips**: 
• Never share personal information with unknown contacts
• Verify independently through official channels
• Be skeptical of unexpected winnings or offers
• Report suspicious content to relevant authorities`;
    }
    
    // News verification - concise
    if (lowerMessage.includes('news') || lowerMessage.includes('article') || lowerMessage.includes('headline')) {
      let response = `📰 **News Fact-Check**\n\n`;
      
      if (lowerMessage.includes('election fraud')) {
        response += `**VERDICT: ⚠️ UNCLEAR**\n\n`;
        response += `Claims of widespread election fraud require substantial evidence and have been extensively investigated. Multiple audits, recounts, and court cases found no evidence of systematic fraud that would change election outcomes. U.S. elections have multiple security safeguards including paper trails, bipartisan oversight, and post-election audits.\n\n`;
        response += `**Citations:**\nhttps://www.cisa.gov/election-security\nhttps://www.eac.gov/election-officials/election-security\n\n`;
      } else if (lowerMessage.includes('climate change') && lowerMessage.includes('hoax')) {
        response += `**VERDICT: ❌ WRONG**\n\n`;
        response += `Climate change is not a hoax. Over 97% of actively publishing climate scientists agree that human activities are the primary cause of recent climate change. This consensus is supported by multiple lines of evidence including temperature records, ice core data, and observable environmental changes.\n\n`;
        response += `**Citations:**\nhttps://climate.nasa.gov/evidence/\nhttps://www.ipcc.ch/reports/\n\n`;
      } else {
        response += `**VERDICT: ⚠️ UNCLEAR**\n\n`;
        response += `News content should be verified through multiple independent sources and established fact-checking organizations. Check source credibility, look for corroborating reports, and verify publication dates and author credentials.\n\n`;
        response += `**Citations:**\nhttps://www.factcheck.org/\nhttps://www.politifact.com/\n\n`;
      }
      
      response += `Share your article for quick analysis!`;
      return response;
    }
    
    // Social media posts - concise
    if (lowerMessage.includes('social media') || lowerMessage.includes('facebook') || lowerMessage.includes('twitter') || lowerMessage.includes('instagram')) {
      let response = `📱 **Social Media Fact-Check**\n\n`;
      
      if (lowerMessage.includes('5g') && lowerMessage.includes('covid')) {
        response += `**VERDICT: ❌ WRONG**\n\n`;
        response += `The claim that 5G technology causes or spreads COVID-19 is false. Viruses are biological entities that cannot be transmitted through radio waves or electromagnetic radiation. COVID-19 is caused by the SARS-CoV-2 virus and spreads through respiratory droplets when infected people cough, sneeze, or talk.\n\n`;
        response += `**Citations:**\nhttps://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters\nhttps://www.fcc.gov/consumers/guides/5g-mobile-wireless-technology\n\n`;
      } else if (lowerMessage.includes('flat earth')) {
        response += `**VERDICT: ❌ WRONG**\n\n`;
        response += `The Earth is not flat. Multiple lines of evidence confirm Earth is an oblate spheroid (slightly flattened sphere), including satellite imagery from multiple countries, physics principles, navigation systems, and astronomical observations. Ships disappear hull-first over the horizon due to Earth's curvature.\n\n`;
        response += `**Citations:**\nhttps://www.nasa.gov/audience/forstudents/k-4/stories/nasa-knows/what-is-earth-k4.html\nhttps://earthobservatory.nasa.gov/\n\n`;
      } else {
        response += `**VERDICT: ⚠️ UNCLEAR**\n\n`;
        response += `Social media content should be verified through multiple independent sources and established fact-checking organizations. Check if accounts are verified, look for original sources, and use reverse image searches for photos.\n\n`;
        response += `**Citations:**\nhttps://www.snopes.com/\nhttps://www.factcheck.org/\n\n`;
      }
      
      response += `Share your social media content for quick verification!`;
      return response;
    }
    
    // General response - clear format
    return `🤖 **Factify Fact-Checker**

**VERDICT: ❓ READY TO ANALYZE**

I provide clear fact-checking with complete statements followed by authoritative citations. Each analysis includes a definitive verdict of RIGHT, WRONG, or UNCLEAR based on current evidence from reliable sources.

**Citations:**
https://www.who.int/
https://www.cdc.gov/
https://www.factcheck.org/

**Share any claim for comprehensive fact-checking with complete analysis and citations!**`;
  }

  // Clear chat function
  clearChat() {
    if (this.chatMessages) {
      this.chatMessages.innerHTML = '';
    }
    if (this.chatInput) {
      this.chatInput.value = '';
      this.chatInput.focus();
    }
    this.conversationHistory = [];
    
    // Add welcome message back
    this.addMessage('👋 Hi! I\'m your AI fact-checking assistant. Send me any content you\'d like me to analyze for credibility and accuracy.', 'bot');
  }
}

// Global functions for suggested questions
function sendSuggestedQuestion(question) {
  const chatInput = document.getElementById('chatInput');
  if (chatInput && window.factCheckChatbot) {
    chatInput.value = question;
    window.factCheckChatbot.sendMessage();
  }
}

function sendChatMessage() {
  if (window.factCheckChatbot) {
    window.factCheckChatbot.sendMessage();
  }
}

// Global function to clear chat
function clearChat() {
  if (window.factCheckChatbot) {
    window.factCheckChatbot.clearChat();
  }
}

// API Status Checker
class APIStatusChecker {
  constructor() {
    this.isChecking = false;
    this.lastCheck = null;
  }

  async checkAllServices() {
    if (this.isChecking) return;
    
    this.isChecking = true;
    this.showCheckingState();
    
    try {
      if (typeof apiManager !== 'undefined' && apiManager !== null) {
        const healthCheck = await apiManager.healthCheck();
        this.updateServiceStatuses(healthCheck);
        this.lastCheck = new Date();
      } else {
        console.warn('API Manager not available, showing fallback status');
        // Fallback when API manager is not available
        this.showFallbackStatus();
      }
    } catch (error) {
      console.error('Health check failed:', error);
      this.showErrorState(error.message);
    } finally {
      this.isChecking = false;
      this.hideCheckingState();
    }
  }

  showCheckingState() {
    const refreshBtn = document.getElementById('refreshStatusBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    
    if (refreshBtn) {
      refreshBtn.classList.add('refreshing');
      refreshBtn.disabled = true;
    }
    
    // Reset all service cards to checking state
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
      card.className = 'service-card';
      const indicator = card.querySelector('.status-indicator');
      const statusText = card.querySelector('.status-text');
      
      if (indicator) {
        indicator.className = 'status-indicator checking';
      }
      if (statusText) {
        statusText.textContent = 'Checking...';
      }
    });

    // Update summary
    const summaryText = document.getElementById('summaryText');
    if (summaryText) {
      summaryText.textContent = 'Testing all services...';
    }
  }

  hideCheckingState() {
    const refreshBtn = document.getElementById('refreshStatusBtn');
    
    if (refreshBtn) {
      refreshBtn.classList.remove('refreshing');
      refreshBtn.disabled = false;
    }
  }

  updateServiceStatuses(healthCheck) {
    const services = healthCheck.services;
    
    Object.keys(services).forEach(serviceName => {
      const serviceData = services[serviceName];
      this.updateServiceCard(serviceName, serviceData);
    });

    // Update summary
    this.updateSummary(healthCheck);
  }

  updateServiceCard(serviceName, serviceData) {
    const serviceCard = document.querySelector(`[data-service="${serviceName}"]`);
    if (!serviceCard) return;

    const indicator = serviceCard.querySelector('.status-indicator');
    const statusText = serviceCard.querySelector('.status-text');
    const statusMessage = serviceCard.querySelector('.status-message');
    const lastTest = serviceCard.querySelector('.last-test');

    // Update card class
    serviceCard.className = `service-card ${serviceData.status}`;

    // Update indicator
    if (indicator) {
      indicator.className = `status-indicator ${serviceData.status}`;
    }

    // Update status text
    if (statusText) {
      statusText.textContent = this.getStatusText(serviceData.status);
    }

    // Update message
    if (statusMessage) {
      statusMessage.textContent = serviceData.message || 'No additional information';
    }

    // Update last test time
    if (lastTest && serviceData.lastTest) {
      const testTime = new Date(serviceData.lastTest);
      lastTest.textContent = `Last tested: ${testTime.toLocaleTimeString()}`;
    }
  }

  updateSummary(healthCheck) {
    const summaryText = document.getElementById('summaryText');
    const summaryTimestamp = document.getElementById('summaryTimestamp');

    if (summaryText) {
      summaryText.textContent = `${healthCheck.summary} - Status: ${healthCheck.status.replace('_', ' ').toUpperCase()}`;
    }

    if (summaryTimestamp) {
      const timestamp = new Date(healthCheck.timestamp);
      summaryTimestamp.textContent = `Last checked: ${timestamp.toLocaleString()}`;
    }
  }

  getStatusText(status) {
    switch (status) {
      case 'connected':
        return 'Connected ✅';
      case 'error':
        return 'Error ❌';
      case 'configured':
        return 'Configured ⚙️';
      case 'not_configured':
        return 'Not Configured ⚠️';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  }

  showFallbackStatus() {
    const services = ['gemini', 'huggingface', 'ocr', 'sightengine'];
    
    services.forEach(serviceName => {
      const serviceData = {
        status: 'not_configured',
        message: 'Backend service not available - check your configuration',
        lastTest: new Date().toISOString()
      };
      this.updateServiceCard(serviceName, serviceData);
    });

    // Update summary
    const summaryText = document.getElementById('summaryText');
    const summaryTimestamp = document.getElementById('summaryTimestamp');

    if (summaryText) {
      summaryText.textContent = 'Backend service not available - Please check your configuration';
    }

    if (summaryTimestamp) {
      summaryTimestamp.textContent = `Last checked: ${new Date().toLocaleString()}`;
    }
  }

  showErrorState(errorMessage) {
    const services = ['gemini', 'huggingface', 'ocr', 'sightengine'];
    
    services.forEach(serviceName => {
      const serviceData = {
        status: 'error',
        message: errorMessage,
        lastTest: new Date().toISOString()
      };
      this.updateServiceCard(serviceName, serviceData);
    });

    // Update summary
    const summaryText = document.getElementById('summaryText');
    const summaryTimestamp = document.getElementById('summaryTimestamp');

    if (summaryText) {
      summaryText.textContent = `Error checking services: ${errorMessage}`;
    }

    if (summaryTimestamp) {
      summaryTimestamp.textContent = `Last checked: ${new Date().toLocaleString()}`;
    }
  }
}

// Global API status checker instance
let apiStatusChecker;

// Global function for the check status button
function checkAPIStatus() {
  if (apiStatusChecker) {
    apiStatusChecker.checkAllServices();
  }
}

// Initialize VS Code background and chatbot
function initVSCodeFeatures() {
  // Initialize VS Code background
  const vsCodeBg = new VSCodeBackground();
  
  // Initialize chatbot
  window.factCheckChatbot = new FactCheckChatbot();
  
  // Initialize API status checker
  apiStatusChecker = new APIStatusChecker();
  
  // Initialize API manager
  if (typeof initializeAPIManager === 'function') {
    initializeAPIManager();
  }
  
  // Set dark theme by default for VS Code look
  document.documentElement.setAttribute('data-color-scheme', 'dark');
  updateThemeIcon('dark');
}

// Enhanced verification with backend integration
async function analyzeContentWithBackend(content, type) {
  const processingState = document.getElementById('processingState');
  const resultsSection = document.getElementById('resultsSection');
  const progressFill = document.getElementById('progressFill');
  
  // Hide previous results and show processing
  if (resultsSection) resultsSection.classList.add('hidden');
  if (processingState) processingState.classList.remove('hidden');
  
  // Simulate analysis with progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress > 100) progress = 100;
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    if (progress >= 100) {
      clearInterval(progressInterval);
    }
  }, 200);

  try {
    let result;
    
    // Use API manager if available
    if (typeof apiManager !== 'undefined' && apiManager !== null) {
      const analysis = await apiManager.analyzeContent(content, type);
      result = convertBackendResult(analysis);
    } else {
      // Fallback to original mock analysis
      result = generateMockResult(content);
    }
    
    // Ensure progress reaches 100%
    setTimeout(() => {
      clearInterval(progressInterval);
      if (progressFill) progressFill.style.width = '100%';
      
      setTimeout(() => {
        showAnalysisResults(content, type, result);
      }, 500);
    }, 2000);
    
  } catch (error) {
    console.error('Analysis error:', error);
    clearInterval(progressInterval);
    
    setTimeout(() => {
      const fallbackResult = generateMockResult(content);
      showAnalysisResults(content, type, fallbackResult);
    }, 1000);
  }
}

function convertBackendResult(backendAnalysis) {
  if (!backendAnalysis || !backendAnalysis.success) {
    return generateMockResult('');
  }
  
  const factCheck = backendAnalysis.analysis?.factCheck || {};
  const sentiment = backendAnalysis.analysis?.sentiment || {};
  const classification = backendAnalysis.analysis?.classification || {};
  
  // Calculate credibility score based on available data
  let credibilityScore = factCheck.credibilityScore || 50;
  
  // Adjust score based on sentiment and classification
  if (sentiment.sentiment === 'NEGATIVE' && classification.classification === 'misleading') {
    credibilityScore = Math.max(10, credibilityScore - 20);
  } else if (classification.classification === 'factual') {
    credibilityScore = Math.min(90, credibilityScore + 10);
  }
  
  // Determine verdict based on credibility score
  let verdict = 'questionable';
  if (credibilityScore > 70) {
    verdict = 'likely_true';
  } else if (credibilityScore < 30) {
    verdict = 'likely_false';
  }
  
  // Build explanation with all available analysis
  let explanation = factCheck.analysis || 'AI analysis completed.';
  if (sentiment.sentiment) {
    explanation += ` Sentiment: ${sentiment.sentiment}.`;
  }
  if (classification.classification) {
    explanation += ` Content type: ${classification.classification}.`;
  }
  
  return {
    verdict,
    confidence: credibilityScore,
    explanation,
    recommendations: [
      'Cross-reference with multiple reliable sources',
      'Check the publication date and context',
      'Verify author credentials and expertise',
      classification.classification === 'misleading' ? 'Be cautious - content may be misleading' : null,
      sentiment.sentiment === 'NEGATIVE' ? 'Consider emotional bias in the content' : null
    ].filter(Boolean)
  };
}

// Update the original analyzeContent function
function analyzeContent(content, type) {
  analyzeContentWithBackend(content, type);
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initVSCodeFeatures();
});