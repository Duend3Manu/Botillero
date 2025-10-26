# partidos_fifa_scraper_v7_chatbot_format.py
import sys
import io
import time
import locale
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from selenium.common.exceptions import TimeoutException

# --- Diccionario de Banderas ---
BANDERAS = {
    "Japón": "🇯🇵", "Egipto": "🇪🇬", "República de Corea": "🇰🇷", "Ucrania": "🇺🇦",
    "Chile": "🇨🇱", "Nueva Zelanda": "🇳🇿", "Paraguay": "🇵🇾", "Panamá": "🇵🇦",
    "Marruecos": "🇲🇦", "España": "🇪🇸", "Italia": "🇮🇹", "Australia": "🇦🇺",
    "Brasil": "🇧🇷", "México": "🇲🇽", "Cuba": "🇨🇺", "Argentina": "🇦🇷",
    "Francia": "🇫🇷", "Sudáfrica": "🇿🇦", "Noruega": "🇳🇴", "Nigeria": "🇳🇬",
    "EE. UU.": "🇺🇸", "Nueva Caledonia": "🇳🇨", "Colombia": "🇨🇴", "Arabia Saudí": "🇸🇦",
    # Equipos genéricos de fases finales
    "2A": "⚽", "2C": "⚽", "1B": "⚽", "3ACD": "⚽", "1D": "⚽", "3BEF": "⚽",
    "1F": "⚽", "2E": "⚽", "2B": "⚽", "2F": "⚽", "1A": "⚽", "3CDE": "⚽",
    "1E": "⚽", "2D": "⚽", "1C": "⚽", "3ABF": "⚽",
    "W39": "⚽", "W40": "⚽", "W37": "⚽", "W38": "⚽", "W41": "⚽", "W42": "⚽",
    "W43": "⚽", "W44": "⚽", "W47": "⚽", "W48": "⚽", "W45": "⚽", "W46": "⚽",
    "RU49": "⚽", "RU50": "⚽", "W49": "⚽", "W50": "⚽"
}

def get_flag(team_name):
    return BANDERAS.get(team_name.strip(), "⚽")

# --- CONFIGURACIÓN DE FECHA EN ESPAÑOL ---
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'es')
    except locale.Error:
        print("Advertencia: No se pudo configurar el locale a español para las fechas.")

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def obtener_partidos_fifa(url):
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--log-level=3')
    options.add_argument("--start-maximized")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    driver = webdriver.Chrome(service=service, options=options)
    
    driver.get(url)
    partidos_formateados = []
    try:
        cookie_button = WebDriverWait(driver, 15).until(EC.element_to_be_clickable((By.ID, "onetrust-accept-btn-handler")))
        cookie_button.click()
        driver.execute_script("window.scrollBy(0, 800);")
        time.sleep(2)
        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.CLASS_NAME, "matches-container_title__ATLsl")))
        
        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        elementos = soup.select(".matches-container_title__ATLsl, .match-row_matchRowContainer__NoCRI")
        
        fecha_actual_str = ""
        for elemento in elementos:
            if "matches-container_title__ATLsl" in elemento.get('class', []):
                fecha_actual_str = elemento.get_text(strip=True).upper()
            
            elif "match-row_matchRowContainer__NoCRI" in elemento.get('class', []):
                equipos = elemento.find_all("span", class_="d-none d-md-block")
                if len(equipos) < 2: continue
                
                equipo_local = equipos[0].get_text(strip=True)
                equipo_visitante = equipos[1].get_text(strip=True)
                flag_local = get_flag(equipo_local)
                flag_visitante = get_flag(equipo_visitante)
                
                estado_elem = elemento.find(class_="match-row_matchRowStatus__AJE7s")
                contenido_partido = ""

                hora_elem = estado_elem.find(class_="match-row_matchTime__9QJXJ")
                if hora_elem:
                    texto_estado = f"_({hora_elem.get_text(strip=True)})_"
                    contenido_partido = f"🏟️ {flag_local} *{equipo_local}* vs *{equipo_visitante}* {flag_visitante} {texto_estado}"
                else:
                    scores = estado_elem.find_all(class_="match-row_score__wfcQP")
                    minuto_elem = estado_elem.find(class_="match-row_statusLabel__AiSA3")
                    if len(scores) == 2:
                        minuto = f"_({minuto_elem.get_text(strip=True)})_" if minuto_elem else "_(FINAL)_"
                        contenido_partido = f"⚽ {flag_local} *{equipo_local}* {scores[0].get_text(strip=True)} - {scores[1].get_text(strip=True)} *{equipo_visitante}* {flag_visitante} {minuto}"
                
                partidos_formateados.append({
                    "tipo": "partido", "contenido": contenido_partido, "fecha_str": fecha_actual_str,
                    "equipos": [equipo_local, equipo_visitante]
                })

    except TimeoutException:
        print("\n❌ Error: El script no pudo encontrar los elementos en la página.")
    except Exception as e:
        print(f"❌ Ocurrió un error inesperado: {e}")
    finally:
        driver.quit()
    
    return partidos_formateados

def main():
    url_mundial_fifa = "https://www.fifa.com/es/tournaments/mens/u20worldcup/chile-2025/scores-fixtures"
    lista_completa = obtener_partidos_fifa(url_mundial_fifa)
    
    if not lista_completa:
        print("\nNo se pudo obtener la información de los partidos desde FIFA.com.")
        return

    hoy_dt = datetime.now()
    fecha_hoy_str = hoy_dt.strftime("%A %d %B %Y").upper()

    partidos_de_hoy = []
    proximo_partido_chile = None
    fecha_partido_chile = ""
    chile_encontrado = False

    for item in lista_completa:
        if item["tipo"] == "partido":
            if item["fecha_str"] == fecha_hoy_str:
                partidos_de_hoy.append(item["contenido"])
            
            try:
                fecha_partido_dt = datetime.strptime(item["fecha_str"], "%A %d %B %Y")
                if "Chile" in item["equipos"] and not chile_encontrado and fecha_partido_dt.date() >= hoy_dt.date():
                    proximo_partido_chile = item["contenido"]
                    fecha_partido_chile = item["fecha_str"]
                    chile_encontrado = True
            except ValueError:
                continue

    # --- NUEVA LÓGICA PARA CONSTRUIR EL MENSAJE DEL CHATBOT ---
    mensaje_final = []
    mensaje_final.append("🏆 *Resultados Mundial Sub-20* 🏆")
    mensaje_final.append("-----------------------------------")

    # SECCIÓN 1: PARTIDOS DE HOY
    mensaje_final.append(f"\n*HOY, {hoy_dt.strftime('%A %d').upper()}*")
    if partidos_de_hoy:
        mensaje_final.extend(partidos_de_hoy)
    else:
        mensaje_final.append("🚫 No hay partidos programados para hoy.")

    # SECCIÓN 2: PRÓXIMO PARTIDO DE CHILE
    mensaje_final.append("\n*PRÓXIMO DE CHILE* 🇨🇱")
    if proximo_partido_chile:
        # Formatear la fecha para que sea más corta y legible
        fecha_dt = datetime.strptime(fecha_partido_chile, "%A %d %B %Y")
        fecha_formateada = fecha_dt.strftime("%A %d de %B")
        mensaje_final.append(f"📅 _{fecha_formateada.capitalize()}_")
        mensaje_final.append(proximo_partido_chile)
    else:
        mensaje_final.append("🚫 No se encontraron próximos partidos para Chile.")
    
    # Imprimir el mensaje completo formateado para WhatsApp
    print("\n".join(mensaje_final))


if __name__ == "__main__":
    main()