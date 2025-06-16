// sync.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Delete,
  Body,
} from '@nestjs/common';
import { ChromaSyncService, SyncSourceConfig } from './chroma-sync.service';
import { VectorService } from './vector.service';

@Controller('sync')
export class SyncController {
  constructor(
    private chromaSyncService: ChromaSyncService,
    private vectorService: VectorService,
  ) {}

  @Post('full')
  async fullSync() {
    try {
      await this.chromaSyncService.fullSync();
      return {
        success: true,
        message: 'Full sync completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Full sync failed',
        error: error.message,
      };
    }
  }

  @Post('incremental')
  async incrementalSync() {
    try {
      await this.chromaSyncService.incrementalSync();
      return {
        success: true,
        message: 'Incremental sync completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Incremental sync failed',
        error: error.message,
      };
    }
  }

  @Post('source/:sourceName')
  async syncSpecificSource(
    @Param('sourceName') sourceName: string,
    @Query('incremental') incremental?: string,
  ) {
    try {
      const isIncremental = incremental === 'true';
      await this.chromaSyncService.syncSpecificSource(
        sourceName,
        isIncremental,
      );
      return {
        success: true,
        message: `Sync completed for ${sourceName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed for ${sourceName}`,
        error: error.message,
      };
    }
  }

  @Get('health')
  async healthCheck() {
    return await this.chromaSyncService.healthCheck();
  }

  @Get('configs')
  async getConfigs(): Promise<Record<string, SyncSourceConfig>> {
    return this.chromaSyncService.getSyncConfigs();
  }

  @Post('configs/:sourceName/toggle')
  async toggleSource(
    @Param('sourceName') sourceName: string,
    @Query('enabled') enabled?: string,
  ) {
    const isEnabled = enabled !== 'false';
    this.chromaSyncService.setSyncEnabled(sourceName, isEnabled);
    return {
      success: true,
      message: `${sourceName} sync ${isEnabled ? 'enabled' : 'disabled'}`,
    };
  }

  @Get('collections')
  async listCollections() {
    try {
      const collections = await this.vectorService.listCollections();
      return {
        success: true,
        collections,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to list collections',
        error: error.message,
      };
    }
  }

  @Post('collections/:collectionName/search')
  async searchInCollection(
    @Param('collectionName') collectionName: string,
    @Body() body: { query: string; limit?: number },
  ) {
    try {
      const results = await this.vectorService.searchSimilar(
        collectionName,
        body.query,
        body.limit || 5,
      );
      return {
        success: true,
        results,
      };
    } catch (error) {
      return {
        success: false,
        message: `Search failed in collection ${collectionName}`,
        error: error.message,
      };
    }
  }

  @Delete('collections/:collectionName')
  async deleteCollection(@Param('collectionName') collectionName: string) {
    try {
      await this.vectorService.deleteCollection(collectionName);
      return {
        success: true,
        message: `Collection ${collectionName} deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete collection ${collectionName}`,
        error: error.message,
      };
    }
  }

  @Delete('collections')
  async wipeAllCollections() {
    try {
      await this.vectorService.wipeAllCollections();
      return {
        success: true,
        message: 'All collections wiped successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to wipe all collections',
        error: error.message,
      };
    }
  }

  @Get('collections/:collectionName/count')
  async getCollectionCount(@Param('collectionName') collectionName: string) {
    try {
      const count = await this.vectorService.getCollectionCount(collectionName);
      return {
        success: true,
        collection: collectionName,
        count,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get count for collection ${collectionName}`,
        error: error.message,
      };
    }
  }

  @Get('collections/counts')
  async getAllCollectionCounts() {
    try {
      const counts = await this.vectorService.getAllCollectionCounts();
      return {
        success: true,
        counts,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get collection counts',
        error: error.message,
      };
    }
  }
}
