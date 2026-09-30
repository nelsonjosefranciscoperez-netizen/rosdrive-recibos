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
  Erika: "5493416129272",
  Bruno: "5493416129272",
  Hector: "5493416129272"
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

  const item =
    apiCache.get(action);

  if (!item) {
    return null;
  }

  if (
    Date.now() - item.time >
    API_CACHE_TTL
  ) {

    apiCache.delete(action);

    return null;

  }

  return item.data;

}

/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    mostrarPantallaCarga();

    try {

      inicializarNavegacion();

      actualizarFecha();

      actualizarTotal();

      const servicio =
        document.getElementById(
          "servicio"
        );

      if (servicio) {

        servicio.addEventListener(
          "change",
          actualizarPrecioServicio
        );

      }

      const precio =
        document.getElementById(
          "precio"
        );

      if (precio) {

        precio.addEventListener(
          "input",
          actualizarTotal
        );

      }

      const cantidad =
        document.getElementById(
          "cantidad"
        );

      if (cantidad) {

        cantidad.addEventListener(
          "input",
          actualizarTotal
        );

      }

      inicializarBalance();

      inicializarGastos();

      const cargaDatos =
        cargarDatos();

      const tiempoMaximoCarga =
        new Promise(
          resolve => {

            setTimeout(
              resolve,
              3500
            );

          }
        );

      Promise.race([
        cargaDatos,
        tiempoMaximoCarga
      ])
        .catch(
          error => {

            console.error(
              "Error cargando datos:",
              error
            );

          }
        )
        .finally(
          () => {

            ocultarPantallaCarga();

          }
        );

    } catch (error) {

      console.error(
        "Error iniciando RosDrive:",
        error
      );

      ocultarPantallaCarga();

    }

  }
);

/* =========================================================
   NAVEGACIÓN
========================================================= */

function inicializarNavegacion() {

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            mostrarSeccion(
              button.dataset.section
            );

          }
        );

      }
    );

}

