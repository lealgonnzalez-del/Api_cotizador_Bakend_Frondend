const API_URL = 'https://api-cotizador-bakend.onrender.com/api';

let manoDeObra = [];
let materiales = [];
let cotizaciones = [];
let cuentasCobro = [];
let totalCalculadoGeneral = 0;

window.onload = function() {
  const hoy = new Date().toISOString().split('T')[0];
  const inputFecha = document.getElementById('c-fecha');
  const inputFechaCobro = document.getElementById('cobro-fecha');
  if(inputFecha) inputFecha.value = hoy;
  if(inputFechaCobro) inputFechaCobro.value = hoy;
  renderInputs();
};

// --- AUTENTICACIÓN CON MONGODB ---
async function verificarLogin() {
  const usuario = document.getElementById('userInput').value;
  const password = document.getElementById('passInput').value;
  const errorMsg = document.getElementById('errorMsg');

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });
    
    const data = await response.json();

    if (response.ok && data.success) {
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('editor-screen').style.display = 'block';
      renderInputs();
      actualizarCotizacion();
      cargarCotizacionesBD();
      cargarCuentasCobroBD();
    } else {
      errorMsg.style.display = 'block';
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('No se pudo conectar con el servidor backend.');
  }
}

function cerrarSesion() {
  document.getElementById('editor-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('userInput').value = '';
  document.getElementById('passInput').value = '';
  document.getElementById('errorMsg').style.display = 'none';
}

function cambiarTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(tabId).classList.add('active');
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  if(tabId === 'lista-cot') cargarCotizacionesBD();
  if(tabId === 'lista-cobros') cargarCuentasCobroBD();
  if(tabId === 'crear-cobro') poblarSelectCotizacionesAprobadas();
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
}

function renderInputs() {
  const containerMO = document.getElementById('mano-obra-container');
  if (containerMO) {
    containerMO.innerHTML = '';
    if(manoDeObra.length === 0) {
      containerMO.innerHTML = `<p style="font-size: 12px; color: #778; font-style: italic;">No hay labores agregadas.</p>`;
    }
    manoDeObra.forEach((item, index) => {
      const valPunteado = formatoMoneda(item.valorTotal || 0);
      containerMO.innerHTML += `
        <div class="item-row" style="display: flex; gap: 6px; margin-bottom: 8px; align-items: center;">
          <input type="text" value="${item.descripcion}" style="flex: 2;" placeholder="Descripción de la labor" oninput="actualizarMO(${index}, 'descripcion', this.value)">
          <input type="number" value="${item.valorTotal}" style="flex: 1;" placeholder="Costo Total ($)" oninput="actualizarMO(${index}, 'valorTotal', this.value)">
          <span id="punteo-mo-${index}" style="font-size: 11px; font-weight: bold; width: 100px; text-align: right; background: #e9ecef; padding: 6px; border-radius: 4px;">${valPunteado}</span>
          <button class="btn btn-remove" onclick="eliminarManoDeObra(${index})">X</button>
        </div>`;
    });
  }

  const containerMat = document.getElementById('materiales-container');
  if (containerMat) {
    containerMat.innerHTML = '';
    if(materiales.length === 0) {
      containerMat.innerHTML = `<p style="font-size: 12px; color: #778; font-style: italic;">No hay materiales agregados.</p>`;
    }
    materiales.forEach((item, index) => {
      const parcial = (item.cantidad || 0) * (item.vUnitario || 0);
      containerMat.innerHTML += `
        <div class="item-row" style="display: flex; gap: 6px; margin-bottom: 8px; align-items: center;">
          <input type="text" value="${item.descripcion}" style="flex: 2;" placeholder="Material" oninput="actualizarMat(${index}, 'descripcion', this.value)">
          <input type="number" value="${item.cantidad}" style="width: 55px;" placeholder="Cant" oninput="actualizarMat(${index}, 'cantidad', this.value)">
          <input type="number" value="${item.vUnitario}" style="width: 95px;" placeholder="V. Unit" oninput="actualizarMat(${index}, 'vUnitario', this.value)">
          <span id="parcial-mat-${index}" style="font-size: 11px; font-weight: bold; width: 100px; text-align: right; background: #e9ecef; padding: 6px; border-radius: 4px;">${formatoMoneda(parcial)}</span>
          <button class="btn btn-remove" onclick="eliminarMat(${index})">X</button>
        </div>`;
    });
  }
}

