// sync.controller.ts
import { Controller, Post, Get, Param, Query } from '@nestjs/common';
import { ChromaSyncService, SyncSourceConfig } from './chroma-sync.service';

@Controller('sync')
export class SyncController {
  constructor(private chromaSyncService: ChromaSyncService) {}

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
}
