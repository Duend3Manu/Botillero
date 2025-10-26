import sys
import json
import requests

def search_fap(search_term):
    url = 'https://celuzador.porsilapongo.cl/fappello.php'
    headers = {
        'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF'
    }
    data = {
        'term': search_term
    }

    try:
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()  # Raise an exception for HTTP errors
        resultados = response.json()

        result = {
            'text': ''
        }

        if resultados and len(resultados) > 0:
            mensaje_respuesta = f'Resultado de la búsqueda para "{search_term}":\n\n'
            for i, resultado in enumerate(resultados):
                mensaje_respuesta += f'{i + 1}. {resultado.get("name", "N/A")} - {resultado.get("profile_url", "N/A")}\n'
            result['text'] = mensaje_respuesta
        else:
            result['text'] = f'No se encontraron resultados para "{search_term}".'
        
        return json.dumps(result)

    except requests.exceptions.RequestException as e:
        return json.dumps({'text': f'Error de conexión con la API: {e}'})
    except json.JSONDecodeError:
        return json.dumps({'text': 'Error al decodificar la respuesta de la API.'})
    except Exception as e:
        return json.dumps({'text': f'Error inesperado: {e}'})

if __name__ == '__main__':
    if len(sys.argv) > 1:
        search_term = sys.argv[1]
        print(search_fap(search_term))
    else:
        print(json.dumps({'text': 'Error: Término de búsqueda no proporcionado.'}))
