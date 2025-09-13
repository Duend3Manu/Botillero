import sys
import socket
import whois
import dns.resolver
import ipapi
import ssl
import requests
from datetime import datetime

def analyze_nic_cl(domain, ip_address):
    """
    --- ¡NUEVO! ---
    Realiza un análisis especializado para dominios .cl consultando directamente a NIC Chile.
    """
    report = [f"🔍 *Análisis para dominio chileno:* `{domain}` ({ip_address})\n"]
    
    # --- 1. WHOIS específico para NIC Chile ---
    try:
        report.append("--- 🇨🇱 WHOIS (NIC Chile) ---")
        # Forzamos la consulta al servidor oficial de NIC Chile
        w = whois.whois(domain, server='whois.nic.cl')
        
        # El resultado de NIC.cl viene como un texto plano que debemos procesar
        # Es usual que no entregue datos del titular por privacidad.
        if w and w.text:
            lines = w.text.splitlines()
            # Buscamos las líneas que nos interesan
            for line in lines:
                if "Fecha de creación:" in line:
                    report.append(f"Creado: `{line.split(':')[1].strip()}`")
                if "Fecha de expiración:" in line:
                    report.append(f"Expira: `{line.split(':')[1].strip()}`")
                if "Servidores de nombre:" in line:
                    # Limpiamos y formateamos los servidores de nombres
                    ns_line = line.split(':')[1].strip()
                    ns_list = ', '.join(ns_line.split())
                    report.append(f"Servidores de Nombre: `{ns_list}`")
        else:
             report.append("⚠️ No se pudo obtener información detallada de NIC Chile.")
    except Exception as e:
        report.append(f"⚠️ Error al consultar a NIC Chile: {e}")
    
    report.append("") # Espacio
    
    # --- 2. Escaneo de Puertos Comunes (lo mantenemos para .cl) ---
    common_ports = {21:"FTP", 22:"SSH", 80:"HTTP", 443:"HTTPS", 3306:"MySQL", 8080:"HTTP-Proxy"}
    open_ports = []
    for port, service in common_ports.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        if sock.connect_ex((ip_address, port)) == 0:
            open_ports.append(f"✅ `{port}/{service}`")
        sock.close()
    
    report.append("--- 📡 Puertos Comunes ---")
    if open_ports:
        report.append("\n".join(open_ports))
    else:
        report.append("❌ No se encontraron puertos comunes abiertos.")
        
    return "\n".join(report)


def analyze_international_domain(domain, ip_address):
    """
    Realiza el análisis completo para dominios internacionales (no .cl).
    """
    report = [f"🔍 *Análisis para:* `{domain}` ({ip_address})\n"]

    # --- GeoIP, SSL, DNS, WHOIS, Puertos (como antes) ---
    try:
        geo_info = ipapi.location(ip=ip_address, output='json')
        report.append("--- 📍 GeoIP ---")
        report.append(f"País: `{geo_info.get('country_name', 'N/A')}`")
        report.append(f"Ciudad: `{geo_info.get('city', 'N/A')}, {geo_info.get('region', 'N/A')}`")
        report.append(f"ISP: `{geo_info.get('org', 'N/A')}`\n")
    except Exception as e:
        report.append("--- 📍 GeoIP ---\n⚠️ No se pudo obtener la información de geolocalización.\n")

    try:
        report.append("--- 🛡️ SSL & Servidor ---")
        headers = requests.head(f"https://{domain}", timeout=5, allow_redirects=True).headers
        report.append(f"Servidor Web: `{headers.get('Server', 'No identificado')}`")
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(5)
            s.connect((domain, 443))
            cert = s.getpeercert()
        issuer = dict(x[0] for x in cert.get('issuer', []))
        valid_to = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
        report.append(f"Certificado SSL emitido por: `{issuer.get('commonName', 'N/A')}`")
        report.append(f"Expira el: `{valid_to.strftime('%Y-%m-%d')}`\n")
    except Exception as e:
        report.append("⚠️ No se pudo obtener la información del servidor o certificado SSL.\n")

    try:
        report.append("--- 🌐 Registros DNS ---")
        a_records = ', '.join([str(r) for r in dns.resolver.resolve(domain, 'A')])
        report.append(f"*A (IPv4):* `{a_records}`")
        ns_records = ', '.join(sorted([str(r) for r in dns.resolver.resolve(domain, 'NS')]))
        report.append(f"*NS:* `{ns_records}`")
        mx_records = ', '.join(sorted([f'{r.preference} {r.exchange}' for r in dns.resolver.resolve(domain, 'MX')]))
        report.append(f"*MX (Correo):* `{mx_records}`\n")
    except Exception as e:
        report.append("⚠️ No se pudieron obtener todos los registros DNS.\n")

    try:
        report.append("--- ℹ️ WHOIS ---")
        w = whois.whois(domain)
        report.append(f"Registrador: `{w.registrar}`")
        creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
        expiration_date = w.expiration_date[0] if isinstance(w.expiration_date, list) else w.expiration_date
        report.append(f"Creado: `{creation_date.strftime('%Y-%m-%d') if creation_date else 'N/A'}`")
        report.append(f"Expira: `{expiration_date.strftime('%Y-%m-%d') if expiration_date else 'N/A'}`\n")
    except Exception as e:
        report.append("⚠️ No se pudo obtener la información de WHOIS.\n")
        
    common_ports = {21:"FTP", 22:"SSH", 80:"HTTP", 443:"HTTPS", 3306:"MySQL", 3389:"RDP", 8080:"HTTP-Proxy"}
    open_ports = []
    for port, service in common_ports.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        if sock.connect_ex((ip_address, port)) == 0:
            open_ports.append(f"✅ `{port}/{service}`")
        sock.close()
    
    report.append("--- 📡 Puertos Comunes ---")
    if open_ports:
        report.append("\n".join(open_ports))
    else:
        report.append("❌ No se encontraron puertos comunes abiertos.")

    return "\n".join(report)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python net_analyzer.py <dominio_o_ip>", file=sys.stderr)
        sys.exit(1)
    
    target = sys.argv[1].lower()
    
    try:
        ip_address = socket.gethostbyname(target)
        
        # --- ¡LÓGICA PRINCIPAL MEJORADA! ---
        # Decidimos qué función usar basándonos en la terminación del dominio.
        if target.endswith('.cl'):
            full_report = analyze_nic_cl(target, ip_address)
        else:
            full_report = analyze_international_domain(target, ip_address)
            
        print(full_report)
        
    except socket.gaierror:
        print(f"❌ No se pudo resolver el dominio '{target}'. ¿Está escrito correctamente?", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Ocurrió un error inesperado durante el análisis: {e}", file=sys.stderr)
        sys.exit(1)
