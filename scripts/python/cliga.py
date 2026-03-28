import requests
from bs4 import BeautifulSoup
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    url = "https://www.campeonatochileno.cl/ligas/copa-de-la-liga/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        r = requests.get(url, headers=headers, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print("Error al obtener datos:", e)
        sys.exit(1)

    soup = BeautifulSoup(r.text, 'html.parser')
    grupos = []
    
    # Cada grupo empieza con un h4 "Grupo A", etc.
    for h4 in soup.find_all('h4'):
        group_title = h4.text.strip()
        if 'Grupo' in group_title:
            
            # Buscar el contenedor de la tabla
            table_container = h4.find_next_sibling('div')
            while table_container and table_container.name != 'h4':
                # Buscamos si tiene header th
                headers_elements = table_container.find_all('div', class_=lambda c: c and 'anwp-grid-table__th' in c)
                if headers_elements:
                    # Extraer Headers
                    columns_names = [th.text.strip() for th in headers_elements if th.text.strip()]
                    
                    if 'Club' in columns_names and 'PT' in columns_names:
                        # Extraer Celdas
                        # Algunas celdas son __th (las posiciones), pero mejor filtramos todas juntas en orden
                        # Las celdas de una misma fila estarán secuenciales
                        
                        cols = columns_names
                        col_count = len(cols)
                        
                        # Extraemos td (y th si están marcados como tal pero no son el header principal)
                        # Actually the values are all the divs directly inside the main grid div
                        grid_div = table_container if 'anwp-grid-table' in table_container.get('class', []) else table_container.find('div', class_=lambda c: c and 'anwp-grid-table' in c and not 'wrapper' in c)
                        
                        if grid_div:
                            cells = grid_div.find_all('div', recursive=False)
                            # Extraer solo el texto limpio de cada celda superior
                            # Si tiene a, cogemos su texto para Club
                            raw_texts = []
                            for cell in cells:
                                if cell.name == 'div':
                                    a_tag = cell.find('a', class_=lambda c: c and 'anwp-link' in c)
                                    if a_tag:
                                        raw_texts.append(a_tag.text.strip())
                                    else:
                                        raw_texts.append(cell.get_text(" ", strip=True))
                                        
                            # El primer set de textos son los headers.
                            # Eliminamos las flechas u otros spans vacios
                            clean_data = []
                            for r in raw_texts:
                                if r and r not in ['▲', '▼', '-', '=']:
                                    clean_data.append(r)
                            
                            # Buscar donde empiezan los datos (despues del primer 'PT')
                            try:
                                pt_idx = clean_data.index('PT')
                            except:
                                break
                                
                            data_only = clean_data[pt_idx+1:]
                            
                            teams = []
                            for i in range(0, len(data_only), col_count):
                                chunk = data_only[i:i+col_count]
                                if len(chunk) < col_count:
                                    break
                                    
                                posClean = chunk[0]
                                club = chunk[1]
                                pts = chunk[-1]
                                        
                                teams.append({
                                    'pos': posClean,
                                    'club': club,
                                    'pts': pts
                                })
                            
                            grupos.append({'name': group_title, 'teams': teams})
                        break
                table_container = table_container.find_next_sibling()

    if not grupos:
        print("No se encontraron los grupos.")
        return

    SEPARADOR = "➖➖➖➖➖➖➖➖➖➖"
    print("🏆 *Grupos Copa de la Liga* 🏆")
    
    for g in grupos:
        print(f"\n*{g['name']}*")
        print("`Pos Equipo         Pts`")
        for i, t in enumerate(g['teams'][:4]):
            nom = (t['club'][:13] + "..") if len(t['club']) > 15 else t['club']
            emoji = "🟢" if i < 2 else "⚪"
            print(f"{emoji} `{str(t['pos'])+'.':<3} {nom:<14} {str(t['pts']):>3}pts`")

if __name__ == "__main__":
    main()
