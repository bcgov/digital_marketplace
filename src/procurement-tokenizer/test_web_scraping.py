#!/usr/bin/env python3
"""
Test Web Scraping Functionality
===============================

This script helps diagnose web scraping issues by testing different methods
and URLs to identify the root cause of problems.
"""

import sys
import logging
import requests
import urllib3
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_requests_basic():
    """Test basic requests functionality."""
    print("\n=== Testing Basic Requests ===")
    try:
        session = requests.Session()
        session.verify = False  # Disable SSL verification
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # Test with a public site first
        response = session.get('https://httpbin.org/get', timeout=10)
        print(f"✅ Public HTTPS test: {response.status_code}")
        
        # Test with HTTP
        response = session.get('http://httpbin.org/get', timeout=10)
        print(f"✅ Public HTTP test: {response.status_code}")
        
        return True
    except Exception as e:
        print(f"❌ Requests test failed: {e}")
        return False

def test_government_site():
    """Test the specific government intranet site."""
    print("\n=== Testing Government Intranet Site ===")
    try:
        session = requests.Session()
        session.verify = False  # Disable SSL verification
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        url = 'https://intranet.fin.gov.bc.ca/service/procurement-practice-standard'
        response = session.get(url, timeout=30)
        print(f"✅ Government site response: {response.status_code}")
        print(f"   Content length: {len(response.content)} bytes")
        print(f"   Content type: {response.headers.get('content-type', 'unknown')}")
        
        if response.status_code == 200:
            # Check if we got actual content or just a login/error page
            content = response.text.lower()
            if any(keyword in content for keyword in ['login', 'authentication', 'unauthorized', 'access denied']):
                print("⚠️  Response appears to be a login/authentication page")
            elif len(content.strip()) < 100:
                print("⚠️  Response content is very short (might be empty)")
            else:
                print("✅ Response appears to contain actual content")
        
        return True
    except Exception as e:
        print(f"❌ Government site test failed: {e}")
        if "certificate verify failed" in str(e):
            print("   This appears to be an SSL certificate issue")
        elif "Max retries exceeded" in str(e):
            print("   This appears to be a connection timeout issue")
        elif "Name or service not known" in str(e):
            print("   This appears to be a DNS resolution issue")
        return False

def test_chrome_driver():
    """Test ChromeDriver installation and basic functionality."""
    print("\n=== Testing ChromeDriver ===")
    driver = None
    try:
        # Test ChromeDriver download/install
        print("Downloading/updating ChromeDriver...")
        driver_path = ChromeDriverManager().install()
        print(f"✅ ChromeDriver installed at: {driver_path}")
        
        # Test Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--ignore-certificate-errors")
        
        # Test driver creation
        service = Service(driver_path)
        driver = webdriver.Chrome(service=service, options=chrome_options)
        print("✅ ChromeDriver created successfully")
        
        # Test basic navigation
        driver.get("https://httpbin.org/get")
        print("✅ Basic navigation test passed")
        
        # Test government site
        try:
            driver.get("https://intranet.fin.gov.bc.ca/service/procurement-practice-standard")
            page_source = driver.page_source
            print(f"✅ Government site loaded, page size: {len(page_source)} characters")
            
            if "login" in page_source.lower() or "authentication" in page_source.lower():
                print("⚠️  Page appears to require authentication")
            elif len(page_source.strip()) < 1000:
                print("⚠️  Page content is very short")
            else:
                print("✅ Page appears to have substantial content")
                
        except Exception as e:
            print(f"⚠️  Government site navigation failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ ChromeDriver test failed: {e}")
        
        # Provide specific error guidance
        error_str = str(e).lower()
        if "win32" in error_str or "not a valid" in error_str:
            print("   This appears to be a 32-bit/64-bit architecture mismatch")
            print("   Try clearing ChromeDriver cache:")
            print("   rm -rf ~/.wdm  (or delete C:\\Users\\<username>\\.wdm on Windows)")
        elif "chrome" in error_str and "not found" in error_str:
            print("   Chrome browser not found. Please install Google Chrome")
        elif "permission" in error_str:
            print("   Permission denied. Try running as administrator")
        
        return False
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

def test_system_chrome():
    """Test if system Chrome can be used directly."""
    print("\n=== Testing System Chrome ===")
    driver = None
    try:
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Try without specifying driver path (use system Chrome)
        driver = webdriver.Chrome(options=chrome_options)
        print("✅ System Chrome driver created successfully")
        
        driver.get("https://httpbin.org/get")
        print("✅ System Chrome navigation test passed")
        
        return True
    except Exception as e:
        print(f"❌ System Chrome test failed: {e}")
        return False
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

def main():
    """Run all diagnostic tests."""
    print("🔧 Web Scraping Diagnostic Tool")
    print("=" * 50)
    
    print("\nThis tool will test various aspects of web scraping to help diagnose issues.")
    print("Results will help identify whether the problem is:")
    print("- Network/SSL issues")
    print("- ChromeDriver installation problems") 
    print("- Government site accessibility")
    print("- Authentication requirements")
    
    # Run tests
    results = {
        'requests_basic': test_requests_basic(),
        'government_site': test_government_site(),
        'chrome_driver': test_chrome_driver(),
        'system_chrome': test_system_chrome()
    }
    
    # Summary
    print("\n" + "=" * 50)
    print("🔍 DIAGNOSTIC SUMMARY")
    print("=" * 50)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20}: {status}")
    
    # Recommendations
    print("\n💡 RECOMMENDATIONS")
    print("-" * 30)
    
    if not results['requests_basic']:
        print("❌ Basic network requests are failing. Check your internet connection.")
    
    if not results['government_site']:
        print("❌ Government intranet site is not accessible.")
        print("   - This is likely because you're not on the BC government network")
        print("   - Intranet sites typically require VPN or internal network access")
        print("   - Try testing with a different, publicly accessible URL")
    
    if not results['chrome_driver'] and not results['system_chrome']:
        print("❌ Both ChromeDriver methods failed.")
        print("   - Ensure Google Chrome is installed")
        print("   - Try clearing ChromeDriver cache:")
        print("     Windows: Delete C:\\Users\\<username>\\.wdm")
        print("     Linux/Mac: rm -rf ~/.wdm")
        print("   - Consider running as administrator")
    
    if all(results.values()):
        print("✅ All tests passed! Web scraping should work correctly.")
    
    print("\n📋 NEXT STEPS")
    print("-" * 20)
    if results['government_site']:
        print("✅ Try running the tokenizer again:")
        print("   python tokenize_procurement_docs.py --url 'https://intranet.fin.gov.bc.ca/service/procurement-practice-standard'")
    else:
        print("📝 Test with a public site first:")
        print("   python tokenize_procurement_docs.py --url 'https://www.canada.ca/en/government/procurement.html'")
        print("📝 If that works, the issue is network access to the intranet site")

if __name__ == "__main__":
    main() 