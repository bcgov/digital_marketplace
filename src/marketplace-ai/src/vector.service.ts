// vector.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import { pipeline } from '@xenova/transformers';

@Injectable()
export class VectorService implements OnModuleInit {
  private client: ChromaClient;
  private embeddingPipeline: any;
  private collection: any;

  async onModuleInit() {
    // Initialize Chroma client - correct import
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });

    // Initialize local embedding model
    this.embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true },
    );

    // Create or get collection
    try {
      this.collection = await this.client.createCollection({
        name: 'documents',
      });
    } catch {
      // Collection might already exist
      this.collection = await this.client.getCollection({ name: 'documents' });
    }
  }

  async addDocument(id: string, content: string, metadata: any = {}) {
    try {
      // Validate inputs
      if (!id || typeof id !== 'string') {
        throw new Error(`Invalid document ID: ${id}`);
      }

      if (
        !content ||
        typeof content !== 'string' ||
        content.trim().length === 0
      ) {
        throw new Error(
          `Invalid content for document ${id}: content must be a non-empty string`,
        );
      }

      // Ensure metadata contains only string values (ChromaDB requirement)
      const cleanMetadata: Record<string, string> = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== null && value !== undefined) {
          cleanMetadata[key] = String(value);
        }
      }

      // Generate embedding
      const output = await this.embeddingPipeline(content, {
        pooling: 'mean',
        normalize: true,
      });
      const embedding = Array.from(output.data);

      // Add to Chroma with validation
      await this.collection.add({
        ids: [id],
        documents: [content],
        embeddings: [embedding],
        metadatas: [cleanMetadata],
      });
    } catch (error) {
      console.error(`VectorService.addDocument failed for ID ${id}:`, error);
      console.error(`Content length: ${content?.length || 0}`);
      console.error(`Metadata:`, JSON.stringify(metadata, null, 2));
      throw error;
    }
  }

  async searchSimilar(query: string, limit: number = 5) {
    // Generate query embedding
    const output = await this.embeddingPipeline(query, {
      pooling: 'mean',
      normalize: true,
    });
    const queryEmbedding = Array.from(output.data);

    // Search in Chroma
    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      include: ['documents', 'metadatas', 'distances'],
    });

    return results.documents[0].map((doc, idx) => ({
      content: doc,
      metadata: results.metadatas[0][idx],
      score: 1 - results.distances[0][idx],
    }));
  }
}
