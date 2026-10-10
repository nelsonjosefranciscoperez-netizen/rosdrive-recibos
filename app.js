/************************************************************
 * ROSDRIVE - APP WEB
 * GitHub Pages ↔ Google Apps Script ↔ Google Sheets
 ************************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbwoLmnjN23zYnOU4rUJVe8Phvo5_Q5r15dqBrQb_AYIbPjhFBMAdTKoL14M_WNCkxum/exec";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const API_CACHE_TTL = 120000;

const SOCIOS = {
  Erika: "5493413368913",
  Bruno: "5493412576895",
  Hector: "5493413369373"
};

const PORCENTAJES = {
  Erika: 45,
  Bruno: 45,
  Hector: 10
};

/* =========================================================
   VARIABLES
========================================================= */

let ventas = [];
let clientes = [];
let recibos = [];
let servicios = [];
let gastos = [];

let dashboardData = {};
let ultimoRecibo = null;
let ultimoBalance = null;

let balanceInicializado = false;

const apiCache = new Map();
const apiRequests = new Map();

/* =========================================================
   CACHE
========================================================= */

function limpiarCacheAPI() {
  apiCache.clear();
}

function obtenerCacheAPI(action) {
  const item = apiCache.get(action);

  if (!item) {
    return null;
  }

  if (Date.now() - item.time > API_CACHE_TTL) {
    apiCache.delete(action);
    return null;
  }

  return item.data;
}

/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  mostrarPantallaCarga();

  try {
    inicializarNavegacion();
    actualizarFecha();
    actualizarTotal();

    // Inicializar la fecha de venta con el día local actual.
    inicializarFechaVenta();

    const servicio = document.getElementById("servicio");

    if (servicio) {
      servicio.addEventListener("change", actualizarPrecioServicio);
    }

    const precio = document.getElementById("precio");

    if (precio) {
      precio.addEventListener("input", actualizarTotal);
    }

    const cantidad = document.getElementById("cantidad");

    if (cantidad) {
      cantidad.addEventListener("input", actualizarTotal);
    }

    inicializarBalance();
    inicializarGastos();

    const cargaDatos = cargarDatos();

    const tiempoMaximoCarga = new Promise(resolve => {
      setTimeout(resolve, 3500);
    });

    Promise.race([
      cargaDatos,
      tiempoMaximoCarga
    ])
      .catch(error => {
        console.error("Error cargando datos:", error);
      })
      .finally(() => {
        ocultarPantallaCarga();
      });

  } catch (error) {
    console.error("Error iniciando RosDrive:", error);
    ocultarPantallaCarga();
  }
});

/* =========================================================
   NAVEGACIÓN
========================================================= */

function inicializarNavegacion() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      mostrarSeccion(button.dataset.section);
    });
  });
}

function mostrarSeccion(section) {
  document.querySelectorAll(".section").forEach(el => {
    el.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.remove("active");
  });

  const destino = document.getElementById(section);

  if (destino) {
    destino.classList.add("active");
  }

  const boton = document.querySelector(
    `.nav-item[data-section="${section}"]`
  );

  if (boton) {
    boton.classList.add("active");
  }

  const titulos = {
    dashboard: [
      "Dashboard",
      "Resumen de actividad de RosDrive"
    ],
    venta: [
      "Nueva venta",
      "Registrar un nuevo servicio"
    ],
    recibos: [
      "Recibos",
      "Historial de recibos generados"
    ],
    clientes: [
      "Clientes",
      "Base de clientes de RosDrive"
    ],
    ventas: [
      "Ventas",
      "Historial de operaciones"
    ],
    gastos: [
      "Gastos",
      "Registrar y consultar gastos"
    ],
    balance: [
      "Balance",
      "Balance semanal y distribución"
    ]
  };

  if (titulos[section]) {
    const titulo = document.getElementById("page-title");
    const subtitulo = document.getElementById("page-subtitle");

    if (titulo) {
      titulo.textContent = titulos[section][0];
    }

    if (subtitulo) {
      subtitulo.textContent = titulos[section][1];
    }
  }

  if (section === "balance") {
    inicializarBalance();
  }
}

/* =========================================================
   FECHA
========================================================= */

