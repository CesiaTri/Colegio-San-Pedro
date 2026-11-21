const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para matrícula del estudiante
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- MENÚ LATERAL ---
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const btnCerrarMenu = document.getElementById('btnCerrarMenu');
const menuLateral = document.getElementById('menuLateral');
const overlay = document.getElementById('overlay');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

function abrirMenu() {
    if (menuLateral) menuLateral.classList.add('abierto');
    if (overlay) overlay.classList.add('activo');
}

function cerrarMenu() {
    if (menuLateral) menuLateral.classList.remove('abierto');
    if (overlay) overlay.classList.remove('activo');
}

if (btnAbrirMenu) btnAbrirMenu.addEventListener('click', abrirMenu);
if (btnCerrarMenu) btnCerrarMenu.addEventListener('click', cerrarMenu);
if (overlay) overlay.addEventListener('click', cerrarMenu);

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', function () {
        localStorage.removeItem('ci_usuario');
        localStorage.removeItem('rol_usuario');
        localStorage.removeItem('perfil_usuario');
    });
}

// --- VERIFICACIÓN DE SESIÓN Y ROL ---
const ciGuardado = localStorage.getItem('ci_usuario');
const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

if (!ciGuardado) {
    window.location.href = '../index.html';
} else if (rolGuardado && rolGuardado !== 'estudiante') {
    window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
}

// --- ELEMENTOS DE MATRÍCULA ---
const matIdEl = document.getElementById('mat-id');
const matEstudianteEl = document.getElementById('mat-estudiante');
const matCursoEl = document.getElementById('mat-curso');
const matNivelEl = document.getElementById('mat-nivel');
const matTurnoEl = document.getElementById('mat-turno');
const matGestionEl = document.getElementById('mat-gestion');
const matFechaEl = document.getElementById('mat-fecha');
const spanEstado = document.getElementById('mat-estado');

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const soloFecha = String(fechaStr).split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return soloFecha;
}

function capitalizar(texto) {
    if (!texto) return '';
    const limpio = String(texto).trim();
    if (!limpio) return '';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function actualizarColorEstado(estadoTexto) {
    if (!spanEstado) return;
    const limpio = String(estadoTexto || '').trim();
    spanEstado.textContent = limpio || '-';
    spanEstado.className = 'estado-badge';

    const normalizado = limpio.toLowerCase();
    if (normalizado === 'pagado' || normalizado === 'pagada') {
        spanEstado.classList.add('estado-verde');
    } else {
        spanEstado.classList.add('estado-rojo');
    }
}

async function cargarMatriculaEstudiante() {
    if (!ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data, error } = await supabaseClient
            .from('vista_matricula_estudiante')
            .select('*')
            .eq('ci_estudiante', filtroCi)
            .order('gestion', { ascending: false })
            .order('id_matricula', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error consultando vista_matricula_estudiante:', error);
            if (matIdEl) matIdEl.textContent = '-';
            if (matEstudianteEl) matEstudianteEl.textContent = `CI ${ciGuardado}`;
            if (matCursoEl) matCursoEl.textContent = '-';
            if (matNivelEl) matNivelEl.textContent = '-';
            if (matTurnoEl) matTurnoEl.textContent = '-';
            if (matGestionEl) matGestionEl.textContent = '-';
            if (matFechaEl) matFechaEl.textContent = '-';
            actualizarColorEstado('Sin datos');
            return;
        }

        if (!data) {
            if (matIdEl) matIdEl.textContent = '-';
            if (matEstudianteEl) matEstudianteEl.textContent = `CI ${ciGuardado}`;
            if (matCursoEl) matCursoEl.textContent = '-';
            if (matNivelEl) matNivelEl.textContent = '-';
            if (matTurnoEl) matTurnoEl.textContent = '-';
            if (matGestionEl) matGestionEl.textContent = '-';
            if (matFechaEl) matFechaEl.textContent = '-';
            actualizarColorEstado('Sin matrícula');
            return;
        }

        const nombreCompleto = (
            data.nombre_completo ||
            `${data.nombres || ''} ${data.apellidos || ''}`.trim() ||
            `CI ${ciGuardado}`
        );

        const gradoCap = capitalizar(data.grado);
        const cursoTexto = data.curso_completo || (
            data.nivel && gradoCap && data.paralelo
                ? `${data.nivel}° de ${gradoCap} ("${data.paralelo}")`
                : '-'
        );

        let nivelTexto = '-';
        if (gradoCap === 'Secundaria') {
            nivelTexto = 'Secundaria Comunitaria Productiva';
        } else if (gradoCap === 'Primaria') {
            nivelTexto = 'Primaria Comunitaria Vocacional';
        } else if (gradoCap) {
            nivelTexto = gradoCap;
        }

        if (matIdEl) matIdEl.textContent = data.id_matricula !== null && data.id_matricula !== undefined ? String(data.id_matricula) : '-';
        if (matEstudianteEl) matEstudianteEl.textContent = nombreCompleto;
        if (matCursoEl) matCursoEl.textContent = cursoTexto;
        if (matNivelEl) matNivelEl.textContent = nivelTexto;
        if (matTurnoEl) matTurnoEl.textContent = capitalizar(data.turno) || '-';
        if (matGestionEl) matGestionEl.textContent = data.gestion !== null && data.gestion !== undefined ? String(data.gestion) : '-';
        if (matFechaEl) matFechaEl.textContent = formatearFecha(data.fecha_matricula);
        actualizarColorEstado(data.estado_matricula);
    } catch (err) {
        console.error('Error inesperado cargando matrícula del estudiante:', err);
        actualizarColorEstado('Error');
    }
}

cargarMatriculaEstudiante();