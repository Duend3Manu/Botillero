# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

# Diccionario de emojis para el horóscopo chino
emojis_horoscopo_chino = {
    "rata": "🐀",
    "buey": "🐂",
    "tigre": "🐅",
    "conejo": "🐇",
    "dragón": "🐉",
    "serpiente": "🐍",
    "caballo": "🐎",
    "cabra": "🐐",
    "mono": "🐒",
    "gallo": "🐓",
    "perro": "🐕",
    "cerdo": "🐖",
}


def obtener_horoscopo_chino(signo_buscar):
    url = "https://www.elhoroscopochino.com.ar/horoscopo-chino-de-hoy"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        signos = soup.find_all("div", class_="card-body")
        datos_signos = {}

        for signo in signos:
            # Usamos .find() para evitar errores si alguna etiqueta no existe
            titulo_tag = signo.find("h3", class_="card-title")
            descripcion_tag = signo.find("p", class_="card-text")

            if titulo_tag and descripcion_tag:
                # Normalizamos el nombre del signo para que coincida con el diccionario
                nombre_crudo = titulo_tag.text.strip().split(" ")[0]
                nombre_signo = nombre_crudo.lower().replace('ó', 'o') # Para "Dragón"
                
                fecha = titulo_tag.small.text.strip() if titulo_tag.small else "No disponible"
                descripcion = descripcion_tag.text.strip()
                
                datos_signos[nombre_signo] = {
                    "fecha": fecha,
                    "descripcion": descripcion
                }

        signo_normalizado = signo_buscar.lower()
        if signo_normalizado in datos_signos:
            return datos_signos[signo_normalizado]
        else:
            return "Signo no encontrado."
            
    except requests.RequestException as e:
        return f"Error de conexión: {e}"
    except Exception as e:
        return f"Error al procesar la página: {e}"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python horoscopoc.py <signo>")
    else:
        signo = sys.argv[1]
        horoscopo = obtener_horoscopo_chino(signo)
        
        if isinstance(horoscopo, dict):
            nombre_signo = signo.capitalize()
            # Buscamos el emoji, normalizando el nombre del signo
            signo_key = nombre_signo.lower().replace('ó', 'o')
            emoji = emojis_horoscopo_chino.get(signo_key, "🏮")

            # --- NUEVO BLOQUE DE FORMATO ---
            titulo = f"☯️ *Horóscopo Chino: {nombre_signo}* {emoji}"
            separador = "---------------------------------"
            fecha = f"📅 *Fecha:* {horoscopo['fecha']}"
            prediccion = f"📜 *Predicción:*\n{horoscopo['descripcion']}"
            
            mensaje_final = "\n".join([
                titulo,
                separador,
                fecha,
                "", # Línea en blanco para espaciar
                prediccion
            ])
            print(mensaje_final)
        else:
            print(horoscopo)