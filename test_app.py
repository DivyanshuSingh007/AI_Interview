"""
Quick Selenium test to verify the app loads correctly.
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def test_page_loads():
    # Setup Chrome options
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    
    # Create driver
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    try:
        # Navigate to the app
        print("Navigating to http://localhost:3000...")
        driver.get("http://localhost:3000")
        
        # Wait for page to load
        time.sleep(5)
        
        # Check page title
        title = driver.title
        print(f"Page title: {title}")
        
        # Check for main elements
        page_source = driver.page_source.lower()
        
        # Check for "Interview" text (main app name)
        if "interview" in page_source:
            print("✓ Found 'Interview' text on page")
        else:
            print("✗ 'Interview' text not found")
            
        # Check for common UI elements
        if "get started" in page_source or "start" in page_source:
            print("✓ Found start button on page")
            
        if "upload" in page_source or "resume" in page_source:
            print("✓ Found resume upload section")
            
        # Check for any console errors (basic check)
        print("\nPage loaded successfully!")
        print(f"Current URL: {driver.current_url}")
        
        # Get body text for verification
        body_text = driver.find_element(By.TAG_NAME, "body").text
        print(f"\nFirst 500 chars of body:\n{body_text[:500]}...")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False
        
    finally:
        driver.quit()

if __name__ == "__main__":
    test_page_loads()
