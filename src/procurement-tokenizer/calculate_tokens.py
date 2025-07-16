#!/usr/bin/env python3
"""
Calculate Token Count for Procurement Documents
==============================================

This script calculates the total token count for all documents in the 
procurement_docs collection to help estimate prompt size limits.
"""

import chromadb
import click
from tokenize_procurement_docs import DEFAULT_CHROMA_URL, DEFAULT_COLLECTION_NAME, setup_logging
import logging

logger = logging.getLogger(__name__)

def estimate_tokens(text: str, method: str = "gpt") -> int:
    """
    Estimate token count for text using different methods.
    
    Args:
        text: Text to count tokens for
        method: Estimation method ('gpt', 'claude', 'characters', 'words')
    
    Returns:
        Estimated token count
    """
    if method == "gpt":
        # GPT models: ~4 characters per token for English
        return len(text) // 4
    elif method == "claude":
        # Claude: similar to GPT, ~4 characters per token
        return len(text) // 4
    elif method == "characters":
        return len(text)
    elif method == "words":
        return len(text.split())
    else:
        raise ValueError(f"Unknown method: {method}")

def format_large_number(num: int) -> str:
    """Format large numbers with commas."""
    return f"{num:,}"

def calculate_collection_tokens(chroma_url: str, collection_name: str):
    """Calculate total tokens for all documents in the collection."""
    try:
        # Connect to ChromaDB
        client = chromadb.HttpClient(host="localhost", port=8000)
        collection = client.get_collection(collection_name)
        
        # Get all documents
        print(f"📊 Analyzing collection: {collection_name}")
        print(f"🔗 ChromaDB URL: {chroma_url}")
        print("=" * 60)
        
        # Get collection info
        total_docs = collection.count()
        print(f"📄 Total documents: {format_large_number(total_docs)}")
        
        if total_docs == 0:
            print("❌ No documents found in collection!")
            return
        
        # Get all documents (in batches if large)
        batch_size = 1000
        all_texts = []
        
        print("📥 Retrieving documents...")
        
        # Get documents in batches
        offset = 0
        while offset < total_docs:
            limit = min(batch_size, total_docs - offset)
            try:
                results = collection.get(limit=limit, offset=offset, include=['documents', 'metadatas'])
                
                if results['documents']:
                    all_texts.extend(results['documents'])
                    print(f"   Retrieved {len(all_texts)} / {total_docs} documents...")
                
                offset += limit
                
            except Exception as e:
                print(f"⚠️  Warning: Error retrieving batch at offset {offset}: {e}")
                break
        
        if not all_texts:
            print("❌ No document content retrieved!")
            return
        
        print(f"✅ Successfully retrieved {len(all_texts)} documents")
        print()
        
        # Calculate statistics
        total_characters = sum(len(text) for text in all_texts)
        total_words = sum(len(text.split()) for text in all_texts)
        
        # Token estimates for different models
        gpt_tokens = estimate_tokens(''.join(all_texts), 'gpt')
        claude_tokens = estimate_tokens(''.join(all_texts), 'claude')
        
        # Document size statistics
        doc_lengths = [len(text) for text in all_texts]
        avg_doc_length = total_characters / len(all_texts) if all_texts else 0
        max_doc_length = max(doc_lengths) if doc_lengths else 0
        min_doc_length = min(doc_lengths) if doc_lengths else 0
        
        # Results
        print("📈 CONTENT STATISTICS")
        print("=" * 60)
        print(f"Total Characters:     {format_large_number(total_characters)}")
        print(f"Total Words:          {format_large_number(total_words)}")
        print(f"Average chars/doc:    {format_large_number(int(avg_doc_length))}")
        print(f"Largest document:     {format_large_number(max_doc_length)} characters")
        print(f"Smallest document:    {format_large_number(min_doc_length)} characters")
        print()
        
        print("🤖 TOKEN ESTIMATES")
        print("=" * 60)
        print(f"GPT Models (~4 chars/token):    {format_large_number(gpt_tokens)} tokens")
        print(f"Claude Models (~4 chars/token): {format_large_number(claude_tokens)} tokens")
        print()
        
        print("📏 CONTEXT WINDOW ANALYSIS")
        print("=" * 60)
        
        # Common model context windows
        context_windows = {
            "GPT-3.5-turbo": 4096,
            "GPT-4": 8192,
            "GPT-4-turbo": 128000,
            "GPT-4o": 128000,
            "Claude-3-haiku": 200000,
            "Claude-3-sonnet": 200000,
            "Claude-3-opus": 200000,
            "Claude-3.5-sonnet": 200000,
        }
        
        for model, window_size in context_windows.items():
            percentage = (gpt_tokens / window_size) * 100
            fits = "✅" if gpt_tokens <= window_size else "❌"
            print(f"{model:20} ({format_large_number(window_size):>7} tokens): {fits} {percentage:6.1f}% of context")
        
        print()
        print("💡 RECOMMENDATIONS")
        print("=" * 60)
        
        if gpt_tokens <= 4096:
            print("✅ All content fits in smaller context windows (GPT-3.5, GPT-4)")
        elif gpt_tokens <= 8192:
            print("✅ All content fits in GPT-4 context window")
        elif gpt_tokens <= 128000:
            print("✅ All content fits in modern large context windows")
            print("⚠️  Consider chunking for smaller models")
        else:
            print("⚠️  Content exceeds most context windows")
            print("📝 Strategies:")
            print("   • Use retrieval-augmented generation (RAG)")
            print("   • Summarize documents before adding to prompt")
            print("   • Process documents in batches")
            print("   • Use semantic search to find relevant chunks")
        
        print()
        print("🔍 SEARCH-BASED APPROACH")
        print("=" * 60)
        print("Instead of adding all documents to a prompt, consider:")
        print("1. Use semantic search to find relevant chunks")
        print("2. Add only top 5-10 most relevant chunks to prompt")
        print("3. This typically uses 2,000-10,000 tokens vs all content")
        print("4. Your existing test_search.py demonstrates this approach")
        
        # Calculate sample search result size
        sample_chunks = min(10, len(all_texts))
        if sample_chunks > 0:
            sample_chars = sum(len(all_texts[i]) for i in range(sample_chunks))
            sample_tokens = estimate_tokens(''.join(all_texts[:sample_chunks]), 'gpt')
            print(f"\nExample: Top {sample_chunks} chunks = ~{format_large_number(sample_tokens)} tokens")
        
    except Exception as e:
        logger.error(f"Error calculating tokens: {e}")
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("• Ensure ChromaDB is running: docker-compose up chroma")
        print("• Check if collection exists: python test_search.py")

@click.command()
@click.option('--chroma-url', default=DEFAULT_CHROMA_URL, help='ChromaDB URL')
@click.option('--collection-name', default=DEFAULT_COLLECTION_NAME, help='Collection name')
def main(chroma_url, collection_name):
    """Calculate total token count for all documents in the ChromaDB collection."""
    setup_logging()
    
    print("🧮 Token Calculator for Procurement Documents")
    print("=" * 60)
    
    calculate_collection_tokens(chroma_url, collection_name)

if __name__ == "__main__":
    main() 