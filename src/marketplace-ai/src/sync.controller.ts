// sync.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ChromaSyncService, SyncSourceConfig } from './chroma-sync.service';
import { VectorService } from './vector.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AdminGuard } from './auth/guards';

@Controller('sync')
export class SyncController {
  constructor(
    private chromaSyncService: ChromaSyncService,
    private vectorService: VectorService,
  ) {}

  @Post('full')
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  async healthCheck() {
    return await this.chromaSyncService.healthCheck();
  }

  @Get('configs')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getConfigs(): Promise<Record<string, SyncSourceConfig>> {
    return this.chromaSyncService.getSyncConfigs();
  }

  @Post('configs/:sourceName/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
