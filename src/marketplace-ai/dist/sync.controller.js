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
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.SyncController = void 0;
const common_1 = require('@nestjs/common');
const chroma_sync_service_1 = require('./chroma-sync.service');
const vector_service_1 = require('./vector.service');
const jwt_auth_guard_1 = require('./auth/guards/jwt-auth.guard');
const guards_1 = require('./auth/guards');
let SyncController = class SyncController {
  chromaSyncService;
  vectorService;
  constructor(chromaSyncService, vectorService) {
    this.chromaSyncService = chromaSyncService;
    this.vectorService = vectorService;
  }
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
  async syncSpecificSource(sourceName, incremental) {
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
  async healthCheck() {
    return await this.chromaSyncService.healthCheck();
  }
  async getConfigs() {
    return this.chromaSyncService.getSyncConfigs();
  }
  async toggleSource(sourceName, enabled) {
    const isEnabled = enabled !== 'false';
    this.chromaSyncService.setSyncEnabled(sourceName, isEnabled);
    return {
      success: true,
      message: `${sourceName} sync ${isEnabled ? 'enabled' : 'disabled'}`,
    };
  }
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
  async searchInCollection(collectionName, body) {
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
  async deleteCollection(collectionName) {
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
  async getCollectionCount(collectionName) {
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
};
exports.SyncController = SyncController;
__decorate(
  [
    (0, common_1.Post)('full'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'fullSync',
  null,
);
__decorate(
  [
    (0, common_1.Post)('incremental'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'incrementalSync',
  null,
);
__decorate(
  [
    (0, common_1.Post)('source/:sourceName'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __param(0, (0, common_1.Param)('sourceName')),
    __param(1, (0, common_1.Query)('incremental')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String]),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'syncSpecificSource',
  null,
);
__decorate(
  [
    (0, common_1.Get)('health'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'healthCheck',
  null,
);
__decorate(
  [
    (0, common_1.Get)('configs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'getConfigs',
  null,
);
__decorate(
  [
    (0, common_1.Post)('configs/:sourceName/toggle'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __param(0, (0, common_1.Param)('sourceName')),
    __param(1, (0, common_1.Query)('enabled')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String]),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'toggleSource',
  null,
);
__decorate(
  [
    (0, common_1.Get)('collections'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'listCollections',
  null,
);
__decorate(
  [
    (0, common_1.Post)('collections/:collectionName/search'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __param(0, (0, common_1.Param)('collectionName')),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, Object]),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'searchInCollection',
  null,
);
__decorate(
  [
    (0, common_1.Delete)('collections/:collectionName'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __param(0, (0, common_1.Param)('collectionName')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String]),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'deleteCollection',
  null,
);
__decorate(
  [
    (0, common_1.Delete)('collections'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'wipeAllCollections',
  null,
);
__decorate(
  [
    (0, common_1.Get)('collections/:collectionName/count'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __param(0, (0, common_1.Param)('collectionName')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String]),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'getCollectionCount',
  null,
);
__decorate(
  [
    (0, common_1.Get)('collections/counts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, guards_1.AdminGuard),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SyncController.prototype,
  'getAllCollectionCounts',
  null,
);
exports.SyncController = SyncController = __decorate(
  [
    (0, common_1.Controller)('sync'),
    __metadata('design:paramtypes', [
      chroma_sync_service_1.ChromaSyncService,
      vector_service_1.VectorService,
    ]),
  ],
  SyncController,
);
//# sourceMappingURL=sync.controller.js.map
