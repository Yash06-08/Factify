import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { APIStatus, APIConfig } from '@/types';
import { NLPService } from '@/services/nlp';

interface APIStatusIndicatorProps {
  apiConfig: APIConfig;
  onRefresh?: () => void;
  className?: string;
}

export const APIStatusIndicator: React.FC<APIStatusIndicatorProps> = ({
  apiConfig,
  onRefresh,
  className,
}) => {
  const [status, setStatus] = useState<APIStatus>({
    ocrSpace: 'unconfigured',
    sightEngine: 'unconfigured',
    huggingFace: 'unconfigured',
    gemini: 'unconfigured',
  });
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const checkAPIStatus = async () => {
    setIsChecking(true);
    
    const newStatus: APIStatus = {
      ocrSpace: 'unconfigured',
      sightEngine: 'unconfigured',
      huggingFace: 'unconfigured',
      gemini: 'unconfigured',
    };

    // Test individual APIs with simpler checks
    
    // Test OCR.space
    if (apiConfig.ocrSpaceKey) {
      try {
        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'apikey': apiConfig.ocrSpaceKey,
            'base64Image': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            'language': 'eng'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          newStatus.ocrSpace = data.OCRExitCode === 1 ? 'connected' : 'error';
        } else {
          newStatus.ocrSpace = response.status === 401 ? 'error' : 'error';
        }
      } catch (error) {
        console.error('OCR.space test error:', error);
        newStatus.ocrSpace = 'error';
      }
    }

    // Test SightEngine
    if (apiConfig.sightEngineUser && apiConfig.sightEngineSecret) {
      try {
        const formData = new FormData();
        formData.append('api_user', apiConfig.sightEngineUser);
        formData.append('api_secret', apiConfig.sightEngineSecret);
        formData.append('models', 'genai');
        formData.append('url', 'https://via.placeholder.com/150');
        
        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          newStatus.sightEngine = data.status === 'success' ? 'connected' : 'error';
        } else {
          newStatus.sightEngine = 'error';
        }
      } catch (error) {
        console.error('SightEngine test error:', error);
        newStatus.sightEngine = 'error';
      }
    }

    // Check NLP APIs
    if (apiConfig.huggingFaceKey || apiConfig.geminiKey) {
      try {
        const nlpService = new NLPService(apiConfig);
        const testResults = await nlpService.testConnections();
        
        newStatus.huggingFace = apiConfig.huggingFaceKey 
          ? (testResults.huggingFace ? 'connected' : 'error')
          : 'unconfigured';
          
        newStatus.gemini = apiConfig.geminiKey
          ? (testResults.gemini ? 'connected' : 'error')
          : 'unconfigured';
      } catch (error) {
        console.error('Error testing NLP APIs:', error);
        if (apiConfig.huggingFaceKey) newStatus.huggingFace = 'error';
        if (apiConfig.geminiKey) newStatus.gemini = 'error';
      }
    }

    setStatus(newStatus);
    setLastChecked(Date.now());
    setIsChecking(false);
    onRefresh?.();
  };

  useEffect(() => {
    checkAPIStatus();
  }, [apiConfig]);

  const getStatusIcon = (apiStatus: APIStatus[keyof APIStatus]) => {
    switch (apiStatus) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-danger-600" />;
      case 'unconfigured':
        return <AlertCircle className="w-4 h-4 text-warning-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (apiStatus: APIStatus[keyof APIStatus]) => {
    switch (apiStatus) {
      case 'connected':
        return <Badge variant="success" size="sm">Connected</Badge>;
      case 'error':
        return <Badge variant="danger" size="sm">Error</Badge>;
      case 'unconfigured':
        return <Badge variant="warning" size="sm">Not Configured</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Unknown</Badge>;
    }
  };

  const apis = [
    { key: 'ocrSpace', name: 'OCR.space', description: 'Text extraction from images' },
    { key: 'sightEngine', name: 'SightEngine', description: 'AI-generated image detection' },
    { key: 'huggingFace', name: 'Hugging Face', description: 'NLP analysis & sentiment' },
    { key: 'gemini', name: 'Google Gemini', description: 'Chatbot & fact-checking' },
  ] as const;

  const connectedCount = Object.values(status).filter(s => s === 'connected').length;
  const totalConfigured = Object.entries(status).filter(([_, s]) => s !== 'unconfigured').length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            API Status
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {connectedCount}/{apis.length} APIs connected
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={checkAPIStatus}
          disabled={isChecking}
          className="p-2 w-8 h-8"
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {apis.map((api) => (
          <motion.div
            key={api.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(status[api.key])}
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {api.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {api.description}
                </div>
              </div>
            </div>
            
            {getStatusBadge(status[api.key])}
          </motion.div>
        ))}
      </div>

      {lastChecked && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          Last checked: {new Date(lastChecked).toLocaleTimeString()}
        </div>
      )}

      {totalConfigured === 0 && (
        <div className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning-600 dark:text-warning-400 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-warning-800 dark:text-warning-300">
                No APIs Configured
              </div>
              <div className="text-warning-700 dark:text-warning-400 mt-1">
                Configure your API keys below to enable all features.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
