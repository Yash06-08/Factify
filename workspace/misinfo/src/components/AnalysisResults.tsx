import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Type, 
  QrCode, 
  Share2, 
  Copy, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ExternalLink
} from 'lucide-react';
import { AnalysisResult } from '@/types';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { cn, formatTimestamp, getConfidenceColor, copyToClipboard } from '@/utils';

interface AnalysisResultsProps {
  results: AnalysisResult[];
  className?: string;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  results,
  className,
}) => {
  const handleCopyText = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      // Could show a toast notification here
      console.log('Text copied to clipboard');
    }
  };

  const handleShare = async (result: AnalysisResult) => {
    const shareData = {
      title: 'MisinfoGuard Analysis Result',
      text: `Analysis Result:\n${result.aiDetectionResult ? 
        `AI Generated: ${result.aiDetectionResult.isAIGenerated ? 'Yes' : 'No'} (${Math.round(result.aiDetectionResult.confidence * 100)}% confidence)\n` : ''
      }${result.ocrResult?.text ? `Text Found: ${result.ocrResult.text.substring(0, 100)}...\n` : ''}`,
      url: result.imageUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to clipboard
      await copyToClipboard(`${shareData.title}\n\n${shareData.text}`);
    }
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'danger';
  };

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Eye className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No analysis results yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload some images to get started with misinformation detection
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Analysis Results ({results.length})
        </h3>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
        {results.map((result, index) => (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={
                          result.status === 'completed' ? 'success' :
                          result.status === 'error' ? 'danger' :
                          'secondary'
                        }
                        size="sm"
                      >
                        {result.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {result.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                        {result.status === 'analyzing' && <Clock className="w-3 h-3" />}
                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </Badge>
                      
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(result.timestamp)}
                      </span>
                    </div>

                    {result.status === 'analyzing' && (
                      <div className="mb-3">
                        <ProgressBar
                          progress={50}
                          size="sm"
                          showLabel={false}
                          variant="primary"
                        />
                      </div>
                    )}

                    {result.confidence > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Overall Confidence:
                          </span>
                          <Badge
                            variant={getConfidenceBadgeVariant(result.confidence)}
                            size="sm"
                          >
                            {Math.round(result.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleShare(result)}
                      className="p-2 w-8 h-8"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* AI Detection Results */}
                  {result.aiDetectionResult && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary-600" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          AI Detection
                        </h4>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            AI Generated:
                          </span>
                          <Badge
                            variant={result.aiDetectionResult.isAIGenerated ? 'danger' : 'success'}
                            size="sm"
                          >
                            {result.aiDetectionResult.isAIGenerated ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Confidence:
                          </span>
                          <span className={cn(
                            'text-sm font-medium',
                            getConfidenceColor(result.aiDetectionResult.confidence)
                          )}>
                            {Math.round(result.aiDetectionResult.confidence * 100)}%
                          </span>
                        </div>

                        {result.aiDetectionResult.details && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              {result.aiDetectionResult.details.faces !== undefined && (
                                <div>Faces detected: {result.aiDetectionResult.details.faces}</div>
                              )}
                              {result.aiDetectionResult.details.objects && result.aiDetectionResult.details.objects.length > 0 && (
                                <div>Objects: {result.aiDetectionResult.details.objects.join(', ')}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OCR Results */}
                  {result.ocrResult && result.ocrResult.text && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-primary-600" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Text Extracted
                        </h4>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                            {result.ocrResult.text.length > 200 
                              ? `${result.ocrResult.text.substring(0, 200)}...`
                              : result.ocrResult.text
                            }
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyText(result.ocrResult!.text)}
                            className="p-1 w-6 h-6 flex-shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            Confidence: {Math.round(result.ocrResult.confidence * 100)}%
                          </span>
                          {result.ocrResult.language && (
                            <span className="text-gray-600 dark:text-gray-400">
                              Language: {result.ocrResult.language.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR Code Results */}
                  {result.qrResult && result.qrResult.detected && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-primary-600" />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          QR Code Detected
                        </h4>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 break-all">
                            {result.qrResult.data}
                          </p>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyText(result.qrResult!.data!)}
                              className="p-1 w-6 h-6"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            {result.qrResult.data?.startsWith('http') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(result.qrResult!.data!, '_blank')}
                                className="p-1 w-6 h-6"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            Format: {result.qrResult.format}
                          </span>
                          {result.qrResult.isUrlSafe !== undefined && (
                            <Badge
                              variant={result.qrResult.isUrlSafe ? 'success' : 'warning'}
                              size="sm"
                            >
                              {result.qrResult.isUrlSafe ? 'Safe URL' : 'Suspicious URL'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {result.status === 'error' && result.error && (
                    <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-danger-600 dark:text-danger-400" />
                        <span className="text-sm font-medium text-danger-800 dark:text-danger-300">
                          Analysis Error
                        </span>
                      </div>
                      <p className="text-sm text-danger-700 dark:text-danger-400 mt-1">
                        {result.error}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
