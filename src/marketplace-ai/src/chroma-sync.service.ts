// chroma-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VectorService } from './vector.service';
import { Pool } from 'pg';

// Configuration interface for sync sources
export interface SyncSourceConfig {
  table: string;
  collection: string; // ChromaDB collection name
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

// Default sync configurations for different data sources
const SYNC_CONFIGS: Record<string, SyncSourceConfig> = {
  cwuOpportunityVersions: {
    table: 'public."cwuOpportunityVersions"',
    collection: 'cwu_opportunities', // Dedicated collection for CWU opportunities
    fields: {
      id: 'v.id',
      content: 'v.description',
      updatedAt: 'v."createdAt"',
      metadata: [
        'v.title',
        'v.teaser',
        'v.location',
        'v.reward',
        'v.skills',
        'v.description as full_description',
        'o.id as opportunity_id',
        's.status as status',
      ],
    },
    query: {
      joins: `
        INNER JOIN public."cwuOpportunities" o ON v.opportunity = o.id
        INNER JOIN (
          SELECT opportunity, MAX("createdAt") as latest_created_at
          FROM public."cwuOpportunityVersions"
          GROUP BY opportunity
        ) latest ON v.opportunity = latest.opportunity
        AND v."createdAt" = latest.latest_created_at
        INNER JOIN public."cwuOpportunityStatuses" s ON o.id = s.opportunity
        AND s."createdAt" = (
          SELECT MAX("createdAt")
          FROM public."cwuOpportunityStatuses" s2
          WHERE s2.opportunity = o.id AND s2.status IS NOT NULL
        )
      `,
      where: `v.description IS NOT NULL AND v.description != ''
              AND s.status NOT IN ('DRAFT', 'CANCELED', 'UNDER_REVIEW')`,
      orderBy: 'v."createdAt" DESC',
    },
    chunkSize: 800, // words per chunk
    enabled: true,
  },

  // TWU (Team With Us) Opportunity Versions
  twuOpportunityVersions: {
    table: 'public."twuOpportunityVersions"',
    collection: 'twu_opportunities', // Dedicated collection for TWU opportunities
    fields: {
      id: 'v.id',
      content: 'v.description',
      updatedAt: 'v."createdAt"',
      metadata: [
        'v.title',
        'v.teaser',
        'v.location',
        'v."maxBudget" as max_budget',
        'v.description as full_description',
        'o.id as opportunity_id',
        's.status as status',
      ],
    },
    query: {
      joins: `
        INNER JOIN public."twuOpportunities" o ON v.opportunity = o.id
        INNER JOIN (
          SELECT opportunity, MAX("createdAt") as latest_created_at
          FROM public."twuOpportunityVersions"
          GROUP BY opportunity
        ) latest ON v.opportunity = latest.opportunity
        AND v."createdAt" = latest.latest_created_at
        INNER JOIN public."twuOpportunityStatuses" s ON o.id = s.opportunity
        AND s."createdAt" = (
          SELECT MAX("createdAt")
          FROM public."twuOpportunityStatuses" s2
          WHERE s2.opportunity = o.id AND s2.status IS NOT NULL
        )
      `,
      where: `v.description IS NOT NULL AND v.description != ''
              AND s.status NOT IN ('DRAFT', 'CANCELED', 'UNDER_REVIEW')`,
      orderBy: 'v."createdAt" DESC',
    },
    chunkSize: 800, // words per chunk
    enabled: true,
  },

  // Example: SWU Opportunity Versions (currently disabled)
  swuOpportunityVersions: {
    table: 'public."swuOpportunityVersions"',
    collection: 'swu_opportunities', // Dedicated collection for SWU opportunities
    fields: {
      id: 'v.id',
      content: 'v.description',
      updatedAt: 'v."createdAt"',
      metadata: [
        'v.title',
        'v.teaser',
        'v.location',
        'v."totalMaxBudget" as max_budget',
        'v.description as full_description',
        'o.id as opportunity_id',
        's.status as status',
      ],
    },
    query: {
      joins: `
        INNER JOIN public."swuOpportunities" o ON v.opportunity = o.id
        INNER JOIN (
          SELECT opportunity, MAX("createdAt") as latest_created_at
          FROM public."swuOpportunityVersions"
          GROUP BY opportunity
        ) latest ON v.opportunity = latest.opportunity
        AND v."createdAt" = latest.latest_created_at
        INNER JOIN public."swuOpportunityStatuses" s ON o.id = s.opportunity
        AND s."createdAt" = (
          SELECT MAX("createdAt")
          FROM public."swuOpportunityStatuses" s2
          WHERE s2.opportunity = o.id AND s2.status IS NOT NULL
        )
      `,
      where: `v.description IS NOT NULL AND v.description != ''
              AND s.status NOT IN ('DRAFT', 'CANCELED', 'UNDER_REVIEW')`,
      orderBy: 'v."createdAt" DESC',
    },
    chunkSize: 800,
    enabled: false, // Disabled by default
  },

  // TWU Resource Questions - Questions and guidelines for evaluation
  twuResourceQuestions: {
    table: 'public."twuResourceQuestions"',
    collection: 'twu_resource_questions',
    fields: {
      id: 'CONCAT(o.id, \'_\', rq."order") as id',
      content: "CONCAT(rq.question, ' ', rq.guideline) as content",
      updatedAt: 'rq."createdAt"',
      metadata: [
        'rq.question as full_question',
        'rq.guideline as full_guideline',
        'rq.score',
        'rq."wordLimit" as word_limit',
        'rq."order"',
        'ov.title as opportunity_title',
        'ov.teaser as opportunity_teaser',
        'ov.location as opportunity_location',
        'rq."opportunityVersion" as opportunity_version_id',
        'o.id as opportunity_id',
      ],
    },
    query: {
      joins: `
        INNER JOIN public."twuOpportunityVersions" ov ON rq."opportunityVersion" = ov.id
        INNER JOIN public."twuOpportunities" o ON ov.opportunity = o.id
        INNER JOIN (
          SELECT opportunity, MAX("createdAt") as latest_created_at
          FROM public."twuOpportunityVersions"
          GROUP BY opportunity
        ) latest ON ov.opportunity = latest.opportunity
        AND ov."createdAt" = latest.latest_created_at
        INNER JOIN public."twuOpportunityStatuses" s ON o.id = s.opportunity
        AND s."createdAt" = (
          SELECT MAX("createdAt")
          FROM public."twuOpportunityStatuses" s2
          WHERE s2.opportunity = o.id AND s2.status IS NOT NULL
        )
      `,
      where: `rq.question IS NOT NULL AND rq.question != ''
              AND rq.guideline IS NOT NULL AND rq.guideline != ''
              AND s.status NOT IN ('DRAFT', 'CANCELED', 'UNDER_REVIEW')`,
      orderBy: 'rq."createdAt" DESC',
    },
    chunkSize: 800,
    enabled: true,
  },
};

@Injectable()
export class ChromaSyncService {
  private readonly logger = new Logger(ChromaSyncService.name);
  private pgPool: Pool;
  private lastSyncTime: Date | null = null;

