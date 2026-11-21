const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PREFIJO_CACHE_VER_NOTAS = 'cache_ver_notas_admin_';

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

// --- FORMATEO Y RENDERIZADO DE NOTAS ---
const elMateria = document.getElementById('dato-materia');
const elCurso = document.getElementById('dato-curso');
const elGrado = document.getElementById('dato-grado');
const elTurno = document.getElementById('dato-turno');
const cuerpoTablaNotas = document.getElementById('cuerpo-tabla-notas');
const btnAtras = document.getElementById('btnAtras');

function extraerEntero(raw) {
    if (!raw) return null;
    const digitos = String(raw).replace(/\D/g, '').trim();
    const num = Number.parseInt(digitos, 10);
    return Number.isNaN(num) || num <= 0 ? null : num;
}

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

function formatearPuntaje(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
    const num = Number(val);
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function renderizarCabecera(info) {
    elMateria.textContent = info?.materia || '—';
    elCurso.textContent = info?.curso || '—';
    elGrado.textContent = info?.grado || '—';
    elTurno.textContent = info?.turno || '—';
}

function renderizarTablaNotas(filas) {
    cuerpoTablaNotas.innerHTML = '';

    if (!filas || filas.length === 0) {
        cuerpoTablaNotas.innerHTML = `
            <tr>
                <td colspan="5" class="mensaje-vacio">No hay notas registradas para este curso y materia.</td>
            </tr>
        `;
        return;
    }

    filas.forEach((est) => {
        const tr = document.createElement('tr');
        if (typeof est.finalNum === 'number' && est.finalNum < 51) {
            tr.className = 'fila-reprobada';
        }

        tr.innerHTML = `
            <td class="columna-estudiante">${est.nombre}</td>
            <td>${est.t1Texto}</td>
            <td>${est.t2Texto}</td>
            <td>${est.t3Texto}</td>
            <td><strong>${est.finalTexto}</strong></td>
        `;
        cuerpoTablaNotas.appendChild(tr);
    });
}

async function cargarNotas() {
    const params = new URLSearchParams(window.location.search);
    const idAsignacionParam = extraerEntero(params.get('id_asignacion'));
    const idCursoParam = extraerEntero(params.get('id_curso') || params.get('id'));
    const idMateriaParam = extraerEntero(params.get('id_materia'));

    if (idCursoParam && btnAtras) {
        btnAtras.href = `notas_reportes_administrativo.html?id=${encodeURIComponent(idCursoParam)}`;
    }

    const cacheKey = `${PREFIJO_CACHE_VER_NOTAS}a${idAsignacionParam || 0}_c${idCursoParam || 0}_m${idMateriaParam || 0}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            renderizarCabecera(parsed.cabecera);
            renderizarTablaNotas(parsed.filas);
        }
    } catch (_) {
        // Ignorar errores de caché
    }

    try {
        let query = supabaseClient
            .from('vista_ver_notas_administrativo')
            .select('id_asignacion, id_curso, id_materia, materia, nivel, paralelo, grado, turno, id_matricula, nombre_estudiante, t1, t2, t3, nota_final');

        if (idAsignacionParam) {
            query = query.eq('id_asignacion', idAsignacionParam);
        } else if (idCursoParam && idMateriaParam) {
            query = query.eq('id_curso', idCursoParam).eq('id_materia', idMateriaParam);
        } else if (idCursoParam) {
            query = query.eq('id_curso', idCursoParam);
        } else {
            const { data: primeraFila, error: primeraError } = await supabaseClient
                .from('vista_ver_notas_administrativo')
                .select('id_asignacion')
                .order('id_asignacion', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (primeraError || !primeraFila?.id_asignacion) {
                renderizarCabecera(null);
                renderizarTablaNotas([]);
                return;
            }
            query = query.eq('id_asignacion', primeraFila.id_asignacion);
        }

        const { data: filasVista, error: vistaError } = await query;

        if (vistaError) {
            console.error('Error cargando vista de notas:', vistaError);
            cuerpoTablaNotas.innerHTML = `
                <tr>
                    <td colspan="5" class="mensaje-vacio">Ocurrió un error al cargar las notas desde Supabase.</td>
                </tr>
            `;
            return;
        }

        if (!filasVista || filasVista.length === 0) {
            renderizarCabecera(null);
            renderizarTablaNotas([]);
            return;
        }

        // Si se consultó solo por id_curso sin id_asignacion, toma la primera asignación encontrada
        const asignacionObjetivo = idAsignacionParam || filasVista[0].id_asignacion;
        const registrosFiltrados = filasVista.filter((f) => f.id_asignacion === asignacionObjetivo);
        const referencia = registrosFiltrados[0] || filasVista[0];

        const idCursoFinal = referencia.id_curso;
        if (idCursoFinal && btnAtras) {
            btnAtras.href = `notas_reportes_administrativo.html?id=${encodeURIComponent(idCursoFinal)}`;
        }

        const cabecera = {
            materia: referencia.materia || '—',
            curso: formatearCursoVisible(referencia.nivel, referencia.paralelo),
            grado: formatearCapitalizado(referencia.grado),
            turno: formatearCapitalizado(referencia.turno)
        };
        renderizarCabecera(cabecera);

        const filas = registrosFiltrados
            .map((r) => {
                const t1Num = r.t1 !== null && r.t1 !== undefined ? Number(r.t1) : null;
                const t2Num = r.t2 !== null && r.t2 !== undefined ? Number(r.t2) : null;
                const t3Num = r.t3 !== null && r.t3 !== undefined ? Number(r.t3) : null;
                const finalNum = r.nota_final !== null && r.nota_final !== undefined && !Number.isNaN(Number(r.nota_final))
                    ? Number(r.nota_final)
                    : null;

                return {
                    nombre: r.nombre_estudiante || '—',
                    t1Texto: formatearPuntaje(t1Num),
                    t2Texto: formatearPuntaje(t2Num),
                    t3Texto: formatearPuntaje(t3Num),
                    finalNum,
                    finalTexto: formatearPuntaje(finalNum)
                };
            })
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

        renderizarTablaNotas(filas);

        try {
            localStorage.setItem(cacheKey, JSON.stringify({ cabecera, filas }));
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error cargando notas:', err);
        cuerpoTablaNotas.innerHTML = `
            <tr>
                <td colspan="5" class="mensaje-vacio">Ocurrió un error al cargar las notas desde Supabase.</td>
            </tr>
        `;
    }
}

if (verificarSesionAdmin()) {
    cargarNotas();
}