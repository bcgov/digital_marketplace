#!/usr/bin/env python3
"""
Digital Marketplace - Procurement Documents Tokenization Playbook

This script processes PDF documents and web pages in the procurement_docs directory,
extracts text, chunks it appropriately, and stores it in ChromaDB for
prompt augmentation and semantic search.

Usage:
    python tokenize_procurement_docs.py [OPTIONS]

Examples:
    # Process all documents with default settings
    python tokenize_procurement_docs.py

    # Process with custom chunk size
    python tokenize_procurement_docs.py --chunk-size 800

    # Process specific document
    python tokenize_procurement_docs.py --file "Sprint_With_Us_-_Request_for_Qualifications.pdf"

    # Process a web page
    python tokenize_procurement_docs.py --url "https://intranet.fin.gov.bc.ca/service/procurement-practice-standard"

    # Reset collection before processing
    python tokenize_procurement_docs.py --reset-collection
"""

import os
import re
import sys
import time
import logging
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import urlparse, urljoin

import click
import chromadb
from chromadb.config import Settings
import PyPDF2
import pdfplumber
import fitz  # PyMuPDF
import requests
from bs4 import BeautifulSoup
import html2text
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from dotenv import load_dotenv
import validators

# Load environment variables
load_dotenv()

# Configuration
DEFAULT_CHROMA_URL = "http://localhost:8000"
DEFAULT_COLLECTION_NAME = "procurement_docs"
DEFAULT_CHUNK_SIZE = 800  # words per chunk
DEFAULT_CHUNK_OVERLAP = 100  # words overlap between chunks
DOCS_DIRECTORY = "../../chroma_data/procurement_docs/raw_docs"
DEFAULT_EXPORT_DIR = "../../chroma_data/procurement_docs/full_text"

