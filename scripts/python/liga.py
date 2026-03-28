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
        print("Error al obtener la liga:", e)
        return

    soup = BeautifulSoup(r.text, 'html.parser')

    match_links = soup.find_all('a', href=lambda h: h and '/match/' in h)
    
    matches = []
    seen = set()
    
    for a in match_links:
        p = a.find_parent('div')
        if not p: continue
        p = p.find_parent('div')
        if not p: continue
        
        strings = list(p.stripped_strings)
        s_joined = " | ".join(strings)
        
        if len(strings) > 3 and s_joined not in seen:
            seen.add(s_joined)
            matches.append(strings)

    if not matches:
        print("No se encontraron partidos de la Copa de la Liga.")
        return
        
    print("🏆 *Partidos Copa de la Liga* 🏆")
    
    current_date = ""
    for m in matches:
        
        # Iterar a través de las strings del bloque general
        # Encontramos 'hrs' y construimos el partido!
        for i, val in enumerate(m):
            if 'hrs' in val.lower() or ':' in val:
                hora = val
                
                # Fetch date
                fecha = ""
                # Miremos hasta 3 indices atrás para la fecha
                for j in range(i-1, max(-1, i-4), -1):
                    if any(mes in m[j].lower() for mes in ['marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']):
                        fecha = m[j]
                        break
                    elif len(m[j]) > 4 and '-' in m[j] and m[j][0].isdigit():
                        fecha = m[j]
                        break
                        
                if not fecha and i > 1:
                    fecha = m[i-2] if m[i-1] in ['–', '-'] else m[i-1]
                
                # Fetch teams and scores
                local = ""
                visita = ""
                marcador = "vs"
                
                # Si estamos al borde del arreglo (algo raro pasó)
                if i+2 >= len(m):
                    continue
                    
                local = m[i+1]
                if m[i+2].isdigit() and i+4 < len(m) and m[i+3].isdigit():
                    # Partido finalizado o en curso
                    marcador = f"{m[i+2]}-{m[i+3]}"
                    visita = m[i+4]
                else:
                    # Partido pendiente
                    visita = m[i+2]
                    
                # Print
                if fecha and fecha != current_date:
                    print(f"\n📅 *{fecha}*")
                    current_date = fecha
                    
                emoji = "⚽" if marcador != "vs" else "🏟️"
                # Shorten long stadium names if they accidentaly leak into team name
                if len(local) > 22: local = local[:20] + ".."
                if len(visita) > 22: visita = visita[:20] + ".."
                
                print(f"{emoji} {local} *{marcador}* {visita} _({hora})_")

if __name__ == "__main__":
    main()
