# random_info.py (Versión JSON Estructurado)
import requests
import random
from datetime import datetime
import sys
import io
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Headers estándar para evitar bloqueos
DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

# Variables de entorno
NASA_API_KEY = os.getenv('NASA_API_KEY', 'DEMO_KEY')
REQUEST_TIMEOUT = 10  # segundos

# Resolver path dinámico del JSON
SCRIPT_DIR = Path(__file__).parent.parent.parent
GEEK_TERMS_PATH = SCRIPT_DIR / 'src' / 'data' / 'terminos_geek.json'

# Cache y reintentos
import time

CARTELERA_CACHE_PATH = SCRIPT_DIR / 'temp' / 'cartelera_cache.json'
CARTELERA_TTL = 6 * 60 * 60  # 6 horas
RETRIES = 3
BACKOFF_FACTOR = 1.5

def requests_get_with_retries(url, **kwargs):
    """Wrapper de requests.get con reintentos exponenciales."""
    timeout = kwargs.pop('timeout', REQUEST_TIMEOUT)
    headers = kwargs.pop('headers', DEFAULT_HEADERS)
    attempt = 0
    while attempt < RETRIES:
        try:
            resp = requests.get(url, headers=headers, timeout=timeout, **kwargs)
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException:
            attempt += 1
            if attempt >= RETRIES:
                raise
            sleep_time = BACKOFF_FACTOR ** attempt
            time.sleep(sleep_time)

def read_cartelera_cache():
    try:
        if not CARTELERA_CACHE_PATH.exists():
            return None
        data = json.loads(CARTELERA_CACHE_PATH.read_text(encoding='utf-8'))
        ts = data.get('timestamp', 0)
        if time.time() - ts > CARTELERA_TTL:
            return None
        return data.get('result')
    except Exception:
        return None

def write_cartelera_cache(result):
    try:
        CARTELERA_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        payload = {'timestamp': time.time(), 'result': result}
        CARTELERA_CACHE_PATH.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    except Exception:
        pass

# --- FUNCIONES (Retornan diccionario) ---

def get_efemeride():
    """Obtiene un evento histórico del día actual desde Wikipedia."""
    try:
        today = datetime.now()
        month, day = today.strftime("%m"), today.strftime("%d")
        url = f"https://es.wikipedia.org/api/rest_v1/feed/onthisday/events/{month}/{day}"
        response = requests_get_with_retries(url, headers=DEFAULT_HEADERS, timeout=REQUEST_TIMEOUT)
        eventos = response.json().get('events', [])
        if not eventos:
            return None
        evento = random.choice(eventos)
        return {
            "type": "text",
            "caption": f"📅 *Efemérides del Día*\nUn día como hoy, en el año {evento['year']}, {evento['text']}"
        }
    except (requests.exceptions.RequestException, ValueError, KeyError):
        return None