function actualizarFecha() {
  const elemento = document.getElementById("fechaActual");

  if (!elemento) {
    return;
  }

  const fecha = new Date();

  elemento.textContent = fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/* =========================================================
   FECHA DE VENTA
========================================================= */

// Usa la fecha local para evitar desfases de zona horaria.
function obtenerFechaLocalInput() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function inicializarFechaVenta() {
  const campo = document.getElementById("fechaVenta");

  if (campo && !campo.value) {
    campo.value = obtenerFechaLocalInput();
  }
}

/* =========================================================
   PANTALLA DE CARGA
========================================================= */

function mostrarPantallaCarga() {
  const pantalla = document.getElementById("loadingScreen");

  if (!pantalla) {
    return;
  }

  pantalla.classList.remove("hidden");
  pantalla.style.opacity = "1";
  pantalla.style.visibility = "visible";
  pantalla.style.pointerEvents = "auto";
}

function ocultarPantallaCarga() {
  const pantalla = document.getElementById("loadingScreen");

  if (!pantalla) {
    return;
  }

  pantalla.classList.add("hidden");
  pantalla.style.opacity = "0";
  pantalla.style.visibility = "hidden";
  pantalla.style.pointerEvents = "none";

  setTimeout(() => {
    if (pantalla && pantalla.parentNode) {
      pantalla.remove();
    }
  }, 550);
}

/* =========================================================
   API GET
========================================================= */

async function consultarAPI(action, opciones = {}) {
  const force = opciones.force === true;

  if (!force) {
    const cache = obtenerCacheAPI(action);

    if (cache) {
      return cache;
    }

    if (apiRequests.has(action)) {
      return apiRequests.get(action);
    }
  }

  const url = `${API_URL}?action=${encodeURIComponent(action)}`;

  const promesa = fetch(url, {
    method: "GET",
    cache: "no-store"
  })
    .then(async respuesta => {
      if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
      }

      const datos = await respuesta.json();

      if (datos.ok === false) {
        throw new Error(datos.error || "Error en la API");
      }

      apiCache.set(action, {
        time: Date.now(),
        data: datos
      });

      return datos;
    })
    .finally(() => {
      apiRequests.delete(action);
    });

  apiRequests.set(action, promesa);

  return promesa;
}

/* =========================================================
   CARGAR DATOS
========================================================= */

async function cargarDatos(opciones = {}) {
  const force = opciones.force === true;

  try {
    const resultados = await Promise.allSettled([
      consultarAPI("dashboard", { force }),
      consultarAPI("ventas", { force }),
      consultarAPI("clientes", { force }),
      consultarAPI("recibos", { force }),
      consultarAPI("servicios", { force }),
      consultarAPI("gastos", { force })
    ]);

    /* DASHBOARD */

    if (resultados[0].status === "fulfilled") {
      dashboardData = resultados[0].value;
      actualizarDashboard(dashboardData);
    } else {
      console.error("Error Dashboard:", resultados[0].reason);
    }

    /* VENTAS */

    if (resultados[1].status === "fulfilled") {
      ventas = normalizarLista(resultados[1].value, [
        "ventas",
        "data",
        "resultado"
      ]);

      renderizarVentas(ventas);
    } else {
      console.error("Error Ventas:", resultados[1].reason);
    }

    /* CLIENTES */

    if (resultados[2].status === "fulfilled") {
      clientes = normalizarLista(resultados[2].value, [
        "clientes",
        "data",
        "resultado"
      ]);

      renderizarClientes(clientes);
    } else {
      console.error("Error Clientes:", resultados[2].reason);
    }

    /* RECIBOS */

    if (resultados[3].status === "fulfilled") {
      recibos = normalizarLista(resultados[3].value, [
        "recibos",
        "data",
        "resultado"
      ]);

      renderizarRecibos(recibos);
    } else {
      console.error("Error Recibos:", resultados[3].reason);
    }

    /* SERVICIOS */

    if (resultados[4].status === "fulfilled") {
      servicios = normalizarLista(resultados[4].value, [
        "servicios",
        "data",
        "resultado"
      ]);

      cargarServicios(servicios);
    } else {
      console.error("Error Servicios:", resultados[4].reason);
    }

    /* GASTOS */

    if (resultados[5].status === "fulfilled") {
      gastos = normalizarLista(resultados[5].value, [
        "gastos",
        "data",
        "resultado"
      ]);

      renderizarGastos(gastos);
    } else {
      console.warn(
        "No se pudieron cargar los gastos:",
        resultados[5].reason
      );

      gastos = [];
    }

    actualizarEstadisticasGenerales();

  } catch (error) {
    console.error(error);

    mostrarToast(
      "No se pudieron cargar los datos",
      "error"
    );
  }
}

