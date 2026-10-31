# pacman-atlas

## Atlas inmersivo — 31/10/2026

Versión aprobada para publicación en https://franciscofs.github.io/pacman-atlas/, desde main/raíz. Se conserva la anterior en publica-movil-v1 y esta entrega en inmersiva-v1. Vista1/2modelos, controles comunes y paletas original/Jet/Blue–White–Red. Las notas siguientes registran las pruebas previas a la publicación.

Auditoría de regresiones: corregido selector de eventos de1/2modelos, que también capturaba workspace[data-layout] al hacer clic en distribución/controles descendientes y aplicaba .active al fondo. Ahora se vincula solo a button[data-layout]. Ocultar mapas elimina también la ventana compartida de escalas, sin contenedor vacío. QA32combinaciones (1440×900/390×844 ×claro/oscuro ×1/2modelos ×mapas on/off ×distribución abierta/cerrada) +12depaletas/regiones: sin fallos. Evidencia ../qa_inmersivo_regresiones.json y ../inmersivo_bugs_corregidos.png. Sin errores de consola; prueba local, Pages intacto.

Tercera pasada: modelos sobre fondo completo, sin recorte por mitad o por tarjeta. Cada canvas usa el viewport entero; proyección desplazada ±0,5 en modo doble, mismo aspecto físico y ajuste inicial por pantalla. Controles sobrepuestos en capa superior. Superficie común de interacción, hit-test sobre geometría proyectada para elegir modelo (donante encima si se solapan), giro con captura de puntero y selección RMSE en coordenadas del fondo. Zoom compartido mantiene ambos dentro del mismo fondo; solo limita el borde de pantalla. QA PC1440×900/móvil390×844, canvas completo, selección puntual0,096→región0,104mm, zoom/giro/reset/1–2/paletas sin errores.

Segunda pasada: selector1/2 modelos simultáneos, con cámara/vista/zoom/reset comunes en modo doble; se ocultan pestañas y controles duplicados. Capas y paleta compartidas. Paletas original, Jet continuo y Blue–White–Red (azul–blanco–rojo), con leyendas generadas por la misma función del mapa. Dos escalas agrupadas (RMSEmm y frecuencia%), datos/contraste/rangos intactos. Al volver a uno se restauran sus controles y leyendas. QA1440×900/390×844/360×740, regiones, cámaras, paletas y retorno1/2; sin erroresJS ni overflow. No publicado.

Rama de desarrollo prueba-inmersiva, worktree oats_demo/inmersivo. Preview http://localhost:8094/ (servidor Node). Base pública9cc0035 preservada con etiqueta publica-movil-v1.

Una escena 3D con selector receptor/donantes, región y controles flotantes; tema oscuro inicial con preferencia propia. Capas de mapa y marcadores activables. Resultados, datos y ranking originales; sin transparencia ni nuevas geometrías/parches en esta primera variante. CSS específico en inmersivo.css.

QA1440×900,390×844 y360×740: modelos, selector región, capas, tema, distribución y selección puntual→quitar selección verificados; DLFC0,104, DMFC0,099 y puntoDLFC0,103mm. Consola sin errores y sintaxisJS verificada. La geometría no se deforma; es el mismo visor y mismo dataset.

## Rama de prueba: publico-limpio

Alternativa oscura local: botón de cabecera alterna claro/oscuro y recuerda preferencia en localStorage; mapa/iluminación/cálculos se conservan. Tema noche #101c2c. Datos del estudio reducido a explicación general de cohorte y mapas. Pendiente sincronizar estos ajustes locales con GitHub.

Prueba local de paleta30/10: fondo gris frío #f1f5f9, texto azul oscuro; colores de mapas intactos. Variables al inicio de style.css; paleta anterior conservada mediante html[data-theme="marfil"]. Botón de quitar punto ahora junto al estado del receptor. Estos dos ajustes locales aún no sincronizados con GitHub.

Pasada de legibilidad tras auditoría (30/10): CSS consolidado, leyendas13px, controles de cámara/zoom44px y texto secundario #4d6570. Resumen de receptor/RMSE/origen antes de los modelos; zoom explícito +/− en ambas superficies. Escena abierta y selector móvil conservados. QA1440×900/390×844 sin desborde horizontal; resumen dentro del primer pantallazo, selección regional, contraste, zoom, cámaras, distribución y diálogo funcionales; consola sin errores. Datos y cálculos conservados. Preview http://localhost:8092/; producción sigue en main.

Diseño de escena abierta (30/10): se eliminan tarjetas y divisores entre modelos, se compactan título/cabecera y las superficies ocupan una escena de hasta65vh en escritorio. Cámara inicial3,2 con ajuste por aspect ratio para evitar recortes al estrechar la ventana; proporciones físicas conservadas. Pantallas≤850px usan selector Receptor/Donantes con un modelo a ancho completo. Resumen numérico en una franja; barras bajo Ver distribución de los donantes, plegado inicialmente. Método/datos accesibles desde cabecera. QA: PMFC0,092mm, acordeón y modal funcionales,390px sin desborde/un modelo visible, selector cambia superficie y mantiene resultados; clic puntual en ventana normal0,102mm. Consola sin errores.

Variante de interfaz para el público del congreso. Conserva los mismos datos y cálculos que main. Presenta dos modelos grandes y resultados encima; los controles usan nombres anatómicos, los detalles científicos se consultan en Datos del estudio. No se ha fusionado con main ni cambiado la publicación de GitHub Pages.

Colores actualizados el30/10/2026 por solicitud del usuario: receptor azul intenso→azul claro→blanco (#08519C/#6BAED6/#FFFFFF), donante blanco→naranja claro→naranja intenso (#FFFFFF/#FDAE6B/#A63603), mismas paradas que las figuras finales. Configuración en COLOR_CONFIG dentro de app.js; límites calculados en update(). Los límites son locales: RMSE mínimo–máximo de la región receptora; frecuencia0–máximo del campo donante suavizado de la selección actual (región o punto). Tocar un punto conserva el rangoRMSE de su región, pues el mapa receptor sigue mostrando esa región. Cifras/unidades en los extremos y nota de que colores entre selecciones no implican valores iguales. Campos crudos, conteos, medias ySD intactos. El RMSE se dibuja sin el suavizadoσ1 de las figuras; la malla/iluminación simplificadas también pueden cambiar el acabado.

Contraste del receptor (30/10): selector Lineal / Ampliado, ampliado por defecto. Transforma solo el color mediante log(1+9t)/log(10), con t=(RMSE−mínimo)/(máximo−mínimo). Conserva rango, valores y ranking. El tick central invierte esa transformación y muestra mm originales. En DLFC, extremos0,077–0,166mm, punto medio de color0,121mm lineal frente a0,098mm ampliado; media0,104mm invariable y mapa donante sin cambios. El modo ampliado separa los errores bajos y comprime los altos. La frecuencia donante sigue lineal.

Vista previa local desde la raíz del proyecto: servir oats_demo/publico en el puerto8092. Revisión29/10/2026: cinco medias regionales idénticas, selección puntual y modal de soporte/SD funcionales, pantalla390px sin desborde horizontal y consola sin errores.
Atlas interactivo de congruencia osteocondral · Tangente 3D · cohorte de 35 fémures
