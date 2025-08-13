#!/usr/bin/env python3
"""
Process Saved HTML Files
========================

This script processes locally saved HTML files instead of trying to scrape them from the web.
This is much more reliable for intranet sites or sites with authentication requirements.

Usage:
    python process_saved_html.py path/to/saved.html
    python process_saved_html.py --help
"""

import sys
import logging
import click
from pathlib import Path
from bs4 import BeautifulSoup
import html2text
from datetime import datetime
from urllib.parse import urlparse
import re

# Import our existing components
from tokenize_procurement_docs import (
    DocumentProcessor, ChromaDBManager, 
    DEFAULT_CHROMA_URL, DEFAULT_COLLECTION_NAME,
    DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP,
    setup_logging
)

logger = logging.getLogger(__name__)

class SavedHTMLProcessor:
    """Processes locally saved HTML files."""
    
    def __init__(self):
        """Initialize the HTML processor."""
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = True
        self.html_converter.body_width = 0  # No line wrapping
    
    def extract_text_from_file(self, html_path: Path, original_url: str = None) -> tuple[str, dict]:
        """
        Extract text from a saved HTML file.
        
        Args:
            html_path: Path to the saved HTML file
            original_url: Original URL of the page (optional, for metadata)
        
        Returns:
            Tuple of (extracted_text, metadata)
        """
        try:
            logger.info(f"Processing saved HTML file: {html_path}")
            
            # Read the HTML file
            with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
                html_content = f.read()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Try to extract title
            title = ""
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text().strip()
            
            # Remove unwanted elements
            for element in soup(["script", "style", "nav", "header", "footer", "aside"]):
                element.decompose()
            
            # Try to find main content area
            main_content = (
                soup.find('main') or 
                soup.find('article') or 
                soup.find('div', class_=re.compile(r'content|main|body', re.I)) or
                soup.find('body')
            )
            
            if main_content:
                text = self.html_converter.handle(str(main_content))
            else:
                text = self.html_converter.handle(html_content)
            
            # Clean the text
            text = self.clean_html_text(text)
            
            # Create metadata
            metadata = {
                'source_file': str(html_path),
                'filename': html_path.name,
                'file_size': html_path.stat().st_size,
                'processed_at': datetime.now().isoformat(),
                'document_type': 'html',
                'title': title
            }
            
            # Add URL info if provided
            if original_url:
                metadata['original_url'] = original_url
                metadata['domain'] = urlparse(original_url).netloc
            else:
                # Try to extract URL from HTML meta tags or comments
                url_from_html = self.extract_url_from_html(soup)
                if url_from_html:
                    metadata['original_url'] = url_from_html
                    metadata['domain'] = urlparse(url_from_html).netloc
            
            logger.info(f"Extracted {len(text)} characters from {html_path}")
            return text, metadata
            
        except Exception as e:
            logger.error(f"Failed to process HTML file {html_path}: {e}")
            return "", {}
    
    def extract_url_from_html(self, soup: BeautifulSoup) -> str:
        """Try to extract the original URL from HTML metadata."""
        try:
            # Check for canonical URL
            canonical = soup.find('link', rel='canonical')
            if canonical and canonical.get('href'):
                return canonical['href']
            
            # Check for og:url meta tag
            og_url = soup.find('meta', property='og:url')
            if og_url and og_url.get('content'):
                return og_url['content']
            
            # Check for meta refresh
            refresh = soup.find('meta', attrs={'http-equiv': 'refresh'})
            if refresh and refresh.get('content'):
                content = refresh['content']
                url_match = re.search(r'url=([^;]+)', content, re.IGNORECASE)
                if url_match:
                    return url_match.group(1)
            
        except Exception:
            pass
        
        return ""
    
    def clean_html_text(self, text: str) -> str:
        """Clean text extracted from HTML."""
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common web artifacts
        text = re.sub(r'Skip to main content', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Cookie.*?Accept', '', text, flags=re.IGNORECASE)
        text = re.sub(r'JavaScript.*?enabled', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Menu\s*Toggle', '', text, flags=re.IGNORECASE)
        
        # Clean up markdown-like artifacts
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # Remove markdown links
        text = re.sub(r'_{2,}', '', text)  # Remove underscores
        text = re.sub(r'\*{2,}', '', text)  # Remove asterisks
        
        # Remove navigation artifacts
        text = re.sub(r'Home\s*>\s*', '', text)
        text = re.sub(r'Breadcrumb', '', text, flags=re.IGNORECASE)
        
        return text.strip()

def process_html_file(
    html_path: Path,
    html_processor: SavedHTMLProcessor,
    doc_processor: DocumentProcessor,
    chunk_size: int,
    chunk_overlap: int,
    original_url: str = None,
    export_dir: Path = None
) -> list[dict]:
    """
    Process a single HTML file into chunks.
    
    Args:
        html_path: Path to HTML file
        html_processor: HTML processor instance
        doc_processor: Document processor instance
        chunk_size: Words per chunk
        chunk_overlap: Words overlap between chunks
        original_url: Original URL of the page
    
    Returns:
        List of document chunks with metadata
    """
    try:
        # Extract text from HTML file
        text, metadata = html_processor.extract_text_from_file(html_path, original_url)
        
        if not text.strip():
            logger.warning(f"No text extracted from {html_path}")
            return []
        
        # Clean the text
        cleaned_text = doc_processor.clean_text(text)
        
        if not cleaned_text.strip():
            logger.warning(f"No text after cleaning from {html_path}")
            return []
        
        # Export full text if export directory is specified
        if export_dir:
            export_dir.mkdir(parents=True, exist_ok=True)
            export_file = export_dir / f"{html_path.stem}_html.txt"
            with open(export_file, 'w', encoding='utf-8') as f:
                f.write(f"# {html_path.name}\n")
                f.write(f"# Document Type: HTML\n")
                f.write(f"# Source File: {html_path}\n")
                f.write(f"# File Size: {html_path.stat().st_size:,} bytes\n")
                if original_url:
                    f.write(f"# Original URL: {original_url}\n")
                if metadata.get('title'):
                    f.write(f"# Title: {metadata['title']}\n")
                f.write(f"# Characters: {len(cleaned_text):,}\n")
                f.write(f"# Words: {len(cleaned_text.split()):,}\n")
                f.write(f"# Processed: {datetime.now().isoformat()}\n")
                f.write("\n" + "=" * 80 + "\n\n")
                f.write(cleaned_text)
            logger.info(f"Exported full text to: {export_file}")
        
        # Chunk the text
        chunks = doc_processor.chunk_text(cleaned_text, chunk_size, chunk_overlap)
        
        if not chunks:
            logger.warning(f"No chunks created from {html_path}")
            return []
        
        # Prepare documents for ChromaDB
        documents = []
        for i, chunk in enumerate(chunks):
            # Generate document ID
            doc_id = f"html_{html_path.stem}_{i:03d}"
            
            # Combine metadata
            doc_metadata = {
                **metadata,
                'chunk_index': i,
                'total_chunks': len(chunks),
                'word_count': chunk['word_count'],
                'sentence_count': chunk['sentence_count'],
                'collection_source': 'digital_marketplace_procurement'
            }
            
            documents.append({
                'id': doc_id,
                'text': chunk['text'],
                'metadata': doc_metadata
            })
        
        logger.info(f"Successfully processed {html_path}: {len(chunks)} chunks, {len(cleaned_text)} characters")
        return documents
        
    except Exception as e:
        logger.error(f"Failed to process {html_path}: {e}")
        return []

@click.command()
@click.argument('html_files', nargs=-1, type=click.Path(exists=True, path_type=Path))
@click.option('--chroma-url', default=DEFAULT_CHROMA_URL, help='ChromaDB URL')
@click.option('--collection-name', default=DEFAULT_COLLECTION_NAME, help='Collection name')
@click.option('--chunk-size', default=DEFAULT_CHUNK_SIZE, help='Words per chunk')
@click.option('--chunk-overlap', default=DEFAULT_CHUNK_OVERLAP, help='Words overlap between chunks')
@click.option('--original-url', help='Original URL of the webpage (for metadata)')
@click.option('--reset-collection', is_flag=True, help='Reset collection before processing')
@click.option('--export-text', default='../../chroma_data/procurement_docs/full_text', help='Directory to export full text documents for summary creation')
def main(html_files, chroma_url, collection_name, chunk_size, chunk_overlap, original_url, reset_collection, export_text):
    """
    Process saved HTML files and add them to ChromaDB.
    
    Examples:
        python process_saved_html.py saved_page.html
        python process_saved_html.py *.html --original-url "https://example.com"
        python process_saved_html.py page.html --reset-collection
    """
    setup_logging()
    
    if not html_files:
        logger.error("No HTML files provided. Use --help for usage information.")
        click.echo("\n💡 Quick start:")
        click.echo("1. Save a webpage as HTML (Ctrl+S in browser)")
        click.echo("2. Run: python process_saved_html.py saved_page.html")
        click.echo("3. Optionally add --original-url for better metadata")
        return
    
    try:
        # Initialize processors
        html_processor = SavedHTMLProcessor()
        doc_processor = DocumentProcessor()
        chroma_manager = ChromaDBManager(chroma_url)
        
        # Setup export directory if specified
        export_dir = Path(export_text) if export_text else None
        if export_text:
            logger.info(f"Full text will be exported to: {export_text}")
        
        # Create or get collection
        collection = chroma_manager.create_or_get_collection(collection_name, reset_collection)
        
        # Process each HTML file
        total_documents = 0
        processed_files = 0
        
        for html_path in html_files:
            logger.info(f"Processing HTML file: {html_path}")
            
            documents = process_html_file(
                html_path, html_processor, doc_processor,
                chunk_size, chunk_overlap, original_url, export_dir
            )
            
            if documents:
                # Add to ChromaDB
                chroma_manager.add_documents(collection, documents)
                total_documents += len(documents)
                processed_files += 1
                logger.info(f"Added {len(documents)} chunks from {html_path}")
            else:
                logger.warning(f"No documents created from {html_path}")
        
        # Summary
        logger.info(f"✅ Processing complete!")
        logger.info(f"📄 Processed files: {processed_files}/{len(html_files)}")
        logger.info(f"📝 Total chunks added: {total_documents}")
        logger.info(f"🗄️  Collection: {collection_name}")
        
        if total_documents > 0:
            click.echo(f"\n🎉 Successfully processed {processed_files} HTML files!")
            click.echo(f"📊 Added {total_documents} text chunks to '{collection_name}' collection")
            click.echo(f"\n🔍 Test your data:")
            click.echo(f"   python test_search.py --query 'your search terms'")
        else:
            click.echo("\n⚠️  No documents were successfully processed.")
            click.echo("Check the log files for detailed error information.")
            
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        click.echo(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 