# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup
import io
import json # <--- Importamos la librería JSON

# Forma más compatible de asegurar la codificación de la salida a UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Constantes
URL_TRANSBANK = 'https://status.transbankdevelopers.cl/'
EMOJIS = {
}

def obtener_estado_transbank():
    """Obtiene y procesa el estado de los servicios de Transbank."""
    try:
        response = requests.get(URL_TRANSBANK, timeout=10) # Añadimos un timeout
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Un selector más específico para evitar elementos no deseados
        servicios_container = soup.find('div', class_='components-container')

        # Si el contenedor principal no existe, la página cambió o está rota
        if not servicios_container:
            return {"error": "No se pudo encontrar el contenedor de servicios en la página."}

        servicios = servicios_container.find_all('div', class_='component-inner-container')

        if not servicios:
            return {"error": "No se encontraron servicios individuales en la página."}

        estado_servicios = {}
        for servicio in servicios:
            nombre = servicio.find('span', class_='name').text.strip()
            estado = servicio.find('span', class_='component-status').text.strip()
            estado_servicios[nombre] = estado
        
        return estado_servicios

    except Exception as e:
        return {"error": f"Ocurrió un error inesperado al procesar la página: {e}"}

def main():
    """Función principal para obtener y entregar los datos en formato JSON."""
    estados = obtener_estado_transbank()
    # Imprimimos el resultado como un string JSON
    print(json.dumps(estados, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()