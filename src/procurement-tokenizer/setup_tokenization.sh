#!/bin/bash

# Digital Marketplace - Procurement Documents Tokenization Setup Script
# This script sets up the Python environment and runs the initial tokenization

set -e  # Exit on any error

echo "🚀 Digital Marketplace - Procurement Documents Tokenization Setup"
echo "================================================================="

# Check if we're in the correct directory
if [ ! -f "tokenize_procurement_docs.py" ]; then
    echo "❌ Please run this script from the src/procurement-tokenizer directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: tokenize_procurement_docs.py, requirements.txt"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Found Python $PYTHON_VERSION"

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed. Please install pip3."
    exit 1
fi

echo "✅ Found pip3"

# Check if ChromaDB is running
echo "🔍 Checking ChromaDB connection..."
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
    echo "✅ ChromaDB is running on localhost:8000"
else
    echo "⚠️  ChromaDB not detected on localhost:8000"
    echo "Please ensure ChromaDB is running:"
    echo "  cd ../../ && docker-compose up chroma"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Check if documents directory exists
DOCS_DIR="../../chroma_data/procurement_docs"
if [ ! -d "$DOCS_DIR" ]; then
    echo "⚠️  Documents directory not found: $DOCS_DIR"
    echo "This is okay if you only plan to process web pages."
else
    # Count PDF files
    PDF_COUNT=$(find "$DOCS_DIR" -name "*.pdf" 2>/dev/null | wc -l)
    echo "✅ Found $PDF_COUNT PDF files in $DOCS_DIR"
fi

# Check for Chrome (needed for Selenium)
if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null || command -v chrome &> /dev/null; then
    echo "✅ Chrome browser found (required for web scraping)"
elif [ -d "/Applications/Google Chrome.app" ]; then
    echo "✅ Chrome browser found (macOS)"
else
    echo "⚠️  Chrome browser not detected"
    echo "Chrome is required for web page scraping with Selenium."
    echo "Please install Chrome from: https://www.google.com/chrome/"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📥 Installing Python dependencies..."
echo "This may take a few minutes for packages like torch and transformers..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Dependencies installed successfully"

# Test import of key libraries
echo "🧪 Testing library imports..."
python3 -c "
import chromadb
import PyPDF2
import pdfplumber
import fitz
import requests
import bs4
import html2text
import selenium
import sentence_transformers
import nltk
print('✅ All libraries imported successfully')
" || {
    echo "❌ Library import failed. Please check the error above."
    exit 1
}

# Download NLTK data
echo "📚 Downloading NLTK data..."
python3 -c "
import nltk
try:
    nltk.data.find('tokenizers/punkt')
    print('✅ NLTK punkt tokenizer already available')
except LookupError:
    print('📥 Downloading NLTK punkt tokenizer...')
    nltk.download('punkt')
    print('✅ NLTK punkt tokenizer downloaded')
"

# Test ChromeDriver setup (will download automatically)
echo "🌐 Testing web scraping setup..."
python3 -c "
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

try:
    # Setup Chrome options for headless mode
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    # This will download ChromeDriver if needed
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.quit()
    print('✅ Web scraping setup successful')
except Exception as e:
    print(f'⚠️  Web scraping setup failed: {e}')
    print('PDF processing will still work, but web page scraping may not.')
"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 What you can do now:"
echo ""
echo "1. Process PDF documents:"
echo "   python tokenize_procurement_docs.py"
echo ""
echo "2. Process the government procurement page:"
echo "   python tokenize_procurement_docs.py --url 'https://intranet.fin.gov.bc.ca/service/procurement-practice-standard'"
echo ""
echo "3. Test search functionality:"
echo "   python test_search.py --test-all"
echo ""
echo "4. Interactive search:"
echo "   python test_search.py"
echo ""
echo "💡 Usage examples:"
echo "  # Process all PDFs with custom settings"
echo "  python tokenize_procurement_docs.py --chunk-size 1000 --reset-collection"
echo ""
echo "  # Process specific PDF"
echo "  python tokenize_procurement_docs.py --file 'Sprint_With_Us_-_Request_for_Qualifications.pdf'"
echo ""
echo "  # Search for specific terms"
echo "  python test_search.py --query 'procurement standards'"
echo ""
echo "📖 For more information, see README_TOKENIZATION.md"

# Ask if user wants to run tokenization now
echo ""
echo "🤔 What would you like to do first?"
echo "1) Process all PDF documents"
echo "2) Process the government procurement web page"
echo "3) Run search tests only"
echo "4) Exit and run manually later"
echo ""
read -p "Enter your choice (1-4): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🔄 Processing PDF documents..."
        python tokenize_procurement_docs.py
        echo ""
        echo "🧪 Running search tests..."
        python test_search.py --test-all
        ;;
    2)
        echo "🔄 Processing government procurement web page..."
        python tokenize_procurement_docs.py --url "https://intranet.fin.gov.bc.ca/service/procurement-practice-standard"
        echo ""
        echo "🧪 Running search tests..."
        python test_search.py --test-all
        ;;
    3)
        echo "🧪 Running search tests..."
        python test_search.py --test-all
        ;;
    4)
        echo "👍 You can run the scripts manually later."
        ;;
    *)
        echo "Invalid choice. You can run the scripts manually later."
        ;;
esac

echo ""
echo "✅ All done! Happy tokenizing! 🎉"
echo ""
echo "📝 Remember:"
echo "  - Check tokenization.log for detailed processing logs"
echo "  - Use --help flag for command options"
echo "  - For web pages requiring authentication, you may need to modify headers" 