def setup_logging():
    """Setup logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('tokenization.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

class WebPageExtractor:
    """Handles web page content extraction."""
    
    def __init__(self):
        """Initialize the web page extractor."""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        # Disable SSL verification for intranet sites (add certificate bundle later if needed)
        self.session.verify = False
        # Suppress SSL warnings
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = True
        
    def extract_with_requests(self, url: str) -> str:
        """Extract content using requests and BeautifulSoup."""
        try:
            logger.info(f"Fetching content from {url} using requests...")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            
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
                text = self.html_converter.handle(response.text)
            
            return self.clean_web_text(text)
            
        except Exception as e:
            logger.error(f"Failed to extract content using requests: {e}")
            return ""
    
    def extract_with_selenium(self, url: str) -> str:
        """Extract content using Selenium for JavaScript-heavy pages."""
        driver = None
        try:
            logger.info(f"Fetching content from {url} using Selenium...")
            
            # Setup Chrome options
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--ignore-certificate-errors")
            chrome_options.add_argument("--ignore-ssl-errors")
            chrome_options.add_argument("--ignore-certificate-errors-spki-list")
            
            # Try to create driver with better error handling
            # First try system Chrome (more reliable)
            try:
                logger.info("Attempting to use system Chrome...")
                driver = webdriver.Chrome(options=chrome_options)
                logger.info("Successfully using system Chrome")
                
            except Exception as system_chrome_error:
                logger.warning(f"System Chrome failed: {system_chrome_error}")
                
                # Fallback to ChromeDriver download
                try:
                    logger.info("Falling back to ChromeDriver download...")
                    driver_path = ChromeDriverManager().install()
                    logger.info(f"Using ChromeDriver at: {driver_path}")
                    
                    service = Service(driver_path)
                    driver = webdriver.Chrome(service=service, options=chrome_options)
                    
                except Exception as driver_error:
                    logger.error(f"ChromeDriver setup also failed: {driver_error}")
                    raise Exception(f"Both system Chrome and ChromeDriver failed. System: {system_chrome_error}, ChromeDriver: {driver_error}")
            
            # Load page
            driver.get(url)
            
            # Wait for page to load
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Additional wait for dynamic content
            time.sleep(3)
            
            # Get page source and extract text
            page_source = driver.page_source
            soup = BeautifulSoup(page_source, 'html.parser')
            
            # Remove unwanted elements
            for element in soup(["script", "style", "nav", "header", "footer"]):
                element.decompose()
            
            # Try to find main content
            main_content = (
                soup.find('main') or 
                soup.find('article') or 
                soup.find('div', class_=re.compile(r'content|main|body', re.I)) or
                soup.find('body')
            )
            
            if main_content:
                text = self.html_converter.handle(str(main_content))
            else:
                text = self.html_converter.handle(page_source)
            
            return self.clean_web_text(text)
            
        except Exception as e:
            logger.error(f"Failed to extract content using Selenium: {e}")
            return ""
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass  # Ignore cleanup errors
    
    def clean_web_text(self, text: str) -> str:
        """Clean text extracted from web pages."""
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common web artifacts
        text = re.sub(r'Skip to main content', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Cookie.*?Accept', '', text, flags=re.IGNORECASE)
        text = re.sub(r'JavaScript.*?enabled', '', text, flags=re.IGNORECASE)
        
        # Clean up markdown-like artifacts
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # Remove markdown links
        text = re.sub(r'_{2,}', '', text)  # Remove underscores
        text = re.sub(r'\*{2,}', '', text)  # Remove asterisks
        
        return text.strip()
    
    def extract_text(self, url: str, method: str = "auto") -> tuple[str, dict]:
        """
        Extract text from a web page.
        
        Args:
            url: URL to extract from
            method: Extraction method ('auto', 'requests', 'selenium')
        
        Returns:
            Tuple of (extracted_text, metadata)
        """
        if not validators.url(url):
            raise ValueError(f"Invalid URL: {url}")
        
        metadata = {
            'url': url,
            'domain': urlparse(url).netloc,
            'extracted_at': datetime.now().isoformat(),
            'method_used': method
        }
        
        if method == "auto":
            # Try requests first (faster), then Selenium if needed
            text = self.extract_with_requests(url)
            if text and len(text.strip()) > 100:  # If we got meaningful content
                metadata['method_used'] = 'requests'
                logger.info(f"Successfully extracted content using requests")
                return text, metadata
            
            logger.info("Requests extraction yielded minimal content, trying Selenium...")
            text = self.extract_with_selenium(url)
            metadata['method_used'] = 'selenium'
            return text, metadata
        
        elif method == "requests":
            text = self.extract_with_requests(url)
            return text, metadata
        elif method == "selenium":
            text = self.extract_with_selenium(url)
            return text, metadata
        else:
            raise ValueError(f"Unknown extraction method: {method}")

class DocumentProcessor:
    """Handles PDF text extraction and processing."""
    
    def __init__(self):
        """Initialize the document processor."""
        # Download required NLTK data
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            logger.info("Downloading NLTK punkt tokenizer...")
            nltk.download('punkt')
    
    def extract_text_pypdf2(self, pdf_path: str) -> str:
        """Extract text using PyPDF2."""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            logger.error(f"PyPDF2 extraction failed for {pdf_path}: {e}")
            return ""
    
    def extract_text_pdfplumber(self, pdf_path: str) -> str:
        """Extract text using pdfplumber (better for tables and complex layouts)."""
        try:
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
        except Exception as e:
            logger.error(f"pdfplumber extraction failed for {pdf_path}: {e}")
            return ""
    
    def extract_text_pymupdf(self, pdf_path: str) -> str:
        """Extract text using PyMuPDF (fastest, good for most cases)."""
        try:
            text = ""
            doc = fitz.open(pdf_path)
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text += page.get_text() + "\n"
            doc.close()
            return text
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed for {pdf_path}: {e}")
            return ""
    
    def extract_text(self, pdf_path: str, method: str = "auto") -> str:
        """
        Extract text from PDF using the specified method.
        
        Args:
            pdf_path: Path to the PDF file
            method: Extraction method ('auto', 'pymupdf', 'pdfplumber', 'pypdf2')
        
        Returns:
            Extracted text as string
        """
        logger.info(f"Extracting text from {pdf_path} using method: {method}")
        
        if method == "auto":
            # Try methods in order of preference
            methods = [
                ("pymupdf", self.extract_text_pymupdf),
                ("pdfplumber", self.extract_text_pdfplumber),
                ("pypdf2", self.extract_text_pypdf2)
            ]
            
            for method_name, extractor in methods:
                text = extractor(pdf_path)
                if text.strip():  # If we got meaningful text
                    logger.info(f"Successfully extracted text using {method_name}")
                    return text
                logger.warning(f"{method_name} returned empty text")
            
            logger.error(f"All extraction methods failed for {pdf_path}")
            return ""
        
        elif method == "pymupdf":
            return self.extract_text_pymupdf(pdf_path)
        elif method == "pdfplumber":
            return self.extract_text_pdfplumber(pdf_path)
        elif method == "pypdf2":
            return self.extract_text_pypdf2(pdf_path)
        else:
            raise ValueError(f"Unknown extraction method: {method}")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove page breaks and form feeds
        text = re.sub(r'[\f\r]', '\n', text)
        
        # Remove excessive newlines
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 100) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks.
        
        Args:
            text: Text to chunk
            chunk_size: Target number of words per chunk
            overlap: Number of words to overlap between chunks
        
        Returns:
            List of chunk dictionaries with text and metadata
        """
        # Split into sentences
        sentences = sent_tokenize(text)
        
        chunks = []
        current_chunk = []
        current_word_count = 0
        
        for sentence in sentences:
            words = word_tokenize(sentence)
            sentence_word_count = len(words)
            
            # If adding this sentence would exceed chunk size, finalize current chunk
            if current_word_count > 0 and current_word_count + sentence_word_count > chunk_size:
                chunk_text = ' '.join(current_chunk)
                if chunk_text.strip():
                    chunks.append({
                        'text': chunk_text.strip(),
                        'word_count': current_word_count,
                        'sentence_count': len(current_chunk)
                    })
                
                # Start new chunk with overlap
                if overlap > 0 and len(current_chunk) > 1:
                    # Take last few sentences for overlap
                    overlap_sentences = []
                    overlap_words = 0
                    for i in range(len(current_chunk) - 1, -1, -1):
                        sentence_words = len(word_tokenize(current_chunk[i]))
                        if overlap_words + sentence_words <= overlap:
                            overlap_sentences.insert(0, current_chunk[i])
                            overlap_words += sentence_words
                        else:
                            break
                    
                    current_chunk = overlap_sentences
                    current_word_count = overlap_words
                else:
                    current_chunk = []
                    current_word_count = 0
            
            current_chunk.append(sentence)
            current_word_count += sentence_word_count
        
        # Add final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            if chunk_text.strip():
                chunks.append({
                    'text': chunk_text.strip(),
                    'word_count': current_word_count,
                    'sentence_count': len(current_chunk)
                })
        
        # Add chunk indices
        for i, chunk in enumerate(chunks):
            chunk['chunk_index'] = i
            chunk['total_chunks'] = len(chunks)
        
        return chunks

