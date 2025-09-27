import sys
from bs4 import BeautifulSoup
import requests
from unidecode import unidecode

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://www.metro.cl/el-viaje/estado-red'
page = requests.get(url)
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

def print_line_status(line, line_status, problem_stations):
    """Imprime el estado de una línea y los problemas, si existen."""
    if problem_stations:
        print(f'{colors[line]}{unidecode(line)}: {", ".join(problem_stations)} ⚠️')
        print(f'{colors[line]}{unidecode(line)}: {line_status}')
    else:
        print(f'{colors[line]}{unidecode(line)}: {line_status}')

def main():
    all_operational = True
    all_problems = []

    for line in lines:
        line_result = soup.find('strong', string=line)
        
        if not line_result:
            print(f"No se encontró información para {line}.")
            continue
        
        station_results = line_result.find_next('ul').find_all('li')
        if not station_results:
            print(f"No se encontraron estaciones para {line}.")
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
        
        print_line_status(line, line_status, problem_stations)
        
        if problem_stations:
            all_operational = False
            all_problems.extend(station.split(' - ')[0] for station in problem_stations)
    
    if all_operational:
        print("Toda la red del metro está operativa.")
    else:
        print(f"Problemas en las estaciones {', '.join(set(all_problems))}, más información en https://twitter.com/metrodesantiago")

if __name__ == '__main__':
    main()
