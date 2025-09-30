# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup
from unidecode import unidecode
sys.stdout.reconfigure(encoding='utf-8')

# Diccionario de emojis para cada signo chino
emojis_signos_chinos = {
    "rata": "🐀", "buey": "🐂", "tigre": "🐅", "conejo": "🐇", "dragon": "🐉",
    "serpiente": "🐍", "caballo": "🐎", "cabra": "🐐", "mono": "🐒",
    "gallo": "🐓", "perro": "🐕", "cerdo": "🐖"
}

def obtener_horoscopo_chino(signo_buscar):
    url = "https://www.elhoroscopochino.com.ar/horoscopo-chino-de-hoy"
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        signos_divs = soup.find_all("div", class_="card-body")
        datos_signos = {}
        
        for signo in signos_divs:
            nombre_signo_raw = signo.find("h3", class_="card-title").text.strip().split(" ")[0]
            
            # --- INICIO DEL CAMBIO ---
            p_tag = signo.find("p", class_="card-text")
            
            # Reemplazamos las etiquetas <br> por saltos de línea dobles para crear párrafos
            for br in p_tag.find_all("br"):
                br.replace_with("\n\n")
            
            # Obtenemos el texto ya formateado
            descripcion = p_tag.get_text(strip=True)
            # --- FIN DEL CAMBIO ---

            nombre_normalizado = unidecode(nombre_signo_raw.lower())
            datos_signos[nombre_normalizado] = {
                "nombre_original": nombre_signo_raw,
                "descripcion": descripcion
            }

        signo_normalizado_buscar = unidecode(signo_buscar.lower())
        if signo_normalizado_buscar in datos_signos:
            return datos_signos[signo_normalizado_buscar]
        else:
            return "Signo no encontrado."
            
    except Exception as e:
        return f"Error al obtener o procesar el horóscopo chino: {e}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python horoscopoc.py <signo>")
    else:
        signo = sys.argv[1]
        horoscopo = obtener_horoscopo_chino(signo)

        if isinstance(horoscopo, dict):
            signo_normalizado = unidecode(signo.lower())
            emoji = emojis_signos_chinos.get(signo_normalizado, "🧧")
            
            print(f"*{horoscopo['nombre_original'].capitalize()}* {emoji}\n")
            # La descripción ahora se imprimirá con los párrafos que extrajimos
            print(f"_{horoscopo['descripcion']}_")
        else:
            print(horoscopo)