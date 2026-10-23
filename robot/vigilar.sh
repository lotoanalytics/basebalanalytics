#!/usr/bin/env bash
# =====================================================================
# MODO VIGILANTE del robot de béisbol
# =====================================================================
# Se queda ENCENDIDO y corre el robot cada CADA_MINUTOS (por defecto 5)
# hasta la hora VIGILAR_HASTA (hora RD, por defecto 00:00 = medianoche).
# Para detenerlo antes: en GitHub, pestaña Actions -> la corrida
# "Robot vigilante" -> botón "Cancel workflow".
# Cada vuelta es una corrida normal del robot (con todas sus protecciones):
# mira los horarios guardados y busca solo lo que toca.
# Tope de seguridad: 5 h 40 min (GitHub corta cualquier corrida a las 6 h).
# =====================================================================
set -u
HASTA="${VIGILAR_HASTA:-00:00}"
CADA="${CADA_MINUTOS:-5}"
hoy_rd=$(TZ=America/Santo_Domingo date +%F)
fin=$(TZ=America/Santo_Domingo date -d "$hoy_rd $HASTA" +%s)
ahora=$(date +%s)
if [ "$fin" -le "$ahora" ]; then fin=$((fin + 86400)); fi       # 00:00 = la medianoche que viene
tope=$((ahora + 340 * 60)); [ "$fin" -gt "$tope" ] && fin=$tope
echo "[vigilante] Encendido. Corre el robot cada $CADA min hasta las $(TZ=America/Santo_Domingo date -d @"$fin" '+%I:%M %p') hora RD."

mkdir -p registro
: > registro/vigilante.txt

guardar_registro() {   # sube lo que va diciendo el robot a la rama "exploracion"
  [ -d expl/.git ] || return 0
  mkdir -p expl/registro && cp registro/* expl/registro/
  (cd expl && git add -A registro && git commit -qm "Vigilante $(date -u +%F_%H%M)" && git push -q origin HEAD:exploracion) >/dev/null 2>&1 || true
}

vuelta=0
while [ "$(date +%s)" -lt "$fin" ]; do
  vuelta=$((vuelta + 1))
  echo "===== Vuelta $vuelta · $(TZ=America/Santo_Domingo date '+%I:%M %p') hora RD =====" | tee -a registro/vigilante.txt
  node robot/robot-beisbol.js 2>&1 | tee registro/ultima-corrida.txt >> registro/vigilante.txt
  tail -n 12 registro/ultima-corrida.txt
  guardar_registro
  resto=$((fin - $(date +%s))); [ "$resto" -le 0 ] && break
  espera=$((CADA * 60)); [ "$espera" -gt "$resto" ] && espera=$resto
  sleep "$espera"
done
echo "[vigilante] Llegó la hora de apagarse. $vuelta vuelta(s) hechas." | tee -a registro/vigilante.txt
guardar_registro
