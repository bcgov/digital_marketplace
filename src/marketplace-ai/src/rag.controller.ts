// rag.controller.ts
import { Controller, Get, Query, Post, Body, Param } from '@nestjs/common';
import { VectorService } from './vector.service';

interface OpportunitySearchRequest {
  title?: string;
  teaser?: string;
  limit?: number;
  collection?: string; // Optional collection override
}

interface SearchRequest {
  query: string;
  limit?: number;
}

@Controller('rag')
export class RagController {
  constructor(private vectorService: VectorService) {}

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('collection') collection?: string,
  ) {
    // Default to CWU opportunities if no collection specified
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

  @Post('search-opportunities')
  async searchOpportunities(@Body() request: OpportunitySearchRequest) {
    // Construct search query from title and teaser
    const searchTerms: string[] = [];
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

    // Default to CWU opportunities if no collection specified
    const targetCollection = request.collection || 'twu_opportunities';

    // Get more results initially to account for deduplication
    const searchLimit = Math.max(limit * 3, 15);
    const results = await this.vectorService.searchSimilar(
      targetCollection,
      query,
      searchLimit,
    );

    // Filter for opportunity-related content and enhance results
    const opportunityResults = results
      .filter((r) => r.metadata.opportunity_id) // Only opportunity content
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
          full_description: r.metadata.full_description, // Include full description
        },
      }));

    // De-duplicate based on opportunity_id, keeping only the first (highest scoring) result
    const seenOpportunities = new Set<string>();
    const deduplicatedResults = opportunityResults.filter((result) => {
      const opportunityId = result.metadata.opportunity_id;
      if (seenOpportunities.has(opportunityId)) {
        return false;
      }
      seenOpportunities.add(opportunityId);
      return true;
    });

    // Limit to requested number of results
    const finalResults = deduplicatedResults.slice(0, limit);

    return {
      query,
      collection: targetCollection,
      results: finalResults,
      totalBeforeDeduplication: opportunityResults.length,
      finalCount: finalResults.length,
    };
  }

  @Post('collections/:collectionName/search')
  async searchInCollection(
    @Param('collectionName') collectionName: string,
    @Body() request: SearchRequest,
  ) {
    const results = await this.vectorService.searchSimilar(
      collectionName,
      request.query,
      request.limit || 5,
    );

    // For opportunity collections, de-duplicate by opportunity_id
    let processedResults = results;
    if (collectionName.includes('opportunities')) {
      const seenOpportunities = new Set<string>();
      processedResults = results.filter((result) => {
        const opportunityId = result.metadata.opportunity_id;
        if (!opportunityId) return true; // Keep non-opportunity results

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

  @Get('collections')
  async getCollections() {
    const collections = await this.vectorService.listCollections();
    return {
      collections,
    };
  }

  @Get('add')
  async addDocument(
    @Query('id') id: string,
    @Query('content') content: string,
    @Query('collection') collection?: string,
  ) {
    // Default to CWU opportunities if no collection specified
    const targetCollection = collection || 'cwu_opportunities';
    await this.vectorService.addDocument(targetCollection, id, content);
    return {
      success: true,
      collection: targetCollection,
    };
  }
}
