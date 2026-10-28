
"use strict";

// Dirección de la API desarrollada en clase.
const API_URL = "http://127.0.0.1:8000";

// Elementos de la interfaz.
const totalSolicitudes = document.getElementById("totalSolicitudes");
const totalServidores = document.getElementById("totalServidores");
const servidoresActivos = document.getElementById("servidoresActivos");

const tablaServidores = document.getElementById("tablaServidores");
const resultadoSolicitud = document.getElementById("resultadoSolicitud");
const contenedorEstadisticas = document.getElementById("estadisticas");
const mensajes = document.getElementById("mensajes");

const btnActualizar = document.getElementById("btnActualizar");
const btnSolicitar = document.getElementById("btnSolicitar");
const btnEstadisticas = document.getElementById("btnEstadisticas");

// Mostrar mensajes dentro de la página.
function mostrarMensaje(texto, tipo = "info") {
    mensajes.textContent = texto;
    mensajes.className = "mensajes mensaje-" + tipo;
}

// Realizar peticiones a la API.
async function consultarAPI(ruta) {
    let respuesta;

    try {
        respuesta = await fetch(API_URL + ruta, {
            method: "GET",
            cache: "no-store"
        });
    } catch (error) {
        throw new Error(
            "No se pudo conectar con la API. " +
            "Verifica que el balanceador esté encendido."
        );
    }

    if (!respuesta.ok) {
        let detalle = "Error HTTP " + respuesta.status;

        try {
            const errorAPI = await respuesta.json();

            if (errorAPI.detail) {
                detalle = typeof errorAPI.detail === "string"
                    ? errorAPI.detail
                    : JSON.stringify(errorAPI.detail);
            }
        } catch (error) {
            // Se conserva el mensaje del código HTTP.
        }

        throw new Error(detalle);
    }

    try {
        return await respuesta.json();
    } catch (error) {
        throw new Error("La API devolvió una respuesta JSON inválida.");
    }
}

// Consultar GET /servidores.
async function cargarServidores() {
    btnActualizar.disabled = true;

    try {
        const datos = await consultarAPI("/servidores");

        if (!Array.isArray(datos.servidores)) {
            throw new Error("Formato inválido en la lista de servidores.");
        }

        tablaServidores.replaceChildren();

        totalServidores.textContent = datos.total_servidores;

        let activos = 0;

        datos.servidores.forEach(servidor => {
            const fila = document.createElement("tr");

            const celdaNombre = document.createElement("td");
            celdaNombre.textContent = servidor.nombre;

            const celdaPuerto = document.createElement("td");
            celdaPuerto.textContent = servidor.puerto;

            const celdaEstado = document.createElement("td");
            const etiqueta = document.createElement("span");

            const estaActivo = servidor.estado === "activo";

            etiqueta.textContent = estaActivo ? "Activo" : "Inactivo";
            etiqueta.className = estaActivo
                ? "estado activo"
                : "estado inactivo";

            if (estaActivo) {
                activos++;
            }

            celdaEstado.appendChild(etiqueta);
            fila.append(celdaNombre, celdaPuerto, celdaEstado);
            tablaServidores.appendChild(fila);
        });

        servidoresActivos.textContent = activos;

        if (datos.servidores.length === 0) {
            const fila = document.createElement("tr");
            const celda = document.createElement("td");

            celda.colSpan = 3;
            celda.textContent = "No hay servidores configurados.";

            fila.appendChild(celda);
            tablaServidores.appendChild(fila);
        }

        if (activos === 0) {
            mostrarMensaje("No hay servidores activos disponibles.", "error");
        } else {
            mostrarMensaje(
                "Información actualizada. Servidores activos: " + activos,
                "exito"
            );
        }

    } catch (error) {
        totalServidores.textContent = "--";
        servidoresActivos.textContent = "--";

        tablaServidores.innerHTML =
            '<tr><td colspan="3">No se pudieron consultar los servidores.</td></tr>';

        mostrarMensaje(error.message, "error");
    } finally {
        btnActualizar.disabled = false;
    }
}

