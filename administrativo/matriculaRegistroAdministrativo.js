const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- MENÚ LATERAL Y SUBMENÚS ---
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const btnCerrarMenu = document.getElementById('btnCerrarMenu');
const menuLateral = document.getElementById('menuLateral');
const overlay = document.getElementById('overlay');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

function abrirMenu() {
    menuLateral.classList.add('abierto');
    overlay.classList.add('activo');
}

function cerrarMenu() {
    menuLateral.classList.remove('abierto');
    overlay.classList.remove('activo');
}

btnAbrirMenu.addEventListener('click', abrirMenu);
btnCerrarMenu.addEventListener('click', cerrarMenu);
overlay.addEventListener('click', cerrarMenu);

function toggleSubMenu(idSubMenu) {
    const submenu = document.getElementById(idSubMenu);
    const boton = submenu.previousElementSibling;

    submenu.classList.toggle('abierto');
    boton.classList.toggle('activo');
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function () {
        localStorage.removeItem('ci_usuario');
        localStorage.removeItem('rol_usuario');
        localStorage.removeItem('perfil_usuario');
    });
}

// --- VERIFICAR SESIÓN ADMINISTRATIVA ---
function verificarSesionAdmin() {
    const ciGuardado = localStorage.getItem('ci_usuario');
    const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

    if (!ciGuardado) {
        window.location.href = '../index.html';
        return false;
    }

    if (rolGuardado && rolGuardado !== 'administrativo') {
        window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
        return false;
    }

    return true;
}

// --- SELECCIÓN DE BOTONES (CURSO/NIVEL, PARALELO, TURNO, GRADO) ---
const selecciones = {
    curso: '',
    paralelo: '',
    turno: '',
    grado: ''
};

document.querySelectorAll('.grupo-botones').forEach((grupo) => {
    const nombreGrupo = grupo.dataset.grupo;
    const botones = grupo.querySelectorAll('.btn-opcion');

    botones.forEach((boton) => {
        boton.addEventListener('click', () => {
            botones.forEach((b) => b.classList.remove('seleccionado'));
            boton.classList.add('seleccionado');
            selecciones[nombreGrupo] = boton.dataset.valor;
        });
    });
});

// --- FECHA DE HOY Y GESTIÓN ---
const inputFecha = document.getElementById('fecha-matricula');
const inputGestion = document.getElementById('gestion');

function establecerFechaHoy() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    inputFecha.value = `${anio}-${mes}-${dia}`;
    inputGestion.value = `${anio}`;
}

establecerFechaHoy();

// --- VERIFICAR CI DE ESTUDIANTE EN SUPABASE ---
const inputCiEstudiante = document.getElementById('ci-estudiante');
const estadoCiAlumno = document.getElementById('estadoCiAlumno');

function marcarEstadoCiAlumno(tipo, texto) {
    inputCiEstudiante.classList.remove('ci-invalido', 'ci-valido');
    estadoCiAlumno.classList.remove('error', 'ok', 'pendiente');

    if (tipo === 'error') {
        inputCiEstudiante.classList.add('ci-invalido');
        estadoCiAlumno.classList.add('error');
    } else if (tipo === 'ok') {
        inputCiEstudiante.classList.add('ci-valido');
        estadoCiAlumno.classList.add('ok');
    } else {
        estadoCiAlumno.classList.add('pendiente');
    }

    estadoCiAlumno.textContent = texto || '';
}

