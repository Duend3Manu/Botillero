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
            
            # Los Puntos están en el primer 'td' con clases 'col col1 --bd'
            # Usamos lambda para búsqueda exacta con múltiples clases
            puntos_tag = fila.find('td', class_=lambda c: c and '--bd' in c and 'col1' in c)

            if th_tag and puntos_tag:
                # 3. Extraemos la posición
                posicion_tag = th_tag.find('span', class_='a_tb_ps')
                
                # 4. Extraemos el nombre del equipo desde el ENLACE del equipo
                #    (evitar coger el span de cambio de posición que también tiene _hidden-xs)
                link_equipo = th_tag.find('a', class_='a_tb_tm-lk')
                nombre_equipo_tag = None
                nombre_equipo = None

                if link_equipo:
                    s = link_equipo.find('span', class_='_hidden-xs')
                    if s:
                        nombre_equipo = s.text.strip()
                    else:
                        abbr = link_equipo.find('abbr')
                        if abbr:
                            nombre_equipo = abbr.get('title') or abbr.text.strip()
                else:
                    # Equipo sin perfil en AS.com (ej. recién ascendido)
                    # Buscar abbr con title directamente en el th
                    abbr = th_tag.find('abbr')
                    if abbr:
                        nombre_equipo = abbr.get('title') or abbr.text.strip()

                if nombre_equipo and posicion_tag:
                    posicion = posicion_tag.text.strip()
                    puntos = puntos_tag.text.strip()
                    tabla_de_datos.append([posicion, nombre_equipo, puntos])


    except Exception as e:
        print(f"Error al procesar HTML: {e}")
        sys.exit(1)

    SEPARADOR = "➖➖➖➖➖➖➖➖➖➖➖➖"

    def zona_emoji(pos_num):
        if pos_num <= 3:   return "🔵"   # Libertadores
        if pos_num <= 6:   return "🟡"   # Sudamericana
        if pos_num >= 15:  return "🔴"   # Descenso
        return "⚪"

    def abreviar(nombre, max_len=14):
        return nombre[:max_len - 2] + ".." if len(nombre) > max_len else nombre

    def fila_monospace(pos, nombre, pts):
        """Formato: `pos. nombre    pts` alineado."""
        nom = abreviar(nombre)
        return f"`{str(pos) + '.':<4} {nom:<14} {str(pts):>3}pts`"

    if not tabla_de_datos:
        print("No se encontraron datos de equipos.")
    else:
        print("🏆 *Tabla de Posiciones - Liga Chilena* 🏆\n")
        print("`#    Equipo         Pts`")

        for i, fila in enumerate(tabla_de_datos):
            pos_num = int(fila[0])
            emoji   = zona_emoji(pos_num)
            linea   = fila_monospace(fila[0], fila[1], fila[2])

            # Encabezados de zona antes de cada sección
            if pos_num == 1:
                print("*🔵 Copa Libertadores*")
            elif pos_num == 4:
                print(f"\n{SEPARADOR}")
                print("*🟡 Copa Sudamericana*")
            elif pos_num == 7:
                print(f"\n{SEPARADOR}")
                print("*⚪ Zona Media*")
            elif pos_num == 15:
                print(f"\n{SEPARADOR}")
                print("*🔴 Descenso*")

            print(f"{emoji} {linea}")

        print(f"\n{SEPARADOR}")
        print("🔵 Libertadores · 🟡 Sudamericana · 🔴 Descenso")

if __name__ == "__main__":
    main()