function agregarManoDeObra() {
  manoDeObra.push({ descripcion: "", valorTotal: 0 });
  renderInputs();
  actualizarCotizacion();
}

function eliminarManoDeObra(index) {
  manoDeObra.splice(index, 1);
  renderInputs();
  actualizarCotizacion();
}

function actualizarMO(index, campo, valor) {
  manoDeObra[index][campo] = (campo === 'valorTotal') ? (parseFloat(valor) || 0) : valor;
  const punteoSpan = document.getElementById(`punteo-mo-${index}`);
  if(punteoSpan && campo === 'valorTotal') {
    punteoSpan.innerText = formatoMoneda(manoDeObra[index].valorTotal);
  }
  actualizarCotizacion();
}

function agregarMaterial() {
  materiales.push({ descripcion: "", cantidad: 1, vUnitario: 0 });
  renderInputs();
  actualizarCotizacion();
}

function eliminarMat(index) {
  materiales.splice(index, 1);
  renderInputs();
  actualizarCotizacion();
}

function actualizarMat(index, campo, valor) {
  materiales[index][campo] = (campo === 'cantidad' || campo === 'vUnitario') ? (parseFloat(valor) || 0) : valor;
  const parcial = (materiales[index].cantidad || 0) * (materiales[index].vUnitario || 0);
  const spanParcial = document.getElementById(`parcial-mat-${index}`);
  if(spanParcial) {
    spanParcial.innerText = formatoMoneda(parcial);
  }
  actualizarCotizacion();
}

