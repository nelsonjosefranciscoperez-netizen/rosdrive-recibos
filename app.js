/******************************************************
 * ROSDRIVE - APP
 ******************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbwoLmnjN23zYnOU4rUJVe8Phvo5_Q5r15dqBrQb_AYIbPjhFBMAdTKoL14M_WNCkxum/exec";


/* ====================================================
   DATOS TEMPORALES
   ==================================================== */

let ventas = [];
let clientes = [];
let recibos = [];


/* ====================================================
   INICIO
   ==================================================== */

document.addEventListener("DOMContentLoaded", () => {

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

});


/* ====================================================
   NAVEGACIÓN
   ==================================================== */

function inicializarNavegacion() {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.addEventListener("click", () => {

        const section =
          button.dataset.section;

        mostrarSeccion(section);

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


/* ====================================================
   FECHA
   ==================================================== */

function actualizarFecha() {

  const fecha =
    new Date();

  const opciones = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  };

  document.getElementById("fechaActual").textContent =
    fecha.toLocaleDateString(
      "es-AR",
      opciones
    );

}


/* ====================================================
   SERVICIO
   ==================================================== */

function actualizarPrecioServicio() {

  const select =
    document.getElementById("servicio");

  const opcion =
    select.options[select.selectedIndex];

  if (!opcion) return;

  const precio =
    opcion.dataset.precio || 0;

  document.getElementById("precio").value =
    precio;

  actualizarTotal();

}


/* ====================================================
   TOTAL
   ==================================================== */

function actualizarTotal() {

  const precio =
    Number(
      document.getElementById("precio").value
    ) || 0;

  const cantidad =
    Number(
      document.getElementById("cantidad").value
    ) || 1;

  const total =
    precio * cantidad;

  document.getElementById("totalVenta").textContent =
    formatearDinero(total);

}


/* ====================================================
   GENERAR VENTA
   ==================================================== */

async function generarVenta() {

  const cliente =
    document.getElementById("cliente").value.trim();

  const telefono =
    document.getElementById("telefono").value.trim();

  const direccion =
    document.getElementById("direccion").value.trim();

  const email =
    document.getElementById("email").value.trim();

  const servicio =
    document.getElementById("servicio").value;

  const precio =
    Number(
      document.getElementById("precio").value
    );

  const cantidad =
    Number(
      document.getElementById("cantidad").value
    );

  const formaPago =
    document.getElementById("formaPago").value;

  const estado =
    document.getElementById("estado").value;


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


  if (!precio || precio <= 0) {

    mostrarToast(
      "Ingresá un precio válido",
      "error"
    );

    return;
  }


  const btn =
    document.getElementById("btnGenerar");

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
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body:
          JSON.stringify(datos)

      });


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

    mostrarToast(
      "Venta registrada correctamente",
      "success"
    );


  } catch (error) {

    console.error(error);

    mostrarToast(
      "Error: " + error.message,
      "error"
    );

  } finally {

    btn.disabled = false;

    btn.textContent =
      "🧾 Generar recibo";

  }

}


/* ====================================================
   MODAL
   ==================================================== */

function mostrarResultadoRecibo(resultado) {

  document.getElementById(
    "resultadoRecibo"
  ).innerHTML =

    `Recibo <strong>Nº ${resultado.numero}</strong><br>
     Total: <strong>${formatearDinero(resultado.total)}</strong>`;

  document.getElementById(
    "btnVerPDF"
  ).href =
    resultado.pdfUrl;


  document
    .getElementById("modalRecibo")
    .classList.add("show");

}


function cerrarModal() {

  document
    .getElementById("modalRecibo")
    .classList.remove("show");

}


/* ====================================================
   LIMPIAR FORMULARIO
   ==================================================== */

function limpiarFormulario() {

  document.getElementById("cliente").value = "";
  document.getElementById("telefono").value = "";
  document.getElementById("direccion").value = "";
  document.getElementById("email").value = "";

  document.getElementById("servicio").value = "";

  document.getElementById("precio").value = "0";

  document.getElementById("cantidad").value = "1";

  document.getElementById("formaPago").value =
    "Transferencia";

  document.getElementById("estado").value =
    "PAGADO";

  actualizarTotal();

}


