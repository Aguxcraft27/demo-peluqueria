/* ==========================================================
   CONFIGURACIÓN DEL NEGOCIO
   Para cada cliente se cambia SOLO este archivo.
   ========================================================== */
window.NEGOCIO = {
  id: "prueba",                 // identificador único, sin espacios (separa los datos de cada cliente)
  nombre: "Corte Fino",
  rubro: "Barbería y peluquería",
  ciudad: "Fray Bentos",
  slogan: "Cortes clásicos y modernos, sin esperar.",
  demo: false,                       // muestra la franja "Página de ejemplo"
  web: "https://aguxcraft27.github.io/demo-peluqueria/prueba/",
  whatsapp: "59800000000",          // número del local, con código de país, sin + ni espacios
  instagram: "",                    // usuario sin @ (vacío = no se muestra)
  direccion: "18 de Julio 1234",
  mapa: "https://maps.google.com/?q=Fray+Bentos",
  colores: { acento: "#B4532A", fondo: "#F7F3EE", tinta: "#1E1A17" },

  // Horario por día (0 = domingo … 6 = sábado). Cada tramo: ["desde", "hasta"].
  horarios: {
    0: [],
    1: [["09:00", "12:30"], ["15:00", "20:00"]],
    2: [["09:00", "12:30"], ["15:00", "20:00"]],
    3: [["09:00", "12:30"], ["15:00", "20:00"]],
    4: [["09:00", "12:30"], ["15:00", "20:00"]],
    5: [["09:00", "20:00"]],
    6: [["09:00", "14:00"]]
  },
  diasParaReservar: 14,             // cuántos días hacia adelante se puede reservar

  servicios: [
    { nombre: "Corte de pelo", precio: 450, minutos: 30, detalle: "Lavado incluido" },
    { nombre: "Corte + barba", precio: 650, minutos: 45, detalle: "Perfilado con navaja" },
    { nombre: "Barba", precio: 300, minutos: 15, detalle: "Toalla caliente" },
    { nombre: "Corte niño (hasta 12)", precio: 350, minutos: 30, detalle: "" },
    { nombre: "Color / mechas", precio: 1500, minutos: 90, detalle: "Precio desde, según largo" }
  ],
  equipo: [
    { id: "martin", nombre: "Martín", especialidad: "Degradés y barba", foto: "https://images.unsplash.com/photo-1553521041-d168abd31de3?w=160&h=160&q=70&auto=format&fit=crop&crop=faces" },
    { id: "lucia", nombre: "Lucía", especialidad: "Color y cortes largos", foto: "https://images.unsplash.com/photo-1761839256840-7780a45b85dc?w=160&h=160&q=70&auto=format&fit=crop&crop=focalpoint&fp-x=0.47&fp-y=0.2&fp-z=3" }
  ],
  // Fotos de ejemplo de Unsplash (licencia libre). Para un cliente real, usar fotos de su Instagram con su permiso.
  trabajos: [   // fotos de trabajos (rutas o URLs). Vacío = recuadros de ejemplo
    "https://images.unsplash.com/photo-1630827020718-3433092696e7?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1568339434343-2a640a1a9946?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1635273051839-003bf06a8751?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1772442088712-df1780cbb709?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1599011176306-4a96f1516d4d?w=600&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=600&q=70&auto=format&fit=crop"
  ],

  // Mensaje que se le manda a cada cliente cuando el peluquero cancela.
  mensajeCancelacion: "Hola {nombre}, te escribo de {negocio}. Perdón, me surgió un imprevisto y no voy a poder atenderte el {fecha} a las {hora}. Si querés, elegí otro horario acá: {web}",

  // Recordatorio que se manda por WhatsApp el día antes. {cuando} = "mañana" / "hoy"; {link} = link para que el cliente cancele solo.
  mensajeRecordatorio: "Hola {nombre}! Te recordamos tu turno de {servicio} en {negocio} {cuando} a las {hora}. Si no podés venir, cancelalo acá: {link}",

  // ---- Modo real (Firebase). Vacío = modo demo: los datos se guardan solo en este dispositivo.
  firebase: { apiKey: "AIzaSyADxqD0RkSEFW4XBHHlpd-T44T-8TaPO1s", authDomain: "gen-lang-client-0458344561.firebaseapp.com", projectId: "gen-lang-client-0458344561", storageBucket: "gen-lang-client-0458344561.firebasestorage.app", messagingSenderId: "182547497807", appId: "1:182547497807:web:bcbff087d2308116437b3a" },                     // pegar acá la configuración web de Firebase (ver SETUP-FIREBASE.md)
  admins: ["boscoagustin10@gmail.com"]                        // emails que pueden entrar al panel, ej: ["peluquero@gmail.com"]
};
