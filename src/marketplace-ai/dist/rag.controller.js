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
exports.RagController = void 0;
const common_1 = require('@nestjs/common');
const vector_service_1 = require('./vector.service');
const jwt_auth_guard_1 = require('./auth/guards/jwt-auth.guard');
const guards_1 = require('./auth/guards');
let RagController = class RagController {
  vectorService;
  constructor(vectorService) {
    this.vectorService = vectorService;
  }
  async search(query, collection) {
    const targetCollection = collection || 'cwu_opportunities';
    const results = await this.vectorService.searchSimilar(
      targetCollection,
      query,
      5,
    );
    return {
      query,
      collection: targetCollection,
      results: results.map((r) => ({
        content: r.content,
        score: r.score,
        metadata: r.metadata,
      })),
    };
  }
  async searchOpportunities(request) {
    const searchTerms = [];
    if (request.title) {
      searchTerms.push(request.title);
    }
    if (request.teaser) {
      searchTerms.push(request.teaser);
    }
    if (searchTerms.length === 0) {
      return {
        query: '',
        results: [],
      };
    }
    const query = searchTerms.join(' ');
    const limit = request.limit || 3;
    const targetCollection = request.collection || 'twu_opportunities';
    const searchLimit = Math.max(limit * 3, 15);
    const results = await this.vectorService.searchSimilar(
      targetCollection,
      query,
      searchLimit,
    );
    const opportunityResults = results
      .filter((r) => r.metadata.opportunity_id)
      .map((r) => ({
        content: r.content,
        score: r.score,
        metadata: {
          title: r.metadata.title,
          teaser: r.metadata.teaser,
          location: r.metadata.location,
          reward: r.metadata.reward,
          skills: r.metadata.skills,
          status: r.metadata.status,
          opportunity_id: r.metadata.opportunity_id,
          full_description: r.metadata.full_description,
        },
      }));
    const seenOpportunities = new Set();
    const deduplicatedResults = opportunityResults.filter((result) => {
      const opportunityId = result.metadata.opportunity_id;
      if (seenOpportunities.has(opportunityId)) {
        return false;
      }
      seenOpportunities.add(opportunityId);
      return true;
    });
    const finalResults = deduplicatedResults.slice(0, limit);
    return {
      query,
      collection: targetCollection,
      results: finalResults,
      totalBeforeDeduplication: opportunityResults.length,
      finalCount: finalResults.length,
    };
  }
  async searchResourceQuestions(request) {
    const { skill, limit = 3 } = request;
    if (!skill) {
      return {
        query: '',
        results: [],
      };
    }
    const searchLimit = Math.max(limit * 2, 6);
    const results = await this.vectorService.searchSimilar(
      'twu_resource_questions',
      skill,
      searchLimit,
    );
    const questionResults = results
      .filter((r) => r.metadata.full_question && r.metadata.full_guideline)
      .map((r) => ({
        content: r.content,
        score: r.score,
        metadata: {
          question: r.metadata.full_question,
          guideline: r.metadata.full_guideline,
          score: r.metadata.score,
          wordLimit: r.metadata.word_limit,
          opportunityTitle: r.metadata.opportunity_title,
          opportunityTeaser: r.metadata.opportunity_teaser,
          opportunityLocation: r.metadata.opportunity_location,
          opportunityId: r.metadata.opportunity_id,
        },
      }))
      .slice(0, limit);
    return {
      query: skill,
      collection: 'twu_resource_questions',
      results: questionResults,
      totalFound: results.length,
      finalCount: questionResults.length,
    };
  }
  async searchInCollection(collectionName, request) {
    const results = await this.vectorService.searchSimilar(
      collectionName,
      request.query,
      request.limit || 5,
    );
    let processedResults = results;
    if (collectionName.includes('opportunities')) {
      const seenOpportunities = new Set();
      processedResults = results.filter((result) => {
        const opportunityId = result.metadata.opportunity_id;
        if (!opportunityId) return true;
        if (seenOpportunities.has(opportunityId)) {
          return false;
        }
        seenOpportunities.add(opportunityId);
        return true;
      });
    }
    return {
      query: request.query,
      collection: collectionName,
      results: processedResults.map((r) => ({
        content: r.content,
        score: r.score,
        metadata: r.metadata,
      })),
      totalBeforeDeduplication: results.length,
      finalCount: processedResults.length,
    };
  }
  async getCollections() {
    const collections = await this.vectorService.listCollections();
    return {
      collections,
    };
  }
  async addDocument(id, content, collection) {
    const targetCollection = collection || 'cwu_opportunities';
    await this.vectorService.addDocument(targetCollection, id, content);
    return {
      success: true,
      collection: targetCollection,
    };
  }
};
exports.RagController = RagController;
__decorate(
  [
    (0, common_1.Get)('search'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      guards_1.GovernmentGuard,
    ),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('collection')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String]),
    __metadata('design:returntype', Promise),
  ],
  RagController.prototype,
  'search',
  null,
);
__decorate(
  [
    (0, common_1.Post)('search-opportunities'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      guards_1.GovernmentGuard,
    ),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  RagController.prototype,
  'searchOpportunities',
  null,
);
__decorate(
  [
    (0, common_1.Post)('search-resource-questions'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      guards_1.GovernmentGuard,
    ),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  RagController.prototype,
  'searchResourceQuestions',
  null,
);
__decorate(
  [
    (0, common_1.Post)('collections/:collectionName/search'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      guards_1.GovernmentGuard,
    ),
    __param(0, (0, common_1.Param)('collectionName')),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, Object]),
    __metadata('design:returntype', Promise),
  ],
  RagController.prototype,
  'searchInCollection',
  null,
);
__decorate(
  [
    (0, common_1.Get)('collections'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      guards_1.GovernmentGuard,
    ),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  RagController.prototype,
  'getCollections',
  null,
);
__decorate(
  [
    (0, common_1.Get)('add'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      guards_1.GovernmentGuard,
    ),
    __param(0, (0, common_1.Query)('id')),
    __param(1, (0, common_1.Query)('content')),
    __param(2, (0, common_1.Query)('collection')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String, String]),
    __metadata('design:returntype', Promise),
  ],
  RagController.prototype,
  'addDocument',
  null,
);
exports.RagController = RagController = __decorate(
  [
    (0, common_1.Controller)('rag'),
    __metadata('design:paramtypes', [vector_service_1.VectorService]),
  ],
  RagController,
);
//# sourceMappingURL=rag.controller.js.map
