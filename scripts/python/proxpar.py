# -*- coding: utf-8 -*-
import sys
import io
from bs4 import BeautifulSoup
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# Asegúrate de que la salida sea en UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

urlas = 'https://chile.as.com/resultados/futbol/chile/jornada/'

options = webdriver.ChromeOptions()
options.add_argument("--headless")
options.add_argument("--disable-gpu")
options.add_argument("--log-level=3")
options.add_argument("--no-sandbox") # Crucial para VPS/Linux
options.add_argument("--disable-dev-shm-usage") # Evita crashes por memoria compartida
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
options.add_experimental_option('excludeSwitches', ['enable-logging'])

driver = None
html_content = ""

try:
    s = Service() 
    driver = webdriver.Chrome(service=s, options=options)

    driver.get(urlas)
    

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "a_sd"))
    )
    
    html_content = driver.page_source

except TimeoutException:
    print("Error: La página cargó, pero el contenedor 'a_sd' (lista de partidos) no apareció después de 10s.")
except Exception as e:
    print(f"Error durante la carga con Selenium: {str(e)}")
finally:
    if driver:
        driver.quit() 

# --- (LÓGICA DE PARSEO CORREGIDA) ---

if html_content:
    soup = BeautifulSoup(html_content, 'html.parser')
    
    main_title_tag = soup.find("h1", {"class": "a_hd_t"})
    if main_title_tag:
        titulo_texto = main_title_tag.text.strip()
        titulo_limpio = ' '.join(titulo_texto.split())
        print(f"\n🏆 {titulo_limpio} 🏆")
    
    day_blocks = soup.find_all("div", {"class": "a_sd"})
    
    if not day_blocks:
        print("Error: Se cargó el HTML pero no se encontraron bloques de día 'a_sd'.")
    
    for block in day_blocks:
        day_title_tag = block.find("h2", {"class": "a_sd_t"})
        if day_title_tag:
            print(f"\n--- {day_title_tag.text.strip()} ---")
        
        matches = block.find_all("li", {"class": "a_sc_l_it"})
        
        for match in matches:
            try:
                # Encontrar equipo local
                local_team = match.find("div", {"class": "a_sc_tm"}).find("span", {"class": "a_sc_tn"}).text.strip()
                
                # Encontrar equipo visitante
                away_team = match.find("div", {"class": "a_sc_tm a_sc_tm-r"}).find("span", {"class": "a_sc_tn"}).text.strip()
                
                # --- LÓGICA DE RESULTADO/HORA CORREGIDA ---
                
                # 1. Buscar si es un partido FUTURO
                future_time_container = match.find("div", {"class": "a_sc_hr"})
                
                # 2. Buscar si es un partido JUGADO o EN VIVO
                score_container = match.find("div", {"class": "a_sc_gl"})
                
                if future_time_container:
                    # Es un partido FUTURO
                    time_text = " ".join(future_time_container.text.split())
                    print(f"⚽ {local_team} vs {away_team}\n   └─ {time_text}")
                
                elif score_container:
                    # Es un partido JUGADO o EN VIVO
                    score_text = " ".join(score_container.text.split())
                    
                    # Revisar el estado (Finalizado, 72', etc.)
                    status_text = ""
                    status_container = match.find("div", {"class": "a_sc_st"})
                    if status_container:
                        status_text = status_container.text.strip()
                        
                    if status_text == "Finalizado":
                        print(f"✅ {local_team} | {score_text} | {away_team}")
                    else:
                        # Si no está finalizado, está EN VIVO (ej. "72'")
                        print(f"▶️ {local_team} | {score_text} | {away_team}  ({status_text})")
                
                # Si no es ni 'a_sc_hr' ni 'a_sc_gl', no imprime nada (es un 'li' inválido)

            except AttributeError:
                # Si una <li> no tiene la estructura de partido, la saltamos
                continue

    print("\n---------------------------------")
    
else:
    print("No se pudo obtener el contenido HTML desde Selenium.")