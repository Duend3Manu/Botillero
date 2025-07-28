# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import sys

# --- Configuración de Codificación ---
try:
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)
except AttributeError:
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)
except Exception as e:
    print(f"Advertencia: No se pudo configurar la codificación UTF-8: {e}", file=sys.stderr)

# --- Constantes ---
URLS = {
    "Chile": "https://es.investing.com/indices/chile-indices",  # Chile primero
    "Global": "https://es.investing.com/indices/indices-cfds"
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}
PAISES_INDICES = {
    "US 30": "Estados Unidos", "US 500": "Estados Unidos", "US Tech 100": "Estados Unidos",
    "SmallCap 2000": "Estados Unidos", "DAX": "Alemania", "FTSE 100": "Reino Unido",
    "CAC 40": "Francia", "Euro Stoxx 50": "Unión Europea", "AEX": "Países Bajos",
    "IBEX 35": "España", "FTSE MIB": "Italia", "SMI": "Suiza", "Nikkei 225": "Japón",
    "Hang Seng": "Hong Kong", "S&P/ASX 200": "Australia", 
    "IPSA": "Chile", "S&P CLX IPSA": "Chile", "S&P CLX IGPA": "Chile"  # Agregados
}
BANDERAS_PAISES = {
    "Estados Unidos": "🇺🇸", "Alemania": "🇩🇪", "Reino Unido": "🇬🇧", "Francia": "🇫🇷",
    "Unión Europea": "🇪🇺", "Países Bajos": "🇳🇱", "España": "🇪🇸", "Italia": "🇮🇹",
    "Suiza": "🇨🇭", "Japón": "🇯🇵", "Hong Kong": "🇭🇰", "Australia": "🇦🇺", "Chile": "🇨🇱"
}

# --- Funciones ---
def obtener_datos(url):
    """Extrae datos de índices bursátiles desde una URL específica."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error al obtener la página {url}: {e}", file=sys.stderr)
        return []

    try:
        soup = BeautifulSoup(response.text, "html.parser")
        tabla = soup.find("table", {"data-test": "indices-cfds"}) or \
                soup.find("table", class_="common-table") or \
                soup.find("table")

        if not tabla:
            print(f"Error: No se encontró la tabla de índices en {url}.", file=sys.stderr)
            return []

        indices = []
        filas_a_procesar = tabla.find("tbody").find_all("tr") if tabla.find("tbody") else tabla.find_all("tr")

        for fila in filas_a_procesar:
            columnas = fila.find_all("td")
            if len(columnas) >= 7:
                try:
                    nombre_tag = columnas[1].find('a')
                    nombre = nombre_tag.text.strip() if nombre_tag else columnas[1].text.strip()

                    ultimo, maximo, minimo, variacion, porcentaje_variacion = (
                        columnas[2].text.strip(), columnas[3].text.strip(),
                        columnas[4].text.strip(), columnas[5].text.strip(),
                        columnas[6].text.strip()
                    )

                    pais = PAISES_INDICES.get(nombre)
                    bandera = BANDERAS_PAISES.get(pais, "") if pais else ""
                    nombre_formateado = f"{bandera} {nombre}" if bandera else nombre

                    indices.append((nombre_formateado, ultimo, maximo, minimo, variacion, porcentaje_variacion))

                except Exception as e:
                    print(f"Advertencia: Error procesando fila en {url}: {e}", file=sys.stderr)
                    continue

        return indices

    except Exception as e:
        print(f"Error durante el parseo del HTML en {url}: {e}", file=sys.stderr)
        return []

def formatear_para_whatsapp(indices):
    """Genera el mensaje formateado para WhatsApp."""
    if not indices:
        return "❌ No se pudieron obtener los datos de los índices bursátiles en este momento."

    mensaje_partes = ["📊 *Índices Bursátiles Principales*\n"]
    for nombre, ultimo, maximo, minimo, variacion, porcentaje in indices:
        mensaje_partes.append(
            f"*{nombre}*\n"
            f"  Último: {ultimo}\n"
            f"  Máx.: {maximo}\n"
            f"  Mín.: {minimo}\n"
            f"  Var.: {variacion}\n"
            f"  % Var.: {porcentaje}\n"
        )
    return "\n".join(mensaje_partes).strip()

# --- Ejecución Principal ---
if __name__ == "__main__":
    indices_obtenidos = []
    for nombre, url in URLS.items():
        print(f"Obteniendo datos de {nombre}...")
        indices_obtenidos.extend(obtener_datos(url))

    mensaje_whatsapp = formatear_para_whatsapp(indices_obtenidos)
    print(mensaje_whatsapp)  # Imprime solo el resultado final
