import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  disabled?: boolean;
}

export function FileUpload({
  onFilesSelected,
  accept = '.pdf,.txt,.doc,.docx,.csv,.json',
  maxFiles = 10,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, maxFiles, onFilesSelected],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = e.target.files
        ? Array.from(e.target.files).slice(0, maxFiles)
        : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
      // Reset input
      e.target.value = '';
    },
    [disabled, maxFiles, onFilesSelected],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        bg-white rounded-lg border-2 border-dashed p-8 text-center transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Upload
        className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
      />
      <p className="text-gray-600 mb-2">
        {isDragging ? 'Drop files here' : 'Drop files here or click to browse'}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Supported: PDF, DOC, DOCX, TXT, CSV, JSON (Max {maxFiles} files)
      </p>
      <label className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
        />
        <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Select Files
        </span>
      </label>
    </div>
  );
}
