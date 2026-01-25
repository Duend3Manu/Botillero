import sys
import socket
import whois
import dns.resolver
import ipapi
import requests
import io
import ssl
import threading
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import re
from Wappalyzer import Wappalyzer, WebPage

socket.setdefaulttimeout(10)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuración de constantes
COMMON_PORTS = {
    21: ("FTP", "Tráfico no cifrado.", "[!]"),
    22: ("SSH", "Acceso seguro.", "[OK]"),
    23: ("Telnet", "¡Protocolo inseguro! Debe cerrarse.", "[!!]"),
    80: ("HTTP", "Tráfico web no cifrado.", "[!]"),
    443: ("HTTPS", "Tráfico web seguro.", "[OK]"),
    3306: ("MySQL", "No debería estar expuesto a internet.", "[!!]"),
    3389: ("RDP", "Escritorio Remoto. Riesgo alto si no está securizado.", "[!]"),
    8080: ("HTTP-Proxy", "Proxy o servidor alternativo.", "[OK]")
}

MAX_SUBDOMAINS = 15  # Limitar resultados de subdominios
PORT_SCAN_TIMEOUT = 1.0
MAX_THREADS = 8

def is_valid_domain_or_ip(target):
    """
    Valida si el target es un dominio o IP válido.
    Retorna: (es_valido, es_ip, mensaje_error)
    """
    # Intentar validar como IP
    try:
        from ipaddress import ip_address
        ip_address(target)
        return True, True, None
    except ValueError:
        pass
    
    # Validar como dominio - patrón más flexible
    # Debe tener al menos un punto y caracteres válidos
    if '.' in target and len(target) > 3:
        # Verificar caracteres válidos (letras, números, guiones, puntos)
        if re.match(r'^[a-z0-9.-]+\.[a-z0-9-]+$', target, re.IGNORECASE):
            return True, False, None
    
    return False, False, f"'{target}' no es un dominio o IP válido."

def check_for_cdn(ip_address):
    """
    Verifica si la IP pertenece a un CDN conocido como Cloudflare.
    """
    try:
        geo_info = ipapi.location(ip=ip_address, output='json')
        isp = geo_info.get('org', '').lower()
        if 'cloudflare' in isp:
            return "[SHIELD] *Advertencia:* Este dominio está protegido por Cloudflare. El escaneo de puertos reflejará los servidores de Cloudflare, no el servidor de origen."
    except Exception:
        return None
    return None

def scan_single_port(ip_address, port):
    """
    Escanea un puerto individual de forma optimizada.
    Retorna: (puerto, servicio, consejo, emoji) si está abierto, None si está cerrado
    """
    service, advice, emoji = COMMON_PORTS.get(port, (f"Port {port}", "Servicio desconocido.", "❓"))
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(PORT_SCAN_TIMEOUT)
            if sock.connect_ex((ip_address, port)) == 0:
                return (port, service, advice, emoji)
    except (socket.timeout, socket.error):
        pass
    return None

def detailed_port_scan(ip_address):
    """
    Escanea puertos comunes usando threading para mayor velocidad.
    """
    report = ["\n--- PORT SCAN ---"]
    open_ports_details = []
    
    # Usar ThreadPoolExecutor para paralelizar el escaneo
    with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
        futures = {executor.submit(scan_single_port, ip_address, port): port for port in COMMON_PORTS.keys()}
        
        for future in as_completed(futures):
            result = future.result()
            if result:
                port, service, advice, marker = result
                open_ports_details.append(f"{marker} `{port}/{service}`: {advice}")
    
    if open_ports_details:
        report.extend(sorted(open_ports_details))
    else:
        report.append("[OK] ¡Excelente! No se encontraron puertos de riesgo comunes abiertos.")
        
    return "\n".join(report)

