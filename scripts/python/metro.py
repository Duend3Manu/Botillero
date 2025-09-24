import sys
import json
from bs4 import BeautifulSoup
import requests
from unidecode import unidecode

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://www.metro.cl/el-viaje/estado-red'
try:
    page = requests.get(url, timeout=10)
    page.raise_for_status()
except requests.exceptions.RequestException as e:
    print(json.dumps({"status": f"❌ No se pudo conectar con metro.cl para obtener el estado de la red. Error: {e}"}))
    sys.exit(1)

soup = BeautifulSoup(page.content, 'html.parser')

lines = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 4a', 'Línea 5', 'Línea 6']
statuses = {
    'estado1': 'Estación Operativa',
    'estado4': 'Accesos Cerrados',
    'estado2': 'Estación Cerrada Temporalmente'
}

colors = {
    'Línea 1': '🔴',
    'Línea 2': '🟡',
    'Línea 3': '🟤',
    'Línea 4': '🔵',
    'Línea 4a': '🔷',
    'Línea 5': '🟢',
    'Línea 6': '🟣'
}

def get_status(class_name):
    """Devuelve el estado correspondiente a la clase."""
    return statuses.get(class_name, 'Desconocido')

def main():
    output_lines = []
    all_operational = True
    all_problems = []

    for line in lines:
        line_result = soup.find('strong', string=line)
        
        if not line_result:
            output_lines.append(f"No se encontró información para {line}.")
            continue
        
        station_results = line_result.find_next('ul').find_all('li')
        if not station_results:
            output_lines.append(f"No se encontraron estaciones para {line}.")
            continue
        
        line_status = 'Operativa'
        problem_stations = []
        
        for station_result in station_results:
            station_name = station_result.text.strip()
            station_class = station_result['class'][0]
            station_status = get_status(station_class)
            
            if station_status in ['Accesos Cerrados', 'Estación Cerrada Temporalmente']:
                problem_stations.append(f'{station_name} - {station_status}')
                if station_status == 'Estación Cerrada Temporalmente':
                    line_status = 'Cerrada Temporalmente'
        
        if problem_stations:
            output_lines.append(f'{colors[line]}{unidecode(line)}: {", ".join(problem_stations)} ⚠️')
        else:
            output_lines.append(f'{colors[line]}{unidecode(line)}: {line_status}')

        if problem_stations:
            all_operational = False
            all_problems.extend(station.split(' - ')[0] for station in problem_stations)
    
    final_status_lines = []
    if all_operational:
        final_status_lines.append("✅ *Toda la red se encuentra disponible.*")
        final_status_lines.extend(output_lines)
    else:
        final_status_lines.append("⚠️ *Se registran problemas en la red:*")
        final_status_lines.extend(output_lines)
        final_status_lines.append(f"Problemas en las estaciones {', '.join(set(all_problems))}, más información en https://twitter.com/metrodesantiago")

    final_string = "\n".join(final_status_lines)
    print(json.dumps({"status": final_string}, ensure_ascii=False))


if __name__ == '__main__':
    main()