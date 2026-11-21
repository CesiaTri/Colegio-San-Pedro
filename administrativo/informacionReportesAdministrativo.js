const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PREFIJO_CACHE_INFO_CURSO = 'cache_info_estudiantes_curso_v2_';

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

// --- FORMATEO Y RENDERIZADO ---
const elCursoNombre = document.getElementById('curso-nombre');
const elCursoGrado = document.getElementById('curso-grado');
const elCursoTurno = document.getElementById('curso-turno');
const cuerpoTablaInfo = document.getElementById('cuerpo-tabla-info');

function formatearCursoVisible(nivelRaw, paraleloRaw) {
    const digitos = String(nivelRaw || '').replace(/\D/g, '');
    const sufijos = {
        '1': '1ro',
        '2': '2do',
        '3': '3ro',
        '4': '4to',
        '5': '5to',
        '6': '6to'
    };
    const nivelTexto = sufijos[digitos] || (digitos ? `${digitos}°` : (nivelRaw || '—'));
    const paraleloTexto = String(paraleloRaw || '').trim().toUpperCase();
    return paraleloTexto ? `${nivelTexto} ${paraleloTexto}` : nivelTexto;
}

function formatearCapitalizado(val) {
    const limpio = String(val || '').trim();
    if (!limpio) return '—';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function renderizarCabeceraCurso(curso) {
    if (!curso) {
        elCursoNombre.textContent = '—';
        elCursoGrado.textContent = '—';
        elCursoTurno.textContent = '—';
        return;
    }
    elCursoNombre.textContent = formatearCursoVisible(curso.nivel, curso.paralelo);
    elCursoGrado.textContent = formatearCapitalizado(curso.grado);
    elCursoTurno.textContent = formatearCapitalizado(curso.turno);
}

function renderizarTablaInformacion(lista, mensajeVacio = 'No hay estudiantes registrados en este curso.') {
    cuerpoTablaInfo.innerHTML = '';

    if (!lista || lista.length === 0) {
        cuerpoTablaInfo.innerHTML = `
            <tr>
                <td colspan="6" class="mensaje-vacio">${mensajeVacio}</td>
            </tr>
        `;
        return;
    }

    lista.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="celda-nombre col-estudiante">${item.nombreEstudiante}</td>
            <td class="col-estudiante">${item.dirEstudiante}</td>
            <td class="col-estudiante">${item.telfEstudiante}</td>
            <td class="celda-nombre col-tutor">${item.nombreTutor}</td>
            <td class="col-tutor">${item.telfTutor}</td>
            <td class="col-tutor">${item.relacion}</td>
        `;
        cuerpoTablaInfo.appendChild(tr);
    });
}

function extraerIdCurso(idRaw) {
    if (!idRaw) return null;
    const digitos = String(idRaw).replace(/\D/g, '').trim();
    const num = Number.parseInt(digitos, 10);
    return Number.isNaN(num) || num <= 0 ? null : num;
}

async function cargarInformacionCurso() {
    const params = new URLSearchParams(window.location.search);
    const idCursoParam = extraerIdCurso(params.get('id'));

    if (idCursoParam) {
        try {
            const cached = localStorage.getItem(`${PREFIJO_CACHE_INFO_CURSO}${idCursoParam}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                renderizarCabeceraCurso(parsed.curso);
                if (Array.isArray(parsed.filas) && parsed.filas.length > 0) {
                    renderizarTablaInformacion(parsed.filas);
                }
            }
        } catch (_) {
            // Ignorar errores de caché
        }
    }

    try {
        let query = supabaseClient
            .from('vista_informacion_curso_administrativo')
            .select('id_curso, nivel, paralelo, grado, turno, id_estudiante, nombre_estudiante, dir_estudiante, telf_estudiante, nombre_tutor, telf_tutor, relacion');

        if (idCursoParam) {
            query = query.eq('id_curso', idCursoParam);
        } else {
            // Si no se pasa ?id=, obtiene el primer id_curso disponible y luego todas sus filas
            const { data: primerCurso, error: primerError } = await supabaseClient
                .from('vista_informacion_curso_administrativo')
                .select('id_curso')
                .order('id_curso', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (primerError) {
                console.error('Error consultando primer curso en la vista:', primerError);
                renderizarTablaInformacion([], 'No se pudo consultar el curso.');
                return;
            }

            if (!primerCurso) {
                renderizarCabeceraCurso(null);
                renderizarTablaInformacion([], 'No se encontró el curso solicitado.');
                return;
            }

            query = query.eq('id_curso', primerCurso.id_curso);
        }

        const { data: filasVista, error } = await query;

        if (error) {
            console.error('Error consultando vista de información del curso:', error);
            renderizarTablaInformacion([], 'No se pudo cargar la información del curso desde Supabase.');
            return;
        }

        if (!filasVista || filasVista.length === 0) {
            renderizarCabeceraCurso(null);
            renderizarTablaInformacion([], 'No se encontró el curso solicitado.');
            return;
        }

        const primeraFila = filasVista[0];
        const cursoInfo = {
            id: primeraFila.id_curso,
            nivel: primeraFila.nivel,
            paralelo: primeraFila.paralelo,
            grado: primeraFila.grado,
            turno: primeraFila.turno
        };

        renderizarCabeceraCurso(cursoInfo);

        // Si el curso no tiene estudiantes, la vista devuelve 1 fila con id_estudiante = null
        const filasEstudiantes = filasVista
            .filter((f) => f.id_estudiante !== null && f.id_estudiante !== undefined)
            .map((f) => ({
                nombreEstudiante: f.nombre_estudiante || '—',
                dirEstudiante: f.dir_estudiante || '—',
                telfEstudiante: f.telf_estudiante || '—',
                nombreTutor: f.nombre_tutor || '—',
                telfTutor: f.telf_tutor || '—',
                relacion: f.relacion || '—'
            }));

        renderizarTablaInformacion(filasEstudiantes, 'No hay estudiantes matriculados en este curso.');

        try {
            localStorage.setItem(
                `${PREFIJO_CACHE_INFO_CURSO}${cursoInfo.id}`,
                JSON.stringify({ curso: cursoInfo, filas: filasEstudiantes })
            );
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando información del curso:', err);
        renderizarTablaInformacion([], 'Ocurrió un error al comunicarse con Supabase.');
    }
}

if (verificarSesionAdmin()) {
    cargarInformacionCurso();
}