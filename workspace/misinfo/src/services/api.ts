import axios, { AxiosResponse } from 'axios';
import { OCRResult, AIDetectionResult, APIConfig } from '@/types';

// OCR.space API service
export class OCRService {
  private apiKey: string;
  private baseUrl = 'https://api.ocr.space/parse/image';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeImage(imageData: string | File): Promise<OCRResult> {
    try {
      const formData = new FormData();
      
      if (typeof imageData === 'string') {
        formData.append('base64Image', imageData);
      } else {
        formData.append('file', imageData);
      }
      
      formData.append('apikey', this.apiKey);
      formData.append('language', 'eng');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      const response: AxiosResponse = await axios.post(this.baseUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.data.OCRExitCode !== 1) {
        throw new Error(response.data.ErrorMessage || 'OCR analysis failed');
      }

      const parsedResults = response.data.ParsedResults?.[0];
      if (!parsedResults) {
        throw new Error('No text detected in image');
      }

      return {
        text: parsedResults.ParsedText || '',
        confidence: parsedResults.TextOverlay?.HasOverlay ? 0.9 : 0.7,
        language: 'eng',
        words: parsedResults.TextOverlay?.Lines?.flatMap((line: any) => 
          line.Words?.map((word: any) => ({
            text: word.WordText,
            confidence: 0.8,
            boundingBox: {
              x: word.Left,
              y: word.Top,
              width: word.Width,
              height: word.Height,
            },
          })) || []
        ) || [],
      };
    } catch (error) {
      console.error('OCR Service Error:', error);
      throw new Error(`OCR analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// SightEngine API service
export class SightEngineService {
  private user: string;
  private secret: string;
  private baseUrl = 'https://api.sightengine.com/1.0/check.json';

  constructor(user: string, secret: string) {
    this.user = user;
    this.secret = secret;
  }

  async analyzeImage(imageData: string | File): Promise<AIDetectionResult> {
    try {
      const formData = new FormData();
      
      if (typeof imageData === 'string') {
        // Handle base64 data URLs
        if (imageData.startsWith('data:')) {
          // Convert base64 data URL to blob
          const response = await fetch(imageData);
          const blob = await response.blob();
          formData.append('media', blob, 'image.png');
          console.log('Added base64 image as blob to form data');
        } else {
          // Assume it's a URL
          formData.append('media_url', imageData);
          console.log('Added media URL to form data:', imageData);
        }
      } else {
        formData.append('media', imageData);
        console.log('Added file to form data');
      }
      
      formData.append('models', 'ai-generated');
      formData.append('api_user', this.user);
      formData.append('api_secret', this.secret);

      console.log('SightEngine API call with models: ai-generated');
      console.log('FormData contents:', {
        models: 'ai-generated',
        api_user: this.user,
        api_secret: this.secret.length > 0 ? '***' : '',
        hasMedia: imageData !== null
      });

      const response: AxiosResponse = await axios.post(this.baseUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('SightEngine response:', response.data);

      if (response.data.status !== 'success') {
        const errorMsg = response.data.error?.message || response.data.message || 'AI detection failed';
        console.error('SightEngine API error:', response.data);
        throw new Error(errorMsg);
      }

      // Check for different response structures
      let genaiResult = response.data.type?.ai_generated;
      
      // Alternative response structure
      if (!genaiResult && response.data.ai_generated) {
        genaiResult = response.data.ai_generated;
      }
      
      // Another alternative
      if (!genaiResult && response.data.genai) {
        genaiResult = response.data.genai.ai_generated;
      }

      if (genaiResult === undefined || genaiResult === null) {
        console.warn('No AI detection data in response:', response.data);
        // Return a default result instead of throwing
        return {
          isAIGenerated: false,
          confidence: 0,
          model: 'SightEngine GenAI',
          details: {
            faces: response.data.faces?.length || 0,
            objects: response.data.objects?.map((obj: any) => obj.name) || [],
            manipulation: false,
          },
        };
      }

      return {
        isAIGenerated: genaiResult > 0.5,
        confidence: Math.round(genaiResult * 100) / 100,
        model: 'SightEngine GenAI',
        details: {
          faces: response.data.faces?.length || 0,
          objects: response.data.objects?.map((obj: any) => obj.name) || [],
          manipulation: genaiResult > 0.7,
        },
      };
    } catch (error) {
      console.error('SightEngine Service Error:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      throw new Error(`AI detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Combined analysis service
export class AnalysisService {
  private ocrService?: OCRService;
  private sightEngineService?: SightEngineService;

  constructor(config: APIConfig) {
    if (config.ocrSpaceKey) {
      this.ocrService = new OCRService(config.ocrSpaceKey);
    }
    if (config.sightEngineUser && config.sightEngineSecret) {
      this.sightEngineService = new SightEngineService(config.sightEngineUser, config.sightEngineSecret);
    }
  }

  async analyzeImage(imageData: string | File): Promise<{
    ocrResult?: OCRResult;
    aiDetectionResult?: AIDetectionResult;
  }> {
    const results: {
      ocrResult?: OCRResult;
      aiDetectionResult?: AIDetectionResult;
    } = {};

    const promises: Promise<void>[] = [];

    // OCR Analysis
    if (this.ocrService) {
      promises.push(
        this.ocrService.analyzeImage(imageData)
          .then(result => { results.ocrResult = result; })
          .catch(error => console.warn('OCR failed:', error))
      );
    }

    // AI Detection Analysis
    if (this.sightEngineService) {
      promises.push(
        this.sightEngineService.analyzeImage(imageData)
          .then(result => { results.aiDetectionResult = result; })
          .catch(error => console.warn('AI detection failed:', error))
      );
    }

    await Promise.allSettled(promises);
    return results;
  }

  updateConfig(config: APIConfig) {
    if (config.ocrSpaceKey) {
      this.ocrService = new OCRService(config.ocrSpaceKey);
    }
    if (config.sightEngineUser && config.sightEngineSecret) {
      this.sightEngineService = new SightEngineService(config.sightEngineUser, config.sightEngineSecret);
    }
  }
}

// Export a convenience function for image analysis
export async function analyzeImage(imageUrl: string, settings: any): Promise<any> {
  const analysisService = new AnalysisService(settings.apiConfig);
  const results = await analysisService.analyzeImage(imageUrl);
  
  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    imageUrl,
    ocrText: results.ocrResult?.text || '',
    aiGenerated: results.aiDetectionResult || { isAIGenerated: false, confidence: 0 },
    qrCode: null,
    metadata: {
      fileSize: 0,
      dimensions: { width: 0, height: 0 },
      format: 'unknown'
    }
  };
}