/* =========================================================
   NORMALIZAR LISTAS
========================================================= */

function normalizarLista(respuesta, posiblesPropiedades) {
  if (!respuesta) {
    return [];
  }

  for (const propiedad of posiblesPropiedades) {
    if (Array.isArray(respuesta[propiedad])) {
      return respuesta[propiedad];
    }
  }

  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  return [];
}

/* =========================================================
   DASHBOARD
========================================================= */

function actualizarDashboard(data) {
  const facturacion = Number(data.facturacion || 0);
  const recibosMes = Number(data.recibos || 0);
  const clientesTotal = Number(data.clientes || 0);
  const serviciosTotal = Number(data.servicios || 0);

  const statFacturacion = document.getElementById("statFacturacion");
  const statRecibos = document.getElementById("statRecibos");
  const statClientes = document.getElementById("statClientes");
  const statServicios = document.getElementById("statServicios");

  if (statFacturacion) {
    statFacturacion.textContent = formatearDinero(facturacion);
  }

  if (statRecibos) {
    statRecibos.textContent = recibosMes;
  }

  if (statClientes) {
    statClientes.textContent = clientesTotal;
  }

  if (statServicios) {
    statServicios.textContent = serviciosTotal;
  }

  renderizarUltimasVentas(data.ultimasVentas || []);
}

/* =========================================================
   ÚLTIMAS VENTAS
========================================================= */

