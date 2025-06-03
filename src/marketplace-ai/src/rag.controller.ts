// rag.controller.ts
import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { VectorService } from './vector.service';

interface OpportunitySearchRequest {
  title?: string;
  teaser?: string;
  limit?: number;
}

@Controller('rag')
export class RagController {
  constructor(private vectorService: VectorService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    const results = await this.vectorService.searchSimilar(query, 5);

    return {
      query,
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

    const results = await this.vectorService.searchSimilar(query, limit);

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
        },
      }));

    return {
      query,
      results: opportunityResults,
    };
  }

  @Get('add')
  async addDocument(
    @Query('id') id: string,
    @Query('content') content: string,
  ) {
    await this.vectorService.addDocument(id, content);
    return { success: true };
  }
}