def analyze_security_headers_and_ssl(domain):
    """
    Analiza cabeceras de seguridad y certificado SSL/TLS.
    """
    report = ["\n--- SSL/SECURITY HEADERS ---"]
    try:
        # Intentar HTTPS primero
        response = requests.get(f"https://{domain}", timeout=5, allow_redirects=True, verify=True)
        headers = response.headers
        report.append(f"Servidor Web: `{headers.get('Server', 'No identificado')}`")

        # Cabeceras de seguridad
        security_headers = {
            "Strict-Transport-Security": "[OK] Previene ataques Man-in-the-Middle.",
            "Content-Security-Policy": "[OK] Ayuda a prevenir XSS.",
            "X-Frame-Options": "[OK] Previene Clickjacking.",
            "X-Content-Type-Options": "[OK] Previene ataques de tipo MIME."
        }
        
        found_headers = [f"  - `{header}`: {desc}" for header, desc in security_headers.items() if header in headers]
        
        if found_headers:
            report.append("Cabeceras de Seguridad Encontradas:")
            report.extend(found_headers)
        else:
            report.append("[!] No se encontraron cabeceras de seguridad comunes.")

        # Análisis del certificado SSL
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    expire_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_left = (expire_date - datetime.now()).days
                    status = "[OK] Válido" if days_left > 30 else f"[!] Expira pronto"
                    report.append(f"Certificado SSL: {status}, expira en `{days_left}` días.")
        except ssl.SSLCertVerificationError:
            report.append("[X] Certificado SSL: Inválido o no confiable.")
        except ssl.SSLError as e:
            report.append(f"[!] Error SSL: {str(e)[:80]}")

    except requests.exceptions.ConnectionError:
        report.append("[!] No se pudo conectar (HTTPS no disponible, intentando HTTP)")
        try:
            response = requests.get(f"http://{domain}", timeout=5)
            report.append(f"[OK] HTTP disponible (no seguro)")
        except:
            report.append("[X] No se pudo conectar por HTTP ni HTTPS")
    except requests.exceptions.Timeout:
        report.append("[!] Timeout al conectar (servidor no responde rápido)")
    except Exception as e:
        report.append(f"[!] Error al analizar SSL/Headers: {str(e)[:80]}")
    
    return "\n".join(report)

def detect_technologies(domain):
    """
    Detecta tecnologías usando Wappalyzer con mejor manejo de errores.
    """
    report = ["\n--- TECHNOLOGIES DETECTED ---"]
    try:
        wappalyzer = Wappalyzer.latest()
        webpage = WebPage.new_from_url(f"https://{domain}", timeout=5)
        technologies = wappalyzer.analyze(webpage)
        
        if technologies:
            tech_list = [f"`{tech}`" for tech in sorted(technologies)[:15]]  # Limitar a 15
            report.append(", ".join(tech_list))
        else:
            report.append("No se detectaron tecnologías específicas.")
    except requests.exceptions.Timeout:
        report.append("[!] Timeout en detección de tecnologías")
    except Exception:
        report.append("[!] No se pudieron detectar tecnologías.")
    return "\n".join(report)

def get_manual_nic_cl_whois(domain):
    """
    [FUNCIÓN ELIMINADA - Ya no es necesaria con mejor manejo de errores]
    """
    pass

def find_subdomains(domain):
    """
    Busca subdominios usando crt.sh con límite de resultados.
    """
    report = ["\n--- SUBDOMAINS FOUND (crt.sh) ---"]
    try:
        response = requests.get(f"https://crt.sh/?q=%.{domain}&output=json", timeout=10)
        response.raise_for_status()
        subdomains = set()
        
        for entry in response.json():
            name_value = entry.get('name_value', '').lower().strip()
            subdomains.update(name.strip() for name in name_value.split('\n') if name.strip())
        
        # Filtrar subdominios válidos
        filtered_subdomains = sorted([s for s in subdomains if s != domain and '*' not in s])
        
        if filtered_subdomains:
            # Limitar a MAX_SUBDOMAINS
            displayed = filtered_subdomains[:MAX_SUBDOMAINS]
            report.append(f"Se encontraron {len(filtered_subdomains)} subdominios (mostrando {len(displayed)}):")
            report.extend(f"- `{s}`" for s in displayed)
            if len(filtered_subdomains) > MAX_SUBDOMAINS:
                report.append(f"_... y {len(filtered_subdomains) - MAX_SUBDOMAINS} más_")
        else:
            report.append("No se encontraron subdominios adicionales.")
    except requests.exceptions.Timeout:
        report.append("[!] La búsqueda de subdominios excedió el tiempo de espera.")
    except requests.exceptions.HTTPError as e:
        report.append(f"[!] Error {e.response.status_code} desde crt.sh")
    except Exception:
        report.append("[!] No se pudo realizar la búsqueda de subdominios.")
    return "\n".join(report)

