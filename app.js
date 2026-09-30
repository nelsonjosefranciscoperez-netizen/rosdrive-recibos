/******************************************************
 * ROSDRIVE - APP WEB
 * GitHub Pages ↔ Google Apps Script ↔ Google Sheets
 ******************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbwoLmnjN23zYnOU4rUJVe8Phvo5_Q5r15dqBrQb_AYIbPjhFBMAdTKoL14M_WNCkxum/exec";

/* =====================================================
   VARIABLES
===================================================== */

let ventas = [];
let clientes = [];
let recibos = [];
let servicios = [];

let dashboardData = {};
let ultimoRecibo = null;

/* =====================================================
   CACHE OPTIMIZADA
===================================================== */

const API_CACHE_TTL = 120000; // 2 minutos

const apiCache = new Map();
const apiRequests = new Map();

function limpiarCacheAPI() {
  apiCache.clear();
}

function obtenerCacheAPI(action) {
  const item = apiCache.get(action);

  if (!item) return null;

  if (Date.now() - item.time > API_CACHE_TTL) {
    apiCache.delete(action);
    return null;
  }

  return item.data;
}

/* =====================================================
   INICIO
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {

  inicializarNavegacion();
  actualizarFecha();
  actualizarTotal();

  const servicio = document.getElementById("servicio");

  if (servicio) {
    servicio.addEventListener(
      "change",
      actualizarPrecioServicio
    );
  }

  const precio = document.getElementById("precio");

  if (precio) {
    precio.addEventListener(
      "input",
      actualizarTotal
    );
  }

  const cantidad = document.getElementById("cantidad");

  if (cantidad) {
    cantidad.addEventListener(
      "input",
      actualizarTotal
    );
  }

  await cargarDatos();

});

/* =====================================================
   NAVEGACIÓN
===================================================== */

function inicializarNavegacion() {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          mostrarSeccion(
            button.dataset.section
          );
        }
      );

    });

}

function mostrarSeccion(section) {

  document
    .querySelectorAll(".section")
    .forEach(el => {
      el.classList.remove("active");
    });

  document
    .querySelectorAll(".nav-item")
    .forEach(el => {
      el.classList.remove("active");
    });

  const destino =
    document.getElementById(section);

  if (destino) {
    destino.classList.add("active");
  }

  const boton =
    document.querySelector(
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

}

/* =====================================================
   FECHA
===================================================== */

function actualizarFecha() {

  const elemento =
    document.getElementById(
      "fechaActual"
    );

  if (!elemento) return;

  const fecha = new Date();

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

/* =====================================================
   API GET OPTIMIZADA
===================================================== */

async function consultarAPI(
  action,
  opciones = {}
) {

  const force =
    opciones.force === true;

  /*
   * Si no se fuerza actualización,
   * utilizamos caché.
   */

  if (!force) {

    const cache =
      obtenerCacheAPI(action);

    if (cache) {
      return cache;
    }

    /*
     * Si ya existe una consulta igual
     * en curso, reutilizamos esa promesa.
     */

    if (apiRequests.has(action)) {
      return apiRequests.get(action);
    }

  }

  const url =
    `${API_URL}?action=${encodeURIComponent(action)}`;

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

        if (datos.ok === false) {

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
        apiRequests.delete(action);
      }
    );

  apiRequests.set(
    action,
    promesa
  );

  return promesa;

}

/* =====================================================
   CARGAR DATOS
   TODAS LAS CONSULTAS EN PARALELO
===================================================== */

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

    actualizarEstadisticasGenerales();

  } catch (error) {

    console.error(error);

    mostrarToast(
      "No se pudieron cargar los datos",
      "error"
    );

  }

}

/* =====================================================
   NORMALIZAR LISTAS
===================================================== */

function normalizarLista(
  respuesta,
  posiblesPropiedades
) {

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

  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  return [];

}

/* =====================================================
   DASHBOARD
===================================================== */

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

/* =====================================================
   ÚLTIMAS VENTAS
===================================================== */