function mostrarSeccion(
  section
) {

  document
    .querySelectorAll(
      ".section"
    )
    .forEach(
      el => {

        el.classList.remove(
          "active"
        );

      }
    );

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      el => {

        el.classList.remove(
          "active"
        );

      }
    );

  const destino =
    document.getElementById(
      section
    );

  if (destino) {

    destino.classList.add(
      "active"
    );

  }

  const boton =
    document.querySelector(
      `.nav-item[data-section="${section}"]`
    );

  if (boton) {

    boton.classList.add(
      "active"
    );

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

    const titulo =
      document.getElementById(
        "page-title"
      );

    const subtitulo =
      document.getElementById(
        "page-subtitle"
      );

    if (titulo) {

      titulo.textContent =
        titulos[section][0];

    }

    if (subtitulo) {

      subtitulo.textContent =
        titulos[section][1];

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

  const elemento =
    document.getElementById(
      "fechaActual"
    );

  if (!elemento) {
    return;
  }

  const fecha =
    new Date();

  elemento.textContent =
    fecha.toLocaleDateString(
      "es-AR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

}

/* =========================================================
   PANTALLA DE CARGA
========================================================= */

function mostrarPantallaCarga() {

  const pantalla =
    document.getElementById(
      "loadingScreen"
    );

  if (!pantalla) {
    return;
  }

  pantalla.classList.remove(
    "hidden"
  );

  pantalla.style.opacity =
    "1";

  pantalla.style.visibility =
    "visible";

  pantalla.style.pointerEvents =
    "auto";

}

function ocultarPantallaCarga() {

  const pantalla =
    document.getElementById(
      "loadingScreen"
    );

  if (!pantalla) {
    return;
  }

  pantalla.classList.add(
    "hidden"
  );

  pantalla.style.opacity =
    "0";

  pantalla.style.visibility =
    "hidden";

  pantalla.style.pointerEvents =
    "none";

  setTimeout(
    () => {

      if (
        pantalla &&
        pantalla.parentNode
      ) {

        pantalla.remove();

      }

    },
    550
  );

}

/* =========================================================
   API GET
========================================================= */

async function consultarAPI(
  action,
  opciones = {}
) {

  const force =
    opciones.force === true;

  if (!force) {

    const cache =
      obtenerCacheAPI(
        action
      );

    if (cache) {

      return cache;

    }

    if (
      apiRequests.has(
        action
      )
    ) {

      return apiRequests.get(
        action
      );

    }

  }

  const url =
    `${API_URL}?action=${encodeURIComponent(
      action
    )}`;

  const promesa =
    fetch(
      url,
      {
        method: "GET",
        cache: "no-store"
      }
    )
      .then(
        async respuesta => {

          if (!respuesta.ok) {

            throw new Error(
              `Error HTTP ${respuesta.status}`
            );

          }

          const datos =
            await respuesta.json();

          if (
            datos.ok === false
          ) {

            throw new Error(
              datos.error ||
              "Error en la API"
            );

          }

          apiCache.set(
            action,
            {
              time: Date.now(),
              data: datos
            }
          );

          return datos;

        }
      )
      .finally(
        () => {

          apiRequests.delete(
            action
          );

        }
      );

  apiRequests.set(
    action,
    promesa
  );

  return promesa;

}

/* =========================================================
   CARGAR DATOS
========================================================= */

async function cargarDatos(
  opciones = {}
) {

  const force =
    opciones.force === true;

  try {

    const resultados =
      await Promise.allSettled([

        consultarAPI(
          "dashboard",
          { force }
        ),

        consultarAPI(
          "ventas",
          { force }
        ),

        consultarAPI(
          "clientes",
          { force }
        ),

        consultarAPI(
          "recibos",
          { force }
        ),

        consultarAPI(
          "servicios",
          { force }
        ),

        consultarAPI(
          "gastos",
          { force }
        )

      ]);

    /* DASHBOARD */

    if (
      resultados[0].status ===
      "fulfilled"
    ) {

      dashboardData =
        resultados[0].value;

      actualizarDashboard(
        dashboardData
      );

    } else {

      console.error(
        "Error Dashboard:",
        resultados[0].reason
      );

    }

    /* VENTAS */

    if (
      resultados[1].status ===
      "fulfilled"
    ) {

      ventas =
        normalizarLista(
          resultados[1].value,
          [
            "ventas",
            "data",
            "resultado"
          ]
        );

      renderizarVentas(
        ventas
      );

    } else {

      console.error(
        "Error Ventas:",
        resultados[1].reason
      );

    }

    /* CLIENTES */

    if (
      resultados[2].status ===
      "fulfilled"
    ) {

      clientes =
        normalizarLista(
          resultados[2].value,
          [
            "clientes",
            "data",
            "resultado"
          ]
        );

      renderizarClientes(
        clientes
      );

    } else {

      console.error(
        "Error Clientes:",
        resultados[2].reason
      );

    }

    /* RECIBOS */

    if (
      resultados[3].status ===
      "fulfilled"
    ) {

      recibos =
        normalizarLista(
          resultados[3].value,
          [
            "recibos",
            "data",
            "resultado"
          ]
        );

      renderizarRecibos(
        recibos
      );

    } else {

      console.error(
        "Error Recibos:",
        resultados[3].reason
      );

    }

    /* SERVICIOS */

    if (
      resultados[4].status ===
      "fulfilled"
    ) {

      servicios =
        normalizarLista(
          resultados[4].value,
          [
            "servicios",
            "data",
            "resultado"
          ]
        );

      cargarServicios(
        servicios
      );

    } else {

      console.error(
        "Error Servicios:",
        resultados[4].reason
      );

    }

    /* GASTOS */

    if (
      resultados[5].status ===
      "fulfilled"
    ) {

      gastos =
        normalizarLista(
          resultados[5].value,
          [
            "gastos",
            "data",
            "resultado"
          ]
        );

      renderizarGastos(
        gastos
      );

    } else {

      console.warn(
        "No se pudieron cargar los gastos:",
        resultados[5].reason
      );

      gastos = [];

    }

    actualizarEstadisticasGenerales();

  } catch (error) {

    console.error(
      error
    );

    mostrarToast(
      "No se pudieron cargar los datos",
      "error"
    );

  }

}

/* =========================================================
   NORMALIZAR LISTAS
========================================================= */

function normalizarLista(
  respuesta,
  posiblesPropiedades
) {

  if (!respuesta) {
    return [];
  }

  for (
    const propiedad of posiblesPropiedades
  ) {

    if (
      Array.isArray(
        respuesta[propiedad]
      )
    ) {

      return respuesta[propiedad];

    }

  }

  if (
    Array.isArray(
      respuesta
    )
  ) {

    return respuesta;

  }

  return [];

}

/* =========================================================
   DASHBOARD
========================================================= */

function actualizarDashboard(
  data
) {

  const facturacion =
    Number(
      data.facturacion || 0
    );

  const recibosMes =
    Number(
      data.recibos || 0
    );

  const clientesTotal =
    Number(
      data.clientes || 0
    );

  const serviciosTotal =
    Number(
      data.servicios || 0
    );

  const statFacturacion =
    document.getElementById(
      "statFacturacion"
    );

  const statRecibos =
    document.getElementById(
      "statRecibos"
    );

  const statClientes =
    document.getElementById(
      "statClientes"
    );

  const statServicios =
    document.getElementById(
      "statServicios"
    );

  if (statFacturacion) {

    statFacturacion.textContent =
      formatearDinero(
        facturacion
      );

  }

  if (statRecibos) {

    statRecibos.textContent =
      recibosMes;

  }

  if (statClientes) {

    statClientes.textContent =
      clientesTotal;

  }

  if (statServicios) {

    statServicios.textContent =
      serviciosTotal;

  }

  renderizarUltimasVentas(
    data.ultimasVentas || []
  );

}

/* =========================================================
   ÚLTIMAS VENTAS
========================================================= */

function renderizarUltimasVentas(
  lista
) {

  const contenedor =
    document.getElementById(
      "ultimasVentas"
    );

  if (!contenedor) {
    return;
  }

  if (
    !lista ||
    !lista.length
  ) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📊
        </div>

        <h3>
          Todavía no hay ventas cargadas
        </h3>

        <p>
          Las ventas que generes desde la app aparecerán acá.
        </p>

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

        ${lista.map(
          venta => `

          <tr>

            <td>
              <strong>
                ${escaparHTML(
                  venta.recibo || "-"
                )}
              </strong>
            </td>

            <td>
              ${escaparHTML(
                venta.fecha || "-"
              )}
            </td>

            <td>
              ${escaparHTML(
                venta.cliente || "-"
              )}
            </td>

            <td>
              ${escaparHTML(
                venta.servicio || "-"
              )}
            </td>

            <td>
              ${formatearDinero(
                venta.total
              )}
            </td>

            <td>
              ${crearBadgeEstado(
                venta.estado
              )}
            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}

/* =========================================================
   ESTADÍSTICAS
========================================================= */

function actualizarEstadisticasGenerales() {

  const statRecibos =
    document.getElementById(
      "statRecibos"
    );

  const statClientes =
    document.getElementById(
      "statClientes"
    );

  const statServicios =
    document.getElementById(
      "statServicios"
    );

  const statFacturacion =
    document.getElementById(
      "statFacturacion"
    );

  if (
    statRecibos &&
    recibos.length
  ) {

    statRecibos.textContent =
      recibos.length;

  }

  if (
    statClientes &&
    clientes.length
  ) {

    statClientes.textContent =
      clientes.length;

  }

  if (
    statServicios &&
    servicios.length
  ) {

    statServicios.textContent =
      servicios.length;

  }

  const total =
    ventas.reduce(
      (
        suma,
        venta
      ) => {

        return (
          suma +
          Number(
            venta.total || 0
          )
        );

      },
      0
    );

  if (
    statFacturacion &&
    !dashboardData.facturacion
  ) {

    statFacturacion.textContent =
      formatearDinero(
        total
      );

  }

}

/* =========================================================
   SERVICIOS
========================================================= */

function cargarServicios(
  lista
) {

  const select =
    document.getElementById(
      "servicio"
    );

  if (
    !select ||
    !lista.length
  ) {

    return;

  }

  select.innerHTML = `

    <option value="">
      Seleccionar servicio...
    </option>

  `;

  lista.forEach(
    servicio => {

      const nombre =
        servicio.nombre ||
        servicio.servicio ||
        servicio.descripcion ||
        "";

      const precio =
        Number(
          servicio.precio ||
          servicio.total ||
          servicio.valor ||
          0
        );

      if (!nombre) {
        return;
      }

      const option =
        document.createElement(
          "option"
        );

      option.value =
        nombre;

      option.textContent =
        `${nombre} - ${formatearDinero(
          precio
        )}`;

      option.dataset.precio =
        precio;

      select.appendChild(
        option
      );

    }
  );

}

/* =========================================================
   PRECIO SERVICIO
========================================================= */

function actualizarPrecioServicio() {

  const select =
    document.getElementById(
      "servicio"
    );

  if (!select) {
    return;
  }

  const opcion =
    select.options[
      select.selectedIndex
    ];

  if (!opcion) {
    return;
  }

  const precio =
    Number(
      opcion.dataset.precio || 0
    );

  const campoPrecio =
    document.getElementById(
      "precio"
    );

  if (campoPrecio) {

    campoPrecio.value =
      precio;

  }

  actualizarTotal();

}

/* =========================================================
   TOTAL
========================================================= */

function actualizarTotal() {

  const campoPrecio =
    document.getElementById(
      "precio"
    );

  const campoCantidad =
    document.getElementById(
      "cantidad"
    );

  const totalElemento =
    document.getElementById(
      "totalVenta"
    );

  if (!campoPrecio) {
    return;
  }

  const precio =
    Number(
      campoPrecio.value
    ) || 0;

  const cantidad =
    campoCantidad
      ? Number(
          campoCantidad.value
        ) || 1
      : 1;

  const total =
    precio * cantidad;

  if (totalElemento) {

    totalElemento.textContent =
      formatearDinero(
        total
      );

  }

}

/* =========================================================
   GENERAR VENTA
========================================================= */

async function generarVenta() {

  const cliente =
    obtenerValor(
      "cliente"
    );

  const telefono =
    obtenerValor(
      "telefono"
    );

  const direccion =
    obtenerValor(
      "direccion"
    );

  const email =
    obtenerValor(
      "email"
    );

  const servicio =
    obtenerValor(
      "servicio"
    );

  const precio =
    Number(
      obtenerValor(
        "precio"
      )
    );

  const cantidad =
    Number(
      obtenerValor(
        "cantidad"
      )
    ) || 1;

  const formaPago =
    obtenerValor(
      "formaPago"
    );

  const estado =
    obtenerValor(
      "estado"
    );

  if (!cliente) {

    mostrarToast(
      "Ingresá el nombre del cliente",
      "error"
    );

    return;

  }

  if (!servicio) {

    mostrarToast(
      "Seleccioná un servicio",
      "error"
    );

    return;

  }

  if (
    !precio ||
    precio <= 0
  ) {

    mostrarToast(
      "Ingresá un precio válido",
      "error"
    );

    return;

  }

  const btn =
    document.getElementById(
      "btnGenerar"
    );

  if (btn) {

    btn.disabled = true;

    btn.textContent =
      "⏳ Generando...";

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

    fecha:
      new Date().toISOString()

  };

  try {

    const respuesta =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(
              datos
            )

        }
      );

    if (!respuesta.ok) {

      throw new Error(
        `Error HTTP ${respuesta.status}`
      );

    }

    const resultado =
      await respuesta.json();

    if (!resultado.ok) {

      throw new Error(
        resultado.error ||
        "No se pudo generar el recibo."
      );

    }

    ultimoRecibo = {

      numero:
        resultado.numero,

      total:
        resultado.total,

      pdfUrl:
        resultado.pdfUrl,

      cliente,
      telefono,
      servicio,
      formaPago

    };

    mostrarResultadoRecibo(
      resultado
    );

    limpiarFormulario();

    limpiarCacheAPI();

    await cargarDatos({
      force: true
    });

    mostrarToast(
      "Venta registrada correctamente",
      "success"
    );

  } catch (error) {

    console.error(
      error
    );

    mostrarToast(
      "Error: " +
      error.message,
      "error"
    );

  } finally {

    if (btn) {

      btn.disabled = false;

      btn.textContent =
        "🧾 Generar recibo";

    }

  }

}

/* =========================================================
   RESULTADO RECIBO
========================================================= */

function mostrarResultadoRecibo(
  resultado
) {

  const telefono =
    normalizarWhatsApp(
      ultimoRecibo
        ? ultimoRecibo.telefono
        : ""
    );

  const mensaje =
    crearMensajeWhatsApp(
      ultimoRecibo || {},
      resultado
    );

  const whatsappUrl =
    telefono

      ? `https://wa.me/${telefono}?text=${encodeURIComponent(
          mensaje
        )}`

      : `https://wa.me/?text=${encodeURIComponent(
          mensaje
        )}`;

  const resultadoElemento =
    document.getElementById(
      "resultadoRecibo"
    );

  if (resultadoElemento) {

    resultadoElemento.innerHTML = `

      <div class="recibo-success">

        <div class="success-icon">
          ✓
        </div>

        <h3>
          ¡Recibo generado correctamente!
        </h3>

        <p>
          Recibo Nº
          <strong>
            ${escaparHTML(
              resultado.numero || "-"
            )}
          </strong>
        </p>

        <p>
          Total:
          <strong>
            ${formatearDinero(
              resultado.total
            )}
          </strong>
        </p>

      </div>

      <div
        class="recibo-actions"
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
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

  const modal =
    document.getElementById(
      "modalRecibo"
    );

  if (modal) {

    modal.classList.add(
      "show"
    );

  }

}

