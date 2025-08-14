# Digital Marketplace - Procurement Documents Tokenization Setup Script (PowerShell)
# This script sets up the Python environment and runs the initial tokenization

param(
    [switch]$SkipChromeCheck,
    [switch]$SkipChromaCheck
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "Digital Marketplace - Procurement Documents Tokenization Setup" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Check if we're in the correct directory
if (-not (Test-Path "tokenize_procurement_docs.py")) {
    Write-Host "ERROR: Please run this script from the src/procurement-tokenizer directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Expected files: tokenize_procurement_docs.py, requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Check if Python 3 is available
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+\.\d+)") {
        $version = $matches[1]
        Write-Host "Found Python $version" -ForegroundColor Green
    } else {
        throw "Python version not detected"
    }
} catch {
    Write-Host "ERROR: Python 3 is required but not installed. Please install Python 3.8 or higher." -ForegroundColor Red
    Write-Host "   Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Check if pip is available
try {
    pip --version | Out-Null
    Write-Host "Found pip" -ForegroundColor Green
} catch {
    Write-Host "ERROR: pip is required but not installed. Please install pip." -ForegroundColor Red
    exit 1
}

# Check if ChromaDB is running
if (-not $SkipChromaCheck) {
    Write-Host "Checking ChromaDB connection..." -ForegroundColor Blue
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/heartbeat" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "ChromaDB is running on localhost:8000" -ForegroundColor Green
        } else {
            throw "ChromaDB not responding"
        }
    } catch {
        Write-Host " ChromaDB not detected on localhost:8000" -ForegroundColor Yellow
        Write-Host "Please ensure ChromaDB is running:" -ForegroundColor Yellow
        Write-Host "  cd ../../; docker-compose up chroma" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host " Setup cancelled" -ForegroundColor Red
            exit 1
        }
    }
}

# Check if documents directory exists
$docsDir = "..\..\chroma_data\procurement_docs"
if (-not (Test-Path $docsDir)) {
    Write-Host "WARNING: Documents directory not found: $docsDir" -ForegroundColor Yellow
    Write-Host "This is okay if you only plan to process web pages." -ForegroundColor Yellow
} else {
    # Count PDF files
    $pdfCount = (Get-ChildItem $docsDir -Filter "*.pdf" -ErrorAction SilentlyContinue).Count
    Write-Host "Found $pdfCount PDF files in $docsDir" -ForegroundColor Green
}

# Check for Chrome (needed for Selenium)
if (-not $SkipChromeCheck) {
    $chromeFound = $false
    
    # Check common Chrome installation paths
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
    )
    
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            $chromeFound = $true
            break
        }
    }
    
    if ($chromeFound) {
        Write-Host "Chrome browser found (required for web scraping)" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Chrome browser not detected" -ForegroundColor Yellow
        Write-Host "Chrome is required for web page scraping with Selenium." -ForegroundColor Yellow
        Write-Host "Please install Chrome from: https://www.google.com/chrome/" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host "Setup cancelled" -ForegroundColor Red
            exit 1
        }
    }
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Blue
    python -m venv venv
    Write-Host "Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Blue
& ".\venv\Scripts\Activate.ps1"

# Check if activation worked
if ($env:VIRTUAL_ENV) {
    Write-Host "Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "WARNING: Virtual environment activation may have failed" -ForegroundColor Yellow
}

# Install requirements
Write-Host "Installing Python dependencies..." -ForegroundColor Blue
Write-Host "This may take a few minutes for packages like torch and transformers..." -ForegroundColor Yellow

try {
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install dependencies. Error: $_" -ForegroundColor Red
    exit 1
}

# Test import of key libraries
Write-Host " Testing library imports..." -ForegroundColor Blue
$testScript = @"
try:
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
    print('All libraries imported successfully')
except Exception as e:
    print(f'Library import failed: {e}')
    exit(1)
"@

$testResult = python -c $testScript
Write-Host $testResult

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Library import failed. Please check the error above." -ForegroundColor Red
    exit 1
}

# Download NLTK data
Write-Host "Downloading NLTK data..." -ForegroundColor Blue
$nltkScript = @"
import nltk
try:
    nltk.data.find('tokenizers/punkt')
    print('NLTK punkt tokenizer already available')
except LookupError:
    print('Downloading NLTK punkt tokenizer...')
    nltk.download('punkt')
    print('NLTK punkt tokenizer downloaded')
"@

python -c $nltkScript

