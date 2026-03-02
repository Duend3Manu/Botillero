import sys
import json
import requests
import re
import io
from bs4 import BeautifulSoup

# Configurar salida UTF-8 para evitar errores en Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "https://fapello.com/search/{}/"

def search_fap(search_term):
    # Normalizar término para la URL: todo junto
    term_url = search_term.strip().lower().replace(' ', '').replace('-', '').replace('_', '')
    url = BASE_URL.format(term_url)

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://fapello.com/'
    }

    try:
        r = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        r.raise_for_status()

        soup = BeautifulSoup(r.text, 'html.parser')

        # Los resultados son links a perfiles: href="https://fapello.com/username/"
        patron = re.compile(r'https://fapello\.com/([a-zA-Z0-9_\-\.]+)/$')
        
        vistos = set()
        resultados = []
        
        # Ignorar páginas del sistema
        ignore_list = {
            'search', 'login', 'register', 'signup', 'premium', 'categories', 
            'trending', 'latest', 'top', 'forum', 'welcome', 'popular', 'posts', 
            'contacts', 'daily-search-ranking', 'top-likes', 'top-followers', 
            'videos', 'random', 'hot', 'search_v2', 'what-is-fapello'
        }

        for a in soup.find_all('a', href=patron):
            href = a['href'].rstrip('/')
            m = patron.match(a['href'])
            if not m:
                continue
            
            username = m.group(1)
            if username in ignore_list:
                continue
                
            if href in vistos:
                continue
                
            vistos.add(href)
            
            # Nombre visible: texto del link o username
            nombre = a.get_text(strip=True) or username
            
            resultados.append({'name': nombre, 'username': username, 'profile_url': a['href'].rstrip('/')})

    except Exception as e:
        return json.dumps({'text': f'❌ Error al buscar en Fapello: {str(e)}'}, ensure_ascii=False)

    # Construir respuesta
    if resultados:
        max_resultados = 15
        msg = f'🔞 *Resultados para "{search_term}":*\n\n'
        for i, r in enumerate(resultados[:max_resultados]):
            msg += f'{i+1}. *{r["username"]}*\n   🔗 {r["profile_url"]} \n'
        
        if len(resultados) > max_resultados:
            msg += f'\n_... y {len(resultados) - max_resultados} resultados más._\n'
            
        msg += f'\n👉 *Si no está en la lista, búscalo manualmente aquí:*\n{url}'
        return json.dumps({'text': msg.strip()}, ensure_ascii=False)
    else:
        msg = f'❌ No se encontraron resultados exactos para *"{search_term}"*.\n\n'
        msg += f'👉 *Puedes intentar buscarlo manualmente aquí:*\n{url}'
        return json.dumps({'text': msg.strip()}, ensure_ascii=False)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        search_term = " ".join(sys.argv[1:])
        print(search_fap(search_term))
    else:
        print(json.dumps({'text': 'Error: Término de búsqueda no proporcionado.'}, ensure_ascii=False))