/* =========================================================
   WHATSAPP RECIBO
========================================================= */

function crearMensajeWhatsApp(
  datos,
  resultado
) {

  const numero =
    resultado.numero ||
    datos.numero ||
    "";

  const cliente =
    datos.cliente ||
    "cliente";

  const servicio =
    datos.servicio ||
    "";

  const total =
    resultado.total ||
    datos.total ||
    0;

  const formaPago =
    datos.formaPago ||
    "";

  const pdf =
    resultado.pdfUrl ||
    datos.pdfUrl ||
    "";

  return `Hola ${cliente} 👋

Te enviamos tu recibo de RosDrive 🚗

🧾 Recibo Nº ${numero}

🚘 Servicio: ${servicio}

💰 Total: ${formatearDinero(
    total
  )}

💳 Forma de pago: ${formaPago}

📄 Recibo:
${pdf}

¡Gracias por confiar en RosDrive!`;

}

/* =========================================================
   NORMALIZAR WHATSAPP
========================================================= */

function normalizarWhatsApp(
  telefono
) {

  let numero =
    String(
      telefono || ""
    ).replace(
      /\D/g,
      ""
    );

  if (!numero) {
    return "";
  }

  if (
    numero.startsWith(
      "549"
    )
  ) {

    return numero;

  }

  if (
    numero.startsWith(
      "54"
    )
  ) {

    return (
      "549" +
      numero.substring(2)
    );

  }

  if (
    numero.startsWith(
      "0"
    )
  ) {

    numero =
      numero.substring(1);

  }

  if (
    numero.startsWith(
      "15"
    )
  ) {

    numero =
      numero.substring(2);

  }

  return (
    "549" +
    numero
  );

}

/* =========================================================
   CERRAR MODAL
========================================================= */

