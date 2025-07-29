import { VectorService } from './vector.service';
interface OpportunitySearchRequest {
  title?: string;
  teaser?: string;
  limit?: number;
  collection?: string;
}
interface SearchRequest {
  query: string;
  limit?: number;
}
interface ResourceQuestionSearchRequest {
  skill: string;
  limit?: number;
}
export declare class RagController {
  private vectorService;
  constructor(vectorService: VectorService);
  search(
    query: string,
    collection?: string,
  ): Promise<{
    query: string;
    collection: string;
    results: any;
  }>;
  searchOpportunities(request: OpportunitySearchRequest): Promise<
    | {
        query: string;
        results: never[];
        collection?: undefined;
        totalBeforeDeduplication?: undefined;
        finalCount?: undefined;
      }
    | {
        query: string;
        collection: string;
        results: any;
        totalBeforeDeduplication: any;
        finalCount: any;
      }
  >;
  searchResourceQuestions(request: ResourceQuestionSearchRequest): Promise<
    | {
        query: string;
        results: never[];
        collection?: undefined;
        totalFound?: undefined;
        finalCount?: undefined;
      }
    | {
        query: string;
        collection: string;
        results: any;
        totalFound: any;
        finalCount: any;
      }
  >;
  searchInCollection(
    collectionName: string,
    request: SearchRequest,
  ): Promise<{
    query: string;
    collection: string;
    results: any;
    totalBeforeDeduplication: any;
    finalCount: any;
  }>;
  getCollections(): Promise<{
    collections: string[];
  }>;
  addDocument(
    id: string,
    content: string,
    collection?: string,
  ): Promise<{
    success: boolean;
    collection: string;
  }>;
}
export {};
