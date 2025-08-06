# net_analyzer.py
import sys
import whois
import dns.resolver
import ipapi
import socket
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def analizar_dominio(dominio):
    """
    Realiza un análisis completo (GeoIP, DNS, WHOIS) de un dominio o IP.
    """
    try:
        # --- Obtener IP ---
        ip = socket.gethostbyname(dominio)
        print(f"🔍 Análisis para: *{dominio}* ({ip})\n")
    except socket.gaierror:
        print(f"❌ No se pudo resolver el dominio '{dominio}'. ¿Está bien escrito?")
        return

    # --- GeoIP ---
    try:
        geo_info = ipapi.location(ip)
        print("--- 📍 GeoIP ---")
        print(f"País: {geo_info.get('country_name', 'N/A')} ({geo_info.get('country_code', 'N/A')})")
        print(f"Ciudad: {geo_info.get('city', 'N/A')}, {geo_info.get('region', 'N/A')}")
        print(f"ISP: {geo_info.get('org', 'N/A')}\n")
    except Exception:
        print("--- 📍 GeoIP ---\nNo se pudo obtener la información de geolocalización.\n")

    # --- DNS Records ---
    try:
        print("--- 🌐 Registros DNS ---")
        # Registros A (IPv4)
        a_records = [str(r) for r in dns.resolver.resolve(dominio, 'A')]
        print(f"A (IPv4): {', '.join(a_records)}")
        # Registros MX (Mail)
        mx_records = sorted([f"{r.preference} {r.exchange}" for r in dns.resolver.resolve(dominio, 'MX')])
        print(f"MX (Correo): {', '.join(mx_records)}\n")
    except Exception:
        print("No se pudieron obtener los registros DNS.\n")

    # --- WHOIS ---
    # Solo para dominios, no para IPs
    if dominio == ip:
        print("--- ℹ️ WHOIS ---\nLa consulta WHOIS solo está disponible para nombres de dominio.")
    else:
        try:
            print("--- ℹ️ WHOIS ---")
            w = whois.whois(dominio)
            # Normalizamos las fechas que a veces vienen en listas
            creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
            expiration_date = w.expiration_date[0] if isinstance(w.expiration_date, list) else w.expiration_date

            print(f"Registrado por: {w.registrar}")
            print(f"Fecha Creación: {creation_date.strftime('%d-%m-%Y') if creation_date else 'N/A'}")
            print(f"Fecha Expiración: {expiration_date.strftime('%d-%m-%Y') if expiration_date else 'N/A'}")
        except Exception:
            print("No se pudo obtener la información de WHOIS (puede ser un dominio .cl o estar protegido).")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analizar_dominio(sys.argv[1])
    else:
        print("Por favor, proporciona un dominio o IP para analizar.")