import { VectorService } from './vector.service';
export interface SyncSourceConfig {
  table: string;
  collection: string;
  fields: {
    id: string;
    content: string;
    updatedAt: string;
    metadata?: string[];
  };
  query?: {
    where?: string;
    joins?: string;
    orderBy?: string;
  };
  chunkSize?: number;
  enabled?: boolean;
}
export declare class ChromaSyncService {
  private vectorService;
  private readonly logger;
  private pgPool;
  private lastSyncTime;
  constructor(vectorService: VectorService);
  incrementalSync(): Promise<void>;
  fullSync(): Promise<void>;
  private syncDataSource;
  private buildQuery;
  private processRecord;
  private extractFieldName;
  private chunkText;
  addSyncConfig(name: string, config: SyncSourceConfig): void;
  setSyncEnabled(sourceName: string, enabled: boolean): void;
  getSyncConfigs(): Record<string, SyncSourceConfig>;
  syncSpecificSource(sourceName: string, incremental?: boolean): Promise<void>;
  healthCheck(): Promise<{
    status: string;
    lastSync: Date | null;
    configs: string[];
  }>;
}