function cerrarModal() {

  const modal =
    document.getElementById(
      "modalRecibo"
    );

  if (modal) {

    modal.classList.remove(
      "show"
    );

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

  campos.forEach(
    id => {

      const elemento =
        document.getElementById(
          id
        );

      if (elemento) {

        elemento.value =
          "";

      }

    }
  );

  const servicio =
    document.getElementById(
      "servicio"
    );

  if (servicio) {

    servicio.value =
      "";

  }

  const precio =
    document.getElementById(
      "precio"
    );

  if (precio) {

    precio.value =
      "0";

  }

  const cantidad =
    document.getElementById(
      "cantidad"
    );

  if (cantidad) {

    cantidad.value =
      "1";

  }

  const formaPago =
    document.getElementById(
      "formaPago"
    );

  if (formaPago) {

    formaPago.value =
      "Transferencia";

  }

  const estado =
    document.getElementById(
      "estado"
    );

  if (estado) {

    estado.value =
      "PAGADO";

  }

  actualizarTotal();

}

/* =========================================================
   RECIBOS - FILTRO
========================================================= */

function filtrarRecibos() {

  const campo =
    document.getElementById(
      "buscarRecibo"
    );

  const texto =
    campo
      ? campo.value
          .toLowerCase()
          .trim()
      : "";

  const filtrados =
    recibos.filter(
      recibo => {

        return (

          String(
            recibo.numero ||
            recibo.recibo ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            )

          ||

          String(
            recibo.cliente ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            )

        );

      }
    );

  renderizarRecibos(
    filtrados
  );

}

/* =========================================================
   RECIBOS - RENDER
========================================================= */

function renderizarRecibos(
  lista
) {

  const contenedor =
    document.getElementById(
      "listaRecibos"
    );

  if (!contenedor) {
    return;
  }

  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          🧾
        </div>

        <h3>
          No hay recibos para mostrar
        </h3>

        <p>
          Los recibos generados aparecerán acá.
        </p>

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
          <th>ACCIONES</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(
          recibo => {

            const numero =
              recibo.numero ||
              recibo.recibo ||
              "";

            const pdf =
              recibo.pdf ||
              recibo.pdfUrl ||
              "";

            return `

              <tr>

                <td>

                  <strong>
                    ${escaparHTML(
                      numero || "-"
                    )}
                  </strong>

                </td>

                <td>
                  ${escaparHTML(
                    recibo.fecha || "-"
                  )}
                </td>

                <td>
                  ${escaparHTML(
                    recibo.cliente || "-"
                  )}
                </td>

                <td>
                  ${escaparHTML(
                    recibo.servicio || "-"
                  )}
                </td>

                <td>
                  ${formatearDinero(
                    recibo.total
                  )}
                </td>

                <td>
                  ${crearBadgeEstado(
                    recibo.estado
                  )}
                </td>

                <td>

                  <div
                    class="recibo-actions-small"
                    style="
                      display:flex;
                      gap:8px;
                      flex-wrap:wrap;
                    "
                  >

                    ${
                      pdf
                        ? `
                          <a
                            href="${pdf}"
                            target="_blank"
                            rel="noopener"
                            class="pdf-link"
                          >
                            📄 Ver
                          </a>
                        `
                        : ""
                    }

                    <button
                      type="button"
                      class="btn-delete"
                      onclick="eliminarRecibo('${escaparAtributo(
                        numero
                      )}')"
                      style="cursor:pointer;"
                    >
                      🗑️ Eliminar
                    </button>

                  </div>

                </td>

              </tr>

            `;

          }
        ).join("")}

      </tbody>

    </table>

  `;

}

/* =========================================================
   ELIMINAR RECIBO
========================================================= */

async function eliminarRecibo(
  numero
) {

  if (!numero) {

    mostrarToast(
      "No se encontró el número del recibo.",
      "error"
    );

    return;

  }

  const confirmado =
    confirm(
      `¿Seguro que querés eliminar el recibo Nº ${numero}?\n\n` +
      `Se eliminará la venta del balance y el PDF asociado de Drive.`
    );

  if (!confirmado) {
    return;
  }

  try {

    mostrarToast(
      "Eliminando recibo...",
      "success"
    );

    const respuesta =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "eliminar",

              numero:
                numero

            })

        }
      );

    if (!respuesta.ok) {

      throw new Error(
        `Error HTTP ${respuesta.status}`
      );

    }

    const resultado =
      await respuesta.json();

    if (!resultado.ok) {

      throw new Error(
        resultado.error ||
        "No se pudo eliminar el recibo."
      );

    }

    mostrarToast(
      `Recibo Nº ${numero} eliminado correctamente`,
      "success"
    );

    limpiarCacheAPI();

    await cargarDatos({
      force: true
    });

  } catch (error) {

    console.error(
      error
    );

    mostrarToast(
      "Error al eliminar: " +
      error.message,
      "error"
    );

  }

}

/* =========================================================
   CLIENTES - FILTRO
========================================================= */

function filtrarClientes() {

  const campo =
    document.getElementById(
      "buscarCliente"
    );

  const texto =
    campo
      ? campo.value
          .toLowerCase()
          .trim()
      : "";

  const filtrados =
    clientes.filter(
      cliente => {

        return (

          String(
            cliente.nombre ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            )

          ||

          String(
            cliente.telefono ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            )

          ||

          String(
            cliente.email ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            )

        );

      }
    );

  renderizarClientes(
    filtrados
  );

}

/* =========================================================
   CLIENTES - RENDER
========================================================= */

function renderizarClientes(
  lista
) {

  const contenedor =
    document.getElementById(
      "listaClientes"
    );

  if (!contenedor) {
    return;
  }

  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          👥
        </div>

        <h3>
          No hay clientes para mostrar
        </h3>

        <p>
          Los clientes aparecerán automáticamente al registrar ventas.
        </p>

      </div>

    `;

    return;

  }

  contenedor.innerHTML = `

    <table class="data-table">

      <thead>

        <tr>

          <th>CLIENTE</th>
          <th>TELÉFONO</th>
          <th>DIRECCIÓN</th>
          <th>EMAIL</th>
          <th>COMPRAS</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(
          cliente => `

          <tr>

            <td>

              <strong>
                ${escaparHTML(
                  cliente.nombre || "-"
                )}
              </strong>

            </td>

            <td>
              ${escaparHTML(
                cliente.telefono || "-"
              )}
            </td>

            <td>
              ${escaparHTML(
                cliente.direccion || "-"
              )}
            </td>

            <td>
              ${escaparHTML(
                cliente.email || "-"
              )}
            </td>

            <td>
              ${formatearDinero(
                cliente.total || 0
              )}
            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}

/* =========================================================
   VENTAS - FILTRO
========================================================= */

function filtrarVentas() {

  const campo =
    document.getElementById(
      "buscarVenta"
    );

  const filtroPago =
    document.getElementById(
      "filtroPago"
    );

  const texto =
    campo
      ? campo.value
          .toLowerCase()
          .trim()
      : "";

  const pago =
    filtroPago
      ? filtroPago.value
      : "";

  const filtradas =
    ventas.filter(
      venta => {

        const coincideTexto =

          String(
            venta.cliente ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            )

          ||

          String(
            venta.servicio ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            )

          ||

          String(
            venta.recibo ||
            ""
          )
            .toLowerCase()
            .includes(
              texto
            );

        const coincidePago =
          !pago ||
          (
            venta.pago ||
            venta.formaPago ||
            ""
          ) === pago;

        return (
          coincideTexto &&
          coincidePago
        );

      }
    );

  renderizarVentas(
    filtradas
  );

}

/* =========================================================
   VENTAS - RENDER
========================================================= */

