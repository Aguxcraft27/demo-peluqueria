/* ==========================================================
   MOTOR DE TURNOS
   Lo usan la página pública (index.html) y el panel (panel.html).
   - Modo demo: guarda todo en este dispositivo (localStorage).
   - Modo real: guarda en Firebase (Firestore + login del peluquero).
   Cada turno ocupa bloques de 15 minutos; un bloque ocupado no se puede
   volver a reservar, así nunca hay dos turnos a la misma hora.
   ========================================================== */
(function () {
  const N = window.NEGOCIO;
  const BLOQUE = 15;
  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  /* ---------- Utilidades ---------- */
  const aMin = (h) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
  const aHora = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const hoyIso = () => iso(new Date());
  const fechaDe = (f) => new Date(f + "T12:00");
  const sumarDias = (f, n) => { const d = fechaDe(f); d.setDate(d.getDate() + n); return iso(d); };
  const fechaCorta = (f) => { const d = fechaDe(f); return DIAS[d.getDay()].toLowerCase() + " " + d.getDate() + "/" + (d.getMonth() + 1); };
  const fechaLarga = (f) => { const d = fechaDe(f); return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()]; };
  const money = (n) => "$ " + Number(n).toLocaleString("es-UY");
  const estilista = (id) => N.equipo.find(e => e.id === id) || { id, nombre: id || "" };
  // Celular uruguayo a formato internacional: 099 123 456 -> 59899123456
  function normalizarCel(c) {
    let d = String(c || "").replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("598")) return d;
    if (d.startsWith("0")) d = d.slice(1);
    return d.length === 8 ? "598" + d : d;
  }
  // Celular uruguayo (09X XXX XXX) o extranjero con código de país
  const celValido = (c) => { const d = normalizarCel(c); return /^5989\d{7}$/.test(d) || (!d.startsWith("598") && d.length >= 10 && d.length <= 15); };
  const wa = (numero, texto) => "https://wa.me/" + (numero || "") + (texto ? "?text=" + encodeURIComponent(texto) : "");
  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "text") n.textContent = v; else if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
    }
    kids.forEach(c => c != null && c !== false && n.append(c));
    return n;
  }

  /* ---------- Reglas de agenda ---------- */
  /* Horario semanal efectivo. Arranca con el de negocio.js; si el peluquero guardó uno
     (documento dias/horario = { semana: { "0": [...], … "6": [...] } }) pasa a mandar ese.
     Cada día es una lista de tramos: pares ["09:00","12:30"] (demo) o textos "09:00-12:30" (Firebase,
     que no permite listas dentro de listas). Lista vacía = cerrado ese día. */
  const horarioBase = () => { const o = {}; for (let d = 0; d < 7; d++) o[d] = ((N.horarios || {})[d] || []).map(t => [t[0], t[1]]); return o; };
  const HHMM = /^\d{2}:\d{2}$/;
  function normalizarTramos(l) {
    return (Array.isArray(l) ? l : [])
      .map(t => typeof t === "string" ? t.split("-") : Array.isArray(t) ? t : t && [t.desde, t.hasta])
      .filter(t => t && HHMM.test(t[0]) && HHMM.test(t[1]) && aMin(t[0]) < aMin(t[1]))
      .map(t => [t[0], t[1]]).sort((x, y) => aMin(x[0]) - aMin(y[0]));
  }
  let HORARIO = horarioBase();
  // dias = lo que devuelve backend.dias(); si trae "horario" se usa, si no vale el de negocio.js
  function aplicarHorario(dias) {
    const h = horarioBase(), s = dias && dias.horario && dias.horario.semana;
    if (s) for (let d = 0; d < 7; d++) if (Array.isArray(s[d])) h[d] = normalizarTramos(s[d]);
    HORARIO = h;
  }
  const tramosDeDow = (d) => HORARIO[d] || [];
  const codificarSemana = (sem) => { const o = {}; for (let d = 0; d < 7; d++) o[d] = (sem[d] || []).map(t => t[0] + "-" + t[1]); return o; };
  const tramosDe = (f) => tramosDeDow(fechaDe(f).getDay());
  // dias = datos de la colección "dias":
  //   "2026-10-22": { abierto: false }  -> cierre (o apertura) puntual de una fecha
  //   "semana-4":   { abierto: false }  -> cierre semanal: todos los jueves (0 = domingo … 6 = sábado)
  // Prioridad: fecha pasada o sin horario = cerrado; si hay dato de esa fecha manda ese
  // (así se puede abrir un jueves puntual aunque los jueves estén cerrados); si no, manda el cierre semanal.
  const idSemana = (dow) => "semana-" + dow;
  function abiertoDia(f, dias) {
    if (f < hoyIso() || !tramosDe(f).length) return false;
    const o = dias && dias[f];
    if (o) return o.abierto !== false;
    const s = dias && dias[idSemana(fechaDe(f).getDay())];
    return !(s && s.abierto === false);
  }
  function bloquesDe(hora, minutos) {
    const a = aMin(hora), out = [];
    for (let i = 0; i < Math.ceil(minutos / BLOQUE); i++) out.push(aHora(a + i * BLOQUE));
    return out;
  }
  const idOcupado = (f, est, hhmm) => f + "_" + est + "_" + hhmm.replace(":", "");
  const idsBloques = (f, est, hora, minutos) => bloquesDe(hora, minutos).map(b => idOcupado(f, est, b));
  // Horarios libres para un servicio. estPref = id del estilista o "" (cualquiera).
  function horariosLibres(f, minutos, estPref, ocupados) {
    const ahora = new Date(), esHoy = f === hoyIso(), minimo = ahora.getHours() * 60 + ahora.getMinutes() + 30;
    const ests = estPref ? [estPref] : N.equipo.map(e => e.id);
    const out = [];
    for (const [a, b] of tramosDe(f)) {
      for (let m = aMin(a); m + minutos <= aMin(b); m += 30) {
        if (esHoy && m < minimo) continue;
        const h = aHora(m);
        const est = ests.find(e => idsBloques(f, e, h, minutos).every(id => !ocupados.has(id)));
        if (est) out.push({ hora: h, estilista: est });
      }
    }
    return out;
  }
  function mensajeCancelacion(t) {
    return N.mensajeCancelacion.replace("{nombre}", t.nombre).replace("{negocio}", N.nombre)
      .replace("{fecha}", fechaCorta(t.fecha)).replace("{hora}", t.hora).replace("{web}", N.web + "#reservar");
  }
  const esBloqueo = (t) => !!t && t.tipo === "bloqueo";
  // Link privado para que el cliente cancele su turno: el id del turno (20 letras al azar en Firebase) hace de secreto.
  function linkCancelar(id) {
    const base = N.web || new URL(".", location.href).href;
    return base.replace(/\/?$/, "/") + "cancelar.html?t=" + encodeURIComponent(id);
  }
  const rellenar = (txt, vals) => txt.replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
  const RECORDATORIO_BASE = "Hola {nombre}! Te recordamos tu turno de {servicio} en {negocio} {cuando} a las {hora}. Si no podés venir, cancelalo acá: {link}";
  function mensajeRecordatorio(t) {
    const hoy = hoyIso();
    const cuando = t.fecha === hoy ? "hoy" : t.fecha === sumarDias(hoy, 1) ? "mañana" : "el " + fechaCorta(t.fecha);
    return rellenar(N.mensajeRecordatorio || RECORDATORIO_BASE, { nombre: t.nombre, servicio: t.servicio, negocio: N.nombre, cuando, hora: t.hora, link: linkCancelar(t.id) });
  }
  // Documentos de bloqueo (uno por estilista): ocupan los bloques de 15 min pero no son turnos de clientes.
  const docsBloqueo = (p) => p.estilistas.map(e => ({ fecha: p.fecha, hora: p.hora, minutos: p.minutos, servicio: "Bloqueo", estilista: e,
    nombre: "Bloqueo", celular: "", estado: "confirmado", tipo: "bloqueo", motivo: p.motivo || "", bloques: idsBloques(p.fecha, e, p.hora, p.minutos) }));

  /* ---------- Modo demo (este dispositivo) ---------- */
  function backendDemo() {
    const KEY = "turnos-demo:" + N.id;
    const leer = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
    let db = leer();
    const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
    const fresco = () => { db = leer() || db; aplicarHorario(db.dias); return db; };

    function reservarSync(t, sinCierre) {
      if (!sinCierre && !abiertoDia(t.fecha, db.dias)) throw new Error("cerrado");
      if (t.bloques.some(id => db.ocupados[id])) throw new Error("ocupado");
      const id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      db.turnos[id] = { ...t, creado: new Date().toISOString() };
      t.bloques.forEach(b => { db.ocupados[b] = id; });
      return id;
    }
    // Turnos de ejemplo para que el panel no arranque vacío
    function sembrar() {
      const nombres = ["Juan", "Sofía", "Mateo", "Valentina", "Bruno", "Camila", "Nicolás", "Lucas", "Martina", "Diego"];
      let k = 0;
      for (let i = 0; i < 6; i++) {
        const f = sumarDias(hoyIso(), i);
        if (!abiertoDia(f, db.dias)) continue;
        for (let j = 0; j < 3; j++) {
          const s = N.servicios[(i + j) % N.servicios.length];
          const oc = new Set(Object.keys(db.ocupados));
          const libres = horariosLibres(f, s.minutos, "", oc);
          if (!libres.length) break;
          const x = libres[(i * 5 + j * 7) % libres.length];
          try {
            reservarSync({ fecha: f, hora: x.hora, minutos: s.minutos, servicio: s.nombre, estilista: x.estilista,
              nombre: nombres[k++ % nombres.length], celular: "", estado: "confirmado", ejemplo: true,
              bloques: idsBloques(f, x.estilista, x.hora, s.minutos) });
          } catch (e) {}
        }
      }
    }
    if (!db) { db = { turnos: {}, ocupados: {}, dias: {} }; aplicarHorario(db.dias); sembrar(); guardar(); }
    aplicarHorario(db.dias);

    return {
      modo: "demo",
      async dias() { return { ...fresco().dias }; },
      async ocupados(f) { return new Set(Object.keys(fresco().ocupados).filter(k => k.startsWith(f + "_"))); },
      async reservar(t) { fresco(); const id = reservarSync(t); guardar(); return id; },
      // Turno cargado a mano por el peluquero: ignora el cierre de reservas, pero nunca pisa otro turno.
      async crearTurnoPanel(t) { fresco(); const id = reservarSync({ ...t, origen: "panel" }, true); guardar(); return id; },
      async bloquear(p) {
        fresco(); const docs = docsBloqueo(p);
        if (docs.some(d => d.bloques.some(b => db.ocupados[b]))) throw new Error("ocupado");
        docs.forEach(d => {
          const id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          db.turnos[id] = { ...d, creado: new Date().toISOString() }; d.bloques.forEach(b => { db.ocupados[b] = id; });
        });
        guardar();
      },
      async quitarBloqueo(t) {
        fresco(); const x = db.turnos[t.id]; if (!x) return;
        (x.bloques || []).forEach(b => { if (db.ocupados[b] === t.id) delete db.ocupados[b]; }); delete db.turnos[t.id]; guardar();
      },
      async turno(id) { const x = fresco().turnos[id]; return x ? { id, ...x } : null; },
      async cancelarPorCliente(id) {
        fresco(); const x = db.turnos[id];
        if (!x || esBloqueo(x)) throw new Error("noexiste");
        if (x.estado !== "confirmado") throw new Error("yacancelado");
        x.estado = "cancelado"; x.canceladoPor = "cliente";
        (x.bloques || []).forEach(b => { if (db.ocupados[b] === id) delete db.ocupados[b]; }); guardar();
      },
      async marcarRecordado(id) { fresco(); if (db.turnos[id]) db.turnos[id].recordado = true; guardar(); },
      async turnos(desde, hasta) {
        return Object.entries(fresco().turnos).map(([id, t]) => ({ id, ...t })).filter(t => t.fecha >= desde && t.fecha <= hasta);
      },
      async setDia(id, abierto) { fresco().dias[id] = { abierto }; guardar(); },
      async borrarDia(id) { delete fresco().dias[id]; guardar(); },
      // Guarda el horario semanal y los cierres "para siempre" juntos: día apagado = tramos [] + semana-N cerrado.
      async guardarHorario(semana, cerrados) {
        fresco(); db.dias.horario = { semana };
        for (let d = 0; d < 7; d++) { if (cerrados.includes(d)) db.dias[idSemana(d)] = { abierto: false }; else delete db.dias[idSemana(d)]; }
        guardar(); aplicarHorario(db.dias);
      },
      async cancelar(t) {
        fresco(); const x = db.turnos[t.id]; if (!x) return;
        x.estado = "cancelado"; x.canceladoPor = "peluquero"; (x.bloques || []).forEach(b => { if (db.ocupados[b] === t.id) delete db.ocupados[b]; }); guardar();
      },
      async marcarAvisado(id) { fresco(); if (db.turnos[id]) db.turnos[id].avisado = true; guardar(); },
      async reiniciar() { db = { turnos: {}, ocupados: {}, dias: {} }; aplicarHorario(db.dias); sembrar(); guardar(); },
      onAuth(cb) { cb({ email: "demo" }); }, async login() {}, async logout() {}
    };
  }

  /* ---------- Modo real (Firebase) ---------- */
  async function backendFirebase() {
    const base = "https://www.gstatic.com/firebasejs/10.12.2/";
    const [A, F, AU] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-firestore.js"), import(base + "firebase-auth.js")]);
    const app = A.initializeApp(N.firebase), fs = F.getFirestore(app), auth = AU.getAuth(app);
    const col = (c) => F.collection(fs, "negocios", N.id, c);
    const rango = (c, campo, desde, hasta) => F.getDocs(F.query(col(c), F.where(campo, ">=", desde), F.where(campo, "<=", hasta)));
    return {
      modo: "real",
      async dias(desde, hasta) {
        // Tres lecturas: las fechas del rango, los 7 cierres semanales ("semana-0" … "semana-6") y el
        // horario semanal ("horario"); por su nombre los dos últimos quedan fuera del rango de fechas.
        const [fechas, semana, horario] = await Promise.all([
          rango("dias", F.documentId(), desde, hasta), rango("dias", F.documentId(), idSemana(0), idSemana(6)),
          F.getDoc(F.doc(col("dias"), "horario"))]);
        const out = {};
        fechas.forEach(d => { out[d.id] = d.data(); });
        semana.forEach(d => { out[d.id] = d.data(); });
        if (horario.exists()) out.horario = horario.data();
        aplicarHorario(out);
        return out;
      },
      async ocupados(f) {
        const s = await F.getDocs(F.query(col("ocupados"), F.where("fecha", "==", f)));
        return new Set(s.docs.map(d => d.id));
      },
      async reservar(t) {
        const b = F.writeBatch(fs), ref = F.doc(col("turnos"));
        b.set(ref, { ...t, creado: F.serverTimestamp() });
        t.bloques.forEach(id => b.set(F.doc(col("ocupados"), id), { fecha: t.fecha, estilista: t.estilista, turno: ref.id }));
        try { await b.commit(); } catch (e) { throw new Error(e.code === "permission-denied" ? "ocupado" : "red"); }
        return ref.id;
      },
      // Turno cargado a mano por el peluquero (con su sesión iniciada): mismo mecanismo de bloques, nunca pisa otro turno.
      async crearTurnoPanel(t) {
        const b = F.writeBatch(fs), ref = F.doc(col("turnos"));
        b.set(ref, { ...t, origen: "panel", creado: F.serverTimestamp() });
        t.bloques.forEach(id => b.set(F.doc(col("ocupados"), id), { fecha: t.fecha, estilista: t.estilista, turno: ref.id }));
        try { await b.commit(); } catch (e) { throw new Error(e.code === "permission-denied" ? "ocupado" : "red"); }
        return ref.id;
      },
      async bloquear(p) {
        const b = F.writeBatch(fs);
        docsBloqueo(p).forEach(d => {
          const ref = F.doc(col("turnos"));
          b.set(ref, { ...d, creado: F.serverTimestamp() });
          d.bloques.forEach(id => b.set(F.doc(col("ocupados"), id), { fecha: d.fecha, estilista: d.estilista, turno: ref.id }));
        });
        try { await b.commit(); } catch (e) { throw new Error(e.code === "permission-denied" ? "ocupado" : "red"); }
      },
      async quitarBloqueo(t) {
        const b = F.writeBatch(fs);
        b.delete(F.doc(col("turnos"), t.id));
        (t.bloques || []).forEach(id => b.delete(F.doc(col("ocupados"), id)));
        await b.commit();
      },
      // Lectura de un turno por su id (lo usa cancelar.html). Las reglas lo permiten solo a quien conoce el id.
      async turno(id) {
        const s = await F.getDoc(F.doc(col("turnos"), id));
        return s.exists() ? { id: s.id, ...s.data() } : null;
      },
      // El cliente cancela su turno con el link: solo cambia estado/canceladoPor y libera sus bloques.
      async cancelarPorCliente(id) {
        let t;
        try { t = await this.turno(id); } catch (e) { throw new Error("red"); }
        if (!t || esBloqueo(t)) throw new Error("noexiste");
        if (t.estado !== "confirmado") throw new Error("yacancelado");
        const b = F.writeBatch(fs);
        b.update(F.doc(col("turnos"), id), { estado: "cancelado", canceladoPor: "cliente" });
        (t.bloques || []).forEach(x => b.delete(F.doc(col("ocupados"), x)));
        try { await b.commit(); } catch (e) { throw new Error(e.code === "permission-denied" ? "yacancelado" : "red"); }
      },
      async marcarRecordado(id) { await F.updateDoc(F.doc(col("turnos"), id), { recordado: true }); },
      async turnos(desde, hasta) {
        const s = await rango("turnos", "fecha", desde, hasta);
        return s.docs.map(d => ({ id: d.id, ...d.data() }));
      },
      async setDia(id, abierto) { await F.setDoc(F.doc(col("dias"), id), { abierto }); },
      async borrarDia(id) { await F.deleteDoc(F.doc(col("dias"), id)); },
      async guardarHorario(semana, cerrados) {
        const b = F.writeBatch(fs);   // todo junto: el horario y los 7 cierres semanales
        b.set(F.doc(col("dias"), "horario"), { semana: codificarSemana(semana) });
        for (let d = 0; d < 7; d++) {
          const ref = F.doc(col("dias"), idSemana(d));
          if (cerrados.includes(d)) b.set(ref, { abierto: false }); else b.delete(ref);
        }
        await b.commit();
        aplicarHorario({ horario: { semana } });
      },
      async cancelar(t) {
        const b = F.writeBatch(fs);
        b.update(F.doc(col("turnos"), t.id), { estado: "cancelado", canceladoPor: "peluquero" });
        (t.bloques || []).forEach(id => b.delete(F.doc(col("ocupados"), id)));
        await b.commit();
      },
      async marcarAvisado(id) { await F.updateDoc(F.doc(col("turnos"), id), { avisado: true }); },
      onAuth(cb) { AU.onAuthStateChanged(auth, cb); },
      login(email, clave) { return AU.signInWithEmailAndPassword(auth, email, clave); },
      loginGoogle() { return AU.signInWithPopup(auth, new AU.GoogleAuthProvider()); },
      logout() { return AU.signOut(auth); }
    };
  }

  window.Turnos = {
    conectar: () => (N.firebase && N.firebase.apiKey ? backendFirebase() : Promise.resolve(backendDemo())),
    abiertoDia, idSemana, tramosDe, tramosDeDow, aplicarHorario, horariosLibres, idsBloques, bloquesDe, mensajeCancelacion, mensajeRecordatorio, linkCancelar, esBloqueo,
    U: { aMin, aHora, iso, hoyIso, fechaDe, sumarDias, fechaCorta, fechaLarga, money, estilista, normalizarCel, celValido, wa, el, DIAS }
  };
})();