def analyze_nic_cl(domain, ip_address):
    """
    Analiza dominios chilenos (.cl) con WHOIS de NIC Chile.
    """
    report = [f"[SEARCH] *Análisis para dominio chileno:* `{domain}` ({ip_address})\n"]
    
    # Verificar CDN
    cdn_warning = check_for_cdn(ip_address)
    if cdn_warning:
        report.append(cdn_warning)

    try:
        report.append("\n--- WHOIS ---")
        w = whois.whois(domain)
        if w.domain_name:
            creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
            expiration_date = w.expiration_date[0] if isinstance(w.expiration_date, list) else w.expiration_date
            report.append(f"Creado: `{creation_date}`\nExpira: `{expiration_date}`")
        else:
            report.append(f"[!] No se encontró información WHOIS para `{domain}`.")
    except socket.timeout:
        report.append("[!] Timeout en consulta WHOIS (servidor lento)")
    except Exception:
        report.append("[!] No se pudo obtener información WHOIS (continuando...)")
    
    # Análisis adicionales
    report.append(analyze_security_headers_and_ssl(domain))
    report.append(detailed_port_scan(ip_address))
    report.append(detect_technologies(domain))
    report.append(find_subdomains(domain))
    return "\n".join(report)

def analyze_international_domain(domain, ip_address):
    """
    Analiza dominios internacionales con WHOIS genérico.
    """
    report = [f"[SEARCH] *Análisis para:* `{domain}` ({ip_address})\n"]
    
    cdn_warning = check_for_cdn(ip_address)
    if cdn_warning:
        report.append(cdn_warning)
        
    try:
        report.append("\n--- WHOIS (Internacional) ---")
        w = whois.whois(domain)
        if w.domain_name:
            creation_date = w.creation_date[0] if isinstance(w.creation_date, list) else w.creation_date
            expiration_date = w.expiration_date[0] if isinstance(w.expiration_date, list) else w.expiration_date
            report.append(f"Creado: `{creation_date}`\nExpira: `{expiration_date}`")
        else:
            report.append(f"[!] No se encontró información WHOIS para `{domain}`.")
    except socket.timeout:
        report.append("[!] Timeout en consulta WHOIS")
    except Exception:
        report.append("[!] No se pudo obtener información WHOIS (continuando...)")

    # Análisis adicionales
    report.append(analyze_security_headers_and_ssl(domain))
    report.append(detailed_port_scan(ip_address))
    report.append(detect_technologies(domain))
    report.append(find_subdomains(domain))
    return "\n".join(report)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python net_analyzer.py <dominio_o_ip>", file=sys.stderr)
        sys.exit(1)
    
    target = sys.argv[1].lower().strip()
    
    # Validar entrada
    es_valido, es_ip, error = is_valid_domain_or_ip(target)
    if not es_valido:
        print(f"[ERROR] {error}", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Resolver IP si es dominio
        if not es_ip:
            ip_address_str = socket.gethostbyname(target)
        else:
            ip_address_str = target
            try:
                target = socket.gethostbyaddr(target)[0]  # Intentar obtener dominio de la IP
            except socket.herror:
                pass  # Si no se puede resolver, mantener la IP
        
        # Ejecutar análisis apropiado
        if target.endswith('.cl'):
            full_report = analyze_nic_cl(target, ip_address_str)
        else:
            full_report = analyze_international_domain(target, ip_address_str)
            
        print(full_report)
        
    except socket.gaierror:
        print(f"[ERROR] No se pudo resolver '{target}'. Verifica que el dominio sea correcto.")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {str(e)[:150]}")
        sys.exit(1)