function renderizarVentas(
  lista
) {

  const contenedor =
    document.getElementById(
      "tablaVentas"
    );

  if (!contenedor) {
    return;
  }

  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📈
        </div>

        <h3>
          No hay ventas para mostrar
        </h3>

        <p>
          Las operaciones aparecerán acá.
        </p>

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
          <th>PAGO</th>
          <th>ESTADO</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(
          venta => `

          <tr>

            <td>

              <strong>
                ${escaparHTML(
                  venta.recibo ||
                  venta.numero ||
                  "-"
                )}
              </strong>

            </td>

            <td>
              ${escaparHTML(
                venta.fecha || "-"
              )}
            </td>

            <td>
              ${escaparHTML(
                venta.cliente || "-"
              )}
            </td>

            <td>
              ${escaparHTML(
                venta.servicio || "-"
              )}
            </td>

            <td>
              ${formatearDinero(
                venta.total
              )}
            </td>

            <td>
              ${escaparHTML(
                venta.pago ||
                venta.formaPago ||
                "-"
              )}
            </td>

            <td>
              ${crearBadgeEstado(
                venta.estado
              )}
            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}

/* =========================================================
   GASTOS
========================================================= */

function inicializarGastos() {

  const formulario =
    document.getElementById(
      "formGasto"
    );

  if (!formulario) {
    return;
  }

  formulario.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      await registrarGasto();

    }
  );

}

async function registrarGasto() {

  const descripcion =
    obtenerValor(
      "descripcionGasto"
    );

  const monto =
    Number(
      obtenerValor(
        "montoGasto"
      )
    );

  const categoria =
    obtenerValor(
      "categoriaGasto"
    );

  const fecha =
    obtenerValor(
      "fechaGasto"
    ) ||
    new Date().toISOString();

  if (!descripcion) {

    mostrarToast(
      "Ingresá una descripción para el gasto.",
      "error"
    );

    return;

  }

  if (
    !monto ||
    monto <= 0
  ) {

    mostrarToast(
      "Ingresá un monto válido.",
      "error"
    );

    return;

  }

  try {

    const respuesta =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "registrarGasto",

              descripcion,
              monto,
              categoria,
              fecha

            })

        }
      );

    if (!respuesta.ok) {

      throw new Error(
        `Error HTTP ${respuesta.status}`
      );

    }

    const resultado =
      await respuesta.json();

    if (!resultado.ok) {

      throw new Error(
        resultado.error ||
        "No se pudo registrar el gasto."
      );

    }

    mostrarToast(
      "Gasto registrado correctamente.",
      "success"
    );

    limpiarCacheAPI();

    const formulario =
      document.getElementById(
        "formGasto"
      );

    if (formulario) {

      formulario.reset();

    }

    await cargarDatos({
      force: true
    });

  } catch (error) {

    console.error(
      error
    );

    mostrarToast(
      "Error al registrar gasto: " +
      error.message,
      "error"
    );

  }

}

function renderizarGastos(
  lista
) {

  const contenedor =
    document.getElementById(
      "listaGastos"
    );

  if (!contenedor) {
    return;
  }

  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          💸
        </div>

        <h3>
          No hay gastos registrados
        </h3>

        <p>
          Los gastos que cargues aparecerán acá.
        </p>

      </div>

    `;

    return;

  }

  const ordenados =
    [...lista].sort(
      (a, b) =>
        obtenerFechaObjeto(
          b.fecha
        ) -
        obtenerFechaObjeto(
          a.fecha
        )
    );

  contenedor.innerHTML = `

    <table class="data-table">

      <thead>

        <tr>

          <th>FECHA</th>
          <th>DESCRIPCIÓN</th>
          <th>CATEGORÍA</th>
          <th>MONTO</th>

        </tr>

      </thead>

      <tbody>

        ${ordenados.map(
          gasto => `

          <tr>

            <td>
              ${escaparHTML(
                formatearFecha(
                  gasto.fecha
                )
              )}
            </td>

            <td>

              <strong>
                ${escaparHTML(
                  gasto.descripcion ||
                  gasto.detalle ||
                  gasto.concepto ||
                  "-"
                )}
              </strong>

            </td>

            <td>
              ${escaparHTML(
                gasto.categoria ||
                "-"
              )}
            </td>

            <td>

              <strong>
                ${formatearDinero(
                  obtenerMontoGasto(
                    gasto
                  )
                )}
              </strong>

            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}

/* =========================================================
   BALANCE
========================================================= */

function inicializarBalance() {

  const desde =
    document.getElementById(
      "balanceDesde"
    );

  const hasta =
    document.getElementById(
      "balanceHasta"
    );

  const fechaAnterior =
    document.getElementById(
      "fechaBalance"
    );

  const hoy =
    new Date();

  if (
    desde &&
    !desde.value
  ) {

    desde.value =
      convertirFechaInput(
        obtenerInicioSemana(
          hoy
        )
      );

  }

  if (
    hasta &&
    !hasta.value
  ) {

    hasta.value =
      convertirFechaInput(
        obtenerFinSemana(
          hoy
        )
      );

  }

  if (
    fechaAnterior &&
    !fechaAnterior.value
  ) {

    fechaAnterior.value =
      convertirFechaInput(
        hoy
      );

  }

  if (balanceInicializado) {
    return;
  }

  balanceInicializado = true;

  const boton =
    document.getElementById(
      "btnCalcularBalance"
    ) ||
    document.getElementById(
      "btnActualizarBalance"
    );

  if (boton) {

    boton.addEventListener(
      "click",
      calcularBalance
    );

  }

  if (desde) {

    desde.addEventListener(
      "change",
      () => {

        ultimoBalance =
          null;

      }
    );

  }

  if (hasta) {

    hasta.addEventListener(
      "change",
      () => {

        ultimoBalance =
          null;

      }
    );

  }

}

/* =========================================================
   CALCULAR BALANCE
   CONSULTA DIRECTAMENTE EL ENDPOINT balance DE APPS SCRIPT
========================================================= */