class ChromaDBManager:
    """Handles ChromaDB operations."""
    
    def __init__(self, chroma_url: str = DEFAULT_CHROMA_URL):
        """Initialize ChromaDB connection."""
        self.chroma_url = chroma_url
        self.client = None
        self.embedding_model = None
        
        # Initialize embedding model (same as your existing setup)
        logger.info("Loading sentence transformer model...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self._connect()
    
    def _connect(self):
        """Connect to ChromaDB."""
        try:
            # Parse URL to get host and port
            if self.chroma_url.startswith('http://'):
                url_part = self.chroma_url[7:]
            elif self.chroma_url.startswith('https://'):
                url_part = self.chroma_url[8:]
            else:
                url_part = self.chroma_url
            
            if ':' in url_part:
                host, port = url_part.split(':')
                port = int(port)
            else:
                host = url_part
                port = 8000
            
            self.client = chromadb.HttpClient(
                host=host,
                port=port,
                settings=Settings(allow_reset=True)
            )
            
            # Test connection
            self.client.heartbeat()
            logger.info(f"Successfully connected to ChromaDB at {self.chroma_url}")
            
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB at {self.chroma_url}: {e}")
            raise
    
    def create_or_get_collection(self, collection_name: str, reset: bool = False) -> Any:
        """Create or get a collection."""
        try:
            if reset:
                try:
                    self.client.delete_collection(collection_name)
                    logger.info(f"Deleted existing collection: {collection_name}")
                except Exception:
                    pass  # Collection might not exist
            
            collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"description": "Procurement documents for Digital Marketplace"}
            )
            
            logger.info(f"Using collection: {collection_name}")
            return collection
            
        except Exception as e:
            logger.error(f"Failed to create/get collection {collection_name}: {e}")
            raise
    
    def add_documents(self, collection: Any, documents: List[Dict[str, Any]]) -> None:
        """Add documents to the collection."""
        if not documents:
            logger.warning("No documents to add")
            return
        
        try:
            # Prepare data for ChromaDB
            ids = []
            texts = []
            metadatas = []
            embeddings = []
            
            logger.info(f"Generating embeddings for {len(documents)} document chunks...")
            
            for doc in tqdm(documents, desc="Processing documents"):
                ids.append(doc['id'])
                texts.append(doc['text'])
                metadatas.append(doc['metadata'])
                
                # Generate embedding
                embedding = self.embedding_model.encode(doc['text']).tolist()
                embeddings.append(embedding)
            
            # Add to ChromaDB in batches
            batch_size = 100
            for i in range(0, len(documents), batch_size):
                batch_end = min(i + batch_size, len(documents))
                
                collection.add(
                    ids=ids[i:batch_end],
                    documents=texts[i:batch_end],
                    metadatas=metadatas[i:batch_end],
                    embeddings=embeddings[i:batch_end]
                )
                
                logger.info(f"Added batch {i//batch_size + 1}/{(len(documents) + batch_size - 1)//batch_size}")
            
            logger.info(f"Successfully added {len(documents)} documents to collection")
            
        except Exception as e:
            logger.error(f"Failed to add documents to collection: {e}")
            raise

