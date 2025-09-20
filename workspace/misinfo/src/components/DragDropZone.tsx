import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, X, AlertCircle } from 'lucide-react';
import { useDragDrop } from '@/hooks/useDragDrop';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { cn, formatFileSize } from '@/utils';

interface DragDropZoneProps {
  onAnalysisComplete?: (results: any[]) => void;
  className?: string;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onAnalysisComplete,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isDragging,
    files,
    error,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    updateFileStatus,
    clearFiles,
    handleFileInputChange,
    setError,
  } = useDragDrop();

  const { analyzeImages } = useAnalysis();

  const handleAnalyzeFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setError(null);

    // Update all files to uploading status
    pendingFiles.forEach(file => {
      updateFileStatus(file.id, 'uploading', 10);
    });

    try {
      // Simulate upload progress
      for (let progress = 20; progress <= 90; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        pendingFiles.forEach(file => {
          updateFileStatus(file.id, 'analyzing', progress);
        });
      }

      // Perform analysis
      const results = await analyzeImages(pendingFiles.map(f => f.file));

      // Update files with results
      results.forEach((result, index) => {
        const file = pendingFiles[index];
        if (file) {
          updateFileStatus(
            file.id,
            result.status === 'error' ? 'error' : 'completed',
            100,
            result
          );
        }
      });

      onAnalysisComplete?.(results);
    } catch (err) {
      console.error('Analysis failed:', err);
      pendingFiles.forEach(file => {
        updateFileStatus(file.id, 'error', 0);
      });
      setError('Analysis failed. Please try again.');
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="drag-overlay"
          >
            <Card glass className="p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-primary-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Drop images here
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Release to analyze for misinformation
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'drag-zone relative rounded-xl p-8 text-center transition-all duration-200',
          isDragging && 'active'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
            <Image className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Drag & Drop Images
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              or click to browse files
            </p>
            <Button onClick={handleBrowseFiles} variant="primary">
              <Upload className="w-4 h-4" />
              Browse Files
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supports JPEG, PNG, GIF, WebP • Max 10MB per file
          </p>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-700 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-danger-800 dark:text-danger-300">
                  Error
                </h4>
                <p className="text-sm text-danger-700 dark:text-danger-400">
                  {error}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Files ({files.length})
              </h4>
              <div className="flex gap-2">
                {files.some(f => f.status === 'pending') && (
                  <Button
                    size="sm"
                    onClick={handleAnalyzeFiles}
                    disabled={files.every(f => f.status !== 'pending')}
                  >
                    Analyze All
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={clearFiles}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    {file.preview && (
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.file.size)}
                      </p>
                      
                      {file.status !== 'pending' && (
                        <div className="mt-1">
                          <ProgressBar
                            progress={file.progress}
                            size="sm"
                            variant={
                              file.status === 'error' ? 'danger' :
                              file.status === 'completed' ? 'success' :
                              'primary'
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && file.result && (
                        <div className="text-xs text-success-600 dark:text-success-400 font-medium">
                          ✓ Done
                        </div>
                      )}
                      {file.status === 'error' && (
                        <div className="text-xs text-danger-600 dark:text-danger-400 font-medium">
                          ✗ Error
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(file.id)}
                        className="p-1 w-6 h-6"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
