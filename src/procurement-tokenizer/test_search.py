#!/usr/bin/env python3
"""
Test script to verify procurement documents tokenization and search functionality.

Usage:
    python test_search.py [OPTIONS]

Examples:
    # Basic search test
    python test_search.py

    # Search with custom query
    python test_search.py --query "agile software development"

    # Get collection statistics
    python test_search.py --stats
"""

import chromadb
import click
from typing import List, Dict, Any
import json
import sys
from datetime import datetime

DEFAULT_CHROMA_URL = "http://localhost:8000"
DEFAULT_COLLECTION_NAME = "procurement_docs"

def connect_to_chroma(chroma_url: str) -> chromadb.HttpClient:
    """Connect to ChromaDB and return client."""
    try:
        # Parse URL
        if chroma_url.startswith('http://'):
            url_part = chroma_url[7:]
        elif chroma_url.startswith('https://'):
            url_part = chroma_url[8:]
        else:
            url_part = chroma_url
        
        if ':' in url_part:
            host, port = url_part.split(':')
            port = int(port)
        else:
            host = url_part
            port = 8000
        
        client = chromadb.HttpClient(host=host, port=port)
        client.heartbeat()  # Test connection
        print(f"✅ Successfully connected to ChromaDB at {chroma_url}")
        return client
    
    except Exception as e:
        print(f"❌ Failed to connect to ChromaDB at {chroma_url}: {e}")
        sys.exit(1)

def get_collection_stats(client: chromadb.HttpClient, collection_name: str) -> Dict[str, Any]:
    """Get statistics about the collection."""
    try:
        collection = client.get_collection(collection_name)
        count = collection.count()
        
        # Get sample metadata to understand structure
        if count > 0:
            sample = collection.get(limit=1, include=['metadatas'])
            sample_metadata = sample['metadatas'][0] if sample['metadatas'] else {}
        else:
            sample_metadata = {}
        
        return {
            'count': count,
            'sample_metadata': sample_metadata,
            'collection_metadata': collection.metadata
        }
    
    except Exception as e:
        print(f"❌ Error getting collection stats: {e}")
        return {'error': str(e)}

def search_documents(
    client: chromadb.HttpClient, 
    collection_name: str, 
    query: str, 
    n_results: int = 5
) -> List[Dict[str, Any]]:
    """Search documents in the collection."""
    try:
        collection = client.get_collection(collection_name)
        
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            include=['documents', 'metadatas', 'distances']
        )
        
        # Format results
        formatted_results = []
        
        if results['documents'][0]:
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0], 
                results['metadatas'][0], 
                results['distances'][0]
            )):
                formatted_results.append({
                    'rank': i + 1,
                    'document': doc,
                    'metadata': metadata,
                    'distance': distance,
                    'similarity_score': 1 - distance  # Convert distance to similarity
                })
        
        return formatted_results
    
    except Exception as e:
        print(f"❌ Error searching documents: {e}")
        return []

def print_search_results(results: List[Dict[str, Any]], query: str):
    """Print search results in a readable format."""
    print(f"\n🔍 Search Results for: '{query}'")
    print("=" * 80)
    
    if not results:
        print("No results found.")
        return
    
    for result in results:
        print(f"\n📄 Rank {result['rank']} (Similarity: {result['similarity_score']:.3f})")
        
        # Show source (filename for PDFs, URL for web pages)
        metadata = result['metadata']
        if metadata.get('document_type') == 'webpage':
            print(f"🌐 URL: {metadata.get('url', 'Unknown')}")
            print(f"🏷️  Domain: {metadata.get('domain', 'Unknown')}")
        else:
            print(f"📁 File: {metadata.get('filename', 'Unknown')}")
        
        print(f"📊 Chunk: {metadata.get('chunk_index', '?')}/{metadata.get('total_chunks', '?')}")
        print(f"📝 Words: {metadata.get('word_count', '?')}")
        print(f"📅 Type: {metadata.get('document_type', 'unknown')}")
        
        # Show first 300 characters of content
        content = result['document']
        if len(content) > 300:
            content = content[:300] + "..."
        print(f"📋 Content: {content}")
        print("-" * 80)

