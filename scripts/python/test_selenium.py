#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Script de prueba para verificar que Selenium funciona"""

import sys
print("Python version:", sys.version)

try:
    from selenium import webdriver
    print("✓ Selenium importado correctamente")
except ImportError as e:
    print("✗ Error importando Selenium:", e)
    sys.exit(1)

try:
    from webdriver_manager.chrome import ChromeDriverManager
    print("✓ webdriver-manager importado correctamente")
except ImportError as e:
    print("✗ Error importando webdriver-manager:", e)
    sys.exit(1)

try:
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--log-level=3')
    
    print("Intentando iniciar Chrome con webdriver-manager...")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    print("✓ Chrome iniciado correctamente")
    
    print("Navegando a Google...")
    driver.get("https://www.google.com")
    print("✓ Navegación exitosa")
    print("Título de la página:", driver.title)
    
    driver.quit()
    print("✓ Todo funciona correctamente!")
    
except Exception as e:
    print("✗ Error:", str(e))
    import traceback
    traceback.print_exc()
    sys.exit(1)