function renderizarUltimasVentas(lista) {
  const contenedor = document.getElementById("ultimasVentas");

  if (!contenedor) {
    return;
  }

  if (!lista || !lista.length) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Todavía no hay ventas cargadas</h3>
        <p>Las ventas que generes desde la app aparecerán acá.</p>
      </div>
    `;

    return;
  }

  contenedor.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>RECIBO</th>
          <th>FECHA</th>
          <th>CLIENTE</th>
          <th>SERVICIO</th>
          <th>TOTAL</th>
          <th>ESTADO</th>
        </tr>
      </thead>
      <tbody>
        ${lista.map(venta => `
          <tr>
            <td><strong>${escaparHTML(venta.recibo || "-")}</strong></td>
            <td>${escaparHTML(venta.fecha || "-")}</td>
            <td>${escaparHTML(venta.cliente || "-")}</td>
            <td>${escaparHTML(venta.servicio || "-")}</td>
            <td>${formatearDinero(venta.total)}</td>
            <td>${crearBadgeEstado(venta.estado)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* =========================================================
   ESTADÍSTICAS
========================================================= */

function actualizarEstadisticasGenerales() {
  const statRecibos = document.getElementById("statRecibos");
  const statClientes = document.getElementById("statClientes");
  const statServicios = document.getElementById("statServicios");
  const statFacturacion = document.getElementById("statFacturacion");

  if (statRecibos && recibos.length) {
    statRecibos.textContent = recibos.length;
  }

  if (statClientes && clientes.length) {
    statClientes.textContent = clientes.length;
  }

  if (statServicios && servicios.length) {
    statServicios.textContent = servicios.length;
  }

  const total = ventas.reduce((suma, venta) => {
    return suma + Number(venta.total || 0);
  }, 0);

  if (statFacturacion && !dashboardData.facturacion) {
    statFacturacion.textContent = formatearDinero(total);
  }
}

/* =========================================================
   SERVICIOS
========================================================= */

function cargarServicios(lista) {
  const select = document.getElementById("servicio");

  if (!select || !lista.length) {
    return;
  }

  select.innerHTML = `
    <option value="">Seleccionar servicio...</option>
  `;

  lista.forEach(servicio => {
    const nombre =
      servicio.nombre ||
      servicio.servicio ||
      servicio.descripcion ||
      "";

    const precio = Number(
      servicio.precio ||
      servicio.total ||
      servicio.valor ||
      0
    );

    if (!nombre) {
      return;
    }

    const option = document.createElement("option");

    option.value = nombre;
    option.textContent = `${nombre} - ${formatearDinero(precio)}`;
    option.dataset.precio = precio;

    select.appendChild(option);
  });
}

/* =========================================================
   PRECIO SERVICIO
========================================================= */

function actualizarPrecioServicio() {
  const select = document.getElementById("servicio");

  if (!select) {
    return;
  }

  const opcion = select.options[select.selectedIndex];

  if (!opcion) {
    return;
  }

  const precio = Number(opcion.dataset.precio || 0);
  const campoPrecio = document.getElementById("precio");

  if (campoPrecio) {
    campoPrecio.value = precio;
  }

  actualizarTotal();
}

/* =========================================================
   TOTAL
========================================================= */

function actualizarTotal() {
  const campoPrecio = document.getElementById("precio");
  const campoCantidad = document.getElementById("cantidad");
  const totalElemento = document.getElementById("totalVenta");

  if (!campoPrecio) {
    return;
  }

  const precio = Number(campoPrecio.value) || 0;

  const cantidad = campoCantidad
    ? Number(campoCantidad.value) || 1
    : 1;

  const total = precio * cantidad;

  if (totalElemento) {
    totalElemento.textContent = formatearDinero(total);
  }
}

/* =========================================================
   GENERAR VENTA
========================================================= */

async function generarVenta() {
  const cliente = obtenerValor("cliente");
  const telefono = obtenerValor("telefono");
  const direccion = obtenerValor("direccion");
  const email = obtenerValor("email");
  const servicio = obtenerValor("servicio");
  const precio = Number(obtenerValor("precio"));

  const cantidad = Number(obtenerValor("cantidad")) || 1;
  const formaPago = obtenerValor("formaPago");
  const estado = obtenerValor("estado");

  // NUEVO: usar la fecha seleccionada en el formulario.
  const fechaVenta = obtenerValor("fechaVenta");

  if (!cliente) {
    mostrarToast("Ingresá el nombre del cliente", "error");
    return;
  }

  if (!servicio) {
    mostrarToast("Seleccioná un servicio", "error");
    return;
  }

  if (!fechaVenta) {
    mostrarToast("Seleccioná la fecha de venta", "error");
    return;
  }

  if (!precio || precio <= 0) {
    mostrarToast("Ingresá un precio válido", "error");
    return;
  }

  const btn = document.getElementById("btnGenerar");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Generando...";
  }

  const datos = {
    cliente,
    telefono,
    direccion,
    email,
    servicio,
    precio,
    cantidad,
    formaPago,
    estado,

    // Se fija al mediodía local para evitar desfases de zona horaria.
    fecha: new Date(`${fechaVenta}T12:00:00`).toISOString()
  };

  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(datos)
    });

    if (!respuesta.ok) {
      throw new Error(`Error HTTP ${respuesta.status}`);
    }

    const resultado = await respuesta.json();

    if (!resultado.ok) {
      throw new Error(
        resultado.error || "No se pudo generar el recibo."
      );
    }

    ultimoRecibo = {
      numero: resultado.numero,
      total: resultado.total,
      pdfUrl: resultado.pdfUrl,
      cliente,
      telefono,
      servicio,
      formaPago
    };

    mostrarResultadoRecibo(resultado);
    limpiarFormulario();
    limpiarCacheAPI();

    await cargarDatos({ force: true });

    mostrarToast("Venta registrada correctamente", "success");

  } catch (error) {
    console.error(error);

    mostrarToast(
      "Error: " + error.message,
      "error"
    );

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🧾 Generar recibo";
    }
  }
}

/* =========================================================
   RESULTADO RECIBO
========================================================= */