def print_collection_stats(stats: Dict[str, Any]):
    """Print collection statistics."""
    print(f"\n📊 Collection Statistics")
    print("=" * 50)
    
    if 'error' in stats:
        print(f"❌ Error: {stats['error']}")
        return
    
    print(f"📄 Total documents: {stats['count']}")
    
    if stats['sample_metadata']:
        print(f"📁 Sample metadata structure:")
        for key, value in stats['sample_metadata'].items():
            print(f"  • {key}: {value}")
    
    if stats['collection_metadata']:
        print(f"🏷️  Collection metadata:")
        for key, value in stats['collection_metadata'].items():
            print(f"  • {key}: {value}")

def run_predefined_searches(client: chromadb.HttpClient, collection_name: str):
    """Run a set of predefined searches to test different aspects."""
    
    test_queries = [
        "procurement practice standard",
        "agile software development",
        "sprint with us",
        "team requirements",
        "resource agreement",
        "budget and pricing",
        "evaluation criteria",
        "proposal submission",
        "government procurement",
        "contract management"
    ]
    
    print(f"\n🧪 Running Predefined Test Searches")
    print("=" * 50)
    
    all_results = {}
    
    for query in test_queries:
        print(f"\n🔍 Testing: '{query}'")
        results = search_documents(client, collection_name, query, n_results=3)
        
        if results:
            print(f"  ✅ Found {len(results)} results")
            # Show top result only
            top_result = results[0]
            metadata = top_result['metadata']
            source = metadata.get('filename') or metadata.get('url', 'Unknown')
            doc_type = metadata.get('document_type', 'unknown')
            print(f"  🥇 Top match: {source} ({doc_type}) "
                  f"(similarity: {top_result['similarity_score']:.3f})")
        else:
            print(f"  ❌ No results found")
        
        all_results[query] = len(results)
    
    # Summary
    print(f"\n📈 Search Test Summary")
    print("-" * 30)
    total_queries = len(test_queries)
    successful_queries = sum(1 for count in all_results.values() if count > 0)
    print(f"Successful searches: {successful_queries}/{total_queries}")
    print(f"Success rate: {(successful_queries/total_queries)*100:.1f}%")

@click.command()
@click.option('--chroma-url', default=DEFAULT_CHROMA_URL, help='ChromaDB URL')
@click.option('--collection-name', default=DEFAULT_COLLECTION_NAME, help='Collection name')
@click.option('--query', help='Search query to test')
@click.option('--stats', is_flag=True, help='Show collection statistics')
@click.option('--test-all', is_flag=True, help='Run predefined test searches')
@click.option('--n-results', default=5, help='Number of search results to return')
def main(chroma_url, collection_name, query, stats, test_all, n_results):
    """
    Test the procurement documents tokenization and search functionality.
    
    This script helps verify that the tokenization process worked correctly
    and demonstrates how to search the processed documents and web pages.
    """
    
    print(f"🚀 Procurement Documents Search Test")
    print(f"📍 ChromaDB: {chroma_url}")
    print(f"📚 Collection: {collection_name}")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Connect to ChromaDB
    client = connect_to_chroma(chroma_url)
    
    # Check if collection exists
    try:
        collections = client.list_collections()
        collection_names = [col.name for col in collections]
        
        if collection_name not in collection_names:
            print(f"❌ Collection '{collection_name}' not found!")
            print(f"Available collections: {collection_names}")
            print("💡 Run the tokenization script first: python tokenize_procurement_docs.py")
            sys.exit(1)
        else:
            print(f"✅ Collection '{collection_name}' found")
            
    except Exception as e:
        print(f"❌ Error checking collections: {e}")
        sys.exit(1)
    
    # Get and display statistics
    if stats or not query:
        collection_stats = get_collection_stats(client, collection_name)
        print_collection_stats(collection_stats)
    
    # Run predefined tests
    if test_all:
        run_predefined_searches(client, collection_name)
    
    # Perform search
    if query:
        print(f"\n🔍 Searching for: '{query}'")
        results = search_documents(client, collection_name, query, n_results)
        print_search_results(results, query)
    
    # Interactive mode if no specific action
    if not query and not stats and not test_all:
        print(f"\n💬 Interactive Search Mode")
        print("Enter search queries (or 'quit' to exit):")
        
        while True:
            try:
                user_query = input("\n🔍 Search: ").strip()
                
                if user_query.lower() in ['quit', 'exit', 'q']:
                    break
                
                if not user_query:
                    continue
                
                results = search_documents(client, collection_name, user_query, n_results)
                print_search_results(results, user_query)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Search error: {e}")
        
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    main() 