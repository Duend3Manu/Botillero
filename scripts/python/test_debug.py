# -*- coding: utf-8 -*-
# Script de debug simple
import sys
import requests
from bs4 import BeautifulSoup
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

url = "https://www.elhoroscopochino.com.ar/horoscopo-chino-de-hoy"
response = requests.get(url, headers=HEADERS, timeout=10)
soup = BeautifulSoup(response.content, "html.parser")

# Buscar h2
h2_tags = soup.find_all("h2")
print(f"Total H2s encontrados: {len(h2_tags)}\n")

# Buscar específicamente el de RATA
for i, h2 in enumerate(h2_tags):
    texto = h2.get_text(strip=True)
    print(f"H2 #{i}: '{texto}'")
    
    if 'RATA' in texto:
        print(f"\n¡ENCONTRADO RATA!")
        print(f"  Texto H2: {texto}")
        print(f"  Buscando párrafos siguientes...")
        
        # Ver qué hay después
        elem = h2.next_sibling
        count = 0
        while elem and count < 5:
            if hasattr(elem, 'name'):
                print(f"    Elemento {count}: <{elem.name}> - '{elem.get_text(strip=True)[:80]}'")
                count += 1
            elem = elem.next_sibling
        break
