# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup

# Establecer la codificación de la salida estándar
sys.stdout.reconfigure(encoding='utf-8')

# Constantes
URL_TRANSBANK = 'https://status.transbankdevelopers.cl/'
EMOJIS = {
    "Operational": "✅",  # tick verde
    "No disponible": "❌",  # x roja
    "Degradado": "⚠️"  # signo de exclamación amarillo
}

def obtener_estado_transbank():
    """Obtiene el estado de los servicios de Transbank desde la web."""
    try:
        response = requests.get(URL_TRANSBANK)
        response.raise_for_status()  # Lanza una excepción para códigos de estado 4xx/5xx

        soup = BeautifulSoup(response.text, 'html.parser')
        servicios = soup.find_all('div', class_='component-inner-container')

        # Extraer nombre y estado de cada servicio en un diccionario
        return {
            servicio.find('span', class_='name').text.strip(): 
            servicio.find('span', class_='component-status').text.strip()
            for servicio in servicios
        }
    except requests.RequestException as e:
        print(f'Error al realizar la solicitud HTTP: {e}')
    except Exception as e:
        print(f'Error inesperado: {e}')
    return None

def mostrar_estado(servicio, estado):
    """Devuelve el estado del servicio con el emoji correspondiente."""
    emoji = EMOJIS.get(estado, "❓")  # Signo de interrogación en caso de estado desconocido
    return f"{emoji} {servicio}: {estado}"

def main():
    """Función principal para obtener y mostrar el estado de los servicios."""
    estado = obtener_estado_transbank()
    if estado:
        print("Estado de Transbank Developers:")
        for servicio, estado in estado.items():
            print(mostrar_estado(servicio, estado))
    else:
        print("No se pudo obtener el estado de Transbank Developers en este momento.")

if __name__ == "__main__":
    main()
