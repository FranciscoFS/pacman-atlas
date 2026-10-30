# pacman-atlas

## Rama de prueba: publico-limpio

Variante de interfaz para el público del congreso. Conserva los mismos datos y cálculos que main. Presenta dos modelos grandes y resultados debajo; los controles usan nombres anatómicos, los detalles científicos se consultan en Datos del estudio. No se ha fusionado con main ni cambiado la publicación de GitHub Pages.

Colores actualizados el30/10/2026 por solicitud del usuario: receptor azul intenso→azul claro→blanco (#08519C/#6BAED6/#FFFFFF), donante blanco→naranja claro→naranja intenso (#FFFFFF/#FDAE6B/#A63603), mismas paradas que las figuras finales. Configuración en COLOR_CONFIG dentro de app.js; límites calculados en update(). Ambas escalas son lineales y locales: RMSE mínimo–máximo de la región receptora; frecuencia0–máximo del campo donante suavizado de la selección actual (región o punto). Tocar un punto conserva el rangoRMSE de su región, pues el mapa receptor sigue mostrando esa región. Cifras/unidades en los extremos y nota de que colores entre selecciones no implican valores iguales. Campos crudos, conteos, medias ySD intactos. El RMSE se dibuja sin el suavizadoσ1 de las figuras; la malla/iluminación simplificadas también pueden cambiar el acabado.

Vista previa local desde la raíz del proyecto: servir oats_demo/publico en el puerto8092. Revisión29/10/2026: cinco medias regionales idénticas, selección puntual y modal de soporte/SD funcionales, pantalla390px sin desborde horizontal y consola sin errores.
Atlas interactivo de congruencia osteocondral · Tangente 3D · cohorte de 35 fémures
