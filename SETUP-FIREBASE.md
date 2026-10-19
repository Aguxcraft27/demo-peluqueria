# Pasar del modo demo al modo real (Firebase)

En modo demo cada celular guarda sus propias reservas. En modo real, todas las reservas van a la misma base y el peluquero las ve en el panel desde cualquier lado. Firebase tiene un plan gratis (Spark) que no pide tarjeta.

> Al crear la cuenta, leé los términos de Google y Firebase. Si alguno pide ser mayor de 18, frená y hacelo con un adulto.

## 1. Crear el proyecto (una sola vez, ~10 min)
1. Entrá a https://console.firebase.google.com con tu Gmail y tocá **Crear proyecto**. Ponele un nombre, por ejemplo `turnos-fray-bentos`, y desactivá Google Analytics.
2. **Firestore:** menú *Compilación → Firestore Database → Crear base de datos*. Elegí la ubicación `southamerica-east1` (São Paulo) y arrancá en **modo producción**.
3. **Reglas:** en la pestaña *Reglas* de Firestore, pegá el contenido de `firestore.rules`. Cambiá `peluquero@ejemplo.com` por el email del local y tocá **Publicar**.
4. **Login:** menú *Compilación → Authentication → Comenzar → Correo electrónico/contraseña*. Activalo (solo la primera opción).
   - En *Usuarios → Agregar usuario*, creá el usuario del peluquero con su email y una contraseña. Esa contraseña se la das solo a él.
   - En *Configuración → Dominios autorizados*, agregá `aguxcraft27.github.io`, o el dominio donde esté la página.
5. **App web:** en *Configuración del proyecto* (el engranaje) → *Tus apps* → ícono `</>`, registrá la app y copiá el objeto `firebaseConfig`.

## 2. Conectar la página
En `negocio.js`:
```js
firebase: { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." },
admins: ["email-del-peluquero@gmail.com"]
```
La `apiKey` de Firebase no es secreta, puede estar en la página. Lo que protege los datos son las reglas del paso 3. Subí los cambios y listo.

## 3. Varios clientes
Cada peluquería usa su propio `id` en `negocio.js`, y sus datos quedan separados en `negocios/<id>`. Se puede usar el mismo proyecto de Firebase para varias: hay que sumar el email de cada peluquero en `admins()` de las reglas. Si son muchas, conviene un proyecto por cliente.

## Qué protege y qué no
- Nadie de afuera puede ver la lista de turnos, nombres ni celulares de los clientes: solo el peluquero logueado (la única excepción es el link de cancelación de cada turno, ver más abajo).
- Dos personas no pueden reservar el mismo horario, porque la base rechaza el segundo intento.
- Nadie puede reservar un día que el peluquero cerró, sea ese día puntual o todos los jueves (cierre semanal). Las reglas calculan el día de la semana a partir de la fecha.
- **El link de cancelación es privado del cliente.** Cada turno tiene un id al azar de 20 caracteres que genera Firestore, y ese id va en el link `cancelar.html?t=<id>`. Las reglas dejan leer un turno suelto (`get`) a quien conoce el id, pero nadie puede listar ni buscar turnos. Con el link se puede **solamente** cancelar ese turno (cambiar `estado` de "confirmado" a "cancelado" y `canceladoPor` a "cliente", y liberar sus horarios); nada más. Consecuencia: quien tenga el link puede ver el nombre y el celular de ese turno y cancelarlo, así que pedile al cliente que no lo comparta. Los turnos cargados a mano y los bloqueos también tienen id, pero el link solo se arma para los que reservó el cliente o recibe en el recordatorio.
- **Límite:** alguien con malas intenciones podría llenar la agenda con turnos falsos. Para un comercio chico es poco probable. Si pasa, se cancelan desde el panel y se puede agregar un captcha.
- **Datos personales (Ley 18.331):** los nombres y celulares son de los clientes de la peluquería. Usalos solo para los turnos.

## Días cerrados
El peluquero cierra desde el panel y la web le pregunta "¿Solo ese día o siempre?". Se guardan en la colección `dias`: un documento por fecha (`2026-10-22`) o uno por día de la semana (`semana-4` = todos los jueves; 0 = domingo). No hay que crear nada a mano: se crean solos y las reglas ya los cubren. Si actualizás las reglas de una instalación vieja, volvé a pegar todo `firestore.rules`.

## Horario editable
El peluquero cambia los días y horarios desde el panel, en **Horario** (como el "Horario comercial" de WhatsApp Business): interruptor por día, hasta 3 tramos y botón Guardar. Se guarda en `dias/horario` (los tramos como texto, ej. `"09:00-12:30"`); el `horarios` de `negocio.js` queda solo como valor inicial. Apagar un día guarda además `dias/semana-N`, que es lo que miran las reglas. Está cubierto por `match /dias/{fecha}` (lectura pública, escritura solo del admin): no hay que cambiar las reglas. Límite: las reglas bloquean los días cerrados pero no controlan las horas dentro de un día abierto; eso lo cuida la página.

## Mensaje de cancelación
Se edita en `negocio.js` → `mensajeCancelacion`. Desde el panel, "Avisar por WhatsApp" abre el chat de cada cliente con el mensaje escrito. Si el peluquero prefiere tener también un `/cancelar` en WhatsApp Business, puede crear una respuesta rápida con el mismo texto.

## Turnos a mano, bloqueos y recordatorios
- **Agregar turno** (clientes que llaman o van al local): el peluquero lo carga desde el panel. Se guarda en `turnos` con `origen: "panel"` y ocupa sus bloques en `ocupados` igual que una reserva online, así nunca se superpone con otro.
- **Bloquear horario** (médico, trámites): se guarda como un documento de `turnos` con `tipo: "bloqueo"` (uno por estilista) más sus bloques en `ocupados`. La reserva pública deja de ofrecer esas horas. "Quitar bloqueo" borra el documento y libera los bloques. No cuentan como turnos.
- **Recordatorios:** el panel arma el WhatsApp con `mensajeRecordatorio` de `negocio.js` (se puede editar) y marca `recordado: true` en el turno.
- **Cancelar solo:** el cliente recibe el link `cancelar.html?t=<id>` al reservar y en el recordatorio. Para que el link del recordatorio funcione, `web` en `negocio.js` tiene que ser la dirección real de la página.
- Si actualizás una instalación vieja, volvé a pegar todo `firestore.rules`: hay reglas nuevas para leer un turno por su id, cancelar con el link y crear turnos/bloqueos desde el panel.
