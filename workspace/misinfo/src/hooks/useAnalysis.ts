import { useState, useCallback } from 'react';
import { AnalysisResult, AnalysisHistory } from '@/types';
import { StorageService } from '@/services/storage';
import { AnalysisService } from '@/services/api';
import { QRService } from '@/services/qr';
import { generateId, fileToBase64 } from '@/utils';
import { useSettings } from './useSettings';

export function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState<AnalysisHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  // Load analysis history
  const loadHistory = useCallback(async () => {
    try {
      const analysisHistory = await StorageService.getHistory();
      setHistory(analysisHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    }
  }, []);

  // Analyze a single image
  const analyzeImage = useCallback(async (
    imageFile: File,
    imageUrl?: string
  ): Promise<AnalysisResult | null> => {
    if (!settings?.apiConfig) {
      setError('API configuration not found. Please configure your API keys in settings.');
      return null;
    }

    try {
      setAnalyzing(true);
      setError(null);

      const analysisId = generateId();
      const imageData = await fileToBase64(imageFile);

      // Create initial result
      const result: AnalysisResult = {
        id: analysisId,
        timestamp: Date.now(),
        imageUrl: imageUrl || imageData,
        imageData,
        confidence: 0,
        status: 'analyzing',
      };

      // Initialize analysis service
      const analysisService = new AnalysisService(settings.apiConfig);

      // Perform parallel analysis
      const [analysisResults, qrResult] = await Promise.allSettled([
        analysisService.analyzeImage(imageFile),
        QRService.analyzeImage(imageFile),
      ]);

      // Process OCR and AI detection results
      if (analysisResults.status === 'fulfilled') {
        result.ocrResult = analysisResults.value.ocrResult;
        result.aiDetectionResult = analysisResults.value.aiDetectionResult;
      }

      // Process QR results
      if (qrResult.status === 'fulfilled' && qrResult.value.detected) {
        result.qrResult = qrResult.value;
      }

      // Calculate overall confidence score
      let confidenceSum = 0;
      let confidenceCount = 0;

      if (result.ocrResult) {
        confidenceSum += result.ocrResult.confidence;
        confidenceCount++;
      }

      if (result.aiDetectionResult) {
        confidenceSum += result.aiDetectionResult.confidence;
        confidenceCount++;
      }

      result.confidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
      result.status = 'completed';

      // Save to history if enabled
      if (settings.saveHistory) {
        await StorageService.saveAnalysisResult(result);
        await loadHistory(); // Refresh history
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      
      return {
        id: generateId(),
        timestamp: Date.now(),
        imageUrl: imageUrl || '',
        confidence: 0,
        status: 'error',
        error: errorMessage,
      };
    } finally {
      setAnalyzing(false);
    }
  }, [settings, loadHistory]);

  // Analyze multiple images
  const analyzeImages = useCallback(async (
    imageFiles: File[]
  ): Promise<AnalysisResult[]> => {
    const results: AnalysisResult[] = [];
    
    for (const file of imageFiles) {
      const result = await analyzeImage(file);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }, [analyzeImage]);

  // Clear analysis history
  const clearHistory = useCallback(async () => {
    try {
      await StorageService.clearHistory();
      setHistory({
        results: [],
        totalAnalyses: 0,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history');
    }
  }, []);

  // Get analysis by ID
  const getAnalysisById = useCallback((id: string): AnalysisResult | null => {
    return history?.results.find(result => result.id === id) || null;
  }, [history]);

  return {
    analyzing,
    history,
    error,
    analyzeImage,
    analyzeImages,
    loadHistory,
    clearHistory,
    getAnalysisById,
  };
}