/* ====================================================
   DINERO
   ==================================================== */

function formatearDinero(valor) {

  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  ).format(valor || 0);

}


/* ====================================================
   TOAST
   ==================================================== */

function mostrarToast(mensaje, tipo = "success") {

  const toast =
    document.getElementById("toast");

  const icon =
    document.getElementById("toastIcon");

  const text =
    document.getElementById("toastMessage");


  icon.textContent =
    tipo === "error" ? "!" : "✓";

  text.textContent =
    mensaje;


  toast.classList.add("show");


  setTimeout(() => {

    toast.classList.remove("show");

  }, 3500);

}


/* ====================================================
   RECIBOS
   ==================================================== */

function filtrarRecibos() {

  const texto =
    document.getElementById(
      "buscarRecibo"
    ).value
      .toLowerCase()
      .trim();


  const filtrados =
    recibos.filter(recibo => {

      return (

        String(recibo.numero)
          .toLowerCase()
          .includes(texto)

        ||

        String(recibo.cliente)
          .toLowerCase()
          .includes(texto)

      );

    });


  renderizarRecibos(filtrados);

}


function renderizarRecibos(lista) {

  const contenedor =
    document.getElementById(
      "listaRecibos"
    );


  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">🧾</div>

        <h3>No hay recibos para mostrar</h3>

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
          <th>TOTAL</th>
          <th>ESTADO</th>
          <th>PDF</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(recibo => `

          <tr>

            <td>
              <strong>${recibo.numero}</strong>
            </td>

            <td>${recibo.fecha}</td>

            <td>${recibo.cliente}</td>

            <td>
              ${formatearDinero(recibo.total)}
            </td>

            <td>

              <span class="badge badge-paid">
                PAGADO
              </span>

            </td>

            <td>

              <a
                href="${recibo.pdf}"
                target="_blank"
                class="pdf-link">

                📄 Ver

              </a>

            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

}


/* ====================================================
   CLIENTES
   ==================================================== */

function filtrarClientes() {

  const texto =
    document.getElementById(
      "buscarCliente"
    ).value
      .toLowerCase()
      .trim();


  const filtrados =
    clientes.filter(cliente => {

      return String(cliente.nombre)
        .toLowerCase()
        .includes(texto);

    });


  renderizarClientes(filtrados);

}


function renderizarClientes(lista) {

  const contenedor =
    document.getElementById(
      "listaClientes"
    );


  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">👥</div>

        <h3>No hay clientes para mostrar</h3>

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
          <th>COMPRAS</th>

        </tr>

      </thead>

      <tbody>

        ${lista.map(cliente => `

          <tr>

            <td>
              <strong>${cliente.nombre}</strong>
            </td>

            <td>${cliente.telefono || "-"}</td>

            <td>${cliente.direccion || "-"}</td>

            <td>
              ${formatearDinero(cliente.total || 0)}
            </td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

}


/* ====================================================
   VENTAS
   ==================================================== */

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
    ventas.filter(venta => {

      const coincideTexto =

        String(venta.cliente)
          .toLowerCase()
          .includes(texto)

        ||

        String(venta.servicio)
          .toLowerCase()
          .includes(texto);


      const coincidePago =
        !pago ||
        venta.pago === pago;


      return coincideTexto &&
        coincidePago;

    });


  renderizarVentas(filtradas);

}


function renderizarVentas(lista) {

  const contenedor =
    document.getElementById(
      "tablaVentas"
    );


  if (!lista.length) {

    contenedor.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">📈</div>

        <h3>No hay ventas para mostrar</h3>

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

        </tr>

      </thead>

      <tbody>

        ${lista.map(venta => `

          <tr>

            <td>
              <strong>${venta.recibo}</strong>
            </td>

            <td>${venta.fecha}</td>

            <td>${venta.cliente}</td>

            <td>${venta.servicio}</td>

            <td>
              ${formatearDinero(venta.total)}
            </td>

            <td>${venta.pago}</td>

          </tr>

        `).join("")}

      </tbody>

    </table>

  `;

}