async function buscarEstudiantePorCi(ciRaw) {
    const ciLimpio = String(ciRaw || '').replace(/\D/g, '').trim();
    const ciNumero = Number.parseInt(ciLimpio, 10);

    if (!ciLimpio || Number.isNaN(ciNumero) || ciNumero <= 0) {
        marcarEstadoCiAlumno('error', 'Ingrese un CI numérico válido del estudiante.');
        return { valido: false, ci: null, idEstudiante: null };
    }

    marcarEstadoCiAlumno('pendiente', 'Verificando estudiante...');

    try {
        const { data: estData, error: estError } = await supabaseClient
            .from('estudiante')
            .select('id, ci_persona')
            .eq('ci_persona', ciNumero)
            .maybeSingle();

        if (estError || !estData) {
            marcarEstadoCiAlumno('error', `No existe un estudiante registrado con el CI ${ciNumero}.`);
            return { valido: false, ci: ciNumero, idEstudiante: null };
        }

        const { data: perData } = await supabaseClient
            .from('persona')
            .select('nombres, apellidos')
            .eq('ci', ciNumero)
            .maybeSingle();

        const nombreAlumno = perData
            ? `${perData.nombres || ''} ${perData.apellidos || ''}`.trim()
            : '';

        marcarEstadoCiAlumno(
            'ok',
            nombreAlumno ? `Estudiante: ${nombreAlumno}` : `Estudiante verificado (CI ${ciNumero})`
        );

        return { valido: true, ci: ciNumero, idEstudiante: estData.id };
    } catch (err) {
        console.error('Error verificando estudiante:', err);
        marcarEstadoCiAlumno('error', 'Error al consultar el estudiante en Supabase.');
        return { valido: false, ci: ciNumero, idEstudiante: null };
    }
}

let timerCi;
inputCiEstudiante.addEventListener('input', () => {
    clearTimeout(timerCi);
    if (!inputCiEstudiante.value.trim()) {
        marcarEstadoCiAlumno('pendiente', '');
        return;
    }
    timerCi = setTimeout(() => buscarEstudiantePorCi(inputCiEstudiante.value), 350);
});

inputCiEstudiante.addEventListener('blur', () => {
    clearTimeout(timerCi);
    if (inputCiEstudiante.value.trim()) {
        buscarEstudiantePorCi(inputCiEstudiante.value);
    }
});

// --- BUSCAR ID_CURSO SEGÚN TURNO, GRADO, NIVEL Y PARALELO ---
async function obtenerIdCurso(turnoSel, gradoSel, nivelSel, paraleloSel) {
    const variantesTurno = Array.from(new Set([
        turnoSel,
        turnoSel.toLowerCase(),
        turnoSel.charAt(0).toUpperCase() + turnoSel.slice(1).toLowerCase()
    ]));

    const variantesGrado = Array.from(new Set([
        gradoSel,
        gradoSel.toLowerCase(),
        gradoSel.charAt(0).toUpperCase() + gradoSel.slice(1).toLowerCase()
    ]));

    const { data: cursos, error } = await supabaseClient
        .from('curso')
        .select('id, turno, grado, nivel, paralelo')
        .in('turno', variantesTurno)
        .in('grado', variantesGrado)
        .eq('nivel', String(nivelSel).trim())
        .eq('paralelo', String(paraleloSel).trim().toUpperCase());

    if (error) {
        return { curso: null, error };
    }

    if (!cursos || cursos.length === 0) {
        return { curso: null, error: null };
    }

    return { curso: cursos[0], error: null };
}

// --- GUARDAR MATRÍCULA EN SUPABASE ---
const formMatricula = document.getElementById('formMatricula');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const btnGuardar = document.getElementById('btnGuardar');

