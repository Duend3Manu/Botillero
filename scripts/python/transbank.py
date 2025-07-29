# -*- coding: utf-8 -*-
import sys
import requests
from bs4 import BeautifulSoup
import io

# Forma más compatible de asegurar la codificación de la salida a UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Constantes
URL_TRANSBANK = 'https://status.transbankdevelopers.cl/'
EMOJIS = {
    "Operational": "✅",
    "Degraded Performance": "⚠️",
    "Partial Outage": "❌",
    "Major Outage": "🚨",
    # Añadimos más estados posibles para ser más robustos
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
            print("No se pudo encontrar el contenedor de servicios en la página. La estructura puede haber cambiado.")
            return None

        servicios = servicios_container.find_all('div', class_='component-inner-container')
        
        if not servicios:
            print("No se encontraron servicios individuales en la página.")
            return None

        estado_servicios = {}
        for servicio in servicios:
            nombre = servicio.find('span', class_='name').text.strip()
            estado = servicio.find('span', class_='component-status').text.strip()
            estado_servicios[nombre] = estado
        
        return estado_servicios

    except requests.exceptions.Timeout:
        print(f'Error: La solicitud a {URL_TRANSBANK} tardó demasiado tiempo en responder.')
        return None
    except requests.RequestException as e:
        print(f'Error de red al acceder a la página de Transbank: {e}')
        return None
    except Exception as e:
        print(f'Ocurrió un error inesperado al procesar la página: {e}')
        return None

def main():
    """Función principal para obtener y mostrar el estado de los servicios."""
    print("Obteniendo estado de Transbank Developers...")
    print("---------------------------------------")
    
    estados = obtener_estado_transbank()
    
    if estados:
        for servicio, estado in estados.items():
            # Usamos .get() para obtener el emoji, con "❓" como valor por defecto
            emoji = EMOJIS.get(estado, "❓")
            print(f"{emoji} {servicio}: {estado}")
    else:
        print("❌ No se pudo obtener el estado de Transbank en este momento.")

if __name__ == "__main__":
    main()