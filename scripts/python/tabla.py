import sys
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
import io

# Configuración para la salida en UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = 'https://chile.as.com/resultados/futbol/chile/clasificacion/?omnil=mpal'

# Cabecera de un navegador real para evitar ser detectado como un bot
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

def main():
    content = ""
    try:
        with sync_playwright() as p:
            # MEJORA: Argumentos para estabilidad en servidor (VPS/Linux)
            browser = p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )
            
            context = browser.new_context(
                user_agent=USER_AGENT,
                viewport={'width': 1920, 'height': 1080}
            )
            page = context.new_page()
            
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            # Esperamos la tabla (timeout reducido para no colgar el bot tanto tiempo)
            page.wait_for_selector('table.a_tb', timeout=20000)
            
            content = page.content()
            browser.close()

    except PlaywrightTimeoutError:
        print("Error: Timeout al cargar la tabla de posiciones.")
        sys.exit(1)
    except Exception as e:
        print(f"Error inesperado: {e}")
        sys.exit(1)

    # --- LÓGICA DE PARSEO ACTUALIZADA ---
    soup = BeautifulSoup(content, 'html.parser')
    tabla_de_datos = []

    try:
        # 1. Buscamos la nueva tabla con clase 'a_tb'
        tabla_container = soup.find('table', class_='a_tb')
        
        # 2. Iteramos por cada fila <tr> en el <tbody>
        for fila in tabla_container.find('tbody').find_all('tr'):
            
            # La Posición y el Equipo están en el 'th' (header de la fila)
            th_tag = fila.find('th', scope='row')
            
            # Los Puntos están en el primer 'td' (celda de datos)
            # Buscamos la celda que es 'col col1' y tiene la clase '--bd' (bold)
            puntos_tag = fila.find('td', class_='--bd')

            if th_tag and puntos_tag:
                # 3. Extraemos la posición
                posicion_tag = th_tag.find('span', class_='a_tb_ps')
                
                # 4. Extraemos el nombre del equipo
                # (usamos '_hidden-xs' que es el nombre largo)
                nombre_equipo_tag = th_tag.find('span', class_='_hidden-xs')
                
                # Fallback por si no encuentra el nombre largo, usa la abreviatura
                if not nombre_equipo_tag:
                    nombre_equipo_tag = th_tag.find('abbr')

                if nombre_equipo_tag and posicion_tag:
                    posicion = posicion_tag.text.strip()
                    equipo = nombre_equipo_tag.text.strip()
                    puntos = puntos_tag.text.strip()
                    tabla_de_datos.append([posicion, equipo, puntos])

    except Exception as e:
        print(f"Error al procesar HTML: {e}")
        sys.exit(1)

    def format_row(pos, equipo, puntos, es_encabezado=False):
        equipo_corto = (equipo[:18] + '..') if len(equipo) > 20 else equipo
        
        if es_encabezado:
            return f"   {str(pos):<3} {equipo_corto:<20} {puntos:>5}"
        
        try:
            pos_num = int(pos)
            # Indicadores de clasificación
            if pos_num <= 3:
                indicador = "🏆"  # Libertadores (1-3 + Copa Chile)
            elif pos_num <= 7:
                indicador = "🌎"  # Sudamericana (4-7)
            elif pos_num >= 15:
                indicador = "⬇️ "  # Descenso (15-16)
            else:
                indicador = "  "
        except ValueError:
            indicador = "  "
        
        return f"{indicador} {str(pos):<3} {equipo_corto:<20} {puntos:>5}"

    if not tabla_de_datos:
        print("No se encontraron datos de equipos.")
    else:
        print('🏆 *Tabla de Posiciones - Liga Chilena* 🏆\n')
        # Usamos backticks para fuente monoespaciada en WhatsApp (mejor alineación)
        print(f"`{format_row('Pos', 'Equipo', 'Pts', es_encabezado=True)}`")
        
        for i, fila in enumerate(tabla_de_datos):
            line = format_row(fila[0], fila[1], fila[2])
            print(f"`{line}`")
            
            # Separadores visuales
            if i == 2:  # Después del 3er lugar (Libertadores directa)
                print('-----------------------------------')
            elif i == 6:  # Después del 7mo lugar (Sudamericana)
                print('-----------------------------------')
            elif i == 13:  # Antes de la zona de descenso (pos 14)
                print('-----------------------------------')
        
        print('\n📋 *Leyenda:*')
        print('🏆 Libertadores | 🌎 Sudamericana | ⬇️ Descenso')

if __name__ == "__main__":
    main()