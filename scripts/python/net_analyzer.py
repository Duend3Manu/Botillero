# net_analyzer.py (Versión que crea un archivo .txt)
import sys
import whois
import dns.resolver
import ipapi
import socket
import ssl
import requests
from datetime import datetime
import io
import tempfile # Para crear archivos temporales
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- (Las funciones de conversión de país a bandera no cambian) ---
COUNTRY_CODES = { 'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom', 'DE': 'Germany', 'FR': 'France', 'AU': 'Australia', 'JP': 'Japan', 'CN': 'China', 'IN': 'India', 'BR': 'Brazil', 'RU': 'Russia', 'CL': 'Chile', 'AR': 'Argentina', 'MX': 'Mexico', 'IS': 'Iceland' }
NAMES_TO_CODES = {v.lower(): k for k, v in COUNTRY_CODES.items()}
def codigo_a_bandera(codigo):
    if not isinstance(codigo, str) or len(codigo) != 2: return "🌐"
    OFFSET = 0x1F1E6 - ord('A')
    return chr(ord(codigo.upper()[0]) + OFFSET) + chr(ord(codigo.upper()[1]) + OFFSET)
def nombre_a_bandera(nombre):
    codigo = NAMES_TO_CODES.get(nombre.lower())
    return codigo_a_bandera(codigo) if codigo else "🌐"

def analizar_dominio(dominio):
    # Usaremos una lista para ir guardando cada línea del reporte
    reporte = []
    
    try:
        ip = socket.gethostbyname(dominio)
        reporte.append(f"🔍 Análisis para: *{dominio}* ({ip})\n")
    except socket.gaierror:
        print(f"❌ No se pudo resolver el dominio '{dominio}'. ¿Está bien escrito?")
        return

    # --- GeoIP ---
    try:
        geo_info = ipapi.location(ip, output='json')
        codigo_pais = geo_info.get('country', 'N/A')
        bandera = codigo_a_bandera(codigo_pais)
        reporte.append("--- 📍 GeoIP (Ubicación del Servidor) ---")
        reporte.append(f"{bandera} País: {geo_info.get('country_name', 'N/A')} ({codigo_pais})")
        reporte.append(f"Ciudad: {geo_info.get('city', 'N/A')}, {geo_info.get('region', 'N/A')}")
        reporte.append(f"ISP: {geo_info.get('org', 'N/A')}\n")
    except Exception:
        reporte.append("--- 📍 GeoIP ---\nNo se pudo obtener la información de geolocalización.\n")

    # --- SSL & Servidor ---
    if dominio != ip:
        try:
            reporte.append("--- 🛡️ SSL & Servidor ---")
            headers = requests.head(f"https://{dominio}", timeout=5, allow_redirects=True).headers
            reporte.append(f"Servidor Web: {headers.get('Server', 'No identificado')}")
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=dominio) as s:
                s.connect((dominio, 443))
                cert = s.getpeercert()
            issuer = dict(x[0] for x in cert['issuer'])
            valid_to = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
            reporte.append(f"Certificado SSL emitido por: {issuer.get('commonName', 'N/A')}")
            reporte.append(f"Expira el: {valid_to.strftime('%d-%m-%Y')}\n")
        except Exception:
            reporte.append("No se pudo obtener la información del servidor o certificado SSL.\n")

    # --- DNS Records ---
    try:
        reporte.append("--- 🌐 Registros DNS ---")
        reporte.append(f"A (IPv4): {', '.join([str(r) for r in dns.resolver.resolve(dominio, 'A')])}")
        reporte.append(f"NS (Servidores): {', '.join(sorted([str(r) for r in dns.resolver.resolve(dominio, 'NS')]))}")
        reporte.append(f"MX (Correo): {', '.join(sorted([f'{r.preference} {r.exchange}' for r in dns.resolver.resolve(dominio, 'MX')]))}")
        txt_records = [r.to_text() for r in dns.resolver.resolve(dominio, 'TXT')]
        if txt_records:
            reporte.append(f"TXT: {txt_records[0][:75].strip()}...")
        reporte.append("")
    except Exception:
        reporte.append("No se pudieron obtener todos los registros DNS.\n")

    # --- WHOIS ---
    if dominio != ip:
        try:
            reporte.append("--- ℹ️ WHOIS (Información de Registro) ---")
            w = whois.whois(dominio)
            pais_registro = w.get('country')
            if pais_registro:
                bandera_registro = codigo_a_bandera(pais_registro) if len(pais_registro) == 2 else nombre_a_bandera(pais_registro)
                reporte.append(f"{bandera_registro} País de Registro: {pais_registro}")
            reporte.append(f"Registrado por: {w.registrar}")
            creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
            expiration_date = w.expiration_date[0] if isinstance(w.expiration_date, list) else w.expiration_date
            reporte.append(f"Fecha Creación: {creation_date.strftime('%d-%m-%Y') if creation_date else 'N/A'}")
            reporte.append(f"Fecha Expiración: {expiration_date.strftime('%d-%m-%Y') if expiration_date else 'N/A'}")
            status = w.status
            if status:
                reporte.append(f"Estado: {', '.join(status) if isinstance(status, list) else status}")
        except Exception:
            reporte.append("No se pudo obtener la información de WHOIS.")

    # --- Unimos todo el reporte en un solo texto ---
    reporte_final_texto = "\n".join(reporte)
    
    # --- Guardamos el reporte en un archivo .txt temporal ---
    temp_dir = tempfile.gettempdir()
    nombre_archivo = f"analisis_{dominio.replace('.', '_')}.txt"
    ruta_archivo = os.path.join(temp_dir, nombre_archivo)
    
    # Quitamos el formato de WhatsApp (*, _, etc.) para el archivo de texto
    reporte_para_txt = reporte_final_texto.replace('*', '').replace('_', '')
    with open(ruta_archivo, 'w', encoding='utf-8') as f:
        f.write(reporte_para_txt)
        
    # --- Imprimimos el resultado para Node.js ---
    # Usamos un delimitador único para separar el texto del chat y la ruta del archivo
    print(reporte_final_texto)
    print("|||FILE_PATH|||")
    print(ruta_archivo)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        analizar_dominio(sys.argv[1])
    else:
        print("Por favor, proporciona un dominio o IP para analizar.")