def generate_document_id(filename: str, chunk_index: int, doc_type: str = "pdf") -> str:
    """Generate a unique document ID."""
    # Create a hash of the filename for consistency
    filename_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
    return f"procurement_{doc_type}_{filename_hash}_chunk_{chunk_index}"

def process_pdf_file(
    pdf_path: Path, 
    processor: DocumentProcessor, 
    chunk_size: int, 
    chunk_overlap: int,
    export_dir: Path = None
) -> List[Dict[str, Any]]:
    """Process a single PDF file and return document chunks."""
    
    logger.info(f"Processing PDF file: {pdf_path.name}")
    
    # Extract text
    text = processor.extract_text(str(pdf_path))
    
    if not text.strip():
        logger.warning(f"No text extracted from {pdf_path.name}")
        return []
    
    # Clean text
    cleaned_text = processor.clean_text(text)
    
    # Get file stats
    file_stats = pdf_path.stat()
    
    logger.info(f"Extracted {len(cleaned_text)} characters from {pdf_path.name}")
    
    # Export full text if export directory is specified
    if export_dir:
        export_dir.mkdir(parents=True, exist_ok=True)
        export_file = export_dir / f"{pdf_path.stem}.txt"
        with open(export_file, 'w', encoding='utf-8') as f:
            f.write(f"# {pdf_path.name}\n")
            f.write(f"# Document Type: PDF\n")
            f.write(f"# File Size: {file_stats.st_size:,} bytes\n")
            f.write(f"# Characters: {len(cleaned_text):,}\n")
            f.write(f"# Words: {len(cleaned_text.split()):,}\n")
            f.write(f"# Processed: {datetime.now().isoformat()}\n")
            f.write("\n" + "=" * 80 + "\n\n")
            f.write(cleaned_text)
        logger.info(f"Exported full text to: {export_file}")
    
    # Chunk text
    chunks = processor.chunk_text(cleaned_text, chunk_size, chunk_overlap)
    
    # Prepare documents for ChromaDB
    documents = []
    for chunk in chunks:
        doc_id = generate_document_id(pdf_path.name, chunk['chunk_index'], "pdf")
        
        # Prepare metadata (all values must be strings for ChromaDB)
        metadata = {
            'source': 'procurement_docs',
            'document_type': 'pdf',
            'filename': pdf_path.name,
            'file_size': str(file_stats.st_size),
            'processed_at': datetime.now().isoformat(),
            'chunk_index': str(chunk['chunk_index']),
            'total_chunks': str(chunk['total_chunks']),
            'word_count': str(chunk['word_count']),
            'sentence_count': str(chunk['sentence_count']),
            'collection_source': 'digital_marketplace_procurement'
        }
        
        documents.append({
            'id': doc_id,
            'text': chunk['text'],
            'metadata': metadata
        })
    
    logger.info(f"Created {len(documents)} chunks from {pdf_path.name}")
    return documents

