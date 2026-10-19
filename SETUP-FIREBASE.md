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
- Nadie de afuera puede ver nombres ni celulares de los clientes: solo el peluquero logueado.
- Dos personas no pueden reservar el mismo horario, porque la base rechaza el segundo intento.
- Nadie puede reservar un día que el peluquero cerró.
- **Límite:** alguien con malas intenciones podría llenar la agenda con turnos falsos. Para un comercio chico es poco probable. Si pasa, se cancelan desde el panel y se puede agregar un captcha.
- **Datos personales (Ley 18.331):** los nombres y celulares son de los clientes de la peluquería. Usalos solo para los turnos.

## Mensaje de cancelación
Se edita en `negocio.js` → `mensajeCancelacion`. Desde el panel, "Avisar por WhatsApp" abre el chat de cada cliente con el mensaje escrito. Si el peluquero prefiere tener también un `/cancelar` en WhatsApp Business, puede crear una respuesta rápida con el mismo texto.
