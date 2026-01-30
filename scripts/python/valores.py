import asyncio
import aiohttp
from bs4 import BeautifulSoup
import sys
import requests
from datetime import datetime
import io

# Configurar salida UTF-8 para evitar errores en Windows (Consistente con otros scripts)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Headers para evitar bloqueos
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Limitar el número de solicitudes simultáneas
MAX_CONCURRENT_REQUESTS = 5

async def obtener_html(session, url):
    try:
        async with session.get(url, headers=HEADERS, timeout=10) as response:
            if response.status == 200:
                return await response.text()
            else:
                return None
    except Exception as e:
        return None

async def obtener_valor_google(session, url, semaphore):
    async with semaphore:
        html = await obtener_html(session, url)
        if html:
            soup = BeautifulSoup(html, 'html.parser')
            div_valor = soup.find('div', class_='YMlKec fxKbKc')
            if div_valor:
                return div_valor.text.strip().replace(",", "")
        return None

async def obtener_valores_divisas(session):
    urls = {
        '💵 USD (Google)': 'https://www.google.com/finance/quote/USD-CLP',
        '🇪🇺 EUR (Google)': 'https://www.google.com/finance/quote/EUR-CLP',
        '🇦🇷 ARS': 'https://www.google.com/finance/quote/ARS-CLP',
        '🇵🇪 PEN': 'https://www.google.com/finance/quote/PEN-CLP',
        '🇧🇴 BOB': 'https://www.google.com/finance/quote/BOB-CLP',
        '🇨🇴 COP': 'https://www.google.com/finance/quote/COP-CLP',
        '🇯🇵 JPY': 'https://www.google.com/finance/quote/JPY-CLP',
        '🇧🇷 BRL': 'https://www.google.com/finance/quote/BRL-CLP'
    }
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    
    tasks = []
    keys = []
    for name, url in urls.items():
        keys.append(name)
        tasks.append(obtener_valor_google(session, url, semaphore))
    
    resultados = await asyncio.gather(*tasks)
    return dict(zip(keys, resultados))

def formatear_con_separadores(valor):
    try:
        return "{:,}".format(int(float(valor))).replace(",", ".")
    except (ValueError, TypeError):
        return str(valor)

def formatear_con_decimales(valor):
    try:
        return "{:,.2f}".format(float(valor)).replace(",", ".")
    except (ValueError, TypeError):
        return str(valor)

def obtener_indicadores_mindicador():
    """Obtiene los principales indicadores económicos desde mindicador.cl."""
    try:
        url = "https://mindicador.cl/api"
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Formateamos los indicadores que nos interesan
        uf = data.get('uf', {}).get('valor', 0)
        dolar = data.get('dolar', {}).get('valor', 0)
        euro = data.get('euro', {}).get('valor', 0)
        utm = data.get('utm', {}).get('valor', 0)
        ipc_data = data.get('ipc', {})
        ipc_valor = ipc_data.get('valor', 0)
        
        # Formateamos la fecha del IPC para mostrar Mes/Año
        ipc_fecha_str = ipc_data.get('fecha', '')
        ipc_fecha = ''
        if ipc_fecha_str:
            try:
                ipc_fecha = datetime.fromisoformat(ipc_fecha_str.replace('Z', '+00:00')).strftime('%m-%Y')
            except ValueError:
                pass
        
        reporte = [
            f"🇨🇱 *UF:* ${formatear_con_separadores(uf)}",
            f"💵 *Dólar (Obs):* ${formatear_con_separadores(dolar)}",
            f"🇪🇺 *Euro (Obs):* ${formatear_con_separadores(euro)}",
            f"🇨🇱 *UTM:* ${formatear_con_separadores(utm)}",
            f"📈 *IPC ({ipc_fecha}):* {ipc_valor}%"
        ]
        return "\n".join(reporte)
    except (requests.RequestException, KeyError) as e:
        return f"⚠️ Error obteniendo indicadores oficiales: {e}"

async def main():
    ahora = datetime.now()
    fecha = ahora.strftime("%d-%m-%Y")
    
    print(f"📅 *Indicadores Económicos - {fecha}*\n")
    
    # 1. Indicadores Oficiales (Mindicador.cl)
    print(obtener_indicadores_mindicador())
    
    # 2. Divisas en tiempo real (Google Finance)
    async with aiohttp.ClientSession() as session:
        valores_divisas = await obtener_valores_divisas(session)

        if any(valores_divisas.values()):
            print("\n--- 🌎 *Divisas (Google Finance)* ---")
            for nombre, valor in valores_divisas.items():
                if valor:
                    print(f"{nombre}: ${formatear_con_decimales(valor)}")

if __name__ == "__main__":
    # Fix para Windows y asyncio
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Error en el script principal: {e}", file=sys.stderr)