# Test ChromeDriver setup (will download automatically)
Write-Host "Testing web scraping setup..." -ForegroundColor Blue
$seleniumTest = @"
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    
    # Setup Chrome options for headless mode
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    # This will download ChromeDriver if needed
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.quit()
    print('Web scraping setup successful')
except Exception as e:
    print(f'Web scraping setup failed: {e}')
    print('PDF processing will still work, but web page scraping may not.')
"@

python -c $seleniumTest

Write-Host ""
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "What you can do now:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Process PDF documents:" -ForegroundColor White
Write-Host "   python tokenize_procurement_docs.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Process the government procurement page:" -ForegroundColor White
Write-Host "   python tokenize_procurement_docs.py --url 'https://intranet.fin.gov.bc.ca/service/procurement-practice-standard'" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Test search functionality:" -ForegroundColor White
Write-Host "   python test_search.py --test-all" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Interactive search:" -ForegroundColor White
Write-Host "   python test_search.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Process saved HTML files:" -ForegroundColor White
Write-Host "   python process_saved_html.py saved_page.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Diagnose web scraping issues:" -ForegroundColor White
Write-Host "   python test_web_scraping.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage examples:" -ForegroundColor Yellow
Write-Host "  # Process all PDFs with custom settings" -ForegroundColor White
Write-Host "  python tokenize_procurement_docs.py --chunk-size 1000 --reset-collection" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Process specific PDF" -ForegroundColor White
Write-Host "  python tokenize_procurement_docs.py --file 'Sprint_With_Us_-_Request_for_Qualifications.pdf'" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Search for specific terms" -ForegroundColor White
Write-Host "  python test_search.py --query 'procurement standards'" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more information, see README_TOKENIZATION.md" -ForegroundColor Yellow

# Ask if user wants to run tokenization now
Write-Host ""
Write-Host "What would you like to do first?" -ForegroundColor Cyan
Write-Host "1) Process all PDF documents" -ForegroundColor White
Write-Host "2) Process the government procurement web page (direct scraping)" -ForegroundColor White
Write-Host "3) Process saved HTML files (recommended for intranet)" -ForegroundColor White
Write-Host "4) Run search tests only" -ForegroundColor White
Write-Host "5) Run web scraping diagnostics" -ForegroundColor White
Write-Host "6) Exit and run manually later" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host "Processing PDF documents..." -ForegroundColor Blue
        python tokenize_procurement_docs.py
        Write-Host ""
        Write-Host "Running search tests..." -ForegroundColor Blue
        python test_search.py --test-all
    }
    "2" {
        Write-Host "Processing government procurement web page..." -ForegroundColor Blue
        python tokenize_procurement_docs.py --url "https://intranet.fin.gov.bc.ca/service/procurement-practice-standard"
        Write-Host ""
        Write-Host "Running search tests..." -ForegroundColor Blue
        python test_search.py --test-all
    }
    "3" {
        Write-Host "Processing saved HTML files..." -ForegroundColor Blue
        Write-Host "Place your saved HTML files in this directory, then run:" -ForegroundColor Yellow
        Write-Host "   python process_saved_html.py your_saved_file.html" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Example: Save the intranet page manually in your browser (Ctrl+S)," -ForegroundColor Yellow
        Write-Host "then process it with:" -ForegroundColor Yellow
        Write-Host "   python process_saved_html.py saved_page.html --original-url 'https://intranet.fin.gov.bc.ca/service/procurement-practice-standard'" -ForegroundColor Cyan
    }
    "4" {
        Write-Host "Running search tests..." -ForegroundColor Blue
        python test_search.py --test-all
    }
    "5" {
        Write-Host "Running web scraping diagnostics..." -ForegroundColor Blue
        python test_web_scraping.py
    }
    "6" {
        Write-Host "You can run the scripts manually later." -ForegroundColor Green
    }
    default {
        Write-Host "Invalid choice. You can run the scripts manually later." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "All done! Happy tokenizing!" -ForegroundColor Green
Write-Host ""
Write-Host "Remember:" -ForegroundColor Yellow
Write-Host "  - Check tokenization.log for detailed processing logs" -ForegroundColor White
Write-Host "  - Use --help flag for command options" -ForegroundColor White
Write-Host "  - For intranet pages: Save manually in browser (Ctrl+S) then use process_saved_html.py" -ForegroundColor White
Write-Host "  - Saved HTML approach is more reliable than web scraping for intranet sites" -ForegroundColor White 