function actualizarCotizacion() {
  const elemCliente = document.getElementById('c-cliente');
  const elemContacto = document.getElementById('c-contacto');
  const elemTitulo = document.getElementById('c-titulo');
  const elemFecha = document.getElementById('c-fecha');

  const cliente = elemCliente ? elemCliente.value || "CLIENTE / EDIFICIO" : "CLIENTE / EDIFICIO";
  const contacto = elemContacto ? elemContacto.value || "Administración" : "Administración";
  const titulo = elemTitulo ? elemTitulo.value || "MANTENIMIENTO" : "MANTENIMIENTO";
  const fecha = elemFecha ? elemFecha.value || "" : "";

  if(document.getElementById('p-cliente')) document.getElementById('p-cliente').innerText = cliente;
  if(document.getElementById('p-contacto')) document.getElementById('p-contacto').innerText = contacto;
  if(document.getElementById('p-titulo')) document.getElementById('p-titulo').innerText = titulo;
  if(document.getElementById('p-titulotabla')) document.getElementById('p-titulotabla').innerText = titulo;
  if(document.getElementById('lblFechaCot')) document.getElementById('lblFechaCot').innerText = "Fecha: " + fecha;

  const tbody = document.getElementById('tabla-body');
  if(!tbody) return;
  tbody.innerHTML = '';

  let subtotalManoObra = 0;
  let subtotalMateriales = 0;

  tbody.innerHTML += `<tr class="header-section"><td colspan="5">1. MANO DE OBRA Y EJECUCIÓN</td></tr>`;
  if(manoDeObra.length === 0) {
    tbody.innerHTML += `<tr><td colspan="5" style="color: #888; font-style: italic;">Sin registros de mano de obra</td></tr>`;
  }
  manoDeObra.forEach(item => {
    subtotalManoObra += item.valorTotal;
    tbody.innerHTML += `
      <tr>
        <td colspan="3" class="text-left">${item.descripcion || 'Sin descripción'}</td>
        <td>1 Glb</td>
        <td class="text-right">${formatoMoneda(item.valorTotal)}</td>
      </tr>`;
  });

  tbody.innerHTML += `<tr class="header-section"><td colspan="5">2. MATERIALES E INSUMOS</td></tr>`;
  if(materiales.length === 0) {
    tbody.innerHTML += `<tr><td colspan="5" style="color: #888; font-style: italic;">Sin registros de materiales</td></tr>`;
  }
  materiales.forEach(item => {
    const parcial = item.cantidad * item.vUnitario;
    subtotalMateriales += parcial;
    tbody.innerHTML += `
      <tr>
        <td class="text-left">${item.descripcion || 'Sin material'}</td>
        <td>UND</td>
        <td>${item.cantidad}</td>
        <td class="text-right">${formatoMoneda(item.vUnitario)}</td>
        <td class="text-right">${formatoMoneda(parcial)}</td>
      </tr>`;
  });

  const subtotalDirecto = subtotalManoObra + subtotalMateriales;

  const pAdmin = parseFloat(document.getElementById('c-pAdmin')?.value) || 0;
  const pImprev = parseFloat(document.getElementById('c-pImprev')?.value) || 0;
  const pUtil = parseFloat(document.getElementById('c-pUtil')?.value) || 0;
  const pIva = 19;

  const valAdmin = subtotalDirecto * (pAdmin / 100);
  const valImprev = subtotalDirecto * (pImprev / 100);
  const valUtil = subtotalDirecto * (pUtil / 100);
  const subtotalIndirecto = valAdmin + valImprev + valUtil;
  const valIvaUtilidad = valUtil * (pIva / 100);
  totalCalculadoGeneral = subtotalDirecto + subtotalIndirecto + valIvaUtilidad;

  tbody.innerHTML += `
    <tr class="row-gray"><td colspan="4" class="text-left">SUBTOTAL COSTOS DIRECTOS</td><td class="text-right">${formatoMoneda(subtotalDirecto)}</td></tr>
    <tr><td colspan="3" class="text-left">Administración</td><td>${pAdmin}%</td><td class="text-right">${formatoMoneda(valAdmin)}</td></tr>
    <tr><td colspan="3" class="text-left">Imprevistos</td><td>${pImprev}%</td><td class="text-right">${formatoMoneda(valImprev)}</td></tr>
    <tr><td colspan="3" class="text-left">Utilidad</td><td>${pUtil}%</td><td class="text-right">${formatoMoneda(valUtil)}</td></tr>
    <tr class="row-gray"><td colspan="4" class="text-left">SUBTOTAL INDIRECTOS (AIU)</td><td class="text-right">${formatoMoneda(subtotalIndirecto)}</td></tr>
    <tr><td colspan="3" class="text-left">IVA sobre Utilidad (Ley)</td><td>${pIva}%</td><td class="text-right">${formatoMoneda(valIvaUtilidad)}</td></tr>
    <tr class="total-row"><td colspan="4" class="text-left">VALOR TOTAL PROPUESTA</td><td class="text-right">${formatoMoneda(totalCalculadoGeneral)}</td></tr>
  `;
}

// --- COMUNICACIÓN CON EL BACKEND (MONGODB) ---

async function guardarYDescargarCotizacion() {
  const clienteVal = document.getElementById('c-cliente').value;
  if(!clienteVal) {
    alert("Por favor ingrese el nombre del cliente o edificio.");
    return;
  }

  const numCot = `COT-2026-${String(cotizaciones.length + 1).padStart(3, '0')}`;
  document.getElementById('lblNumCot').innerText = numCot;
  document.getElementById('lblFechaCot').innerText = "Fecha: " + document.getElementById('c-fecha').value;

  const nuevaCot = {
    id: numCot,
    cliente: clienteVal,
    titulo: document.getElementById('c-titulo').value || "MANTENIMIENTO",
    fecha: document.getElementById('c-fecha').value,
    total: totalCalculadoGeneral,
    estado: 'Pendiente'
  };

  try {
    const response = await fetch(`${API_URL}/cotizaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaCot)
    });
    if(response.ok) {
      const elemento = document.getElementById('cotizacion-pdf');
      html2pdf().set({ margin: 10, filename: `${numCot}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(elemento).save();

      alert(`Cotización ${numCot} guardada en la base de datos y descargada.`);
      cargarCotizacionesBD();
    }
  } catch (error) {
    alert('Error al conectar con el servidor backend.');
  }
}

