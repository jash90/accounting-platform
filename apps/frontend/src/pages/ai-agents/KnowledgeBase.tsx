import React, { useState } from 'react';
import { FileText, Eye, Trash2, Upload as UploadIcon } from 'lucide-react';
import { FileUpload } from '../../components/ai-agents/FileUpload';
import { useUploadKnowledge } from '../../api/aiAgentApi';
import { useAIAgentStore } from '../../stores/aiAgent';

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
}

export function KnowledgeBase() {
  const { selectedAgent } = useAIAgentStore();
  const uploadKnowledge = useUploadKnowledge();
  const [uploading, setUploading] = useState(false);

  // Sample documents (in real app, fetch from API)
  const [documents, setDocuments] = useState<UploadedDocument[]>([
    {
      id: '1',
      fileName: 'Tax Laws 2024.pdf',
      fileSize: '2.4 MB',
      uploadedAt: '2 days ago',
      status: 'indexed',
    },
    {
      id: '2',
      fileName: 'Polish Tax System.pdf',
      fileSize: '1.8 MB',
      uploadedAt: '5 days ago',
      status: 'indexed',
    },
    {
      id: '3',
      fileName: 'VAT Guidelines.docx',
      fileSize: '856 KB',
      uploadedAt: '1 week ago',
      status: 'processing',
    },
  ]);

  const handleFilesSelected = async (files: File[]) => {
    if (!selectedAgent) {
      alert('Please select an agent first');
      return;
    }

    setUploading(true);

    try {
      const result = await uploadKnowledge.mutateAsync({
        agentId: selectedAgent.id,
        files,
      });

      // Add uploaded files to list
      const newDocs: UploadedDocument[] = files.map((file, index) => ({
        id: `new-${Date.now()}-${index}`,
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        uploadedAt: 'Just now',
        status: 'processing' as const,
      }));

      setDocuments([...newDocs, ...documents]);
      alert(`Successfully uploaded ${files.length} file(s)`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter((doc) => doc.id !== id));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      indexed: 'bg-green-100 text-green-700',
      processing: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-gray-100 text-gray-700',
      failed: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Base Manager</h2>
          <p className="text-gray-600">
            Upload and manage documents for your AI agents' knowledge base
          </p>
        </div>

        {/* Agent Selection Notice */}
        {!selectedAgent && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
            <p className="text-sm">
              💡 Select an agent from the dashboard first, then upload documents for that agent's knowledge base.
            </p>
          </div>
        )}

        {/* Upload Area */}
        <div className="mb-6">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            maxFiles={10}
            disabled={!selectedAgent || uploading}
          />
          {uploading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Uploading and indexing documents...</p>
            </div>
          )}
        </div>

        {/* Document List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
              <span className="text-sm text-gray-500">{documents.length} documents</span>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <UploadIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {doc.fileSize} • Uploaded {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                        doc.status
                      )}`}
                    >
                      {doc.status}
                    </span>
                    <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
