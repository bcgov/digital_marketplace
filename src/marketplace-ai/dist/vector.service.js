'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.VectorService = void 0;
const common_1 = require('@nestjs/common');
const chromadb_1 = require('chromadb');
let VectorService = class VectorService {
  client;
  embeddingPipeline;
  collections = new Map();
  async onModuleInit() {
    const { pipeline } = await Promise.resolve().then(() =>
      require('@xenova/transformers'),
    );
    this.client = new chromadb_1.ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
    this.embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true },
    );
  }
  async getOrCreateCollection(collectionName) {
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
      const collection = await this.client.getCollection({
        name: collectionName,
      });
      this.collections.set(collectionName, collection);
      return collection;
    }
  }
  async addDocument(collectionName, id, content, metadata = {}) {
    try {
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
      const collection = await this.getOrCreateCollection(collectionName);
      const cleanMetadata = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== null && value !== undefined) {
          cleanMetadata[key] = String(value);
        }
      }
      const output = await this.embeddingPipeline(content, {
        pooling: 'mean',
        normalize: true,
      });
      const embedding = Array.from(output.data);
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
  async searchSimilar(collectionName, query, limit = 5) {
    try {
      const collection = await this.getOrCreateCollection(collectionName);
      const output = await this.embeddingPipeline(query, {
        pooling: 'mean',
        normalize: true,
      });
      const queryEmbedding = Array.from(output.data);
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
  async listCollections() {
    try {
      const collections = await this.client.listCollections();
      return collections.map((c) => (typeof c === 'string' ? c : c.name));
    } catch (error) {
      console.error('VectorService.listCollections failed:', error);
      throw error;
    }
  }
  async deleteCollection(collectionName) {
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
  async wipeAllCollections() {
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
  async getCollectionCount(collectionName) {
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
  async getAllCollectionCounts() {
    try {
      const collections = await this.listCollections();
      const counts = {};
      for (const collectionName of collections) {
        counts[collectionName] = await this.getCollectionCount(collectionName);
      }
      return counts;
    } catch (error) {
      console.error('VectorService.getAllCollectionCounts failed:', error);
      throw error;
    }
  }
};
exports.VectorService = VectorService;
exports.VectorService = VectorService = __decorate(
  [(0, common_1.Injectable)()],
  VectorService,
);
//# sourceMappingURL=vector.service.js.map