async function calcularBalance() {

  const desdeElemento =
    document.getElementById(
      "balanceDesde"
    );

  const hastaElemento =
    document.getElementById(
      "balanceHasta"
    );

  let desde =
    desdeElemento
      ? desdeElemento.value
      : "";

  let hasta =
    hastaElemento
      ? hastaElemento.value
      : "";

  /* Compatibilidad con el sistema anterior */

  if (
    !desde &&
    !hasta
  ) {

    const fechaAnterior =
      document.getElementById(
        "fechaBalance"
      );

    if (
      fechaAnterior &&
      fechaAnterior.value
    ) {

      const rango =
        obtenerRangoSemana(
          fechaAnterior.value
        );

      desde =
        convertirFechaInput(
          rango.inicio
        );

      hasta =
        convertirFechaInput(
          rango.fin
        );

    }

  }

  if (
    !desde ||
    !hasta
  ) {

    mostrarToast(
      "Seleccioná la fecha desde y hasta.",
      "error"
    );

    return null;

  }

  const fechaDesde =
    obtenerFechaObjeto(
      desde
    );

  const fechaHasta =
    obtenerFechaObjeto(
      hasta
    );

  if (
    isNaN(
      fechaDesde.getTime()
    ) ||
    isNaN(
      fechaHasta.getTime()
    )
  ) {

    mostrarToast(
      "Las fechas seleccionadas no son válidas.",
      "error"
    );

    return null;

  }

  if (
    fechaDesde >
    fechaHasta
  ) {

    mostrarToast(
      "La fecha Desde no puede ser posterior a Hasta.",
      "error"
    );

    return null;

  }

  const boton =
    document.getElementById(
      "btnCalcularBalance"
    ) ||
    document.getElementById(
      "btnActualizarBalance"
    );

  const textoOriginal =
    boton
      ? boton.innerHTML
      : "";

  if (boton) {

    boton.disabled =
      true;

    boton.innerHTML =
      "⏳ Calculando...";

  }

  try {

    const url =
      `${API_URL}?action=balance&desde=${encodeURIComponent(
        desde
      )}&hasta=${encodeURIComponent(
        hasta
      )}`;

    const respuesta =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!respuesta.ok) {

      throw new Error(
        `Error HTTP ${respuesta.status}`
      );

    }

    const resultado =
      await respuesta.json();

    if (
      resultado.ok === false
    ) {

      throw new Error(
        resultado.error ||
        "No se pudo calcular el balance."
      );

    }

    const distribucion =
      resultado.distribucion ||
      {};

    const porcentajes =
      resultado.porcentajes ||
      PORCENTAJES;

    const balance = {

      inicio:
        obtenerFechaObjeto(
          resultado.desde ||
          desde
        ),

      fin:
        obtenerFechaObjeto(
          resultado.hasta ||
          hasta
        ),

      ingresos:
        Number(
          resultado.ingresos ||
          0
        ),

      gastos:
        Number(
          resultado.gastos ||
          0
        ),

      disponible:
        Number(
          resultado.neto ??
          resultado.disponible ??
          0
        ),

      Erika:
        Number(
          distribucion.erika ||
          0
        ),

      Bruno:
        Number(
          distribucion.bruno ||
          0
        ),

      Hector:
        Number(
          distribucion.hector ||
          0
        ),

      porcentajes: {

        Erika:
          Number(
            porcentajes.erika ??
            PORCENTAJES.Erika
          ),

        Bruno:
          Number(
            porcentajes.bruno ??
            PORCENTAJES.Bruno
          ),

        Hector:
          Number(
            porcentajes.hector ??
            PORCENTAJES.Hector
          )

      },

      ventas:
        Array.isArray(
          resultado.ventas
        )
          ? resultado.ventas
          : [],

      gastosLista:
        Array.isArray(
          resultado.gastosDetalle
        )
          ? resultado.gastosDetalle
          : []

    };

    ultimoBalance =
      balance;

    renderizarBalance(
      balance
    );

    mostrarToast(
      `Balance calculado: ${balance.ventas.length} ventas y ${balance.gastosLista.length} gastos.`,
      "success"
    );

    return balance;

  } catch (error) {

    console.error(
      "Error calculando balance:",
      error
    );

    mostrarToast(
      "No se pudo calcular el balance: " +
      error.message,
      "error"
    );

    return null;

  } finally {

    if (boton) {

      boton.disabled =
        false;

      boton.innerHTML =
        textoOriginal ||
        "📊 Calcular balance";

    }

  }

}

/* =========================================================
   COMPATIBILIDAD
========================================================= */

async function actualizarBalance() {

  return calcularBalance();

}

/* =========================================================
   RANGO SEMANAL
========================================================= */

function obtenerInicioSemana(
  fechaBase
) {

  const fecha =
    new Date(
      fechaBase
    );

  fecha.setHours(
    0,
    0,
    0,
    0
  );

  const dia =
    fecha.getDay();

  const diferencia =
    dia === 0
      ? 6
      : dia - 1;

  fecha.setDate(
    fecha.getDate() -
    diferencia
  );

  return fecha;

}

function obtenerFinSemana(
  fechaBase
) {

  const inicio =
    obtenerInicioSemana(
      fechaBase
    );

  const fin =
    new Date(
      inicio
    );

  fin.setDate(
    fin.getDate() +
    6
  );

  fin.setHours(
    23,
    59,
    59,
    999
  );

  return fin;

}

function obtenerRangoSemana(
  fechaBase
) {

  return {

    inicio:
      obtenerInicioSemana(
        fechaBase
      ),

    fin:
      obtenerFinSemana(
        fechaBase
      )

  };

}

/* =========================================================
   FILTRAR FECHAS
========================================================= */

function filtrarPorRangoFecha(
  lista,
  inicio,
  fin
) {

  if (!Array.isArray(lista)) {
    return [];
  }

  return lista.filter(
    elemento => {

      const fecha =
        obtenerFechaObjeto(
          elemento.fecha
        );

      if (
        !fecha ||
        isNaN(
          fecha.getTime()
        )
      ) {

        return false;

      }

      return (
        fecha >= inicio &&
        fecha <= fin
      );

    }
  );

}

/* =========================================================
   OBTENER FECHA
========================================================= */

function obtenerFechaObjeto(
  valor
) {

  if (!valor) {

    return new Date(0);

  }

  if (
    valor instanceof Date
  ) {

    return new Date(
      valor
    );

  }

  const texto =
    String(
      valor
    ).trim();

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      texto
    )
  ) {

    const partes =
      texto.split("-");

    return new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

  }

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      texto
    )
  ) {

    const partes =
      texto.split("/");

    return new Date(
      Number(partes[2]),
      Number(partes[1]) - 1,
      Number(partes[0])
    );

  }

  return new Date(
    texto
  );

}

/* =========================================================
   MONTOS
========================================================= */

function obtenerMontoVenta(
  venta
) {

  return Number(
    venta.total ||
    venta.importe ||
    venta.monto ||
    venta.precio ||
    0
  );

}

function obtenerMontoGasto(
  gasto
) {

  return Number(
    gasto.monto ||
    gasto.total ||
    gasto.importe ||
    gasto.valor ||
    0
  );

}

/* =========================================================
   RENDER BALANCE
========================================================= */

function renderizarBalance(
  balance
) {

  if (!balance) {
    return;
  }

  const inicio =
    formatearFecha(
      balance.inicio
    );

  const fin =
    formatearFecha(
      balance.fin
    );

  const elementoRango =
    document.getElementById(
      "rangoBalance"
    );

  if (elementoRango) {

    elementoRango.textContent =
      `${inicio} al ${fin}`;

  }

  /* INGRESOS */

  colocarTexto(
    [
      "balanceIngresos",
      "totalIngresos",
      "statIngresosBalance"
    ],
    formatearDinero(
      balance.ingresos
    )
  );

  /* GASTOS */

  colocarTexto(
    [
      "balanceGastos",
      "totalGastos",
      "statGastosBalance"
    ],
    formatearDinero(
      balance.gastos
    )
  );

  /* NETO */

  colocarTexto(
    [
      "balanceDisponible",
      "totalDisponible",
      "balanceNeto",
      "statDisponibleBalance"
    ],
    formatearDinero(
      balance.disponible
    )
  );

  /* ERIKA */

  colocarTexto(
    [
      "balanceErika",
      "totalErika",
      "montoErika"
    ],
    formatearDinero(
      balance.Erika
    )
  );

  /* BRUNO */

  colocarTexto(
    [
      "balanceBruno",
      "totalBruno",
      "montoBruno"
    ],
    formatearDinero(
      balance.Bruno
    )
  );

  /* HECTOR */

  colocarTexto(
    [
      "balanceHector",
      "totalHector",
      "montoHector"
    ],
    formatearDinero(
      balance.Hector
    )
  );

  /* PORCENTAJES */

  colocarTexto(
    [
      "porcentajeErika"
    ],
    `${balance.porcentajes?.Erika ??
      PORCENTAJES.Erika}%`
  );

  colocarTexto(
    [
      "porcentajeBruno"
    ],
    `${balance.porcentajes?.Bruno ??
      PORCENTAJES.Bruno}%`
  );

  colocarTexto(
    [
      "porcentajeHector"
    ],
    `${balance.porcentajes?.Hector ??
      PORCENTAJES.Hector}%`
  );

  renderizarVentasBalance(
    balance.ventas || []
  );

  renderizarGastosBalance(
    balance.gastosLista || []
  );

  configurarWhatsAppBalance(
    balance
  );

}

