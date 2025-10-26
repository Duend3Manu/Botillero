import sys
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
import csv
import io

# Configuración para la salida en UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = 'https://chile.as.com/resultados/futbol/chile/clasificacion/?omnil=mpal'

# Cabecera de un navegador real para evitar ser detectado como un bot
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

def main():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            
            # --- CONFIGURACIÓN ROBUSTA DEL NAVEGADOR ---
            # Creamos un contexto que simula ser un navegador de escritorio normal
            context = browser.new_context(
                user_agent=USER_AGENT,
                viewport={'width': 1920, 'height': 1080}
            )
            page = context.new_page()
            
            print("Navegando a la URL en entorno de servidor...")
            
            # --- CAMBIOS CLAVE PARA EVITAR TIMEOUT ---
            # 1. Aumentamos el timeout general a 60 segundos.
            # 2. Cambiamos 'networkidle' por 'domcontentloaded', que es más rápido y fiable.
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            
            print("Página cargada. Esperando por el selector 'table.tabla-datos'...")
            # Le damos un timeout generoso para que el contenido cargue
            page.wait_for_selector('table.tabla-datos', timeout=45000)
            
            print("¡Tabla encontrada! Obteniendo contenido...")
            content = page.content()
            browser.close()

    except PlaywrightTimeoutError as e:
        print("\n-------------------------------------------------------------")
        print("ERROR DE TIMEOUT: No se pudo cargar la página o encontrar la tabla a tiempo.")
        print("Esto es común en entornos de servidor. La IP puede estar bloqueada o la red es lenta.")
        print(f"Detalles del error: {e}")
        print("-------------------------------------------------------------")
        sys.exit()
    except Exception as e:
        print(f"\nOcurrió un error inesperado con Playwright: {e}")
        sys.exit()

    # --- El resto del código es tu lógica original, que ya sabemos que funciona ---
    soup = BeautifulSoup(content, 'html.parser')
    tabla_de_datos = []

    try:
        tabla_container = soup.find('table', class_='tabla-datos')
        
        for i, fila in enumerate(tabla_container.find('tbody').find_all('tr')):
            nombre_equipo_tag = fila.find('span', class_='nombre-equipo')
            puntos_tag = fila.find('td', class_='destacado')
            posicion_tag = fila.find('span', class_='pos')
            
            if nombre_equipo_tag and puntos_tag and posicion_tag:
                posicion = posicion_tag.text.strip()
                equipo = nombre_equipo_tag.text.strip()
                puntos = puntos_tag.text.strip()
                tabla_de_datos.append([posicion, equipo, puntos])

    except AttributeError:
        print("Error: Se cargó la página, pero no se pudo encontrar la estructura de la tabla esperada.")
        sys.exit()

    # --- Guardado e impresión ---
    filename = "tabla_as_com.csv"
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Posicion', 'Equipo', 'Puntos'])
            writer.writerows(tabla_de_datos)
    except IOError as e:
        print(f"Error al escribir en el archivo {filename}: {e}")

    def format_row(pos, equipo, puntos):
        equipo_corto = (equipo[:18] + '..') if len(equipo) > 20 else equipo
        return f"{str(pos):<3} {equipo_corto:<20} {puntos:>5}"

    if not tabla_de_datos:
        print("No se encontraron datos de equipos.")
    else:
        print('-------------------------------')
        print(format_row('Pos', 'Equipo', 'Pts'))
        print('-------------------------------')
        for fila in tabla_de_datos:
            print(format_row(fila[0], fila[1], fila[2]))
        print('-------------------------------')

if __name__ == "__main__":
    main()