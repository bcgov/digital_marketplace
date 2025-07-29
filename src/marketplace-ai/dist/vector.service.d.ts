import { OnModuleInit } from '@nestjs/common';
export declare class VectorService implements OnModuleInit {
  private client;
  private embeddingPipeline;
  private collections;
  onModuleInit(): Promise<void>;
  private getOrCreateCollection;
  addDocument(
    collectionName: string,
    id: string,
    content: string,
    metadata?: any,
  ): Promise<void>;
  searchSimilar(
    collectionName: string,
    query: string,
    limit?: number,
  ): Promise<any>;
  listCollections(): Promise<string[]>;
  deleteCollection(collectionName: string): Promise<void>;
  wipeAllCollections(): Promise<void>;
  getCollectionCount(collectionName: string): Promise<number>;
  getAllCollectionCounts(): Promise<Record<string, number>>;
}