function mostrarResultadoRecibo(resultado) {
  const telefono = normalizarWhatsApp(
    ultimoRecibo ? ultimoRecibo.telefono : ""
  );

  const mensaje = crearMensajeWhatsApp(
    ultimoRecibo || {},
    resultado
  );

  const whatsappUrl = telefono
    ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  const resultadoElemento = document.getElementById("resultadoRecibo");

  if (resultadoElemento) {
    resultadoElemento.innerHTML = `
      <div class="recibo-success">
        <div class="success-icon">✓</div>
        <h3>¡Recibo generado correctamente!</h3>
        <p>
          Recibo Nº
          <strong>${escaparHTML(resultado.numero || "-")}</strong>
        </p>
        <p>
          Total:
          <strong>${formatearDinero(resultado.total)}</strong>
        </p>
      </div>

      <div
        class="recibo-actions"
        style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;"
      >
        <a
          href="${resultado.pdfUrl || "#"}"
          target="_blank"
          rel="noopener"
          class="btn btn-primary"
        >
          📄 Ver PDF
        </a>

        <a
          href="${whatsappUrl}"
          target="_blank"
          rel="noopener"
          class="btn btn-whatsapp"
          style="text-decoration:none;"
        >
          💬 Enviar por WhatsApp
        </a>
      </div>
    `;
  }

  const modal = document.getElementById("modalRecibo");

  if (modal) {
    modal.classList.add("show");
  }
}

/* =========================================================
   WHATSAPP RECIBO
========================================================= */

function crearMensajeWhatsApp(datos, resultado) {
  const numero = resultado.numero || datos.numero || "";
  const cliente = datos.cliente || "cliente";
  const servicio = datos.servicio || "";
  const total = resultado.total || datos.total || 0;
  const formaPago = datos.formaPago || "";
  const pdf = resultado.pdfUrl || datos.pdfUrl || "";

  return `Hola ${cliente} 👋

Te enviamos tu recibo de RosDrive 🚗

🧾 Recibo Nº ${numero}

🚘 Servicio: ${servicio}

💰 Total: ${formatearDinero(total)}

💳 Forma de pago: ${formaPago}

📄 Recibo:
${pdf}

¡Gracias por confiar en RosDrive!`;
}

/* =========================================================
   NORMALIZAR WHATSAPP
========================================================= */

function normalizarWhatsApp(telefono) {
  let numero = String(telefono || "").replace(/\D/g, "");

  if (!numero) {
    return "";
  }

  if (numero.startsWith("549")) {
    return numero;
  }

  if (numero.startsWith("54")) {
    return "549" + numero.substring(2);
  }

  if (numero.startsWith("0")) {
    numero = numero.substring(1);
  }

  if (numero.startsWith("15")) {
    numero = numero.substring(2);
  }

  return "549" + numero;
}

/* =========================================================
   CERRAR MODAL
========================================================= */

function cerrarModal() {
  const modal = document.getElementById("modalRecibo");

  if (modal) {
    modal.classList.remove("show");
  }
}

/* =========================================================
   LIMPIAR FORMULARIO
========================================================= */

function limpiarFormulario() {
  const campos = [
    "cliente",
    "telefono",
    "direccion",
    "email"
  ];

  campos.forEach(id => {
    const elemento = document.getElementById(id);

    if (elemento) {
      elemento.value = "";
    }
  });

  // NUEVO: después de limpiar, la fecha vuelve a ser la de hoy.
  const fechaVenta = document.getElementById("fechaVenta");

  if (fechaVenta) {
    fechaVenta.value = obtenerFechaLocalInput();
  }

  const servicio = document.getElementById("servicio");

  if (servicio) {
    servicio.value = "";
  }

  const precio = document.getElementById("precio");

  if (precio) {
    precio.value = "0";
  }

  const cantidad = document.getElementById("cantidad");

  if (cantidad) {
    cantidad.value = "1";
  }

  const formaPago = document.getElementById("formaPago");

  if (formaPago) {
    formaPago.value = "Transferencia";
  }

  const estado = document.getElementById("estado");

  if (estado) {
    estado.value = "PAGADO";
  }

  actualizarTotal();
}

/* =========================================================
   RESTO DEL ARCHIVO
========================================================= */

// El resto de las funciones de recibos, clientes, ventas,
// gastos, balance y utilidades debe conservarse sin cambios.