async function cargarCotizacionesBD() {
  try {
    const res = await fetch(`${API_URL}/cotizaciones`);
    cotizaciones = await res.json();
    renderizarCotizaciones(cotizaciones);
    poblarSelectCotizacionesAprobadas();
  } catch (error) {
    console.error('Error cargando cotizaciones:', error);
  }
}

async function cargarCotizacionesNoAprobadasBD() {
  try {
    const res = await fetch(`${API_URL}/cotizaciones/no-aprobadas`);
    const noAprobadas = await res.json();
    renderizarCotizaciones(noAprobadas);
    alert(`Se extrajeron ${noAprobadas.length} cotizaciones no aprobadas.`);
  } catch (error) {
    console.error('Error filtrando cotizaciones:', error);
  }
}

function renderizarCotizaciones(lista) {
  const tbody = document.getElementById('tabla-cotizaciones-guardadas');
  if(!tbody) return;
  tbody.innerHTML = '';
  if(lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No hay cotizaciones para mostrar.</td></tr>`;
    return;
  }
  lista.forEach((cot) => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${cot.id}</strong></td>
        <td>${cot.cliente}</td>
        <td>${cot.titulo}</td>
        <td>${cot.fecha}</td>
        <td class="text-right">${formatoMoneda(cot.total)}</td>
        <td><span class="badge ${cot.estado === 'Aprobado' ? 'badge-aprobado' : 'badge-pendiente'}">${cot.estado}</span></td>
        <td>
          <button class="btn" style="background:#6c757d; color:white; padding:4px 8px; font-size:11px;" onclick='verDetalleCotizacion(${JSON.stringify(cot)})'>👁️ Ver</button>
          <button class="btn" style="background:#17a2b8; color:white; padding:4px 8px; font-size:11px;" onclick="cambiarEstadoCotizacion('${cot.id}', '${cot.estado}')">Estado</button>
          <button class="btn" style="background:#dc3545; color:white; padding:4px 8px; font-size:11px;" onclick="eliminarCotizacion('${cot.id}')">Eliminar</button>
        </td>
      </tr>`;
  });
}