def process_web_page(
    url: str,
    extractor: WebPageExtractor,
    processor: DocumentProcessor,
    chunk_size: int,
    chunk_overlap: int,
    extraction_method: str = "auto",
    export_dir: Path = None
) -> List[Dict[str, Any]]:
    """Process a web page and return document chunks."""
    
    logger.info(f"Processing web page: {url}")
    
    # Extract text and metadata
    text, web_metadata = extractor.extract_text(url, extraction_method)
    
    if not text.strip():
        logger.warning(f"No text extracted from {url}")
        return []
    
    # Clean text
    cleaned_text = processor.clean_text(text)
    
    logger.info(f"Extracted {len(cleaned_text)} characters from {url}")
    
    # Generate a filename-like identifier from URL
    parsed_url = urlparse(url)
    url_identifier = f"{parsed_url.netloc}{parsed_url.path}".replace('/', '_').replace('.', '_')
    url_identifier = re.sub(r'[^a-zA-Z0-9_-]', '_', url_identifier)
    
    # Export full text if export directory is specified
    if export_dir:
        export_dir.mkdir(parents=True, exist_ok=True)
        export_file = export_dir / f"{url_identifier}.txt"
        with open(export_file, 'w', encoding='utf-8') as f:
            f.write(f"# {url}\n")
            f.write(f"# Document Type: Webpage\n")
            f.write(f"# Domain: {web_metadata['domain']}\n")
            f.write(f"# Extraction Method: {web_metadata['method_used']}\n")
            f.write(f"# Characters: {len(cleaned_text):,}\n")
            f.write(f"# Words: {len(cleaned_text.split()):,}\n")
            f.write(f"# Extracted: {web_metadata['extracted_at']}\n")
            f.write(f"# Processed: {datetime.now().isoformat()}\n")
            f.write("\n" + "=" * 80 + "\n\n")
            f.write(cleaned_text)
        logger.info(f"Exported full text to: {export_file}")
    
    # Chunk text
    chunks = processor.chunk_text(cleaned_text, chunk_size, chunk_overlap)
    
    # Prepare documents for ChromaDB
    documents = []
    for chunk in chunks:
        doc_id = generate_document_id(url_identifier, chunk['chunk_index'], "webpage")
        
        # Prepare metadata (all values must be strings for ChromaDB)
        metadata = {
            'source': 'procurement_docs',
            'document_type': 'webpage',
            'url': url,
            'domain': web_metadata['domain'],
            'extraction_method': web_metadata['method_used'],
            'extracted_at': web_metadata['extracted_at'],
            'processed_at': datetime.now().isoformat(),
            'chunk_index': str(chunk['chunk_index']),
            'total_chunks': str(chunk['total_chunks']),
            'word_count': str(chunk['word_count']),
            'sentence_count': str(chunk['sentence_count']),
            'collection_source': 'digital_marketplace_procurement'
        }
        
        documents.append({
            'id': doc_id,
            'text': chunk['text'],
            'metadata': metadata
        })
    
    logger.info(f"Created {len(documents)} chunks from {url}")
    return documents

@click.command()
@click.option('--chroma-url', default=DEFAULT_CHROMA_URL, help='ChromaDB URL')
@click.option('--collection-name', default=DEFAULT_COLLECTION_NAME, help='Collection name')
@click.option('--chunk-size', default=DEFAULT_CHUNK_SIZE, help='Words per chunk')
@click.option('--chunk-overlap', default=DEFAULT_CHUNK_OVERLAP, help='Words overlap between chunks')
@click.option('--docs-dir', default=DOCS_DIRECTORY, help='Directory containing PDF files')
@click.option('--file', help='Process specific file only')
@click.option('--url', help='Process specific URL only')
@click.option('--reset-collection', is_flag=True, help='Reset collection before processing')
@click.option('--extraction-method', default='auto', 
              type=click.Choice(['auto', 'pymupdf', 'pdfplumber', 'pypdf2', 'requests', 'selenium']),
              help='Extraction method (auto applies to both PDF and web)')
