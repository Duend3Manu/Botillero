# -*- coding: utf-8 -*-
# Script temporal para diagnosticar la estructura HTML
import requests
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

url = "https://www.elhoroscopochino.com.ar/horoscopo-chino-de-hoy"

try:
    response = requests.get(url, headers=HEADERS, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, "html.parser")
    
    # Buscar diferentes tipos de contenedores
    print("=== Buscando elementos 'card' ===")
    cards = soup.find_all(class_=lambda x: x and 'card' in x.lower())
    print(f"Elementos con 'card' en class: {len(cards)}")
    if cards:
        for i, card in enumerate(cards[:3]):  # Mostrar primeros 3
            print(f"\nCard {i}:")
            print(f"  Tag: {card.name}")
            print(f"  Class: {card.get('class')}")
            print(f"  Texto (primeros 100 chars): {card.get_text(strip=True)[:100]}")
    
    print("\n=== Buscando h3 ===")
    h3s = soup.find_all("h3")
    print(f"Total de h3: {len(h3s)}")
    if h3s:
        for i, h3 in enumerate(h3s[:5]):
            print(f"  h3 {i}: class='{h3.get('class')}' texto='{h3.get_text(strip=True)}'")
    
    print("\n=== Buscando divs con diferentes clases ===")
    for class_name in ['card-body', 'card', 'horoscope', 'signo']:
        divs = soup.find_all("div", class_=class_name)
        print(f"  Divs con class='{class_name}': {len(divs)}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
