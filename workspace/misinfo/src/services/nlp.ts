import axios, { AxiosResponse } from 'axios';
import { TextAnalysisResult, APIConfig } from '@/types';
import { generateId } from '@/utils';

// Hugging Face API service for NLP tasks
export class HuggingFaceService {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Sentiment analysis
  async analyzeSentiment(text: string): Promise<{ label: string; score: number }> {
    try {
      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/cardiffnlp/twitter-roberta-base-sentiment-latest`,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data && response.data[0] && response.data[0].length > 0) {
        const result = response.data[0][0];
        return {
          label: result.label,
          score: Math.round(result.score * 100) / 100,
        };
      }

      throw new Error('No sentiment analysis results received');
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      throw new Error(`Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Toxicity detection
  async detectToxicity(text: string): Promise<{ isToxic: boolean; score: number; categories?: string[] }> {
    try {
      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/unitary/toxic-bert`,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data && response.data[0] && response.data[0].length > 0) {
        const results = response.data[0];
        const toxicResult = results.find((r: any) => r.label === 'TOXIC');
        const score = toxicResult ? toxicResult.score : 0;
        
        return {
          isToxic: score > 0.5,
          score: Math.round(score * 100) / 100,
          categories: results.filter((r: any) => r.score > 0.3).map((r: any) => r.label),
        };
      }

      return { isToxic: false, score: 0 };
    } catch (error) {
      console.error('Toxicity detection error:', error);
      throw new Error(`Toxicity detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/cardiffnlp/twitter-roberta-base-sentiment-latest`,
        { inputs: 'test' },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Hugging Face connection test failed:', error);
      return false;
    }
  }
}

// Google Gemini API service for chatbot and fact-checking
export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Generate chat response
  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      const systemPrompt = `You are MisinfoGuard Assistant, a concise fact-checking AI. Always provide:
1. A clear VERDICT (TRUE/FALSE/PARTIALLY TRUE/UNVERIFIABLE)
2. Brief explanation (2-3 sentences max)
3. Key correction if information is false
Keep responses under 150 words and be direct.`;

      const fullPrompt = context 
        ? `${systemPrompt}\n\nContext: ${context}\n\nUser: ${prompt}`
        : `${systemPrompt}\n\nUser: ${prompt}`;

      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      }

      throw new Error('No response generated');
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Chat response failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fact-check text
  async factCheck(text: string): Promise<{
    isFactual: boolean;
    confidence: number;
    sources?: string[];
    explanation?: string;
    verdict?: string;
    correction?: string;
  }> {
    try {
      const prompt = `Fact-check this statement and provide a structured response:

Statement: "${text}"

Respond in this exact JSON format:
{
  "verdict": "TRUE/FALSE/PARTIALLY TRUE/UNVERIFIABLE",
  "isFactual": true/false,
  "confidence": 0.0-1.0,
  "explanation": "Brief 1-2 sentence explanation",
  "correction": "What the correct information is (if false)",
  "sources": ["relevant sources if available"]
}`;

      const response = await this.generateResponse(prompt);
      
      try {
        // Try to parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return {
            verdict: result.verdict || 'UNVERIFIABLE',
            isFactual: result.isFactual || false,
            confidence: Math.min(Math.max(result.confidence || 0, 0), 1),
            explanation: result.explanation || 'No explanation provided',
            correction: result.correction || undefined,
            sources: result.sources || [],
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using text analysis');
      }

      // Fallback: analyze text response
      const lowerResponse = response.toLowerCase();
      let verdict = 'UNVERIFIABLE';
      let isFactual = false;
      
      if (lowerResponse.includes('true') && !lowerResponse.includes('false')) {
        verdict = 'TRUE';
        isFactual = true;
      } else if (lowerResponse.includes('false')) {
        verdict = 'FALSE';
        isFactual = false;
      } else if (lowerResponse.includes('partially')) {
        verdict = 'PARTIALLY TRUE';
        isFactual = false;
      }

      return {
        verdict,
        isFactual,
        confidence: lowerResponse.includes('confident') ? 0.8 : 0.5,
        explanation: response.substring(0, 150) + (response.length > 150 ? '...' : ''),
        correction: undefined,
        sources: [],
      };
    } catch (error) {
      console.error('Fact-check error:', error);
      throw new Error(`Fact-check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: 'Hello'
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      
      return response.status === 200 && response.data?.candidates?.length > 0;
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Combined NLP service
export class NLPService {
  private huggingFaceService?: HuggingFaceService;
  private geminiService?: GeminiService;

  constructor(config: APIConfig) {
    if (config.huggingFaceKey) {
      this.huggingFaceService = new HuggingFaceService(config.huggingFaceKey);
    }
    if (config.geminiKey) {
      this.geminiService = new GeminiService(config.geminiKey);
    }
  }

  // Analyze text comprehensively
  async analyzeText(text: string): Promise<TextAnalysisResult> {
    const analysisId = generateId();
    const result: TextAnalysisResult = {
      id: analysisId,
      timestamp: Date.now(),
      text,
      status: 'analyzing',
    };

    try {
      const promises: Promise<void>[] = [];

      // Sentiment analysis
      if (this.huggingFaceService) {
        promises.push(
          this.huggingFaceService.analyzeSentiment(text)
            .then(sentiment => { result.sentiment = sentiment; })
            .catch(error => console.warn('Sentiment analysis failed:', error))
        );

        // Toxicity detection
        promises.push(
          this.huggingFaceService.detectToxicity(text)
            .then(toxicity => { result.toxicity = toxicity; })
            .catch(error => console.warn('Toxicity detection failed:', error))
        );
      }

      // Fact-checking
      if (this.geminiService) {
        promises.push(
          this.geminiService.factCheck(text)
            .then(factCheck => { result.factCheck = factCheck; })
            .catch(error => console.warn('Fact-check failed:', error))
        );
      }

      await Promise.allSettled(promises);
      result.status = 'completed';
      
      return result;
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : 'Analysis failed';
      return result;
    }
  }

  // Generate chat response
  async generateChatResponse(message: string, context?: string): Promise<string> {
    if (!this.geminiService) {
      throw new Error('Gemini API not configured');
    }

    const chatPrompt = `You are MisinfoGuard Assistant, an AI helper focused on fact-checking and misinformation detection. 
You help users verify information, analyze text for potential misinformation, and provide reliable sources.

${context ? `Context: ${context}\n\n` : ''}User: ${message}

Please provide a helpful, accurate response. If discussing facts, mention the importance of verifying information from multiple reliable sources.`;

    return await this.geminiService.generateResponse(chatPrompt);
  }

  // Test API connections
  async testConnections(): Promise<{
    huggingFace: boolean;
    gemini: boolean;
  }> {
    const results = {
      huggingFace: false,
      gemini: false,
    };

    if (this.huggingFaceService) {
      results.huggingFace = await this.huggingFaceService.testConnection();
    }

    if (this.geminiService) {
      results.gemini = await this.geminiService.testConnection();
    }

    return results;
  }

  // Update configuration
  updateConfig(config: APIConfig) {
    if (config.huggingFaceKey) {
      this.huggingFaceService = new HuggingFaceService(config.huggingFaceKey);
    }
    if (config.geminiKey) {
      this.geminiService = new GeminiService(config.geminiKey);
    }
  }
}
