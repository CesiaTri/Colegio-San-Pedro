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

// --- FECHA DE HOY POR DEFECTO ---
const inputFechaPago = document.getElementById('fecha-pago');

function establecerFechaHoy() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    inputFechaPago.value = `${anio}-${mes}-${dia}`;
    return anio;
}

const anioActual = establecerFechaHoy();

// --- VERIFICAR ESTUDIANTE Y SU MATRÍCULA ---
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

async function obtenerMatriculaActivaEstudiante(idEstudiante, gestionPreferida) {
    const { data: matriculas, error } = await supabaseClient
        .from('matricula')
        .select('id, id_curso, gestion, estado')
        .eq('id_estudiante', idEstudiante)
        .order('gestion', { ascending: false })
        .order('id', { ascending: false });

    if (error) {
        return { matricula: null, error };
    }

    if (!matriculas || matriculas.length === 0) {
        return { matricula: null, error: null };
    }

    const matriculaGestion = matriculas.find((m) => Number(m.gestion) === Number(gestionPreferida));
    return { matricula: matriculaGestion || matriculas[0], error: null };
}

async function verificarEstudianteYMatricula(ciRaw) {
    const ciLimpio = String(ciRaw || '').replace(/\D/g, '').trim();
    const ciNumero = Number.parseInt(ciLimpio, 10);

    if (!ciLimpio || Number.isNaN(ciNumero) || ciNumero <= 0) {
        marcarEstadoCiAlumno('error', 'Ingrese un CI numérico válido del estudiante.');
        return { valido: false, ci: null, idEstudiante: null, matricula: null };
    }

    marcarEstadoCiAlumno('pendiente', 'Verificando estudiante y matrícula...');

    try {
        const { data: estData, error: estError } = await supabaseClient
            .from('estudiante')
            .select('id, ci_persona')
            .eq('ci_persona', ciNumero)
            .maybeSingle();

        if (estError || !estData) {
            marcarEstadoCiAlumno('error', `No existe un estudiante registrado con el CI ${ciNumero}.`);
            return { valido: false, ci: ciNumero, idEstudiante: null, matricula: null };
        }

        const { data: perData } = await supabaseClient
            .from('persona')
            .select('nombres, apellidos')
            .eq('ci', ciNumero)
            .maybeSingle();

        const nombreAlumno = perData
            ? `${perData.nombres || ''} ${perData.apellidos || ''}`.trim()
            : `CI ${ciNumero}`;

        const gestionConsultada = inputFechaPago.value
            ? Number.parseInt(inputFechaPago.value.slice(0, 4), 10) || anioActual
            : anioActual;

        const { matricula, error: matError } = await obtenerMatriculaActivaEstudiante(
            estData.id,
            gestionConsultada
        );

        if (matError) {
            marcarEstadoCiAlumno('error', 'Error al consultar la matrícula del estudiante.');
            return { valido: false, ci: ciNumero, idEstudiante: estData.id, matricula: null };
        }

        if (!matricula) {
            marcarEstadoCiAlumno(
                'error',
                `El estudiante ${nombreAlumno} no tiene matrícula registrada.`
            );
            return { valido: false, ci: ciNumero, idEstudiante: estData.id, matricula: null };
        }

        marcarEstadoCiAlumno(
            'ok',
            `${nombreAlumno} — Matrícula #${matricula.id} (Gestión ${matricula.gestion}, Estado: ${matricula.estado})`
        );

        return { valido: true, ci: ciNumero, idEstudiante: estData.id, matricula };
    } catch (err) {
        console.error('Error verificando estudiante/matrícula:', err);
        marcarEstadoCiAlumno('error', 'Error al consultar Supabase.');
        return { valido: false, ci: ciNumero, idEstudiante: estData.id, matricula: null };
    }
}

let timerCi;
inputCiEstudiante.addEventListener('input', () => {
    clearTimeout(timerCi);
    if (!inputCiEstudiante.value.trim()) {
        marcarEstadoCiAlumno('pendiente', '');
        return;
    }
    timerCi = setTimeout(() => verificarEstudianteYMatricula(inputCiEstudiante.value), 350);
});

inputCiEstudiante.addEventListener('blur', () => {
    clearTimeout(timerCi);
    if (inputCiEstudiante.value.trim()) {
        verificarEstudianteYMatricula(inputCiEstudiante.value);
    }
});

// --- GUARDAR PAGO EN SUPABASE ---
const formPago = document.getElementById('formPago');
const mensajeAlerta = document.getElementById('mensajeAlerta');
const btnGuardar = document.getElementById('btnGuardar');

function mostrarAlerta(texto, tipo) {
    mensajeAlerta.textContent = texto;
    mensajeAlerta.style.display = 'block';
    mensajeAlerta.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

if (verificarSesionAdmin() && formPago) {
    formPago.addEventListener('submit', async function (event) {
        event.preventDefault();

        const ciRaw = inputCiEstudiante.value.trim();
        const concepto = document.getElementById('concepto').value.trim();
        const montoValor = Number.parseFloat(document.getElementById('monto').value);
        const fechaPago = inputFechaPago.value.trim();

        mensajeAlerta.style.display = 'none';

        if (!ciRaw || !concepto || !fechaPago) {
            mostrarAlerta('No se pudo guardar el pago: complete todos los campos obligatorios.', 'error');
            return;
        }

        if (Number.isNaN(montoValor) || montoValor <= 0) {
            mostrarAlerta('No se pudo guardar el pago: ingrese un monto válido mayor a 0.', 'error');
            return;
        }

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        try {
            const verificacion = await verificarEstudianteYMatricula(ciRaw);
            if (!verificacion.valido || !verificacion.matricula) {
                mostrarAlerta(
                    'No se pudo guardar el pago: verifique el CI del estudiante y asegúrese de que tenga una matrícula registrada.',
                    'error'
                );
                return;
            }

            const montoRedondeado = Number(montoValor.toFixed(2));

            // 1. Insertar pago en la tabla pago
            const { error: pagoError } = await supabaseClient
                .from('pago')
                .insert({
                    id_matricula: verificacion.matricula.id,
                    concepto: concepto.slice(0, 100),
                    monto: montoRedondeado,
                    fecha_pago: fechaPago
                });

            if (pagoError) {
                console.error('Error guardando pago:', pagoError);
                mostrarAlerta(`Error al guardar el pago: ${pagoError.message}`, 'error');
                return;
            }

            // 2. Actualizar estado de la matrícula a 'Pagado'
            const { error: estadoError } = await supabaseClient
                .from('matricula')
                .update({ estado: 'Pagado' })
                .eq('id', verificacion.matricula.id);

            if (estadoError) {
                console.warn('Pago guardado, pero no se pudo actualizar el estado de la matrícula:', estadoError);
            }

            mostrarAlerta(
                `¡Pago de Bs ${montoRedondeado.toFixed(2)} por "${concepto}" (CI: ${verificacion.ci}, Matrícula #${verificacion.matricula.id}) guardado correctamente! Estado: Pagado.`,
                'exito'
            );

            formPago.reset();
            marcarEstadoCiAlumno('pendiente', '');
            establecerFechaHoy();
        } catch (err) {
            console.error('Error inesperado al guardar pago:', err);
            mostrarAlerta('Ocurrió un error al comunicarse con Supabase.', 'error');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
        }
    });
}