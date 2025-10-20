import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorSearchRequest {
  collection: string;
  vector: number[];
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: {
    text: string;
    metadata: Record<string, any>;
  };
}

export interface VectorUpsertRequest {
  knowledgeBaseId: string;
  chunks: Array<{
    text: string;
    embedding: number[];
    metadata: Record<string, any>;
  }>;
}

@Injectable()
export class VectorDBService {
  private client: QdrantClient;

  constructor(private configService: ConfigService) {
    const vectorDbUrl = this.configService.get('VECTOR_DB_URL', 'http://localhost:6333');
    this.client = new QdrantClient({ url: vectorDbUrl });
  }

  async createCollection(collectionName: string): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === collectionName);

      if (exists) {
        console.log(`Collection ${collectionName} already exists`);
        return;
      }

      // Create collection with appropriate vector size (1536 for text-embedding-3-large)
      await this.client.createCollection(collectionName, {
        vectors: {
          size: 3072, // text-embedding-3-large dimension
          distance: 'Cosine'
        }
      });

      console.log(`Collection ${collectionName} created successfully`);
    } catch (error) {
      console.error(`Error creating collection ${collectionName}:`, error);
      throw new Error(`Failed to create vector collection: ${error.message}`);
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection(collectionName);
      console.log(`Collection ${collectionName} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting collection ${collectionName}:`, error);
      throw new Error(`Failed to delete vector collection: ${error.message}`);
    }
  }

  async upsert(request: VectorUpsertRequest): Promise<void> {
    try {
      const points = request.chunks.map((chunk, index) => ({
        id: `${request.knowledgeBaseId}-${index}-${Date.now()}`,
        vector: chunk.embedding,
        payload: {
          text: chunk.text,
          knowledgeBaseId: request.knowledgeBaseId,
          metadata: chunk.metadata
        }
      }));

      // Use the knowledge base ID as collection name
      // In production, you might want to use agent ID as collection
      const collectionName = request.knowledgeBaseId;

      // Ensure collection exists
      await this.createCollection(collectionName);

      // Upsert points
      await this.client.upsert(collectionName, {
        wait: true,
        points
      });

      console.log(`Upserted ${points.length} vectors to collection ${collectionName}`);
    } catch (error) {
      console.error('Error upserting vectors:', error);
      throw new Error(`Failed to upsert vectors: ${error.message}`);
    }
  }

  async search(request: VectorSearchRequest): Promise<VectorSearchResult[]> {
    try {
      const searchResult = await this.client.search(request.collection, {
        vector: request.vector,
        limit: request.limit || 5,
        score_threshold: request.threshold || 0.7,
        filter: request.filter
      });

      return searchResult.map(result => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as any
      }));
    } catch (error) {
      console.error(`Error searching in collection ${request.collection}:`, error);
      // Return empty results instead of throwing if collection doesn't exist
      if (error.message?.includes('Not found')) {
        return [];
      }
      throw new Error(`Failed to search vectors: ${error.message}`);
    }
  }

  async deleteByKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    try {
      // Delete all points with matching knowledge base ID
      await this.client.delete(knowledgeBaseId, {
        wait: true,
        filter: {
          must: [
            {
              key: 'knowledgeBaseId',
              match: { value: knowledgeBaseId }
            }
          ]
        }
      });

      console.log(`Deleted vectors for knowledge base ${knowledgeBaseId}`);
    } catch (error) {
      console.error(`Error deleting vectors for KB ${knowledgeBaseId}:`, error);
      throw new Error(`Failed to delete vectors: ${error.message}`);
    }
  }
}
