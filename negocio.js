/* ==========================================================
   CONFIGURACIÓN DEL NEGOCIO
   Para cada cliente se cambia SOLO este archivo.
   ========================================================== */
window.NEGOCIO = {
  id: "corte-fino",                 // identificador único, sin espacios (separa los datos de cada cliente)
  nombre: "Corte Fino",
  rubro: "Barbería y peluquería",
  ciudad: "Fray Bentos",
  slogan: "Cortes clásicos y modernos, sin esperar.",
  demo: true,                       // muestra la franja "Página de ejemplo"
  web: "https://aguxcraft27.github.io/demo-peluqueria/",
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
    { id: "martin", nombre: "Martín", especialidad: "Degradés y barba", foto: "" },
    { id: "lucia", nombre: "Lucía", especialidad: "Color y cortes largos", foto: "" }
  ],
  trabajos: [],                     // fotos de trabajos (rutas o URLs). Vacío = recuadros de ejemplo

  // Mensaje que se le manda a cada cliente cuando el peluquero cancela.
  mensajeCancelacion: "Hola {nombre}, te escribo de {negocio}. Perdón, me surgió un imprevisto y no voy a poder atenderte el {fecha} a las {hora}. Si querés, elegí otro horario acá: {web}",

  // ---- Modo real (Firebase). Vacío = modo demo: los datos se guardan solo en este dispositivo.
  firebase: {},                     // pegar acá la configuración web de Firebase (ver SETUP-FIREBASE.md)
  admins: []                        // emails que pueden entrar al panel, ej: ["peluquero@gmail.com"]
};
