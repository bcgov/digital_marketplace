// vector.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChromaClient } from 'chromadb';

@Injectable()
export class VectorService implements OnModuleInit {
  private client: ChromaClient;
  private embeddingPipeline: any;
  private collections: Map<string, any> = new Map();

  async onModuleInit() {
    const { pipeline } = await import('@xenova/transformers');
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
  }

  private async getOrCreateCollection(collectionName: string) {
    if (this.collections.has(collectionName)) {
      return this.collections.get(collectionName);
    }

    try {
      const collection = await this.client.createCollection({
        name: collectionName,
      });
      this.collections.set(collectionName, collection);
      return collection;
    } catch {
      // Collection might already exist
      const collection = await this.client.getCollection({
        name: collectionName,
      });
      this.collections.set(collectionName, collection);
      return collection;
    }
  }

  async addDocument(
    collectionName: string,
    id: string,
    content: string,
    metadata: any = {},
  ) {
    try {
      // Validate inputs
      if (!collectionName || typeof collectionName !== 'string') {
        throw new Error(`Invalid collection name: ${collectionName}`);
      }

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

      // Get or create the collection
      const collection = await this.getOrCreateCollection(collectionName);

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
      await collection.add({
        ids: [id],
        documents: [content],
        embeddings: [embedding],
        metadatas: [cleanMetadata],
      });
    } catch (error) {
      console.error(
        `VectorService.addDocument failed for ID ${id} in collection ${collectionName}:`,
        error,
      );
      console.error(`Content length: ${content?.length || 0}`);
      console.error(`Metadata:`, JSON.stringify(metadata, null, 2));
      throw error;
    }
  }

  async searchSimilar(
    collectionName: string,
    query: string,
    limit: number = 5,
  ) {
    try {
      // Get the collection
      const collection = await this.getOrCreateCollection(collectionName);

      // Generate query embedding
      const output = await this.embeddingPipeline(query, {
        pooling: 'mean',
        normalize: true,
      });
      const queryEmbedding = Array.from(output.data);

      // Search in Chroma
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        include: ['documents', 'metadatas', 'distances'],
      });

      return results.documents[0].map((doc, idx) => ({
        content: doc,
        metadata: results.metadatas[0][idx],
        score: 1 - results.distances[0][idx],
      }));
    } catch (error) {
      console.error(
        `VectorService.searchSimilar failed for collection ${collectionName}:`,
        error,
      );
      throw error;
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const collections = await this.client.listCollections();
      // Handle both array of strings and array of objects with name property
      return collections.map((c: any) => (typeof c === 'string' ? c : c.name));
    } catch (error) {
      console.error('VectorService.listCollections failed:', error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
    } catch (error) {
      console.error(
        `VectorService.deleteCollection failed for ${collectionName}:`,
        error,
      );
      throw error;
    }
  }

  async wipeAllCollections(): Promise<void> {
    try {
      const collections = await this.listCollections();
      for (const collectionName of collections) {
        await this.deleteCollection(collectionName);
      }
      this.collections.clear();
    } catch (error) {
      console.error('VectorService.wipeAllCollections failed:', error);
      throw error;
    }
  }

  async getCollectionCount(collectionName: string): Promise<number> {
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      const result = await collection.count();
      return result;
    } catch (error) {
      console.error(
        `VectorService.getCollectionCount failed for ${collectionName}:`,
        error,
      );
      throw error;
    }
  }

  async getAllCollectionCounts(): Promise<Record<string, number>> {
    try {
      const collections = await this.listCollections();
      const counts: Record<string, number> = {};

      for (const collectionName of collections) {
        counts[collectionName] = await this.getCollectionCount(collectionName);
      }

      return counts;
    } catch (error) {
      console.error('VectorService.getAllCollectionCounts failed:', error);
      throw error;
    }
  }
}
