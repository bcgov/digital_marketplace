// rag.controller.ts
import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { VectorService } from './vector.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { GovernmentGuard } from './auth/guards';

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

interface ResourceQuestionSearchRequest {
  skill: string;
  limit?: number;
}

@Controller('rag')
export class RagController {
  constructor(private vectorService: VectorService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard, GovernmentGuard)
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
  @UseGuards(JwtAuthGuard, GovernmentGuard)
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

  @Post('search-resource-questions')
  @UseGuards(JwtAuthGuard, GovernmentGuard)
  async searchResourceQuestions(
    @Body() request: ResourceQuestionSearchRequest,
  ) {
    const { skill, limit = 3 } = request;

    if (!skill) {
      return {
        query: '',
        results: [],
      };
    }

    // Search for questions related to the skill
    const searchLimit = Math.max(limit * 2, 6); // Get more results to allow for variety
    const results = await this.vectorService.searchSimilar(
      'twu_resource_questions',
      skill,
      searchLimit,
    );

    // Filter and enhance results
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
      .slice(0, limit); // Limit to requested number

    return {
      query: skill,
      collection: 'twu_resource_questions',
      results: questionResults,
      totalFound: results.length,
      finalCount: questionResults.length,
    };
  }

  @Post('collections/:collectionName/search')
  @UseGuards(JwtAuthGuard, GovernmentGuard)
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
  @UseGuards(JwtAuthGuard, GovernmentGuard)
  async getCollections() {
    const collections = await this.vectorService.listCollections();
    return {
      collections,
    };
  }

  @Get('add')
  @UseGuards(JwtAuthGuard, GovernmentGuard)
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