// Enviar GET /solicitar.
async function enviarSolicitud() {
    btnSolicitar.disabled = true;
    btnSolicitar.textContent = "Procesando...";

    try {
        const datos = await consultarAPI("/solicitar");

        resultadoSolicitud.replaceChildren();

        const titulo = document.createElement("h3");
        titulo.textContent = "Solicitud atendida correctamente";

        const servidor = document.createElement("p");
        servidor.textContent = "Servidor: " + datos.servidor;

        const puerto = document.createElement("p");
        puerto.textContent = "Puerto: " + datos.puerto;

        const contador = document.createElement("p");
        contador.textContent =
            "Solicitudes atendidas por este servidor: " +
            datos.solicitudes_atendidas;

        const resultado = document.createElement("p");
        resultado.textContent = "Resultado: " + datos.resultado;

        resultadoSolicitud.append(
            titulo,
            servidor,
            puerto,
            contador,
            resultado
        );

        mostrarMensaje(
            "La solicitud fue procesada por " + datos.servidor,
            "exito"
        );

    } catch (error) {
        resultadoSolicitud.textContent =
            "No se pudo procesar la solicitud: " + error.message;

        mostrarMensaje(error.message, "error");

    } finally {
        btnSolicitar.disabled = false;
        btnSolicitar.textContent = "Enviar solicitud";

        // Actualizar datos después de cada intento.
        await cargarEstadisticas();
        await cargarServidores();
    }
}

// Consultar GET /estadisticas.
async function cargarEstadisticas() {
    btnEstadisticas.disabled = true;

    try {
        const datos = await consultarAPI("/estadisticas");

        if (
            typeof datos.total_solicitudes !== "number" ||
            !datos.solicitudes_por_servidor ||
            typeof datos.solicitudes_por_servidor !== "object"
        ) {
            throw new Error("Formato inválido de estadísticas.");
        }

        totalSolicitudes.textContent = datos.total_solicitudes;
        contenedorEstadisticas.replaceChildren();

        const estadisticas = Object.entries(
            datos.solicitudes_por_servidor
        );

        if (estadisticas.length === 0) {
            contenedorEstadisticas.textContent =
                "Todavía no existen solicitudes registradas.";
            return;
        }

        estadisticas.forEach(([nombre, cantidad]) => {
            const porcentaje = datos.total_solicitudes > 0
                ? (cantidad / datos.total_solicitudes) * 100
                : 0;

            const item = document.createElement("div");
            item.className = "estadistica-item";

            const info = document.createElement("div");
            info.className = "estadistica-info";

            const nombreServidor = document.createElement("span");
            nombreServidor.textContent = nombre;

            const total = document.createElement("span");
            total.textContent = cantidad + " solicitudes";

            info.append(nombreServidor, total);

            const barraFondo = document.createElement("div");
            barraFondo.className = "barra-fondo";

            const barra = document.createElement("div");
            barra.className = "barra-progreso";
            barra.style.width = porcentaje + "%";

            barraFondo.appendChild(barra);
            item.append(info, barraFondo);
            contenedorEstadisticas.appendChild(item);
        });

    } catch (error) {
        totalSolicitudes.textContent = "--";
        contenedorEstadisticas.textContent =
            "No se pudieron cargar las estadísticas.";

        mostrarMensaje(error.message, "error");

    } finally {
        btnEstadisticas.disabled = false;
    }
}

// Actualización manual.
btnActualizar.addEventListener("click", async () => {
    await cargarServidores();
    await cargarEstadisticas();
});

btnSolicitar.addEventListener("click", enviarSolicitud);

btnEstadisticas.addEventListener("click", cargarEstadisticas);

// Cargar datos reales al abrir la página.
async function iniciarPanel() {
    await cargarServidores();
    await cargarEstadisticas();
}

iniciarPanel();

