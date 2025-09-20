import { useState, useCallback, useRef, DragEvent } from 'react';
import { DragDropFile } from '@/types';
import { generateId, isValidImageFile } from '@/utils';

export function useDragDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<DragDropFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Handle drag enter
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current++;
    
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    dragCounter.current = 0;
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    
    if (droppedFiles.length === 0) {
      setError('No files detected. Please try again.');
      return;
    }

    // Filter and validate image files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    droppedFiles.forEach(file => {
      if (isValidImageFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid files: ${invalidFiles.join(', ')}. Only image files under 10MB are supported.`);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Create DragDropFile objects
    const newFiles: DragDropFile[] = validFiles.map(file => ({
      file,
      id: generateId(),
      status: 'pending',
      progress: 0,
    }));

    // Generate preview URLs
    newFiles.forEach(dragFile => {
      const reader = new FileReader();
      reader.onload = (e) => {
        dragFile.preview = e.target?.result as string;
        setFiles(prev => [...prev]);
      };
      reader.readAsDataURL(dragFile.file);
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Update file status
  const updateFileStatus = useCallback((
    fileId: string, 
    status: DragDropFile['status'], 
    progress?: number,
    result?: any
  ) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { 
            ...file, 
            status, 
            progress: progress ?? file.progress,
            result: result ?? file.result
          }
        : file
    ));
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  // Handle file input change (for click-to-browse)
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;

    setError(null);

    // Filter and validate image files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    selectedFiles.forEach(file => {
      if (isValidImageFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid files: ${invalidFiles.join(', ')}. Only image files under 10MB are supported.`);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Create DragDropFile objects
    const newFiles: DragDropFile[] = validFiles.map(file => ({
      file,
      id: generateId(),
      status: 'pending',
      progress: 0,
    }));

    // Generate preview URLs
    newFiles.forEach(dragFile => {
      const reader = new FileReader();
      reader.onload = (e) => {
        dragFile.preview = e.target?.result as string;
        setFiles(prev => [...prev]);
      };
      reader.readAsDataURL(dragFile.file);
    });

    setFiles(prev => [...prev, ...newFiles]);

    // Clear the input
    e.target.value = '';
  }, []);

  return {
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
  };
}