function mostrarAlerta(texto, tipo) {
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

if (verificarSesionAdmin() && formMatricula) {
    formMatricula.addEventListener('submit', async function (event) {
        event.preventDefault();

        const ciRaw = inputCiEstudiante.value.trim();
        const fecha = inputFecha.value.trim();
        const gestionTexto = inputGestion.value.replace(/\D/g, '').trim();
        const gestionNumero = Number.parseInt(gestionTexto, 10);

        mensajeAlerta.style.display = 'none';

        if (!ciRaw) {
            mostrarAlerta('No se pudo guardar la matrícula: ingrese el CI del estudiante.', 'error');
            return;
        }

        if (!selecciones.curso) {
            mostrarAlerta('No se pudo guardar la matrícula: seleccione un curso (1 a 6).', 'error');
            return;
        }

        if (!selecciones.paralelo) {
            mostrarAlerta('No se pudo guardar la matrícula: seleccione un paralelo (A, B o C).', 'error');
            return;
        }

        if (!selecciones.turno) {
            mostrarAlerta('No se pudo guardar la matrícula: seleccione un turno (Mañana o Tarde).', 'error');
            return;
        }

        if (!selecciones.grado) {
            mostrarAlerta('No se pudo guardar la matrícula: seleccione un grado (Primaria o Secundaria).', 'error');
            return;
        }

        if (!fecha || !gestionTexto || Number.isNaN(gestionNumero)) {
            mostrarAlerta('No se pudo guardar la matrícula: complete la fecha y una gestión numérica válida.', 'error');
            return;
        }

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        try {
            // 1. Verificar estudiante y obtener su id
            const estVerificado = await buscarEstudiantePorCi(ciRaw);
            if (!estVerificado.valido || !estVerificado.idEstudiante) {
                mostrarAlerta('No se pudo guardar la matrícula: el CI del estudiante no existe o no es válido.', 'error');
                return;
            }

            // 2. Buscar el curso en la tabla curso
            const { curso: cursoEncontrado, error: cursoError } = await obtenerIdCurso(
                selecciones.turno,
                selecciones.grado,
                selecciones.curso,
                selecciones.paralelo
            );

            if (cursoError) {
                console.error('Error consultando curso:', cursoError);
                mostrarAlerta(`Error al buscar el curso: ${cursoError.message}`, 'error');
                return;
            }

            if (!cursoEncontrado) {
                mostrarAlerta(
                    `No existe un curso registrado para: ${selecciones.curso}° "${selecciones.paralelo}" de ${selecciones.grado}, Turno ${selecciones.turno}.`,
                    'error'
                );
                return;
            }

            // 3. Evitar matricular dos veces al mismo estudiante en la misma gestión
            const { data: matriculaExistente } = await supabaseClient
                .from('matricula')
                .select('id, estado')
                .eq('id_estudiante', estVerificado.idEstudiante)
                .eq('gestion', gestionNumero)
                .maybeSingle();

            if (matriculaExistente) {
                mostrarAlerta(
                    `El estudiante con CI ${estVerificado.ci} ya cuenta con una matrícula registrada en la gestión ${gestionNumero} (Estado: ${matriculaExistente.estado}).`,
                    'error'
                );
                return;
            }

            // 4. Insertar matrícula en Supabase
            const { error: insertError } = await supabaseClient
                .from('matricula')
                .insert({
                    id_estudiante: estVerificado.idEstudiante,
                    id_curso: cursoEncontrado.id,
                    fecha_matricula: fecha,
                    gestion: gestionNumero,
                    estado: 'Pendiente'
                });

            if (insertError) {
                console.error('Error guardando matrícula:', insertError);
                mostrarAlerta(`Error al guardar la matrícula: ${insertError.message}`, 'error');
                return;
            }

            mostrarAlerta(
                `¡Matrícula guardada correctamente para CI ${estVerificado.ci} (${selecciones.curso}° "${selecciones.paralelo}" de ${selecciones.grado}, Turno ${selecciones.turno}, Gestión ${gestionNumero}, Estado: Pendiente)!`,
                'exito'
            );

            formMatricula.reset();
            marcarEstadoCiAlumno('pendiente', '');
            Object.keys(selecciones).forEach((clave) => {
                selecciones[clave] = '';
            });
            document.querySelectorAll('.btn-opcion').forEach((b) => b.classList.remove('seleccionado'));
            establecerFechaHoy();
        } catch (err) {
            console.error('Error inesperado al guardar matrícula:', err);
            mostrarAlerta('Ocurrió un error al comunicarse con Supabase.', 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
        }
    });
}