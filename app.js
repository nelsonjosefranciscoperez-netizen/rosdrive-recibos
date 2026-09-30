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


/* =====================================================
   INICIO
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {

  inicializarNavegacion();

  actualizarFecha();

  actualizarTotal();

  document
    .getElementById("servicio")
    .addEventListener("change", actualizarPrecioServicio);

  document
    .getElementById("precio")
    .addEventListener("input", actualizarTotal);

  document
    .getElementById("cantidad")
    .addEventListener("input", actualizarTotal);

  await cargarDatos();

});


/* =====================================================
   NAVEGACIÓN
===================================================== */

function inicializarNavegacion() {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.addEventListener("click", () => {

        mostrarSeccion(button.dataset.section);

      });

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

    document.getElementById("page-title").textContent =
      titulos[section][0];

    document.getElementById("page-subtitle").textContent =
      titulos[section][1];

  }

}


/* =====================================================
   FECHA
===================================================== */

function actualizarFecha() {

  const fecha = new Date();

  const opciones = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  };

  document.getElementById("fechaActual").textContent =
    fecha.toLocaleDateString("es-AR", opciones);

}


/* =====================================================
   API GET
===================================================== */

async function consultarAPI(action) {

  const url =
    `${API_URL}?action=${encodeURIComponent(action)}`;

  const respuesta =
    await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

  if (!respuesta.ok) {

    throw new Error(
      `Error HTTP ${respuesta.status}`
    );

  }

  const datos =
    await respuesta.json();

  if (datos.ok === false) {

    throw new Error(
      datos.error || "Error en la API"
    );

  }

  return datos;

}


/* =====================================================
   CARGAR TODOS LOS DATOS
===================================================== */

