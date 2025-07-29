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
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var ChromaSyncService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.ChromaSyncService = void 0;
const common_1 = require('@nestjs/common');
const schedule_1 = require('@nestjs/schedule');
const vector_service_1 = require('./vector.service');
const pg_1 = require('pg');
const SYNC_CONFIGS = {
  cwuOpportunityVersions: {
    table: 'public."cwuOpportunityVersions"',
    collection: 'cwu_opportunities',
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
    chunkSize: 800,
    enabled: true,
  },
  twuOpportunityVersions: {
    table: 'public."twuOpportunityVersions"',
    collection: 'twu_opportunities',
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
    chunkSize: 800,
    enabled: true,
  },
  swuOpportunityVersions: {
    table: 'public."swuOpportunityVersions"',
    collection: 'swu_opportunities',
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
    enabled: false,
  },
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
let ChromaSyncService = (ChromaSyncService_1 = class ChromaSyncService {
  vectorService;
  logger = new common_1.Logger(ChromaSyncService_1.name);
  pgPool;
  lastSyncTime = null;
  constructor(vectorService) {
    this.vectorService = vectorService;
    this.pgPool = new pg_1.Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
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
  async syncDataSource(sourceName, config, incrementalOnly = false) {
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
      }
    }
  }
  buildQuery(config, incrementalOnly) {
    const tableName = config.table;
    let tableAlias = 'v';
    if (tableName.includes('twuResourceQuestions')) {
      tableAlias = 'rq';
    }
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
    if (config.query?.joins) {
      query += config.query.joins;
    }
    const whereConditions = [];
    if (config.query?.where) {
      whereConditions.push(config.query.where);
    }
    if (incrementalOnly && this.lastSyncTime) {
      whereConditions.push(
        `${config.fields.updatedAt} > '${this.lastSyncTime.toISOString()}'`,
      );
    } else if (incrementalOnly) {
      whereConditions.push(
        `${config.fields.updatedAt} > NOW() - INTERVAL '5 minutes'`,
      );
    }
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    if (config.query?.orderBy) {
      query += ` ORDER BY ${config.query.orderBy}`;
    }
    return query;
  }
  async processRecord(sourceName, row, config) {
    const contentFieldName = this.extractFieldName(config.fields.content);
    const idFieldName = this.extractFieldName(config.fields.id);
    const updatedAtFieldName = this.extractFieldName(config.fields.updatedAt);
    const content = row[contentFieldName];
    if (!content || content.trim().length === 0) {
      return;
    }
    const metadata = {
      source: sourceName,
      sourceId: row[idFieldName],
      updatedAt:
        row[updatedAtFieldName]?.toISOString() || new Date().toISOString(),
    };
    if (config.fields.metadata) {
      for (const field of config.fields.metadata) {
        const fieldName = this.extractFieldName(field);
        if (
          fieldName &&
          row[fieldName] !== undefined &&
          row[fieldName] !== null
        ) {
          const value = row[fieldName];
          if (Array.isArray(value)) {
            metadata[fieldName] = JSON.stringify(value);
          } else if (typeof value === 'object' && value !== null) {
            metadata[fieldName] = JSON.stringify(value);
          } else if (typeof value === 'boolean') {
            metadata[fieldName] = value.toString();
          } else if (typeof value === 'number') {
            metadata[fieldName] = value.toString();
          } else if (typeof value === 'string') {
            metadata[fieldName] = value.trim() || 'N/A';
          } else {
            metadata[fieldName] = String(value);
          }
        }
      }
    }
    this.logger.debug(
      `Processing document ${metadata.sourceId} for collection ${config.collection} with metadata:`,
      JSON.stringify(metadata, null, 2),
    );
    const chunks = this.chunkText(content, config.chunkSize || 500);
    for (const [index, chunk] of chunks.entries()) {
      const cleanSourceId = metadata.sourceId.replace(/[^a-zA-Z0-9-_]/g, '_');
      const documentId = `${sourceName}-${cleanSourceId}-${index}`;
      if (!chunk || chunk.trim().length === 0) {
        this.logger.warn(
          `Skipping empty chunk ${index} for document ${documentId}`,
        );
        continue;
      }
      try {
        await this.vectorService.addDocument(
          config.collection,
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
  extractFieldName(field) {
    if (field.includes(' as ')) {
      return field.split(' as ')[1].trim();
    }
    const parts = field.split('.');
    return parts[parts.length - 1];
  }
  chunkText(text, chunkSize = 500) {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }
    return chunks.length > 0 ? chunks : [text];
  }
  addSyncConfig(name, config) {
    SYNC_CONFIGS[name] = config;
    this.logger.log(`Added new sync configuration: ${name}`);
  }
  setSyncEnabled(sourceName, enabled) {
    if (SYNC_CONFIGS[sourceName]) {
      SYNC_CONFIGS[sourceName].enabled = enabled;
      this.logger.log(
        `${enabled ? 'Enabled' : 'Disabled'} sync for: ${sourceName}`,
      );
    }
  }
  getSyncConfigs() {
    return { ...SYNC_CONFIGS };
  }
  async syncSpecificSource(sourceName, incremental = false) {
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
  async healthCheck() {
    return {
      status: 'healthy',
      lastSync: this.lastSyncTime,
      configs: Object.keys(SYNC_CONFIGS).filter(
        (name) => SYNC_CONFIGS[name].enabled,
      ),
    };
  }
});
exports.ChromaSyncService = ChromaSyncService;
__decorate(
  [
    (0, schedule_1.Cron)('0 */5 * * * *'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  ChromaSyncService.prototype,
  'incrementalSync',
  null,
);
exports.ChromaSyncService =
  ChromaSyncService =
  ChromaSyncService_1 =
    __decorate(
      [
        (0, common_1.Injectable)(),
        __metadata('design:paramtypes', [vector_service_1.VectorService]),
      ],
      ChromaSyncService,
    );
//# sourceMappingURL=chroma-sync.service.js.map
