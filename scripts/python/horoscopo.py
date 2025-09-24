# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import sys
from unidecode import unidecode

# Forzamos la salida estándar a usar la codificación UTF-8 para evitar errores en Windows
sys.stdout.reconfigure(encoding='utf-8')

# Diccionario de emojis para cada signo zodiacal
emojis_signos = {
    "aries": "♈️", "tauro": "♉️", "geminis": "♊️", "cancer": "♋️",
    "leo": "♌️", "virgo": "♍️", "libra": "♎️", "escorpio": "♏️",
    "sagitario": "♐️", "capricornio": "♑️", "acuario": "♒️", "piscis": "♓️"
}

def obtener_horoscopo(signo_buscar):
    url = "https://www.pudahuel.cl/horoscopo/"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        return f"Error al realizar la solicitud: {e}"
    
    try:
        soup = BeautifulSoup(response.content, "html.parser")
        datos_signos = {}
        
        # APUNTAMOS AL CONTENEDOR CORRECTO: <div class="signo">
        signos_divs = soup.find_all("div", class_="signo")
        
        for signo_div in signos_divs:
            nombre_tag = signo_div.find("h2")
            if not nombre_tag:
                continue
            
            nombre_signo_raw = nombre_tag.text.strip()
            nombre_signo_normalizado = unidecode(nombre_signo_raw.lower())

            # Buscamos TODOS los párrafos <p> dentro del div del signo
            parrafos = signo_div.find_all("p")
            
            # Si la estructura no es la esperada (mínimo 3 párrafos), lo saltamos
            if len(parrafos) < 3:
                continue

            # La descripción se une desde los dos primeros párrafos
            descripcion = parrafos[0].text.strip() + " " + parrafos[1].text.strip()

            # Los datos están específicamente en el TERCER párrafo
            texto_datos = parrafos[2].get_text(separator="\n").strip()
            
            palabra, numero, color = "No disponible", "No disponible", "No disponible"

            # Se procesa el texto del tercer párrafo para extraer los datos
            for linea in texto_datos.split('\n'):
                # Usamos .partition() que es más seguro que .split()
                if "PALABRA" in linea.upper():
                    palabra = linea.partition(":")[2].strip()
                elif "NÚMERO" in linea.upper():
                    numero = linea.partition(":")[2].strip()
                elif "COLOR" in linea.upper():
                    color = linea.partition(":")[2].strip()

            datos_signos[nombre_signo_normalizado] = {
                "descripcion": descripcion,
                "palabra": palabra,
                "numero": numero,
                "color": color
            }
    except Exception as e:
        return f"Error al procesar la página: {e}"

    signo_normalizado = unidecode(signo_buscar.lower())
    if signo_normalizado in datos_signos:
        return datos_signos[signo_normalizado]
    else:
        return f"Signo '{signo_buscar}' no encontrado."

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python horoscopo.py <signo>")
    else:
        signo = sys.argv[1]
        horoscopo = obtener_horoscopo(signo)
        
        if isinstance(horoscopo, dict):
            # Formato para WhatsApp: *texto* es negrita, _texto_ es cursiva
            nombre_signo = signo.capitalize()
            emoji_signo = emojis_signos.get(unidecode(signo.lower()), "")
            
            # Construimos cada parte del mensaje
            titulo = f"🔮 *Horóscopo para {nombre_signo}* {emoji_signo}"
            separador = "---------------------------------"
            descripcion = f"✨ {horoscopo['descripcion']}"
            palabra = f"🔑 *_{'Palabra'}:_* {horoscopo['palabra']}"
            numero = f"🔢 *_{'Número'}:_* {horoscopo['numero']}"
            color = f"🎨 *_{'Color'}:_* {horoscopo['color']}"
            
            # Unimos todo en un solo mensaje con saltos de línea
            mensaje_final = "\n".join([
                titulo,
                separador,
                descripcion,
                "", # Esto añade una línea en blanco para dar espacio
                palabra,
                numero,
                color
            ])
            
            print(mensaje_final)
        else:
            print(horoscopo)