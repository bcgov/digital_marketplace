import { ChromaSyncService, SyncSourceConfig } from './chroma-sync.service';
import { VectorService } from './vector.service';
export declare class SyncController {
  private chromaSyncService;
  private vectorService;
  constructor(
    chromaSyncService: ChromaSyncService,
    vectorService: VectorService,
  );
  fullSync(): Promise<
    | {
        success: boolean;
        message: string;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
      }
  >;
  incrementalSync(): Promise<
    | {
        success: boolean;
        message: string;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
      }
  >;
  syncSpecificSource(
    sourceName: string,
    incremental?: string,
  ): Promise<
    | {
        success: boolean;
        message: string;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
      }
  >;
  healthCheck(): Promise<{
    status: string;
    lastSync: Date | null;
    configs: string[];
  }>;
  getConfigs(): Promise<Record<string, SyncSourceConfig>>;
  toggleSource(
    sourceName: string,
    enabled?: string,
  ): Promise<{
    success: boolean;
    message: string;
  }>;
  listCollections(): Promise<
    | {
        success: boolean;
        collections: string[];
        message?: undefined;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
        collections?: undefined;
      }
  >;
  searchInCollection(
    collectionName: string,
    body: {
      query: string;
      limit?: number;
    },
  ): Promise<
    | {
        success: boolean;
        results: any;
        message?: undefined;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
        results?: undefined;
      }
  >;
  deleteCollection(collectionName: string): Promise<
    | {
        success: boolean;
        message: string;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
      }
  >;
  wipeAllCollections(): Promise<
    | {
        success: boolean;
        message: string;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
      }
  >;
  getCollectionCount(collectionName: string): Promise<
    | {
        success: boolean;
        collection: string;
        count: number;
        message?: undefined;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
        collection?: undefined;
        count?: undefined;
      }
  >;
  getAllCollectionCounts(): Promise<
    | {
        success: boolean;
        counts: Record<string, number>;
        message?: undefined;
        error?: undefined;
      }
    | {
        success: boolean;
        message: string;
        error: any;
        counts?: undefined;
      }
  >;
}
