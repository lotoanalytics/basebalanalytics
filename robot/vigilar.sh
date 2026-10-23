#!/usr/bin/env bash
# =====================================================================
# ROBOT VIGILANTE (se queda encendido)
# =====================================================================
# Enciende el robot en MODO EN VIVO: el Chrome se queda abierto y el juego
# en vivo se revisa cada CADA_SEGUNDOS (por defecto 30) hasta VIGILAR_HASTA
# (hora RD, por defecto 00:00 = medianoche). Resultados y posiciones se
# buscan cada ~2 minutos o cuando termina un juego.
# Si el robot se cae o se pega, este archivo lo vuelve a encender solo.
# Para detenerlo antes: GitHub -> Actions -> "Robot vigilante" -> "Cancel workflow".
# Tope de seguridad: 5 h 40 min (GitHub corta cualquier corrida a las 6 h).
# =====================================================================
set -u
export MODO_VIVO=1
export VIGILAR_HASTA="${VIGILAR_HASTA:-00:00}"
export CADA_SEGUNDOS="${CADA_SEGUNDOS:-30}"
hoy_rd=$(TZ=America/Santo_Domingo date +%F)
fin=$(TZ=America/Santo_Domingo date -d "$hoy_rd $VIGILAR_HASTA" +%s)
ahora=$(date +%s)
if [ "$fin" -le "$ahora" ]; then fin=$((fin + 86400)); fi
tope=$((ahora + 340 * 60)); [ "$fin" -gt "$tope" ] && fin=$tope
echo "[vigilante] Encendido: cada $CADA_SEGUNDOS s hasta las $(TZ=America/Santo_Domingo date -d @"$fin" '+%I:%M %p') hora RD."

mkdir -p registro
: > registro/vigilante.txt

guardar_registro() {   # sube lo que va diciendo el robot a la rama "exploracion"
  [ -d expl/.git ] || return 0
  mkdir -p expl/registro && tail -n 400 registro/vigilante.txt > expl/registro/vigilante.txt
  (cd expl && git add -A registro && git commit -qm "Vigilante $(date -u +%F_%H%M)" && git push -q origin HEAD:exploracion) >/dev/null 2>&1 || true
}
# Cada 2 minutos se sube el registro (en segundo plano)
( while true; do sleep 120; guardar_registro; done ) &
SUBIDOR=$!
trap 'kill $SUBIDOR 2>/dev/null; guardar_registro' EXIT

arranques=0
while [ "$(date +%s)" -lt "$((fin - 30))" ]; do
  arranques=$((arranques + 1))
  # Toma la versión más nueva del robot cada vez que lo enciende
  git fetch -q origin main 2>/dev/null && git checkout -q origin/main -- robot/robot-beisbol.js 2>/dev/null || true
  echo "===== Encendido #$arranques · $(TZ=America/Santo_Domingo date '+%I:%M %p') hora RD =====" | tee -a registro/vigilante.txt
  node robot/robot-beisbol.js 2>&1 | grep --line-buffered -v "^  (prueba)" | tee -a registro/vigilante.txt
  [ "$(date +%s)" -ge "$((fin - 30))" ] && break
  echo "[vigilante] El robot se detuvo; se vuelve a encender en 10 s." | tee -a registro/vigilante.txt
  sleep 10
done
echo "[vigilante] Llegó la hora de apagarse." | tee -a registro/vigilante.txt
