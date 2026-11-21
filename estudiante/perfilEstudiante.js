const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para perfil del estudiante
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

// --- ELEMENTOS DEL PERFIL ---
const datoCiEl = document.getElementById('dato-ci');
const datoNombreEl = document.getElementById('dato-nombre');
const datoApellidoEl = document.getElementById('dato-apellido');
const datoTelefonoEl = document.getElementById('dato-telefono');
const datoDireccionEl = document.getElementById('dato-direccion');
const datoNacimientoEl = document.getElementById('dato-nacimiento');
const datoCursoEl = document.getElementById('dato-curso');
const datoTurnoEl = document.getElementById('dato-turno');
const datoRudeEl = document.getElementById('dato-rude');

function textoSeguro(valor, fallback = '-') {
    if (valor === null || valor === undefined) return fallback;
    const limpio = String(valor).trim();
    return limpio !== '' ? limpio : fallback;
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const soloFecha = String(fechaStr).split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return soloFecha;
}

function formatearTurno(turno) {
    if (!turno) return '-';
    const limpio = String(turno).trim().toLowerCase();
    if (!limpio) return '-';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function formatearGrado(grado) {
    if (!grado) return '-';
    const limpio = String(grado).trim().toLowerCase();
    if (!limpio) return '-';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

async function cargarPerfilEstudiante() {
    if (!ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        // Consulta SQL:
        // SELECT ci, nombres, apellidos, telefono, direccion, fecha_nacimiento, genero
        // FROM persona
        // WHERE ci = <filtroCi>;
        const { data: personaData, error: personaErr } = await supabaseClient
            .from('persona')
            .select('ci, nombres, apellidos, telefono, direccion, fecha_nacimiento, genero')
            .eq('ci', filtroCi)
            .maybeSingle();

        if (personaErr) {
            console.error('Error consultando persona:', personaErr);
        }

        // Consulta SQL:
        // SELECT id, ci_persona, codigo_rude
        // FROM estudiante
        // WHERE ci_persona = <filtroCi>;
        const { data: estudianteData, error: estudianteErr } = await supabaseClient
            .from('estudiante')
            .select('id, ci_persona, codigo_rude')
            .eq('ci_persona', filtroCi)
            .maybeSingle();

        if (estudianteErr) {
            console.error('Error consultando estudiante:', estudianteErr);
        }

        let matriculaReciente = null;
        let cursoData = null;

        if (estudianteData && estudianteData.id !== null && estudianteData.id !== undefined) {
            // Consulta SQL:
            // SELECT id, id_estudiante, id_curso, fecha_matricula, gestion, estado
            // FROM matricula
            // WHERE id_estudiante = <estudianteData.id>
            // ORDER BY gestion DESC, id DESC
            // LIMIT 1;
            const { data: matData, error: matErr } = await supabaseClient
                .from('matricula')
                .select('id, id_estudiante, id_curso, fecha_matricula, gestion, estado')
                .eq('id_estudiante', estudianteData.id)
                .order('gestion', { ascending: false })
                .order('id', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (matErr) {
                console.error('Error consultando matricula:', matErr);
            } else {
                matriculaReciente = matData;
            }

            if (matriculaReciente && matriculaReciente.id_curso !== null && matriculaReciente.id_curso !== undefined) {
                // Consulta SQL:
                // SELECT id, turno, grado, nivel, paralelo
                // FROM curso
                // WHERE id = <matriculaReciente.id_curso>;
                const { data: curData, error: curErr } = await supabaseClient
                    .from('curso')
                    .select('id, turno, grado, nivel, paralelo')
                    .eq('id', matriculaReciente.id_curso)
                    .maybeSingle();

                if (curErr) {
                    console.error('Error consultando curso:', curErr);
                } else {
                    cursoData = curData;
                }
            }
        }

        const ciValor = personaData?.ci ?? estudianteData?.ci_persona ?? ciGuardado;
        const rudeValor = estudianteData?.codigo_rude ?? estudianteData?.codigo_Rude ?? '-';

        let cursoTexto = '-';
        if (cursoData) {
            const gradoFormateado = formatearGrado(cursoData.grado);
            const nivelTexto = textoSeguro(cursoData.nivel, '');
            const paraleloTexto = textoSeguro(cursoData.paralelo, '');
            if (nivelTexto && paraleloTexto) {
                cursoTexto = `${nivelTexto}° "${paraleloTexto}" de ${gradoFormateado}`;
            } else if (gradoFormateado !== '-') {
                cursoTexto = gradoFormateado;
            }
        }

        if (datoCiEl) datoCiEl.textContent = textoSeguro(ciValor);
        if (datoNombreEl) datoNombreEl.textContent = textoSeguro(personaData?.nombres);
        if (datoApellidoEl) datoApellidoEl.textContent = textoSeguro(personaData?.apellidos);
        if (datoTelefonoEl) datoTelefonoEl.textContent = textoSeguro(personaData?.telefono);
        if (datoDireccionEl) datoDireccionEl.textContent = textoSeguro(personaData?.direccion);
        if (datoNacimientoEl) datoNacimientoEl.textContent = formatearFecha(personaData?.fecha_nacimiento);
        if (datoCursoEl) datoCursoEl.textContent = cursoTexto;
        if (datoTurnoEl) datoTurnoEl.textContent = formatearTurno(cursoData?.turno);
        if (datoRudeEl) datoRudeEl.textContent = textoSeguro(rudeValor);
    } catch (err) {
        console.error('Error inesperado cargando perfil del estudiante:', err);
    }
}

cargarPerfilEstudiante();