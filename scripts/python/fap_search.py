import sys
import json
import requests
import io

# Configurar salida UTF-8 para evitar errores en Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def search_fap(search_term):
    url = 'https://celuzador.porsilapongo.cl/fappello.php'
    headers = {
        'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF'
    }
    data = {
        'term': search_term
    }

    try:
        # Agregamos timeout para evitar bloqueos
        response = requests.post(url, headers=headers, data=data, timeout=15)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        try:
            resultados = response.json()
        except json.JSONDecodeError:
            return json.dumps({'text': 'Error: La API no devolvió un JSON válido.'}, ensure_ascii=False)

        result = {
            'text': ''
        }

        if resultados and isinstance(resultados, list) and len(resultados) > 0:
            mensaje_respuesta = f'🔞 *Resultados para "{search_term}":*\n\n'
            # Limitar a 10 resultados para no saturar el chat
            for i, resultado in enumerate(resultados[:10]):
                name = resultado.get("name", "N/A")
                url = resultado.get("profile_url", "N/A")
                mensaje_respuesta += f'{i + 1}. *{name}*\n   🔗 {url}\n'
            
            if len(resultados) > 10:
                mensaje_respuesta += f'\n_... y {len(resultados) - 10} resultados más._'
                
            result['text'] = mensaje_respuesta.strip()
        else:
            result['text'] = f'No se encontraron resultados para "{search_term}".'
        
        return json.dumps(result, ensure_ascii=False)

    except requests.exceptions.RequestException as e:
        return json.dumps({'text': f'Error de conexión con la API: {str(e)}'}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({'text': f'Error inesperado: {str(e)}'}, ensure_ascii=False)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Unir argumentos por si se pasan separados
        search_term = " ".join(sys.argv[1:])
        print(search_fap(search_term))
    else:
        print(json.dumps({'text': 'Error: Término de búsqueda no proporcionado.'}, ensure_ascii=False))