async function cargarDatos() {

  try {

    mostrarToast(
      "Cargando información...",
      "success"
    );


    /* DASHBOARD */

    try {

      dashboardData =
        await consultarAPI("dashboard");

      actualizarDashboard(
        dashboardData
      );

    } catch (error) {

      console.error(
        "Dashboard:",
        error
      );

    }


    /* VENTAS */

    try {

      const respuestaVentas =
        await consultarAPI("ventas");

      ventas =
        normalizarLista(
          respuestaVentas,
          [
            "ventas",
            "data",
            "resultado"
          ]
        );

      renderizarVentas(
        ventas
      );

    } catch (error) {

      console.error(
        "Ventas:",
        error
      );

    }


    /* CLIENTES */

    try {

      const respuestaClientes =
        await consultarAPI("clientes");

      clientes =
        normalizarLista(
          respuestaClientes,
          [
            "clientes",
            "data",
            "resultado"
          ]
        );

      renderizarClientes(
        clientes
      );

    } catch (error) {

      console.error(
        "Clientes:",
        error
      );

    }


    /* RECIBOS */

    try {

      const respuestaRecibos =
        await consultarAPI("recibos");

      recibos =
        normalizarLista(
          respuestaRecibos,
          [
            "recibos",
            "data",
            "resultado"
          ]
        );

      renderizarRecibos(
        recibos
      );

    } catch (error) {

      console.error(
        "Recibos:",
        error
      );

    }


    /* SERVICIOS */

    try {

      const respuestaServicios =
        await consultarAPI("servicios");

      servicios =
        normalizarLista(
          respuestaServicios,
          [
            "servicios",
            "data",
            "resultado"
          ]
        );

      cargarServicios(
        servicios
      );

    } catch (error) {

      console.error(
        "Servicios:",
        error
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
   NORMALIZAR RESPUESTAS
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

function actualizarDashboard(data) {

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


  document.getElementById(
    "statFacturacion"
  ).textContent =
    formatearDinero(
      facturacion
    );


  document.getElementById(
    "statRecibos"
  ).textContent =
    recibosMes;


  document.getElementById(
    "statClientes"
  ).textContent =
    clientesTotal;


  document.getElementById(
    "statServicios"
  ).textContent =
    serviciosTotal;


  /* ÚLTIMAS VENTAS */

  const ultimas =
    data.ultimasVentas || [];


  renderizarUltimasVentas(
    ultimas
  );

}


/* =====================================================
   ÚLTIMAS VENTAS
===================================================== */

function renderizarUltimasVentas(lista) {

  const contenedor =
    document.getElementById(
      "ultimasVentas"
    );


  if (
    !lista ||
    !lista.length
  ) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">📊</div>

        <h3>Todavía no hay ventas cargadas</h3>

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

        ${lista.map(venta => `

          <tr>

            <td>
              <strong>
                ${venta.recibo || "-"}
              </strong>
            </td>

            <td>
              ${venta.fecha || "-"}
            </td>

            <td>
              ${venta.cliente || "-"}
            </td>

            <td>
              ${venta.servicio || "-"}
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

        `).join("")}

      </tbody>

    </table>

  `;

}


/* =====================================================
   ESTADÍSTICAS
===================================================== */

function actualizarEstadisticasGenerales() {

  /*
   * Si la API ya devolvió estos datos,
   * no los reemplazamos.
   */

  if (
    dashboardData &&
    dashboardData.ok
  ) {

    return;

  }


  document.getElementById(
    "statRecibos"
  ).textContent =
    recibos.length;


  document.getElementById(
    "statClientes"
  ).textContent =
    clientes.length;


  document.getElementById(
    "statServicios"
  ).textContent =
    servicios.length;


  const total =
    ventas.reduce(
      (suma, venta) => {

        return suma +
          Number(
            venta.total || 0
          );

      },
      0
    );


  document.getElementById(
    "statFacturacion"
  ).textContent =
    formatearDinero(total);

}


/* =====================================================
   SERVICIOS
===================================================== */

function cargarServicios(lista) {

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


  lista.forEach(servicio => {

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
      `${nombre} - ${formatearDinero(precio)}`;

    option.dataset.precio =
      precio;


    select.appendChild(
      option
    );

  });

}


/* =====================================================
   PRECIO DEL SERVICIO
===================================================== */

function actualizarPrecioServicio() {

  const select =
    document.getElementById(
      "servicio"
    );


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


  document.getElementById(
    "precio"
  ).value =
    precio;


  actualizarTotal();

}


/* =====================================================
   TOTAL
===================================================== */

function actualizarTotal() {

  const precio =
    Number(
      document.getElementById(
        "precio"
      ).value
    ) || 0;


  const cantidad =
    Number(
      document.getElementById(
        "cantidad"
      ).value
    ) || 1;


  const total =
    precio * cantidad;


  document.getElementById(
    "totalVenta"
  ).textContent =
    formatearDinero(total);

}


/* =====================================================
   GENERAR VENTA
===================================================== */

async function generarVenta() {

  const cliente =
    document.getElementById(
      "cliente"
    ).value.trim();


  const telefono =
    document.getElementById(
      "telefono"
    ).value.trim();


  const direccion =
    document.getElementById(
      "direccion"
    ).value.trim();


  const email =
    document.getElementById(
      "email"
    ).value.trim();


  const servicio =
    document.getElementById(
      "servicio"
    ).value;


  const precio =
    Number(
      document.getElementById(
        "precio"
      ).value
    );


  const cantidad =
    Number(
      document.getElementById(
        "cantidad"
      ).value
    );


  const formaPago =
    document.getElementById(
      "formaPago"
    ).value;


  const estado =
    document.getElementById(
      "estado"
    ).value;


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


  btn.disabled = true;

  btn.textContent =
    "⏳ Generando...";


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
            JSON.stringify(datos)

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


    mostrarResultadoRecibo(
      resultado
    );


    limpiarFormulario();


    /* RECARGAR DATOS */

    await cargarDatos();


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

    btn.disabled = false;

    btn.textContent =
      "🧾 Generar recibo";

  }

}


/* =====================================================
   MODAL RECIBO
===================================================== */

function mostrarResultadoRecibo(
  resultado
) {

  document.getElementById(
    "resultadoRecibo"
  ).innerHTML =

    `Recibo <strong>Nº ${
      resultado.numero || "-"
    }</strong><br>
    
    Total: <strong>${
      formatearDinero(
        resultado.total
      )
    }</strong>`;


  document.getElementById(
    "btnVerPDF"
  ).href =
    resultado.pdfUrl || "#";


  document
    .getElementById(
      "modalRecibo"
    )
    .classList.add(
      "show"
    );

}


function cerrarModal() {

  document
    .getElementById(
      "modalRecibo"
    )
    .classList.remove(
      "show"
    );

}


/* =====================================================
   LIMPIAR FORMULARIO
===================================================== */

function limpiarFormulario() {

  document.getElementById(
    "cliente"
  ).value = "";


  document.getElementById(
    "telefono"
  ).value = "";


  document.getElementById(
    "direccion"
  ).value = "";


  document.getElementById(
    "email"
  ).value = "";


  document.getElementById(
    "servicio"
  ).value = "";


  document.getElementById(
    "precio"
  ).value = "0";


  document.getElementById(
    "cantidad"
  ).value = "1";


  document.getElementById(
    "formaPago"
  ).value =
    "Transferencia";


  document.getElementById(
    "estado"
  ).value =
    "PAGADO";


  actualizarTotal();

}


/* =====================================================
   RECIBOS
===================================================== */

function filtrarRecibos() {

  const texto =
    document.getElementById(
      "buscarRecibo"
    ).value
      .toLowerCase()
      .trim();


  const filtrados =
    recibos.filter(
      recibo => {

        return (

          String(
            recibo.numero || ""
          )
            .toLowerCase()
            .includes(texto)

          ||

          String(
            recibo.cliente || ""
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


function renderizarRecibos(
  lista
) {

  const contenedor =
    document.getElementById(
      "listaRecibos"
    );


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
          <th>PDF</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(
          recibo => `

          <tr>

            <td>
              <strong>
                ${recibo.numero || "-"}
              </strong>
            </td>

            <td>
              ${recibo.fecha || "-"}
            </td>

            <td>
              ${recibo.cliente || "-"}
            </td>

            <td>
              ${recibo.servicio || "-"}
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

              ${
                recibo.pdf
                  ? `
                    <a
                      href="${recibo.pdf}"
                      target="_blank"
                      class="pdf-link">

                      📄 Ver

                    </a>
                  `
                  : "-"
              }

            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}


/* =====================================================
   CLIENTES
===================================================== */

function filtrarClientes() {

  const texto =
    document.getElementById(
      "buscarCliente"
    ).value
      .toLowerCase()
      .trim();


  const filtrados =
    clientes.filter(
      cliente => {

        return (

          String(
            cliente.nombre || ""
          )
            .toLowerCase()
            .includes(texto)

          ||

          String(
            cliente.telefono || ""
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


function renderizarClientes(
  lista
) {

  const contenedor =
    document.getElementById(
      "listaClientes"
    );


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
                ${cliente.nombre || "-"}
              </strong>
            </td>

            <td>
              ${cliente.telefono || "-"}
            </td>

            <td>
              ${cliente.direccion || "-"}
            </td>

            <td>
              ${cliente.email || "-"}
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
   VENTAS
===================================================== */

function filtrarVentas() {

  const texto =
    document.getElementById(
      "buscarVenta"
    ).value
      .toLowerCase()
      .trim();


  const pago =
    document.getElementById(
      "filtroPago"
    ).value;


  const filtradas =
    ventas.filter(
      venta => {

        const coincideTexto =

          String(
            venta.cliente || ""
          )
            .toLowerCase()
            .includes(texto)

          ||

          String(
            venta.servicio || ""
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


function renderizarVentas(
  lista
) {

  const contenedor =
    document.getElementById(
      "tablaVentas"
    );


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
                ${venta.recibo || "-"}
              </strong>
            </td>

            <td>
              ${venta.fecha || "-"}
            </td>

            <td>
              ${venta.cliente || "-"}
            </td>

            <td>
              ${venta.servicio || "-"}
            </td>

            <td>
              ${formatearDinero(
                venta.total
              )}
            </td>

            <td>
              ${venta.pago || "-"}
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
      estado || "PAGADO"
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
      ${valor}
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
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  ).format(
    Number(valor) || 0
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


  const icon =
    document.getElementById(
      "toastIcon"
    );


  const text =
    document.getElementById(
      "toastMessage"
    );


  icon.textContent =
    tipo === "error"
      ? "!"
      : "✓";


  text.textContent =
    mensaje;


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
