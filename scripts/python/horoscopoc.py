# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup
from unidecode import unidecode
import io
import os

# Forzar la salida a UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ruta de la carpeta de signos
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SIGNOS_DIR = os.path.join(SCRIPT_DIR, '..', '..', 'signos')

emojis_signos_chinos = {
    "rata": "🐀", "buey": "🐂", "tigre": "🐅", "conejo": "🐇", "dragon": "🐉",
    "serpiente": "🐍", "caballo": "🐎", "cabra": "🐐", "mono": "🐒",
    "gallo": "🐓", "perro": "🐕", "cerdo": "🐖"
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def obtener_ruta_imagen(signo):
    imagen_path = os.path.join(SIGNOS_DIR, f"{signo}.jpeg")
    if os.path.exists(imagen_path):
        return os.path.abspath(imagen_path)
    return "no_image"

def obtener_horoscopo_chino(signo_buscar):
    url = "https://www.elhoroscopochino.com.ar/horoscopo-chino-de-hoy"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        datos_signos = {}
        
        # Buscar todos los divs que contienen "card-body" en su clase
        # No usar class_="card-body" exacto ya que tiene más clases
        card_divs = soup.find_all("div", class_=lambda x: x and "card-body" in x)
        
        for card in card_divs:
            # Buscar el h2 dentro del card
            h2_tag = card.find("h2")
            if not h2_tag:
                continue
            
            texto_h2 = h2_tag.get_text(strip=True).upper()
            
            # Buscar cuál signo es
            for signo, emoji in emojis_signos_chinos.items():
                if signo.upper() in texto_h2 and 'HOY' in texto_h2:
                    # Buscar el párrafo con la descripción
                    p_tag = card.find("p", class_=lambda x: x and "mb-3" in x if x else False)
                    
                    if p_tag:
                        descripcion = p_tag.get_text(strip=True)
                        
                        datos_signos[signo] = {
                            "nombre_original": signo.capitalize(),
                            "descripcion": descripcion,
                            "imagen": obtener_ruta_imagen(signo)
                        }
                    break
        
        # Buscar el signo solicitado
        signo_normalizado = unidecode(signo_buscar.lower())
        if signo_normalizado in datos_signos:
            return datos_signos[signo_normalizado]
        else:
            if datos_signos:
                return f"Signo '{signo_normalizado}' no encontrado. Disponibles: {', '.join(datos_signos.keys())}"
            else:
                return "No se pudieron encontrar horóscopos en la página."
            
    except Exception as e:
        import traceback
        return f"Error: {str(e)}\n{traceback.format_exc()}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python horoscopoc.py <signo>")
    else:
        signo = sys.argv[1]
        horoscopo = obtener_horoscopo_chino(signo)

        if isinstance(horoscopo, dict):
            signo_norm = unidecode(signo.lower())
            emoji = emojis_signos_chinos.get(signo_norm, "🧧")
            
            print(f"*{horoscopo['nombre_original']}* {emoji}\n")
            print(f"_{horoscopo['descripcion']}_")
        else:
            print(horoscopo)