function renderizarUltimasVentas(
  lista
) {

  const contenedor =
    document.getElementById(
      "ultimasVentas"
    );

  if (!contenedor) return;

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

/* =====================================================
   ESTADÍSTICAS
===================================================== */

function actualizarEstadisticasGenerales() {

  if (
    dashboardData &&
    dashboardData.ok
  ) {
    return;
  }

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

  if (statRecibos) {
    statRecibos.textContent =
      recibos.length;
  }

  if (statClientes) {
    statClientes.textContent =
      clientes.length;
  }

  if (statServicios) {
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

  if (statFacturacion) {

    statFacturacion.textContent =
      formatearDinero(
        total
      );

  }

}

/* =====================================================
   SERVICIOS
===================================================== */

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

      if (!nombre) return;

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

/* =====================================================
   PRECIO SERVICIO
===================================================== */

function actualizarPrecioServicio() {

  const select =
    document.getElementById(
      "servicio"
    );

  if (!select) return;

  const opcion =
    select.options[
      select.selectedIndex
    ];

  if (!opcion) return;

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

/* =====================================================
   TOTAL
===================================================== */

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

  if (!campoPrecio) return;

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

/* =====================================================
   GENERAR VENTA
===================================================== */

async function generarVenta() {

  const cliente =
    obtenerValor("cliente");

  const telefono =
    obtenerValor("telefono");

  const direccion =
    obtenerValor("direccion");

  const email =
    obtenerValor("email");

  const servicio =
    obtenerValor("servicio");

  const precio =
    Number(
      obtenerValor("precio")
    );

  const cantidad =
    Number(
      obtenerValor("cantidad")
    ) || 1;

  const formaPago =
    obtenerValor("formaPago");

  const estado =
    obtenerValor("estado");

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

    /*
     * Se modificó Sheets:
     * eliminar caché y actualizar
     * con datos reales.
     */

    limpiarCacheAPI();

    await cargarDatos({
      force: true
    });

    mostrarToast(
      "Venta registrada correctamente",
      "success"
    );

  } catch (error) {

    console.error(error);

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

/* =====================================================
   RESULTADO RECIBO
===================================================== */

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

/* =====================================================
   WHATSAPP
===================================================== */

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

/* =====================================================
   NORMALIZAR WHATSAPP
===================================================== */

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

  if (!numero) return "";

  if (
    numero.startsWith("549")
  ) {
    return numero;
  }

  if (
    numero.startsWith("54")
  ) {

    return (
      "549" +
      numero.substring(2)
    );

  }

  if (
    numero.startsWith("0")
  ) {

    numero =
      numero.substring(1);

  }

  if (
    numero.startsWith("15")
  ) {

    numero =
      numero.substring(2);

  }

  return (
    "549" +
    numero
  );

}

/* =====================================================
   CERRAR MODAL
===================================================== */

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

/* =====================================================
   LIMPIAR FORMULARIO
===================================================== */

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
        elemento.value = "";
      }

    }
  );

  const servicio =
    document.getElementById(
      "servicio"
    );

  if (servicio) {
    servicio.value = "";
  }

  const precio =
    document.getElementById(
      "precio"
    );

  if (precio) {
    precio.value = "0";
  }

  const cantidad =
    document.getElementById(
      "cantidad"
    );

  if (cantidad) {
    cantidad.value = "1";
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

/* =====================================================
   RECIBOS - FILTRO
===================================================== */

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
            .includes(texto)

          ||

          String(
            recibo.cliente ||
            ""
          )
            .toLowerCase()
            .includes(texto)

        );

      }
    );

  renderizarRecibos(
    filtrados
  );

}

/* =====================================================
   RECIBOS - RENDER
===================================================== */

function renderizarRecibos(
  lista
) {

  const contenedor =
    document.getElementById(
      "listaRecibos"
    );

  if (!contenedor) return;

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

/* =====================================================
   ELIMINAR RECIBO
===================================================== */

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

  if (!confirmado) return;

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

    /*
     * MUY IMPORTANTE:
     * después de eliminar hay que
     * actualizar los datos reales.
     */

    limpiarCacheAPI();

    await cargarDatos({
      force: true
    });

  } catch (error) {

    console.error(error);

    mostrarToast(
      "Error al eliminar: " +
      error.message,
      "error"
    );

  }

}

/* =====================================================
   CLIENTES - FILTRO
===================================================== */

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
            .includes(texto)

          ||

          String(
            cliente.telefono ||
            ""
          )
            .toLowerCase()
            .includes(texto)

          ||

          String(
            cliente.email ||
            ""
          )
            .toLowerCase()
            .includes(texto)

        );

      }
    );

  renderizarClientes(
    filtrados
  );

}

/* =====================================================
   CLIENTES - RENDER
===================================================== */

function renderizarClientes(
  lista
) {

  const contenedor =
    document.getElementById(
      "listaClientes"
    );

  if (!contenedor) return;

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

/* =====================================================
   VENTAS - FILTRO
===================================================== */

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
            .includes(texto)

          ||

          String(
            venta.servicio ||
            ""
          )
            .toLowerCase()
            .includes(texto)

          ||

          String(
            venta.recibo ||
            ""
          )
            .toLowerCase()
            .includes(texto);

        const coincidePago =
          !pago ||
          venta.pago === pago;

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

/* =====================================================
   VENTAS - RENDER
===================================================== */

function renderizarVentas(
  lista
) {

  const contenedor =
    document.getElementById(
      "tablaVentas"
    );

  if (!contenedor) return;

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
                venta.pago || "-"
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

/* =====================================================
   BADGE ESTADO
===================================================== */

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

/* =====================================================
   FORMATO DINERO
===================================================== */

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

/* =====================================================
   OBTENER VALOR
===================================================== */

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

/* =====================================================
   ESCAPAR HTML
===================================================== */

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

/* =====================================================
   ESCAPAR ATRIBUTO
===================================================== */

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

/* =====================================================
   TOAST
===================================================== */

function mostrarToast(
  mensaje,
  tipo = "success"
) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {

    alert(mensaje);

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
