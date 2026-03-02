import sys
import json
import requests
import re
import io

# Configurar salida UTF-8 para evitar errores en Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_phone_info(phone_number):
    """
    Consulta una API para obtener información de un número de teléfono
    y extrae los datos y una posible URL de imagen.
    """
    # Inicializa el diccionario de resultados para evitar errores
    result = {
        'text': '',
        'imageUrl': None
    }
    
    url = 'https://celuzador.porsilapongo.cl/celuzadorApi.php'
    headers = {
        'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF'
    }
    data = {
        'tlfWA': phone_number
    }

    try:
        # Agregamos timeout para evitar bloqueos
        response = requests.post(url, headers=headers, data=data, timeout=15)
        response.raise_for_status()  # Lanza una excepción para errores HTTP (ej. 404, 500)
        try:
            api_response = response.json()
        except json.JSONDecodeError:
             return json.dumps({'text': 'Error: La API no devolvió un JSON válido.', 'imageUrl': None}, ensure_ascii=False, indent=4)

        if api_response.get('estado') == 'correcto':
            data_text = api_response.get('data', '')
            
            # Regex para encontrar y extraer el link de la foto
            link_regex = r'\*Link Foto\* : (https?:\/\/[^\s]+)'
            url_match = None
            
            # Asegura que data_text sea un string antes de usar regex
            if isinstance(data_text, str):
                url_match = re.search(link_regex, data_text)
                # Limpia el texto, eliminando la línea del link y los backticks
                clean_data = re.sub(link_regex, '', data_text).strip()
                result['text'] = f'ℹ️ Información del número ℹ️\n{clean_data.replace("`", "")}'
            else:
                # Si 'data' no es un string, lo convierte para mostrarlo
                result['text'] = f'ℹ️ Información del número ℹ️\n{str(data_text)}'

            # Si se encontró una URL, la añade al resultado
            if url_match and url_match.group(1):
                result['imageUrl'] = url_match.group(1)
        else:
            # Maneja el caso en que la API responde con un estado de error
            result['text'] = f'Error en API: {api_response.get("data", "No se recibió información.")}'
            
    except requests.exceptions.RequestException as e:
        result['text'] = f'Error de conexión con la API: {str(e)}'
    except Exception as e:
        result['text'] = f'Error inesperado: {str(e)}'

    return json.dumps(result, indent=4, ensure_ascii=False) # Usamos indent para que la salida sea más legible al probar

if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Unir argumentos por si se pasan separados
        phone_number = " ".join(sys.argv[1:])
        print(get_phone_info(phone_number))
    else:
        # Imprime un error si no se proporciona el número como argumento
        error_msg = {
            'text': 'Error: Número de teléfono no proporcionado. Úsalo así: python phone_info.py +56912345678',
            'imageUrl': None
        }
        print(json.dumps(error_msg, indent=4, ensure_ascii=False))