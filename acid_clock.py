import time, os, sys, random
from datetime import datetime
try:
    from colorama import init, Fore, Style, Back
except ImportError:
    print(">> Error: Falta instalar 'colorama'. Ejecuta: pip install colorama")
    sys.exit(1)

# Inicializa colorama para Windows/Linux/Mac
init(autoreset=True)

# --- CONFIGURACIÓN DE ESTILO---
# Paleta de colores neón y vibrantes (Morado, Cian, Rosa, Verde, Azul)
LSD_PALETTE = [
    Fore.MAGENTA, Fore.CYAN, Fore.LIGHTRED_EX, Fore.LIGHTGREEN_EX, 
    Fore.LIGHTBLUE_EX, Fore.LIGHTMAGENTA_EX, Fore.LIGHTCYAN_EX
]

# --- DICCIONARIO DE ARTE ASCII PARA NÚMEROS ---
# Usamos bloques heavy para que el color 'pegue' más.
ASCII_NUMBERS = {
    '0': ["  ███  ", " ██ ██ ", " ██ ██ ", " ██ ██ ", "  ███  "],
    '1': ["   ██  ", "  ███  ", "   ██  ", "   ██  ", "  ████ "],
    '2': [" ████  ", "    ██ ", "  ███  ", " ██    ", " █████ "],
    '3': [" ████  ", "    ██ ", "  ███  ", "    ██ ", " ████  "],
    '4': [" ██  ██", " ██  ██", " █████ ", "     ██", "     ██"],
    '5': [" █████ ", " ██    ", " ████  ", "     ██", " ████  "],
    '6': ["  ████ ", " ██    ", " ████  ", " ██  ██", "  ████ "],
    '7': [" █████ ", "    ██ ", "   ██  ", "  ██   ", " ██    "],
    '8': ["  ███  ", " ██ ██ ", "  ███  ", " ██ ██ ", "  ███  "],
    '9': ["  ████ ", " ██  ██", "  ████ ", "     ██", "  ████ "],
    ':': ["       ", "   █   ", "       ", "   █   ", "       "]
}

def get_lsd_color():
    """Devuelve un color aleatorio de la paleta."""
    return random.choice(LSD_PALETTE)

def draw_lsd_clock():
    now = datetime.now()
    time_str = now.strftime("%H:%M:%S")
    
    os.system('cls' if os.name == 'nt' else 'clear') # Limpia terminal
    
    print(f"\n{Style.BRIGHT}{get_lsd_color()}   >>> [ LSD ASCII CLOCK ] <<< {Style.RESET_ALL}")
    print(f"       {now.strftime('%d/%m/%Y')}\n")
    
    # Dibujamos los números línea por línea
    for row in range(5):
        output_row = "   " # Margen izquierdo
        for char in time_str:
            # Para cada caracter, elegimos un color aleatorio
            # Esto crea el efecto de 'trip' y degradado
            color = get_lsd_color()
            output_row += f"{color}{ASCII_NUMBERS[char][row]}{Style.RESET_ALL}"
            output_row += " " # Espacio entre números
        print(output_row)
    
    print(f"\n   >> Real Time: {time_str}")

try:
    while True:
        draw_lsd_clock()
        # Refrescamos rápido (0.2s) para que el color 'baile' constantemente
        time.sleep(0.2) 
except KeyboardInterrupt:
    print(f"\n{Back.MAGENTA}{Fore.WHITE} [!] SISTEMA DESCONECTADO. CORTANDO VIAJE. {RESET_ALL}")