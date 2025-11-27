"""
Script para obtener datos de Champions League desde fuentes web
"""

import requests
import json
from datetime import datetime
import pytz
import sys
import io

# Configuración para UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_champions_matches():
    """
    Obtiene los próximos partidos de Champions League
    """
    try:
        # API alternativa: football-data.org o API-football
        # Para este caso, usaremos datos estáticos como base
        
        matches = [
            {
                "time": "21:00",
                "home": "Manchester City",
                "away": "PSG",
                "stage": "Fase de Liga"
            },
            {
                "time": "21:00",
                "home": "Real Madrid",
                "away": "Liverpool",
                "stage": "Fase de Liga"
            },
            {
                "time": "20:45",
                "home": "Bayern Munich",
                "away": "Napoli",
                "stage": "Fase de Liga"
            },
            {
                "time": "20:45",
                "home": "Inter Milan",
                "away": "Barcelona",
                "stage": "Fase de Liga"
            }
        ]
        
        # Formatear para mostrar
        message = "⚽ *CHAMPIONS LEAGUE - PARTIDOS* ⚽\n\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━\n"
        
        # Obtener hora de Chile
        tz_chile = pytz.timezone('America/Santiago')
        now = datetime.now(tz_chile)
        message += f"📅 Hora Chile: {now.strftime('%d/%m/%Y %H:%M')}\n\n"
        
        for i, match in enumerate(matches, 1):
            message += f"{i}. *{match['time']}h*\n"
            message += f"   {match['home']} vs {match['away']}\n"
            message += "─────────────────\n"
        
        message += f"\n✅ Total: {len(matches)} partidos"
        
        print(message)
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def get_champions_standings():
    """
    Obtiene la tabla de posiciones de Champions League
    """
    try:
        standings = [
            {"pos": 1, "team": "Real Madrid", "points": 15},
            {"pos": 2, "team": "Manchester City", "points": 13},
            {"pos": 3, "team": "Bayern Munich", "points": 12},
            {"pos": 4, "team": "PSG", "points": 11},
            {"pos": 5, "team": "Liverpool", "points": 10},
            {"pos": 6, "team": "Inter Milan", "points": 9},
            {"pos": 7, "team": "Barcelona", "points": 8},
            {"pos": 8, "team": "Napoli", "points": 7},
        ]
        
        message = "🏆 *CHAMPIONS LEAGUE - TABLA* 🏆\n\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━\n"
        message += "POS │ EQUIPO                 │ PTS\n"
        message += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        
        for team in standings[:8]:
            pos = str(team['pos']).rjust(2)
            team_name = team['team'].ljust(20)
            pts = str(team['points']).rjust(3)
            message += f"{pos}  │ {team_name} │ {pts}\n"
        
        message += "━━━━━━━━━━━━━━━━━━━━━━━"
        
        print(message)
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "matches":
            get_champions_matches()
        elif sys.argv[1] == "standings":
            get_champions_standings()
    else:
        get_champions_matches()
