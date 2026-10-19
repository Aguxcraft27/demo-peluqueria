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
  const tramosDe = (f) => N.horarios[fechaDe(f).getDay()] || [];
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

  /* ---------- Modo demo (este dispositivo) ---------- */
  function backendDemo() {
    const KEY = "turnos-demo:" + N.id;
    const leer = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
    let db = leer();
    const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
    const fresco = () => { db = leer() || db; return db; };

    function reservarSync(t) {
      if (!abiertoDia(t.fecha, db.dias)) throw new Error("cerrado");
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
    if (!db) { db = { turnos: {}, ocupados: {}, dias: {} }; sembrar(); guardar(); }

    return {
      modo: "demo",
      async dias() { return { ...fresco().dias }; },
      async ocupados(f) { return new Set(Object.keys(fresco().ocupados).filter(k => k.startsWith(f + "_"))); },
      async reservar(t) { fresco(); const id = reservarSync(t); guardar(); return id; },
      async turnos(desde, hasta) {
        return Object.entries(fresco().turnos).map(([id, t]) => ({ id, ...t })).filter(t => t.fecha >= desde && t.fecha <= hasta);
      },
      async setDia(id, abierto) { fresco().dias[id] = { abierto }; guardar(); },
      async borrarDia(id) { delete fresco().dias[id]; guardar(); },
      async cancelar(t) {
        fresco(); const x = db.turnos[t.id]; if (!x) return;
        x.estado = "cancelado"; (x.bloques || []).forEach(b => { if (db.ocupados[b] === t.id) delete db.ocupados[b]; }); guardar();
      },
      async marcarAvisado(id) { fresco(); if (db.turnos[id]) db.turnos[id].avisado = true; guardar(); },
      async reiniciar() { db = { turnos: {}, ocupados: {}, dias: {} }; sembrar(); guardar(); },
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
        // Dos lecturas: las fechas del rango y los 7 cierres semanales ("semana-0" … "semana-6"),
        // que por su nombre quedan fuera del rango de fechas.
        const [fechas, semana] = await Promise.all([
          rango("dias", F.documentId(), desde, hasta), rango("dias", F.documentId(), idSemana(0), idSemana(6))]);
        const out = {};
        fechas.forEach(d => { out[d.id] = d.data(); });
        semana.forEach(d => { out[d.id] = d.data(); });
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
      async turnos(desde, hasta) {
        const s = await rango("turnos", "fecha", desde, hasta);
        return s.docs.map(d => ({ id: d.id, ...d.data() }));
      },
      async setDia(id, abierto) { await F.setDoc(F.doc(col("dias"), id), { abierto }); },
      async borrarDia(id) { await F.deleteDoc(F.doc(col("dias"), id)); },
      async cancelar(t) {
        const b = F.writeBatch(fs);
        b.update(F.doc(col("turnos"), t.id), { estado: "cancelado" });
        (t.bloques || []).forEach(id => b.delete(F.doc(col("ocupados"), id)));
        await b.commit();
      },
      async marcarAvisado(id) { await F.updateDoc(F.doc(col("turnos"), id), { avisado: true }); },
      onAuth(cb) { AU.onAuthStateChanged(auth, cb); },
      login(email, clave) { return AU.signInWithEmailAndPassword(auth, email, clave); },
      logout() { return AU.signOut(auth); }
    };
  }

  window.Turnos = {
    conectar: () => (N.firebase && N.firebase.apiKey ? backendFirebase() : Promise.resolve(backendDemo())),
    abiertoDia, idSemana, tramosDe, horariosLibres, idsBloques, bloquesDe, mensajeCancelacion,
    U: { aMin, aHora, iso, hoyIso, fechaDe, sumarDias, fechaCorta, fechaLarga, money, estilista, normalizarCel, celValido, wa, el, DIAS }
  };
})();