/* =========================================================
   COLOCAR TEXTO
========================================================= */

function colocarTexto(
  ids,
  valor
) {

  ids.forEach(
    id => {

      const elemento =
        document.getElementById(
          id
        );

      if (elemento) {

        elemento.textContent =
          valor;

      }

    }
  );

}

/* =========================================================
   TABLA VENTAS BALANCE
========================================================= */

function renderizarVentasBalance(
  lista
) {

  const contenedor =
    document.getElementById(
      "ventasBalance"
    );

  if (!contenedor) {
    return;
  }

  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          📈
        </div>

        <h3>
          No hubo ventas en este período
        </h3>

        <p>
          Probá seleccionando otro rango de fechas.
        </p>

      </div>

    `;

    return;

  }

  contenedor.innerHTML = `

    <table class="data-table">

      <thead>

        <tr>

          <th>FECHA</th>
          <th>CLIENTE</th>
          <th>SERVICIO</th>
          <th>TOTAL</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(
          venta => `

          <tr>

            <td>
              ${escaparHTML(
                formatearFecha(
                  venta.fecha
                )
              )}
            </td>

            <td>
              ${escaparHTML(
                venta.cliente ||
                "-"
              )}
            </td>

            <td>
              ${escaparHTML(
                venta.servicio ||
                "-"
              )}
            </td>

            <td>

              <strong>
                ${formatearDinero(
                  obtenerMontoVenta(
                    venta
                  )
                )}
              </strong>

            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}

/* =========================================================
   TABLA GASTOS BALANCE
========================================================= */

function renderizarGastosBalance(
  lista
) {

  const contenedor =
    document.getElementById(
      "gastosBalance"
    );

  if (!contenedor) {
    return;
  }

  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          💸
        </div>

        <h3>
          No hubo gastos en este período
        </h3>

        <p>
          Probá seleccionando otro rango de fechas.
        </p>

      </div>

    `;

    return;

  }

  contenedor.innerHTML = `

    <table class="data-table">

      <thead>

        <tr>

          <th>FECHA</th>
          <th>DESCRIPCIÓN</th>
          <th>CATEGORÍA</th>
          <th>MONTO</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(
          gasto => `

          <tr>

            <td>
              ${escaparHTML(
                formatearFecha(
                  gasto.fecha
                )
              )}
            </td>

            <td>

              <strong>
                ${escaparHTML(
                  gasto.descripcion ||
                  gasto.detalle ||
                  gasto.concepto ||
                  "-"
                )}
              </strong>

            </td>

            <td>
              ${escaparHTML(
                gasto.categoria ||
                "-"
              )}
            </td>

            <td>

              <strong>
                ${formatearDinero(
                  obtenerMontoGasto(
                    gasto
                  )
                )}
              </strong>

            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}

/* =========================================================
   WHATSAPP BALANCE
========================================================= */

function configurarWhatsAppBalance(
  balance
) {

  const socios = [

    {
      nombre: "Erika",
      monto: balance.Erika,
      porcentaje:
        balance.porcentajes?.Erika ??
        PORCENTAJES.Erika
    },

    {
      nombre: "Bruno",
      monto: balance.Bruno,
      porcentaje:
        balance.porcentajes?.Bruno ??
        PORCENTAJES.Bruno
    },

    {
      nombre: "Hector",
      monto: balance.Hector,
      porcentaje:
        balance.porcentajes?.Hector ??
        PORCENTAJES.Hector
    }

  ];

  socios.forEach(
    socio => {

      const numero =
        obtenerNumeroSocio(
          socio.nombre
        );

      const mensaje =
        crearMensajeBalanceWhatsApp(
          socio,
          balance
        );

      const url =
        numero

          ? `https://wa.me/${numero}?text=${encodeURIComponent(
              mensaje
            )}`

          : `https://wa.me/?text=${encodeURIComponent(
              mensaje
            )}`;

      const ids = {

        Erika: [
          "whatsappErika",
          "btnWhatsAppErika"
        ],

        Bruno: [
          "whatsappBruno",
          "btnWhatsAppBruno"
        ],

        Hector: [
          "whatsappHector",
          "btnWhatsAppHector"
        ]

      };

      (
        ids[socio.nombre] ||
        []
      ).forEach(
        id => {

          const elemento =
            document.getElementById(
              id
            );

          if (!elemento) {
            return;
          }

          elemento.href =
            url;

          elemento.target =
            "_blank";

          elemento.rel =
            "noopener";

        }
      );

    }
  );

  const botonGeneral =
    document.getElementById(
      "whatsappBalanceGeneral"
    );

  if (botonGeneral) {

    const mensaje =
      crearMensajeBalanceGeneral(
        balance
      );

    botonGeneral.href =
      `https://wa.me/?text=${encodeURIComponent(
        mensaje
      )}`;

    botonGeneral.target =
      "_blank";

  }

}

/* =========================================================
   OBTENER NÚMERO SOCIO
========================================================= */

function obtenerNumeroSocio(
  nombre
) {

  let numero =
    SOCIOS[nombre] ||
    "";

  const ids = {

    Erika: [
      "whatsappErika",
      "btnWhatsAppErika"
    ],

    Bruno: [
      "whatsappBruno",
      "btnWhatsAppBruno"
    ],

    Hector: [
      "whatsappHector",
      "btnWhatsAppHector"
    ]

  };

  if (!numero) {

    for (
      const id of (
        ids[nombre] ||
        []
      )
    ) {

      const elemento =
        document.getElementById(
          id
        );

      if (!elemento) {
        continue;
      }

      const dataNumero =
        elemento.dataset
          ? elemento.dataset.whatsapp
          : "";

      if (dataNumero) {

        numero =
          dataNumero;

        break;

      }

    }

  }

  return normalizarWhatsApp(
    numero
  );

}

/* =========================================================
   MENSAJE BALANCE INDIVIDUAL
========================================================= */

function crearMensajeBalanceWhatsApp(
  socio,
  balance
) {

  return `Hola ${socio.nombre} 👋

Te paso el balance semanal de RosDrive 🚗

📅 Semana:
${formatearFecha(
    balance.inicio
  )} al ${formatearFecha(
    balance.fin
  )}

💰 Ingresos:
${formatearDinero(
    balance.ingresos
  )}

💸 Gastos:
${formatearDinero(
    balance.gastos
  )}

💵 Neto a repartir:
${formatearDinero(
    balance.disponible
  )}

📊 Tu porcentaje:
${socio.porcentaje}%

💰 Tu parte:
${formatearDinero(
    socio.monto
  )}

RosDrive 🚗`;

}

