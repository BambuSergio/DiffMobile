# DiffMobile

Una aplicación móvil para comparación y diferencia de textos/archivos, construida con React Native y Expo.

## Características

- **Comparación lado a lado**: Pega o carga dos textos/archivos para compararlos
- **Diferencias a nivel de carácter**: Solo se resaltan los caracteres diferentes, no líneas completas
- **Código de colores**:
  - 🟢 Verde: Contenido agregado
  - 🔴 Rojo: Contenido eliminado
  - 🟡 Amarillo: Contenido modificado
- **Acciones rápidas**:
  - Copiar líneas diferentes individualmente
  - Copiar el texto resultante completo (en ambas direcciones)
  - Aceptar cambios en cualquiera de las direcciones
  - Guardar resultados como archivos
  - Exportar en formato diff unificado
- **Internacionalización**: Detecta automáticamente el idioma del dispositivo (español/inglés) con opción de anulación manual en configuración
- **Configuración personalizable**:
  - Selección de idioma (Automático/Inglés/Español)
  - Tema (Sistema/Claro/Oscuro)
  - Tamaño de texto (Pequeño/Mediano/Grande)
  - Opciones de diff (ignorar espacios en blanco, mayúsculas/minúsculas, líneas vacías)

## Instalación

Ir a la [página de lanzamientos de GitHub](https://github.com/BambuSergio/DiffMobile/releases).


## Probándo app con Expo sin instalarla

### Requisitos Previos

- Node.js
- Expo CLI (`npx expo`)
- Emulador Android o dispositivo físico con la app Expo Go

### Ejecutar la Aplicación

```bash
# Iniciar servidor de desarrollo Expo
npx expo start
```

## Estructura del Proyecto

```
DiffMobile/
├── app/                    # Pantallas de Expo Router
│   ├── _layout.tsx         # Layout raíz con navegación
│   ├── index.tsx           # Pantalla principal de comparación
│   ├── settings.tsx        # Pantalla de configuración
│   └── modal.tsx           # Plantilla de pantalla modal
├── components/             # Componentes de UI reutilizables
│   └── DiffResultView.tsx  # Visualización de resultados diff
├── constants/              # Constantes de la aplicación
│   └── theme.ts            # Colores y estilos del tema
├── locales/                # Archivos de traducción i18n
│   ├── en.json             # Traducciones al inglés
│   └── es.json             # Traducciones al español
├── store/                  # Gestión de estado (Zustand)
│   └── appStore.ts         # Estado global de la app
├── types/                  # Tipos de TypeScript
│   └── diff.ts             # Tipos relacionados con diff
├── utils/                  # Funciones de utilidad
│   ├── diffEngine.ts       # Motor de cálculo diff
│   └── i18n.ts             # Configuración de i18n
└── assets/                 # Activos estáticos
    └── images/             # Iconos e imágenes de la app
```

## Stack Tecnológico

- **React Native** - Framework móvil
- **Expo** - Plataforma de desarrollo
- **TypeScript** - Seguridad de tipos
- **Zustand** - Gestión de estado
- **i18next** - Internacionalización
- **expo-router** - Enrutamiento basado en archivos
- **diff** - Biblioteca de cálculo diff

## Licencia

MIT
