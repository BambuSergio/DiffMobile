# Script de inicio optimizado para Termux con límites de inotify
#!/bin/bash

echo "Iniciando Expo con configuración optimizada para Termux..."

# Matar cualquier proceso existente
pkill -f "node.*expo|metro|npm" >/dev/null 2>&1
sleep 2

# Limpiar cachés
rm -rf .expo .metro >/dev/null 2>&1

# Iniciar con la configuración más restrictiva posible
echo "Iniciando Metro Bundler con watch folders limitados..."
MAX_WATCHERS=262144 npx expo start --dev-client \
  --max-workers 0 \
  2>&1 | tee expo.log &

EXPO_PID=$!
echo "Expo iniciado con PID: $EXPO_PID"

# Esperar un momento para ver si inicia correctamente
sleep 5

# Verificar si está corriendo
if ps -p $EXPO_PID > /dev/null; then
  echo "Expo está ejecutándose correctamente"
  echo "Para ver los logs: tail -f expo.log"
  echo "Para detener: kill $EXPO_PID"
else
  echo "Expo falló al iniciar. Revisando logs:"
  tail -20 expo.log
fi