async function cambiarEstadoCotizacion(id, estadoActual) {
  const nuevoEstado = estadoActual === 'Pendiente' ? 'Aprobado' : 'Pendiente';
  try {
    await fetch(`${API_URL}/cotizaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    cargarCotizacionesBD();
  } catch (error) {
    console.error('Error al cambiar estado:', error);
  }
}

async function eliminarCotizacion(id) {
  if(confirm('¿Deseas eliminar esta cotización de la base de datos?')) {
    try {
      await fetch(`${API_URL}/cotizaciones/${id}`, { method: 'DELETE' });
      cargarCotizacionesBD();
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  }
}

function poblarSelectCotizacionesAprobadas() {
  const select = document.getElementById('select-cot-aprobada');
  if(!select) return;
  select.innerHTML = '<option value="">-- Seleccione una cotización aprobada --</option>';
  cotizaciones.filter(c => c.estado === 'Aprobado').forEach(cot => {
    select.innerHTML += `<option value="${cot.id}">${cot.id} - ${cot.cliente} (${formatoMoneda(cot.total)})</option>`;
  });
}

function cargarDatosCotizacionEnCobro() {
  const idCot = document.getElementById('select-cot-aprobada').value;
  const cot = cotizaciones.find(c => c.id === idCot);
  if(cot) {
    document.getElementById('cobro-p-cliente').innerText = cot.cliente;
    document.getElementById('cobro-p-cliente-2').innerText = cot.cliente;
    document.getElementById('cobro-p-ref').innerText = cot.id;
    
    const textoConcepto = `Por medio de la presente, me dirijo a ustedes para efectuar el cobro de los servicios correspondientes al proyecto "${cot.titulo}", amparado bajo la propuesta comercial número ${cot.id}.`;
    
    document.getElementById('cobro-concepto').value = textoConcepto;
    document.getElementById('cobro-p-concepto').innerText = textoConcepto;
    
    document.getElementById('cobro-valor').value = cot.total;
    actualizarVistaCobroManual();
  }
}

function actualizarVistaCobroManual() {
  const tipoCobroSelect = document.getElementById('cobro-tipo').value;
  document.getElementById('cobro-p-tipo').innerText = tipoCobroSelect;

  const conceptoInput = document.getElementById('cobro-concepto').value;
  const conceptoPreview = document.getElementById('cobro-p-concepto');
  if(conceptoPreview) {
    conceptoPreview.innerText = conceptoInput;
  }

  const val = parseFloat(document.getElementById('cobro-valor').value) || 0;
  document.getElementById('punteo-cobro').innerText = formatoMoneda(val);
  document.getElementById('cobro-p-valor').innerText = formatoMoneda(val);
}

async function guardarYDescargarCuentaCobro() {
  const numCobro = `CC-2026-${String(cuentasCobro.length + 1).padStart(3, '0')}`;
  document.getElementById('lblNumCobroPDF').innerText = numCobro;
  document.getElementById('lblFechaCobroPDF').innerText = "Fecha: " + document.getElementById('cobro-fecha').value;

  const nuevoCobro = {
    id: numCobro,
    cliente: document.getElementById('cobro-p-cliente').innerText,
    concepto: document.getElementById('cobro-p-concepto').innerText,
    fecha: document.getElementById('cobro-fecha').value,
    valor: parseFloat(document.getElementById('cobro-valor').value) || 0,
    estado: 'Por Cobrar',
    tipoCobro: document.getElementById('cobro-tipo').value
  };

  try {
    const res = await fetch(`${API_URL}/cuentas-cobro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoCobro)
    });
    if(res.ok) {
      const elemento = document.getElementById('cuentacobro-pdf');
      html2pdf().set({ margin: 10, filename: `${numCobro}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(elemento).save();

      alert(`Cuenta de cobro ${numCobro} guardada en BD y generada.`);
      cargarCuentasCobroBD();
    }
  } catch (error) {
    alert('Error al guardar la cuenta de cobro en el servidor.');
  }
}

async function cargarCuentasCobroBD() {
  try {
    const res = await fetch(`${API_URL}/cuentas-cobro`);
    cuentasCobro = await res.json();
    renderizarCobrosGuardados();
    calcularTotalCobrosPagados();
  } catch (error) {
    console.error('Error cargando cuentas de cobro:', error);
  }
}

async function cargarCuentasCobroPagadasBD() {
  try {
    const res = await fetch(`${API_URL}/cuentas-cobro/pagadas`);
    const pagadas = await res.json();
    cuentasCobro = pagadas;
    renderizarCobrosGuardados();
    calcularTotalCobrosPagados();
    alert(`Se extrajeron ${pagadas.length} cuentas de cobro pagadas y aprobadas.`);
  } catch (error) {
    console.error('Error al extraer cuentas pagadas:', error);
  }
}

function renderizarCobrosGuardados() {
  const tbody = document.getElementById('tabla-cobros-guardados');
  if(!tbody) return;
  tbody.innerHTML = '';
  if(cuentasCobro.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No hay cuentas de cobro registradas.</td></tr>`;
    return;
  }
  cuentasCobro.forEach((cobro) => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${cobro.id}</strong></td>
        <td>${cobro.cliente}</td>
        <td>${cobro.concepto}</td>
        <td>${cobro.fecha}</td>
        <td class="text-right">${formatoMoneda(cobro.valor)}</td>
        <td><span class="badge ${cobro.estado === 'Pagado' ? 'badge-aprobado' : 'badge-pendiente'}">${cobro.estado}</span></td>
        <td>
          <button class="btn" style="background:#6c757d; color:white; padding:4px 8px; font-size:11px;" onclick='verDetalleCobro(${JSON.stringify(cobro)})'>👁️ Ver</button>
          <button class="btn" style="background:#28a745; color:white; padding:4px 8px; font-size:11px;" onclick="marcarPagado('${cobro.id}', '${cobro.estado}')">Pago</button>
          <button class="btn" style="background:#dc3545; color:white; padding:4px 8px; font-size:11px;" onclick="eliminarCobro('${cobro.id}')">Eliminar</button>
        </td>
      </tr>`;
  });
}

async function marcarPagado(id, estadoActual) {
  const nuevoEstado = estadoActual === 'Por Cobrar' ? 'Pagado' : 'Por Cobrar';
  try {
    await fetch(`${API_URL}/cuentas-cobro/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    cargarCuentasCobroBD();
  } catch (error) {
    console.error('Error al actualizar pago:', error);
  }
}

async function eliminarCobro(id) {
  if(confirm('¿Eliminar esta cuenta de cobro de la base de datos?')) {
    try {
      await fetch(`${API_URL}/cuentas-cobro/${id}`, { method: 'DELETE' });
      cargarCuentasCobroBD();
    } catch (error) {
      console.error('Error al eliminar cuenta de cobro:', error);
    }
  }
}

function calcularTotalCobrosPagados() {
  const totalPagado = cuentasCobro
    .filter(cobro => cobro.estado === 'Pagado')
    .reduce((acumulador, actual) => acumulador + (actual.valor || 0), 0);

  const lblTotal = document.getElementById('lbl-total-pagado');
  if(lblTotal) {
    lblTotal.innerText = formatoMoneda(totalPagado);
  }
}

function verDetalleCotizacion(cot) {
  document.getElementById('modal-titulo').innerText = `Cotización: ${cot.id}`;
  document.getElementById('modal-contenido').innerHTML = `
    <p><strong>Cliente / Edificio:</strong> ${cot.cliente}</p>
    <p><strong>Proyecto / Título:</strong> ${cot.titulo}</p>
    <p><strong>Fecha de Emisión:</strong> ${cot.fecha}</p>
    <p><strong>Valor Total:</strong> ${formatoMoneda(cot.total)}</p>
    <p><strong>Estado Actual:</strong> ${cot.estado}</p>
  `;
  document.getElementById('modal-detalle').style.display = 'flex';
}

function verDetalleCobro(cobro) {
  document.getElementById('modal-titulo').innerText = `Cuenta de Cobro: ${cobro.id}`;
  document.getElementById('modal-contenido').innerHTML = `
    <p><strong>Cliente / Edificio:</strong> ${cobro.cliente}</p>
    <p><strong>Tipo de Cobro:</strong> ${cobro.tipoCobro || 'Anticipo'}</p>
    <p><strong>Concepto Detallado:</strong> ${cobro.concepto}</p>
    <p><strong>Fecha:</strong> ${cobro.fecha}</p>
    <p><strong>Valor Cobrado:</strong> ${formatoMoneda(cobro.valor)}</p>
    <p><strong>Estado Actual:</strong> ${cobro.estado}</p>
  `;
  document.getElementById('modal-detalle').style.display = 'flex';
}

function cerrarModalDetalle() {
  document.getElementById('modal-detalle').style.display = 'none';
}

// --- EXPOSICIÓN GLOBAL PARA EVITAR ERRORES DE REFERENCIA EN HTML ---
window.verificarLogin = verificarLogin;
window.cerrarSesion = cerrarSesion;
window.cambiarTab = cambiarTab;
window.agregarManoDeObra = agregarManoDeObra;
window.eliminarManoDeObra = eliminarManoDeObra;
window.actualizarMO = actualizarMO;
window.agregarMaterial = agregarMaterial;
window.eliminarMat = eliminarMat;
window.actualizarMat = actualizarMat;
window.actualizarCotizacion = actualizarCotizacion;
window.guardarYDescargarCotizacion = guardarYDescargarCotizacion;
window.verDetalleCotizacion = verDetalleCotizacion;
window.cambiarEstadoCotizacion = cambiarEstadoCotizacion;
window.eliminarCotizacion = eliminarCotizacion;
window.poblarSelectCotizacionesAprobadas = poblarSelectCotizacionesAprobadas;
window.cargarDatosCotizacionEnCobro = cargarDatosCotizacionEnCobro;
window.actualizarVistaCobroManual = actualizarVistaCobroManual;
window.guardarYDescargarCuentaCobro = guardarYDescargarCuentaCobro;
window.verDetalleCobro = verDetalleCobro;
window.marcarPagado = marcarPagado;
window.eliminarCobro = eliminarCobro;
window.cerrarModalDetalle = cerrarModalDetalle;