@click.option('--export-text', default=DEFAULT_EXPORT_DIR, help='Directory to export full text documents for summary creation')
def main(chroma_url, collection_name, chunk_size, chunk_overlap, docs_dir, file, url, reset_collection, extraction_method, export_text):
    """
    Tokenize procurement documents and web pages, storing them in ChromaDB.
    
    This script processes PDF files and web pages, extracts and chunks
    the text, and stores the chunks in ChromaDB for semantic search and prompt augmentation.
    """
    
    logger.info("Starting procurement documents tokenization...")
    logger.info(f"Configuration:")
    logger.info(f"  ChromaDB URL: {chroma_url}")
    logger.info(f"  Collection: {collection_name}")
    logger.info(f"  Chunk size: {chunk_size} words")
    logger.info(f"  Chunk overlap: {chunk_overlap} words")
    logger.info(f"  Documents directory: {docs_dir}")
    logger.info(f"  Extraction method: {extraction_method}")
    if export_text:
        logger.info(f"  Export text to: {export_text}")
    
    try:
        # Initialize components
        processor = DocumentProcessor()
        web_extractor = WebPageExtractor()
        chroma_manager = ChromaDBManager(chroma_url)
        
        # Setup export directory if specified
        export_dir = Path(export_text) if export_text else None
        
        # Create or get collection
        collection = chroma_manager.create_or_get_collection(collection_name, reset_collection)
        
        all_documents = []
        
        # Process URL if specified
        if url:
            logger.info(f"Processing URL: {url}")
            try:
                documents = process_web_page(url, web_extractor, processor, chunk_size, chunk_overlap, extraction_method, export_dir)
                all_documents.extend(documents)
                logger.info(f"Successfully processed URL: {url}")
            except Exception as e:
                logger.error(f"Failed to process URL {url}: {e}")
        
        # Process PDF files if no specific URL was given
        elif not url:
            # Get list of PDF files to process
            docs_path = Path(docs_dir)
            if not docs_path.exists():
                logger.error(f"Documents directory does not exist: {docs_dir}")
                return
            
            if file:
                # Process specific file
                pdf_files = [docs_path / file]
                if not pdf_files[0].exists():
                    logger.error(f"Specified file does not exist: {file}")
                    return
            else:
                # Process all PDF files
                pdf_files = list(docs_path.glob("*.pdf"))
            
            if not pdf_files:
                logger.warning(f"No PDF files found in {docs_dir}")
            else:
                logger.info(f"Found {len(pdf_files)} PDF file(s) to process")
                
                # Process each PDF file
                for pdf_path in pdf_files:
                    try:
                        documents = process_pdf_file(pdf_path, processor, chunk_size, chunk_overlap, export_dir)
                        all_documents.extend(documents)
                    except Exception as e:
                        logger.error(f"Failed to process {pdf_path.name}: {e}")
                        continue
        
        if not all_documents:
            logger.error("No documents were successfully processed")
            return
        
        # Add documents to ChromaDB
        chroma_manager.add_documents(collection, all_documents)
        
        # Print summary
        logger.info("=" * 60)
        logger.info("PROCESSING SUMMARY")
        logger.info("=" * 60)
        
        if url:
            logger.info(f"URL processed: {url}")
        else:
            logger.info(f"Files processed: {len(pdf_files) if 'pdf_files' in locals() else 0}")
        
        logger.info(f"Total chunks created: {len(all_documents)}")
        logger.info(f"Collection: {collection_name}")
        logger.info(f"ChromaDB URL: {chroma_url}")
        
        # Test search functionality
        logger.info("\nTesting search functionality...")
        test_query = "procurement practice standard"
        results = collection.query(
            query_texts=[test_query],
            n_results=3,
            include=['documents', 'metadatas', 'distances']
        )
        
        if results['documents'][0]:
            logger.info(f"Search test successful! Found {len(results['documents'][0])} results for '{test_query}'")
            for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
                source = metadata.get('filename') or metadata.get('url', 'Unknown')
                logger.info(f"  Result {i+1}: {source} (chunk {metadata['chunk_index']})")
        else:
            logger.warning("Search test returned no results")
        
        logger.info("\nTokenization completed successfully!")
        logger.info(f"Documents are now available for semantic search in collection '{collection_name}'")
        
    except Exception as e:
        logger.error(f"Tokenization failed: {e}")
        raise

if __name__ == "__main__":
    main() 