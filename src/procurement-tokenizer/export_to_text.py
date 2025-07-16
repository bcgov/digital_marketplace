#!/usr/bin/env python3
"""
Export Procurement Documents to Text Files
==========================================

This script exports all documents from the ChromaDB collection to organized 
text files, preparing them for summary creation and compression.
"""

import chromadb
import click
from pathlib import Path
import json
import re
from datetime import datetime
from tokenize_procurement_docs import DEFAULT_CHROMA_URL, DEFAULT_COLLECTION_NAME, setup_logging
import logging

logger = logging.getLogger(__name__)

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for filesystem compatibility."""
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove excessive underscores
    sanitized = re.sub(r'_{2,}', '_', sanitized)
    # Limit length
    if len(sanitized) > 200:
        sanitized = sanitized[:200]
    return sanitized.strip('_')

def reconstruct_document(chunks: list, metadata_sample: dict) -> dict:
    """Reconstruct a complete document from its chunks."""
    # Sort chunks by chunk_index
    sorted_chunks = sorted(chunks, key=lambda x: x.get('chunk_index', 0))
    
    # Combine all text
    full_text = '\n\n'.join(chunk['text'] for chunk in sorted_chunks)
    
    # Calculate statistics
    total_words = sum(chunk.get('word_count', 0) for chunk in sorted_chunks)
    total_sentences = sum(chunk.get('sentence_count', 0) for chunk in sorted_chunks)
    
    return {
        'text': full_text,
        'metadata': metadata_sample,
        'total_chunks': len(chunks),
        'total_words': total_words,
        'total_sentences': total_sentences,
        'character_count': len(full_text)
    }

def group_chunks_by_document(all_results: dict) -> dict:
    """Group chunks by their source document."""
    documents = {}
    
    for i, metadata in enumerate(all_results['metadatas']):
        text = all_results['documents'][i]
        
        # Determine document key based on type
        doc_type = metadata.get('document_type', 'unknown')
        
        if doc_type == 'pdf':
            doc_key = metadata.get('filename', 'unknown_pdf')
        elif doc_type == 'html':
            doc_key = metadata.get('filename', 'unknown_html')
        elif doc_type == 'webpage':
            url = metadata.get('url', 'unknown_webpage')
            # Extract meaningful name from URL
            doc_key = url.split('/')[-1] or url.split('/')[-2] or 'webpage'
            doc_key = sanitize_filename(doc_key)
        else:
            doc_key = f"{doc_type}_{i}"
        
        # Initialize document if not exists
        if doc_key not in documents:
            documents[doc_key] = {
                'chunks': [],
                'metadata_sample': metadata,
                'document_type': doc_type
            }
        
        # Add chunk
        chunk_data = {
            'text': text,
            'chunk_index': metadata.get('chunk_index', 0),
            'word_count': metadata.get('word_count', 0),
            'sentence_count': metadata.get('sentence_count', 0)
        }
        
        documents[doc_key]['chunks'].append(chunk_data)
    
    return documents

def export_documents(chroma_url: str, collection_name: str, output_dir: str):
    """Export all documents from ChromaDB to text files."""
    try:
        # Setup output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        text_dir = output_path / "full_text"
        metadata_dir = output_path / "metadata"
        summaries_dir = output_path / "summaries"
        
        text_dir.mkdir(exist_ok=True)
        metadata_dir.mkdir(exist_ok=True)
        summaries_dir.mkdir(exist_ok=True)
        
        # Connect to ChromaDB
        client = chromadb.HttpClient(host="localhost", port=8000)
        collection = client.get_collection(collection_name)
        
        total_docs = collection.count()
        print(f"📊 Exporting {total_docs:,} chunks from collection: {collection_name}")
        print(f"📁 Output directory: {output_path.absolute()}")
        print("=" * 60)
        
        if total_docs == 0:
            print("❌ No documents found in collection!")
            return
        
        # Get all documents
        print("📥 Retrieving all documents...")
        all_results = collection.get(include=['documents', 'metadatas'])
        
        if not all_results['documents']:
            print("❌ No document content retrieved!")
            return
        
        print(f"✅ Retrieved {len(all_results['documents'])} chunks")
        
        # Group chunks by document
        print("🔄 Reconstructing documents from chunks...")
        documents = group_chunks_by_document(all_results)
        
        print(f"📄 Found {len(documents)} unique documents")
        print()
        
        # Export each document
        export_summary = {
            'export_date': datetime.now().isoformat(),
            'collection_name': collection_name,
            'total_chunks': len(all_results['documents']),
            'unique_documents': len(documents),
            'documents': []
        }
        
        for doc_key, doc_data in documents.items():
            print(f"📝 Processing: {doc_key}")
            
            # Reconstruct full document
            reconstructed = reconstruct_document(doc_data['chunks'], doc_data['metadata_sample'])
            
            # Create safe filename
            safe_filename = sanitize_filename(doc_key)
            if not safe_filename.endswith('.txt'):
                safe_filename += '.txt'
            
            # Save full text
            text_file = text_dir / safe_filename
            with open(text_file, 'w', encoding='utf-8') as f:
                f.write(f"# {doc_key}\n")
                f.write(f"# Document Type: {doc_data['document_type']}\n")
                f.write(f"# Total Chunks: {reconstructed['total_chunks']}\n")
                f.write(f"# Total Words: {reconstructed['total_words']:,}\n")
                f.write(f"# Characters: {reconstructed['character_count']:,}\n")
                f.write(f"# Exported: {datetime.now().isoformat()}\n")
                f.write("\n" + "=" * 80 + "\n\n")
                f.write(reconstructed['text'])
            
            # Save metadata
            metadata_file = metadata_dir / safe_filename.replace('.txt', '.json')
            with open(metadata_file, 'w', encoding='utf-8') as f:
                metadata_export = {
                    'document_key': doc_key,
                    'filename': safe_filename,
                    'document_type': doc_data['document_type'],
                    'statistics': {
                        'total_chunks': reconstructed['total_chunks'],
                        'total_words': reconstructed['total_words'],
                        'total_sentences': reconstructed['total_sentences'],
                        'character_count': reconstructed['character_count']
                    },
                    'original_metadata': reconstructed['metadata'],
                    'export_info': {
                        'exported_at': datetime.now().isoformat(),
                        'text_file': str(text_file.relative_to(output_path)),
                        'ready_for_summary': True
                    }
                }
                json.dump(metadata_export, f, indent=2, default=str)
            
            # Create summary placeholder
            summary_file = summaries_dir / safe_filename
            if not summary_file.exists():
                with open(summary_file, 'w', encoding='utf-8') as f:
                    f.write(f"# SUMMARY: {doc_key}\n")
                    f.write(f"# Original Length: {reconstructed['total_words']:,} words\n")
                    f.write(f"# Target Summary Length: {min(1000, reconstructed['total_words'] // 10)} words\n")
                    f.write(f"# Status: PENDING SUMMARY CREATION\n")
                    f.write("\n" + "=" * 80 + "\n\n")
                    f.write("SUMMARY TO BE CREATED\n\n")
                    f.write("Key sections to preserve:\n")
                    f.write("- Main objectives and requirements\n")
                    f.write("- Important procedures and processes\n")
                    f.write("- Critical dates and deadlines\n")
                    f.write("- Key contacts and responsibilities\n")
                    f.write("- Essential technical specifications\n")
            
            # Track for summary
            doc_summary = {
                'document_key': doc_key,
                'filename': safe_filename,
                'document_type': doc_data['document_type'],
                'original_words': reconstructed['total_words'],
                'text_file': str(text_file.relative_to(output_path)),
                'metadata_file': str(metadata_file.relative_to(output_path)),
                'summary_file': str(summary_file.relative_to(output_path)),
                'summary_status': 'pending'
            }
            
            export_summary['documents'].append(doc_summary)
            
            print(f"   ✅ Exported: {reconstructed['total_words']:,} words → {safe_filename}")
        
        # Save export summary
        summary_file = output_path / 'export_summary.json'
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(export_summary, f, indent=2, default=str)
        
        # Create README
        readme_file = output_path / 'README.md'
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(f"# Procurement Documents Export\n\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n")
            f.write(f"Source Collection: {collection_name}\n")
            f.write(f"Total Chunks: {len(all_results['documents']):,}\n")
            f.write(f"Unique Documents: {len(documents)}\n\n")
            f.write("## Directory Structure\n\n")
            f.write("- `full_text/` - Complete reconstructed documents\n")
            f.write("- `metadata/` - Document metadata and statistics\n")
            f.write("- `summaries/` - Compressed summaries (to be created)\n")
            f.write("- `export_summary.json` - Export overview and file mapping\n\n")
            f.write("## Next Steps\n\n")
            f.write("1. Review the full text documents in `full_text/`\n")
            f.write("2. Create summaries for each document in `summaries/`\n")
            f.write("3. Target summary length: ~10% of original word count\n")
            f.write("4. Focus on preserving essential information and actionable content\n\n")
            f.write("## Document Summary\n\n")
            for doc_summary in export_summary['documents']:
                f.write(f"### {doc_summary['document_key']}\n")
                f.write(f"- Type: {doc_summary['document_type']}\n")
                f.write(f"- Original: {doc_summary['original_words']:,} words\n")
                f.write(f"- Text: `{doc_summary['text_file']}`\n")
                f.write(f"- Summary: `{doc_summary['summary_file']}` (pending)\n\n")
        
        print()
        print("🎉 EXPORT COMPLETE!")
        print("=" * 60)
        print(f"📁 Output directory: {output_path.absolute()}")
        print(f"📄 Documents exported: {len(documents)}")
        print(f"📊 Total original words: {sum(doc['original_words'] for doc in export_summary['documents']):,}")
        print()
        print("📂 Files created:")
        print(f"   • {len(documents)} full text files in full_text/")
        print(f"   • {len(documents)} metadata files in metadata/")
        print(f"   • {len(documents)} summary placeholders in summaries/")
        print(f"   • export_summary.json - overview of all files")
        print(f"   • README.md - documentation")
        print()
        print("🔄 Next Steps:")
        print("1. Review the exported text files")
        print("2. Create summaries for each document (target ~10% of original length)")
        print("3. Focus on preserving essential information and actionable content")
        
    except Exception as e:
        logger.error(f"Error exporting documents: {e}")
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("• Ensure ChromaDB is running: docker-compose up chroma")
        print("• Check if collection exists: python test_search.py")

@click.command()
@click.option('--chroma-url', default=DEFAULT_CHROMA_URL, help='ChromaDB URL')
@click.option('--collection-name', default=DEFAULT_COLLECTION_NAME, help='Collection name')
@click.option('--output-dir', default='../../chroma_data/procurement_docs', help='Output directory for text files')
def main(chroma_url, collection_name, output_dir):
    """Export all documents from ChromaDB to organized text files for summary creation."""
    setup_logging()
    
    print("📁 Document Exporter for Summary Creation")
    print("=" * 60)
    
    export_documents(chroma_url, collection_name, output_dir)

if __name__ == "__main__":
    main() 