  constructor(private vectorService: VectorService) {
    this.pgPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }

  /**
   * Scheduled incremental sync - runs every 5 minutes
   * Only syncs records updated in the last 5 minutes
   */
  @Cron('0 */5 * * * *') // Every 5 minutes
  async incrementalSync() {
    this.logger.log('Starting incremental sync...');
    try {
      for (const [name, config] of Object.entries(SYNC_CONFIGS)) {
        if (config.enabled) {
          await this.syncDataSource(name, config, true);
        }
      }
      this.lastSyncTime = new Date();
      this.logger.log('Incremental sync completed successfully');
    } catch (error) {
      this.logger.error('Incremental sync failed:', error);
    }
  }

  /**
   * Manual full sync - populates all data from scratch
   * This should be called once to initialize the vector database
   */
  async fullSync() {
    this.logger.log('Starting full sync...');
    try {
      for (const [name, config] of Object.entries(SYNC_CONFIGS)) {
        if (config.enabled) {
          await this.syncDataSource(name, config, false);
        }
      }
      this.lastSyncTime = new Date();
      this.logger.log('Full sync completed successfully');
    } catch (error) {
      this.logger.error('Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync a specific data source
   */
  private async syncDataSource(
    sourceName: string,
    config: SyncSourceConfig,
    incrementalOnly: boolean = false,
  ) {
    this.logger.log(`Syncing ${sourceName}...`);

    const query = this.buildQuery(config, incrementalOnly);
    this.logger.debug(`Executing query: ${query}`);

    const result = await this.pgPool.query(query);
    this.logger.log(`Found ${result.rows.length} records for ${sourceName}`);

    for (const row of result.rows) {
      try {
        await this.processRecord(sourceName, row, config);
      } catch (error) {
        this.logger.error(
          `Failed to process record ${row.id} from ${sourceName}:`,
          error,
        );
        // Continue processing other records
      }
    }
  }

  /**
   * Build SQL query based on configuration
   */
  private buildQuery(
    config: SyncSourceConfig,
    incrementalOnly: boolean,
  ): string {
    const tableName = config.table;
    // Determine table alias based on the config
    let tableAlias = 'v'; // Default alias
    if (tableName.includes('twuResourceQuestions')) {
      tableAlias = 'rq';
    }

    // Build SELECT clause
    const selectFields = [
      config.fields.id,
      config.fields.content,
      config.fields.updatedAt,
      ...(config.fields.metadata || []),
    ];

    let query = `
      SELECT ${selectFields.join(', ')}
      FROM ${tableName} ${tableAlias}
    `;

    // Add JOINs if specified
    if (config.query?.joins) {
      query += config.query.joins;
    }

    // Build WHERE clause
    const whereConditions: string[] = [];

    if (config.query?.where) {
      whereConditions.push(config.query.where);
    }

    if (incrementalOnly && this.lastSyncTime) {
      whereConditions.push(
        `${config.fields.updatedAt} > '${this.lastSyncTime.toISOString()}'`,
      );
    } else if (incrementalOnly) {
      // If no last sync time, sync last 5 minutes
      whereConditions.push(
        `${config.fields.updatedAt} > NOW() - INTERVAL '5 minutes'`,
      );
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY if specified
    if (config.query?.orderBy) {
      query += ` ORDER BY ${config.query.orderBy}`;
    }

    return query;
  }

  /**
   * Process a single record from the database
   */
  private async processRecord(
    sourceName: string,
    row: any,
    config: SyncSourceConfig,
  ) {
    const contentFieldName = this.extractFieldName(config.fields.content);
    const idFieldName = this.extractFieldName(config.fields.id);
    const updatedAtFieldName = this.extractFieldName(config.fields.updatedAt);

    const content = row[contentFieldName];
    if (!content || content.trim().length === 0) {
      return;
    }

    // Extract metadata
    const metadata: any = {
      source: sourceName,
      sourceId: row[idFieldName],
      updatedAt:
        row[updatedAtFieldName]?.toISOString() || new Date().toISOString(),
    };

    // Add additional metadata fields with ChromaDB compatibility
    if (config.fields.metadata) {
      for (const field of config.fields.metadata) {
        const fieldName = this.extractFieldName(field);
        if (
          fieldName &&
          row[fieldName] !== undefined &&
          row[fieldName] !== null
        ) {
          const value = row[fieldName];

          // Handle different data types for ChromaDB compatibility
          if (Array.isArray(value)) {
            // Convert arrays to JSON strings
            metadata[fieldName] = JSON.stringify(value);
          } else if (typeof value === 'object' && value !== null) {
            // Convert objects to JSON strings
            metadata[fieldName] = JSON.stringify(value);
          } else if (typeof value === 'boolean') {
            // Convert booleans to strings
            metadata[fieldName] = value.toString();
          } else if (typeof value === 'number') {
            // Convert numbers to strings
            metadata[fieldName] = value.toString();
          } else if (typeof value === 'string') {
            // Keep strings as-is, but ensure they're not empty
            metadata[fieldName] = value.trim() || 'N/A';
          } else {
            // Convert anything else to string
            metadata[fieldName] = String(value);
          }
        }
      }
    }

    // Log metadata for debugging (remove in production)
    this.logger.debug(
      `Processing document ${metadata.sourceId} for collection ${config.collection} with metadata:`,
      JSON.stringify(metadata, null, 2),
    );

    // Chunk the content
    const chunks = this.chunkText(content, config.chunkSize || 500);

    for (const [index, chunk] of chunks.entries()) {
      // Ensure document ID is valid (no special characters that might cause issues)
      const cleanSourceId = metadata.sourceId.replace(/[^a-zA-Z0-9-_]/g, '_');
      const documentId = `${sourceName}-${cleanSourceId}-${index}`;

      // Validate chunk content
      if (!chunk || chunk.trim().length === 0) {
        this.logger.warn(
          `Skipping empty chunk ${index} for document ${documentId}`,
        );
        continue;
      }

      try {
        await this.vectorService.addDocument(
          config.collection, // Pass the collection name from config
          documentId,
          chunk.trim(),
          {
            ...metadata,
            chunkIndex: index.toString(),
            totalChunks: chunks.length.toString(),
          },
        );

        this.logger.debug(
          `Successfully added chunk ${index} for document ${documentId} to collection ${config.collection}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to add chunk ${index} for document ${documentId} to collection ${config.collection}:`,
          error,
        );
        this.logger.error(
          `Problematic metadata:`,
          JSON.stringify(metadata, null, 2),
        );
        this.logger.error(`Chunk content length: ${chunk.length}`);
      }
    }
  }

  /**
   * Extract field name from SQL field expression (handles aliases)
   */
  private extractFieldName(field: string): string {
    if (field.includes(' as ')) {
      return field.split(' as ')[1].trim();
    }
    const parts = field.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Split text into chunks for better vector search performance
   */
  private chunkText(text: string, chunkSize: number = 500): string[] {
    const words: string[] = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Add a new sync configuration at runtime
   */
  addSyncConfig(name: string, config: SyncSourceConfig) {
    SYNC_CONFIGS[name] = config;
    this.logger.log(`Added new sync configuration: ${name}`);
  }

  /**
   * Enable/disable a sync source
   */
  setSyncEnabled(sourceName: string, enabled: boolean) {
    if (SYNC_CONFIGS[sourceName]) {
      SYNC_CONFIGS[sourceName].enabled = enabled;
      this.logger.log(
        `${enabled ? 'Enabled' : 'Disabled'} sync for: ${sourceName}`,
      );
    }
  }

  /**
   * Get current sync configurations
   */
  getSyncConfigs(): Record<string, SyncSourceConfig> {
    return { ...SYNC_CONFIGS };
  }

  /**
   * Manual sync for a specific source
   */
  async syncSpecificSource(sourceName: string, incremental: boolean = false) {
    const config = SYNC_CONFIGS[sourceName];
    if (!config) {
      throw new Error(`Sync configuration not found for: ${sourceName}`);
    }

    this.logger.log(
      `Starting ${
        incremental ? 'incremental' : 'full'
      } sync for ${sourceName}...`,
    );
    await this.syncDataSource(sourceName, config, incremental);
    this.logger.log(`Completed sync for ${sourceName}`);
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{
    status: string;
    lastSync: Date | null;
    configs: string[];
  }> {
    return {
      status: 'healthy',
      lastSync: this.lastSyncTime,
      configs: Object.keys(SYNC_CONFIGS).filter(
        (name) => SYNC_CONFIGS[name].enabled,
      ),
    };
  }
}
