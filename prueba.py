import datetime

def tiempo_para_siguiente_clase(horario):
    """
    Recibe una lista de strings con el horario en formato 'HH:MM' (24hrs) y regresa el tiempo faltante para la siguiente clase.
    """

    ahora = datetime.datetime.now()
    hoy = ahora.date()
    horarios_dt = []
    for h in horario:
        try:
            hora, minuto = map(int, h.split(":"))
            hora_clase = datetime.datetime.combine(hoy, datetime.time(hora, minuto))
            if hora_clase >= ahora:
                horarios_dt.append(hora_clase)
        except:
            print(f"Formato inválido en '{h}'. Usa 'HH:MM'.")

    if not horarios_dt:
        print("No quedan clases hoy.")
        return

    siguiente = min(horarios_dt)
    tiempo_restante = siguiente - ahora
    horas, resto = divmod(int(tiempo_restante.total_seconds()), 3600)
    minutos = resto // 60

    print(f"Tu siguiente clase es a las {siguiente.strftime('%H:%M')}. Faltan {horas} horas y {minutos} minutos.")

# EJEMPLO DE USO:
# Cambia los horarios a los tuyos
horario = ["07:00", "09:30", "13:30", "16:00"]
tiempo_para_siguiente_clase(horario)