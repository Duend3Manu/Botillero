# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import sys
from unidecode import unidecode
import io
import os

# Forzar la salida a UTF-8 para evitar UnicodeEncodeError en Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ruta de la carpeta de signos
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SIGNOS_DIR = os.path.join(SCRIPT_DIR, '..', '..', 'signos')

# Se mantiene tu diccionario de emojis
emojis_signos = {
    "aries": "♈️", "tauro": "♉️", "geminis": "♊️", "cancer": "♋️", "leo": "♌️", 
    "virgo": "♍️", "libra": "♎️", "escorpio": "♏️", "sagitario": "♐️", 
    "capricornio": "♑️", "acuario": "♒️", "piscis": "♓️"
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def obtener_ruta_imagen(signo):
    """
    Obtiene la ruta de la imagen del signo desde la carpeta local.
    Retorna la ruta absoluta si existe, sino retorna "no_image".
    """
    imagen_path = os.path.join(SIGNOS_DIR, f"{signo}.jpg")
    if os.path.exists(imagen_path):
        return os.path.abspath(imagen_path)
    return "no_image"

def obtener_horoscopo(signo_buscar):
    url = "https://www.pudahuel.cl/horoscopo/"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        return f"Error al conectar con la página de horóscopo: {e}"
    
    try:
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Buscar todos los h2 que contienen los nombres de los signos
        signos_h2 = soup.find_all("h2")
        datos_signos = {}
        
        for h2 in signos_h2:
            nombre_signo = h2.text.strip()
            
            # Saltar si no es un signo válido
            nombre_normalizado = unidecode(nombre_signo.lower())
            if nombre_normalizado not in emojis_signos:
                continue
            
            descripcion = ""
            palabra_clave = "No disponible"
            numero = "No disponible"
            color = "No disponible"
            imagen_url = obtener_ruta_imagen(nombre_normalizado)
            
            # Recopilar párrafos hasta encontrar los datos o cambiar de sección
            elementos = []
            actual = h2.find_next()
            
            while actual:
                if actual.name == "h2":
                    # Hemos llegado a otro signo, detener
                    break
                elif actual.name == "p":
                    elementos.append(actual.text.strip())
                
                actual = actual.find_next_sibling()
            
            # Procesar los elementos recopilados
            texto_completo = " ".join(elementos)
            
            # El primer elemento es la descripción (antes de PALABRA:)
            if "PALABRA:" in texto_completo:
                descripcion = texto_completo.split("PALABRA:")[0].strip()
                resto = texto_completo.split("PALABRA:")[1]
                
                # Extraer palabra clave
                if "NÚMERO:" in resto:
                    palabra_clave = resto.split("NÚMERO:")[0].strip()
                    resto = resto.split("NÚMERO:")[1]
                else:
                    palabra_clave = resto.split("COLOR:")[0].strip()
                    resto = resto.split("COLOR:")[1]
                
                # Extraer número
                if "COLOR:" in resto:
                    numero = resto.split("COLOR:")[0].strip()
                    color_texto = resto.split("COLOR:")[1].strip()
                    # Limpiar la parte de "Signo de..." del color
                    if "Signo de" in color_texto:
                        color = color_texto.split("Signo de")[0].strip()
                    else:
                        color = color_texto
                else:
                    numero = resto.strip()
            else:
                descripcion = texto_completo
            
            # Limpiar descripciones que contengan información extra
            if "Signo de" in descripcion:
                descripcion = descripcion.split("Signo de")[0].strip()
            
            datos_signos[nombre_normalizado] = {
                "descripcion": descripcion,
                "palabra": palabra_clave,
                "numero": numero,
                "color": color,
                "imagen": imagen_url
            }

    except Exception as e:
        return f"Error al procesar los datos de la página: {e}"

    signo_normalizado = unidecode(signo_buscar.lower())
    if signo_normalizado in datos_signos:
        return datos_signos[signo_normalizado]
    else:
        return "Signo no encontrado."

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python horoscopo.py <signo>")
    else:
        signo = sys.argv[1]
        horoscopo = obtener_horoscopo(signo)
        
        if isinstance(horoscopo, dict):
            emoji_signo = emojis_signos.get(unidecode(signo.lower()), "")
            
            # --- NUEVO FORMATO DE SALIDA PARA WHATSAPP ---
            print(f"*{signo.capitalize()}* {emoji_signo}\n")
            print(f"{horoscopo['descripcion']}\n")
            print(f"📖 *Palabra Clave:* {horoscopo['palabra']}")
            print(f"🔢 *Número de Suerte:* {horoscopo['numero']}")
            print(f"🎨 *Color:* {horoscopo['color']}")
        else:
            print(horoscopo)