/* =========================================================
   MENSAJE GENERAL
========================================================= */

function crearMensajeBalanceGeneral(
  balance
) {

  return `📊 BALANCE SEMANAL ROSDRIVE 🚗

📅 ${formatearFecha(
    balance.inicio
  )} al ${formatearFecha(
    balance.fin
  )}

💰 INGRESOS
${formatearDinero(
    balance.ingresos
  )}

💸 GASTOS
${formatearDinero(
    balance.gastos
  )}

💵 NETO
${formatearDinero(
    balance.disponible
  )}

👩 ERIKA - ${
    balance.porcentajes?.Erika ??
    PORCENTAJES.Erika
  }%
${formatearDinero(
    balance.Erika
  )}

👨 BRUNO - ${
    balance.porcentajes?.Bruno ??
    PORCENTAJES.Bruno
  }%
${formatearDinero(
    balance.Bruno
  )}

👨 HÉCTOR - ${
    balance.porcentajes?.Hector ??
    PORCENTAJES.Hector
  }%
${formatearDinero(
    balance.Hector
  )}

RosDrive 🚗`;

}

/* =========================================================
   CERRAR BALANCE
========================================================= */

async function cerrarBalance() {

  if (!ultimoBalance) {

    const calculado =
      await calcularBalance();

    if (!calculado) {
      return;
    }

  }

  if (!ultimoBalance) {

    mostrarToast(
      "No hay un balance para cerrar.",
      "error"
    );

    return;

  }

  const balance =
    ultimoBalance;

  const porcentajeErika =
    balance.porcentajes?.Erika ??
    PORCENTAJES.Erika;

  const porcentajeBruno =
    balance.porcentajes?.Bruno ??
    PORCENTAJES.Bruno;

  const porcentajeHector =
    balance.porcentajes?.Hector ??
    PORCENTAJES.Hector;

  const confirmado =
    confirm(
      `¿Cerrar el balance semanal?\n\n` +

      `Ingresos: ${formatearDinero(
        balance.ingresos
      )}\n` +

      `Gastos: ${formatearDinero(
        balance.gastos
      )}\n` +

      `Neto: ${formatearDinero(
        balance.disponible
      )}\n\n` +

      `Erika ${porcentajeErika}%: ${formatearDinero(
        balance.Erika
      )}\n` +

      `Bruno ${porcentajeBruno}%: ${formatearDinero(
        balance.Bruno
      )}\n` +

      `Héctor ${porcentajeHector}%: ${formatearDinero(
        balance.Hector
      )}`
    );

  if (!confirmado) {
    return;
  }

  try {

    const respuesta =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "text/plain;charset=utf-8"

          },

          body:
            JSON.stringify({

              action:
                "cerrarBalance",

              desde:
                convertirFechaInput(
                  balance.inicio
                ),

              hasta:
                convertirFechaInput(
                  balance.fin
                ),

              ingresos:
                balance.ingresos,

              gastos:
                balance.gastos,

              neto:
                balance.disponible,

              Erika:
                balance.Erika,

              Bruno:
                balance.Bruno,

              Hector:
                balance.Hector

            })

        }
      );

    if (!respuesta.ok) {

      throw new Error(
        `Error HTTP ${respuesta.status}`
      );

    }

    const resultado =
      await respuesta.json();

    if (!resultado.ok) {

      throw new Error(
        resultado.error ||
        "No se pudo cerrar el balance."
      );

    }

    mostrarToast(
      "Balance cerrado correctamente.",
      "success"
    );

    limpiarCacheAPI();

    await cargarDatos({
      force: true
    });

  } catch (error) {

    console.error(
      error
    );

    mostrarToast(
      "El balance fue calculado, pero no pudo guardarse: " +
      error.message,
      "error"
    );

  }

}

/* =========================================================
   FORMATEAR FECHA
========================================================= */

function formatearFecha(
  valor
) {

  const fecha =
    obtenerFechaObjeto(
      valor
    );

  if (
    !fecha ||
    isNaN(
      fecha.getTime()
    )
  ) {

    return "-";

  }

  return fecha.toLocaleDateString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );

}

function convertirFechaInput(
  fecha
) {

  const d =
    new Date(
      fecha
    );

  if (
    !d ||
    isNaN(
      d.getTime()
    )
  ) {

    return "";

  }

  const año =
    d.getFullYear();

  const mes =
    String(
      d.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const dia =
    String(
      d.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${año}-${mes}-${dia}`;

}

/* =========================================================
   BADGE ESTADO
========================================================= */

function crearBadgeEstado(
  estado
) {

  const valor =
    String(
      estado ||
      "PAGADO"
    )
      .toUpperCase();

  if (
    valor === "PENDIENTE"
  ) {

    return `

      <span class="badge badge-pending">
        PENDIENTE
      </span>

    `;

  }

  return `

    <span class="badge badge-paid">

      ${escaparHTML(
        valor
      )}

    </span>

  `;

}

/* =========================================================
   FORMATO DINERO
========================================================= */

function formatearDinero(
  valor
) {

  return new Intl.NumberFormat(
    "es-AR",
    {

      style:
        "currency",

      currency:
        "ARS",

      maximumFractionDigits:
        0

    }
  ).format(
    Number(valor) || 0
  );

}

/* =========================================================
   OBTENER VALOR
========================================================= */

function obtenerValor(
  id
) {

  const elemento =
    document.getElementById(
      id
    );

  if (!elemento) {
    return "";
  }

  return String(
    elemento.value || ""
  ).trim();

}

/* =========================================================
   ESCAPAR HTML
========================================================= */

function escaparHTML(
  valor
) {

  return String(
    valor ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}

/* =========================================================
   ESCAPAR ATRIBUTO
========================================================= */

function escaparAtributo(
  valor
) {

  return escaparHTML(
    valor
  )
    .replace(
      /`/g,
      "&#096;"
    );

}

/* =========================================================
   TOAST
========================================================= */

function mostrarToast(
  mensaje,
  tipo = "success"
) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {

    alert(
      mensaje
    );

    return;

  }

  const icon =
    document.getElementById(
      "toastIcon"
    );

  const text =
    document.getElementById(
      "toastMessage"
    );

  if (icon) {

    icon.textContent =
      tipo === "error"
        ? "!"
        : "✓";

  }

  if (text) {

    text.textContent =
      mensaje;

  }

  toast.classList.add(
    "show"
  );

  setTimeout(
    () => {

      toast.classList.remove(
        "show"
      );

    },
    3500
  );

}

/* =========================================================
   SEGURIDAD LOADER
========================================================= */

setTimeout(
  () => {

    const loader =
      document.getElementById(
        "rosdriveLoader"
      );

    if (loader) {

      ocultarPantallaCarga();

    }

  },
  15000
);