def get_fun_fact():
    """Obtiene un dato curioso aleatorio en español."""
    try:
        response = requests_get_with_retries(
            "https://uselessfacts.jsph.pl/api/v2/facts/random?language=es",
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        texto = response.json().get('text')
        if not texto:
            return None
        return {
            "type": "text",
            "caption": f"💡 *¿Sabías que...?*\n{texto}"
        }
    except (requests.exceptions.RequestException, ValueError, KeyError):
        return None

def get_nasa_apod():
    """Obtiene la foto astronómica del día (APOD) desde NASA."""
    try:
        response = requests_get_with_retries(
            f"https://api.nasa.gov/planetary/apod?api_key={NASA_API_KEY}",
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        data = response.json()
        title = data.get('title', 'Foto astronómica')
        explanation = data.get('explanation', 'Sin descripción')
        media_url = data.get('hdurl') or data.get('url')
        
        if not media_url:
            return None
            
        # Limitar explicación a 500 caracteres
        explanation = explanation[:500] + '...' if len(explanation) > 500 else explanation
        
        return {
            "type": "image",
            "caption": f"🔭 *Foto Astronómica del Día (NASA)*\n*{title}*\n\n{explanation}",
            "media_url": media_url
        }
    except (requests.exceptions.RequestException, ValueError, KeyError):
        return None

def get_quote_of_the_day():
    """Obtiene una frase inspiradora del día."""
    try:
        response = requests_get_with_retries(
            "https://api.quotable.io/random?language=es",
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        data = response.json()
        content = data.get('content')
        author = data.get('author', 'Anónimo')
        
        if not content:
            return None
            
        return {
            "type": "text",
            "caption": f"💬 *Frase del Día*\n_{content}_\n\n- *{author}*"
        }
    except (requests.exceptions.RequestException, ValueError, KeyError):
        return None

def get_cartelera_cine():
    """Obtiene la cartelera de películas de Cinépolis Chile."""
    # Intentar leer cache primero
    cached = read_cartelera_cache()
    if cached:
        return cached

    try:
        content = None
        last_exc = None
        for attempt in range(1, RETRIES + 1):
            try:
                with sync_playwright() as p:
                    # MEJORA: Argumentos para estabilidad en servidor (VPS/Linux)
                    browser = p.chromium.launch(
                        headless=True, 
                        args=['--no-sandbox', '--disable-dev-shm-usage']
                    )
                    context = browser.new_context(user_agent=DEFAULT_HEADERS['User-Agent'])
                    page = context.new_page()
                    try:
                        page.goto("https://cinepolischile.cl/", wait_until='domcontentloaded', timeout=20000)
                        page.wait_for_selector('div.titulo-pelicula', timeout=15000)
                        content = page.content()
                    finally:
                        browser.close()
                break
            except Exception as e:
                last_exc = e
                time.sleep(BACKOFF_FACTOR ** attempt)

        if not content:
            return None

        soup = BeautifulSoup(content, 'html.parser')
        peliculas = []
        for tag in soup.find_all('div', class_='titulo-pelicula'):
            h2 = tag.find('h2')
            if h2:
                nombre = h2.text.strip()
                if nombre and nombre not in peliculas:
                    peliculas.append(nombre)

        if not peliculas:
            return None

        result = {
            "type": "text",
            "caption": f"🎬 *Cartelera de Cine Hoy*\n- " + "\n- ".join(peliculas[:8])
        }
        write_cartelera_cache(result)
        return result
    except Exception:
        return None

def get_geek_joke():
    """Obtiene un chiste geek aleatorio."""
    try:
        response = requests_get_with_retries(
            "https://backend-omega-seven.vercel.app/api/getjoke",
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        datos = response.json()
        if not datos or not isinstance(datos, list):
            return None
        
        data = datos[0]
        question = data.get('question')
        punchline = data.get('punchline')
        
        if not question or not punchline:
            return None
        
        return {
            "type": "text",
            "caption": f"🤓 *Chiste Geek*\n\n{question}\n\n_{punchline}_"
        }
    except (requests.exceptions.RequestException, ValueError, KeyError, IndexError):
        return None

def get_trago_del_dia():
    """Obtiene una receta de cóctel aleatorio."""
    try:
        response = requests_get_with_retries(
            "https://www.thecocktaildb.com/api/json/v1/1/random.php",
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        trago = response.json().get('drinks', [None])[0]
        
        if not trago:
            return None
        
        nombre = trago.get('strDrink', 'Cóctel')
        ingredientes = []
        
        for i in range(1, 16):
            ingrediente = trago.get(f'strIngredient{i}')
            medida = trago.get(f'strMeasure{i}')
            if ingrediente and ingrediente.strip():
                medida_str = medida.strip() if medida else ''
                ingredientes.append(f"- {medida_str} {ingrediente.strip()}")
        
        instrucciones = trago.get('strInstructionsES') or trago.get('strInstructions', 'Sin instrucciones')
        thumb = trago.get('strDrinkThumb')
        
        if not thumb or not ingredientes:
            return None
        
        return {
            "type": "image",
            "caption": f"🍸 *Trago del Día: {nombre}*\n\n*Ingredientes:*\n" + "\n".join(ingredientes) + f"\n\n*Instrucciones:*\n{instrucciones}",
            "media_url": thumb
        }
    except (requests.exceptions.RequestException, ValueError, KeyError, IndexError):
        return None

def get_termino_geek():
    """Lee el archivo JSON local y devuelve un término geek al azar."""
    try:
        if not GEEK_TERMS_PATH.exists():
            return None
        
        with open(GEEK_TERMS_PATH, 'r', encoding='utf-8') as f:
            terminos = json.load(f)
        
        if not terminos:
            return None
        
        termino_elegido = random.choice(terminos)
        termino = termino_elegido.get('termino', 'Término')
        definicion = termino_elegido.get('definicion', 'Sin definición')
        
        return {
            "type": "text",
            "caption": f"💻 *Término Geek: {termino}*\n\n{definicion}"
        }
    except (FileNotFoundError, json.JSONDecodeError, KeyError, IndexError):
        return None

def get_xkcd_comic():
    """Obtiene un cómic aleatorio de XKCD."""
    try:
        response_latest = requests_get_with_retries(
            "https://xkcd.com/info.0.json",
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        latest_num = response_latest.json().get('num')
        
        if not latest_num:
            return None
        
        random_num = random.randint(1, latest_num)
        response_comic = requests_get_with_retries(
            f"https://xkcd.com/{random_num}/info.0.json",
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        comic_data = response_comic.json()
        
        title = comic_data.get('safe_title', 'Cómic XKCD')
        img = comic_data.get('img')
        
        if not img:
            return None
        
        return {
            "type": "image",
            "caption": f"✒️ *Cómic XKCD Aleatorio #{random_num}*\n*{title}*",
            "media_url": img
        }
    except (requests.exceptions.RequestException, ValueError, KeyError):
        return None


if __name__ == "__main__":
    opciones = [
        get_efemeride, get_fun_fact, get_nasa_apod, get_quote_of_the_day,
        get_cartelera_cine, get_geek_joke, get_trago_del_dia, get_termino_geek,
        get_xkcd_comic
    ]
    
    random.shuffle(opciones)
    
    resultado = None
    for funcion in opciones:
        resultado = funcion()
        if resultado:
            break
    
    if resultado:
        print(json.dumps(resultado, ensure_ascii=False))
    else:
        # Fallback en JSON por si todo falla
        print(json.dumps({
            "type": "text", 
            "caption": "No pude encontrar un dato aleatorio en este momento, ¡qué mala suerte!"
        }, ensure_ascii=False))