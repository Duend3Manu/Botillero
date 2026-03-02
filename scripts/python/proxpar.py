# -*- coding: utf-8 -*-
"""
proxpar.py
Muestra los partidos de la jornada actual (y la siguiente si existe)
de la Liga Chilena, scrapeando chile.as.com con Selenium.
"""
import sys
import io
import re
import time
import requests
from datetime import datetime
from zoneinfo import ZoneInfo
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# Salida UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL    = "https://chile.as.com"
ESPN_URL    = "https://site.api.espn.com/apis/site/v2/sports/soccer/chi.1/scoreboard"
# Plantilla para la URL de jornada de AS.com
# El número en la URL (N) es el número de jornada que el usuario ve en la URL (1, 2, 3...)
JORNADA_TPL = BASE_URL + "/resultados/futbol/chile/2026/jornada/regular_a_{n}/"

ZONA_CL     = ZoneInfo("America/Santiago")

# ──────────────────────────────────────────
# Detectar jornada actual via ESPN
# ──────────────────────────────────────────
def detectar_jornada_espn():
    """
    Usa la API de ESPN para determinar cuántas jornadas se han disputado
    mirando el campo 'week.number' o buscando en eventos el número de semana.
    Devuelve un entero con el número de jornada estimado, o None.
    """
    try:
        r = requests.get(ESPN_URL, timeout=8)
        data = r.json()

        # Intentar leer week.number directamente
        week = data.get("week", {})
        if week.get("number"):
            return int(week["number"])

        # Buscar en los eventos el displaySeasonWeek o similar
        for ev in data.get("events", []):
            week_num = ev.get("week", {}).get("number")
            if week_num:
                return int(week_num)

    except Exception:
        pass
    return None


def detectar_jornada_por_fecha():
    """
    Calcula la jornada aproximada usando la fecha actual.
    Basado en que la Jornada 1 de la Liga Chilena 2026 fue el 6 de febrero.
    Las jornadas se juegan cada ~7 días.
    Devuelve el número de jornada estimado desde 1.
    """
    inicio_temporada = datetime(2026, 2, 6, tzinfo=ZONA_CL)
    ahora = datetime.now(ZONA_CL)
    dias_transcurridos = (ahora - inicio_temporada).days
    # ~7 días por jornada, mínimo 1
    jornada = max(1, dias_transcurridos // 7 + 1)
    return jornada


# ──────────────────────────────────────────
# Configuración de Selenium
# ──────────────────────────────────────────
def crear_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument("--headless")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--log-level=3")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    opts.add_experimental_option('excludeSwitches', ['enable-logging'])
    return webdriver.Chrome(service=Service(), options=opts)


def get_html(driver, url, timeout=14):
    """Carga una URL y espera que aparezca un bloque de día 'a_sd'."""
    try:
        driver.get(url)
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CLASS_NAME, "a_sd"))
        )
        return driver.page_source
    except TimeoutException:
        # Devolver lo que haya aunque no haya partidos
        return driver.page_source
    except Exception:
        return ""


def numero_de_h1(html):
    """
    Extrae el número de jornada desde el H1 de la página.
    Ej: 'Resultados jornada 3 Liga Chilena 2026' → 3
    """
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    if h1:
        m = re.search(r"jornada\s+(\d+)", h1.text, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return None


# ──────────────────────────────────────────
# Parseo de una página de jornada
# ──────────────────────────────────────────
def parsear_jornada(html):
    """
    Parsea el HTML de una página de jornada de AS.com.
    Devuelve lista de strings formateados, o [] si no hay partidos.
    """
    if not html:
        return []

    soup   = BeautifulSoup(html, "html.parser")
    lineas = []

    # Título
    titulo_tag = soup.find("h1")
    if titulo_tag:
        titulo = " ".join(titulo_tag.get_text().split())
        # AS.com a veces omite espacio entre número y nombre: "jornada 3Liga" → "jornada 3 Liga"
        titulo = re.sub(r"(\d)([A-ZÁÉÍÓÚÜÑa-z])", r"\1 \2", titulo)
        lineas.append(f"🏆 *{titulo}*")


    # Bloques por día
    day_blocks = soup.find_all("div", class_="a_sd")
    if not day_blocks:
        return []

    for bloque in day_blocks:
        dia_tag = bloque.find("h2", class_="a_sd_t")
        if dia_tag:
            lineas.append(f"\n📅 *{dia_tag.text.strip()}*")

        partidos = bloque.find_all("li", class_="a_sc_l_it")
        for partido in partidos:
            try:
                # Dividir en local y visitante
                local = visitante = None
                for div in partido.find_all("div", class_=re.compile(r"a_sc_tm")):
                    span = div.find("span", class_="a_sc_tn")
                    if not span:
                        continue
                    clases = " ".join(div.get("class", []))
                    if "a_sc_tm-r" in clases:
                        visitante = span.text.strip()
                    else:
                        local = span.text.strip()

                if not local or not visitante:
                    continue

                div_hora   = partido.find("div", class_="a_sc_hr")
                div_gol    = partido.find("div", class_="a_sc_gl")
                div_estado = partido.find("div", class_="a_sc_st")
                estado = div_estado.text.strip() if div_estado else ""

                if div_hora:
                    hora = " ".join(div_hora.text.split())
                    lineas.append(f"  🏟️ *{local}* vs *{visitante}* — {hora}")
                elif div_gol:
                    marcador = " ".join(div_gol.text.split())
                    if estado.lower() == "finalizado":
                        lineas.append(f"  ✅ *{local}* {marcador} *{visitante}* _(FT)_")
                    else:
                        st = f" _({estado})_" if estado else ""
                        lineas.append(f"  ▶️ *{local}* {marcador} *{visitante}*{st}")

            except AttributeError:
                continue

    return lineas


# ──────────────────────────────────────────
# Main
# ──────────────────────────────────────────
def main():
    driver = crear_driver()
    try:
        # 1. Estimar jornada actual
        jornada_esp = detectar_jornada_espn()
        jornada_est = detectar_jornada_por_fecha()
        # Usar el mayor entre ambas estimaciones
        num_inicio = max(jornada_esp or 1, jornada_est)

        # 2. Verificar y ajustar: buscar la jornada real más cercana
        #    Cargamos la estimada; si el H1 dice otro número, lo usamos.
        html_actual = get_html(driver, JORNADA_TPL.format(n=num_inicio))
        num_h1 = numero_de_h1(html_actual)

        # Si el H1 confirmó un número diferente al estimado, usar el del H1
        if num_h1 and num_h1 != num_inicio:
            num_jornada = num_h1
            # Recargar con el numero correcto si no coincide
            if num_h1 != num_inicio:
                html_actual = get_html(driver, JORNADA_TPL.format(n=num_jornada))
        else:
            num_jornada = num_inicio

        # 3. Mostrar jornada actual
        lineas = parsear_jornada(html_actual)
        if lineas:
            for l in lineas:
                print(l)
        else:
            print(f"🚫 No se encontraron datos para la Jornada {num_jornada}.")

        # 4. Mostrar jornada siguiente (si existe)
        url_sig    = JORNADA_TPL.format(n=num_jornada + 1)
        html_sig   = get_html(driver, url_sig, timeout=10)
        lineas_sig = parsear_jornada(html_sig)

        if lineas_sig:
            print("\n" + "─" * 40)
            for l in lineas_sig:
                print(l)
        else:
            print(f"\n🚫 Aún no hay datos para la Jornada {num_jornada + 1}.")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()