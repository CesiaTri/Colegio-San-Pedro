const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para asistencia del estudiante visto por el tutor
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

function toggleSubMenu(idSubMenu) {
    const submenu = document.getElementById(idSubMenu);
    if (!submenu) return;
    const boton = submenu.previousElementSibling;
    submenu.classList.toggle('abierto');
    if (boton) boton.classList.toggle('activo');
}

// --- VERIFICACIÓN DE SESIÓN Y ROL ---
const ciGuardado = localStorage.getItem('ci_usuario');
const rolGuardado = (localStorage.getItem('rol_usuario') || '').trim().toLowerCase();

if (!ciGuardado) {
    window.location.href = '../index.html';
} else if (rolGuardado && rolGuardado !== 'tutor') {
    window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
}

// --- PARÁMETRO DE ESTUDIANTE DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const idEstudianteParam = urlParams.get('id');

const selectMes = document.getElementById('select-mes');
const tituloMes = document.getElementById('titulo-mes');
const cuerpoTabla = document.getElementById('cuerpo-tabla');

const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let estudianteSeleccionadoObj = null;
let mapaAsistenciaPorFecha = new Map();

function actualizarSubMenusEstudiantes(estudiantesUnicos, idActivo) {
    const subMenusConfig = [
        { id: 'sub-perfil', destino: 'perfil_est_tutor.html', esAsistencia: false },
        { id: 'sub-notas', destino: 'notas_est_tutor.html', esAsistencia: false },
        { id: 'sub-horario', destino: 'horario_est_tutor.html', esAsistencia: false },
        { id: 'sub-matricula', destino: 'matricula_est_tutor.html', esAsistencia: false },
        { id: 'sub-asistencia', destino: 'asistencia_est_tutor.html', esAsistencia: true }
    ];

    subMenusConfig.forEach(({ id, destino, esAsistencia }) => {
        const subMenuEl = document.getElementById(id);
        if (!subMenuEl) return;

        if (estudiantesUnicos.length === 0) {
            subMenuEl.innerHTML = `<span class="sub-opcion">Sin estudiantes asociados</span>`;
            return;
        }

        subMenuEl.innerHTML = estudiantesUnicos
            .map((est, idx) => {
                const nombreCorto = `${est.nombres || ''} ${est.apellidos || ''}`.trim() || `Estudiante ${idx + 1}`;
                const etiqueta = `${nombreCorto} (Estudiante ${idx + 1})`;
                const activaClase = esAsistencia && String(est.id_estudiante) === String(idActivo) ? ' activa' : '';
                return `<a href="${destino}?id=${encodeURIComponent(est.id_estudiante)}" class="sub-opcion${activaClase}">${etiqueta}</a>`;
            })
            .join('');
    });
}

function normalizarEstadoAsistencia(estadoRaw) {
    if (!estadoRaw) return null;
    const limpio = String(estadoRaw).trim().toLowerCase();
    if (!limpio) return null;

    if (limpio === 'presente') {
        return { clase: 'presente', texto: 'Presente' };
    }
    if (limpio === 'ausente' || limpio === 'falta') {
        return { clase: 'ausente', texto: 'Ausente' };
    }
    if (limpio === 'atraso' || limpio === 'tardanza') {
        return { clase: 'ausente', texto: 'Atraso' };
    }
    if (limpio === 'licencia' || limpio === 'justificado') {
        return { clase: 'sin-clases', texto: 'Licencia' };
    }

    return {
        clase: 'sin-clases',
        texto: limpio.charAt(0).toUpperCase() + limpio.slice(1)
    };
}

function formatearClaveFecha(anio, mesIndex, dia) {
    const mm = String(mesIndex + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return `${anio}-${mm}-${dd}`;
}

function generarCalendario2026(mesIndex) {
    if (!tituloMes || !cuerpoTabla) return;

    const anio = 2026;
    tituloMes.textContent = nombresMeses[mesIndex] || '';
    cuerpoTabla.innerHTML = '';

    const primerDiaFecha = new Date(anio, mesIndex, 1);
    let diaSemanaInicio = primerDiaFecha.getDay();
    diaSemanaInicio = (diaSemanaInicio === 0) ? 6 : diaSemanaInicio - 1;

    const totalDias = new Date(anio, mesIndex + 1, 0).getDate();
    let diaActual = 1;

    for (let semana = 0; semana < 6; semana++) {
        if (diaActual > totalDias) break;

        const tr = document.createElement('tr');

        for (let i = 0; i < 7; i++) {
            const td = document.createElement('td');

            if (semana === 0 && i < diaSemanaInicio) {
                td.className = 'celda-vacia';
                td.innerHTML = '';
            } else if (diaActual <= totalDias) {
                if (i === 6) {
                    td.innerHTML = `
                        <div class="num-dia">${diaActual}</div>
                        <span class="sin-clases">Sin clases</span>
                    `;
                } else {
                    const claveFecha = formatearClaveFecha(anio, mesIndex, diaActual);
                    const estadoDb = mapaAsistenciaPorFecha.get(claveFecha);
                    const infoEstado = normalizarEstadoAsistencia(estadoDb);

                    if (!infoEstado) {
                        td.innerHTML = `
                            <div class="num-dia">${diaActual}</div>
                            <span class="sin-clases">Sin clases</span>
                        `;
                    } else {
                        td.innerHTML = `
                            <div class="num-dia">${diaActual}</div>
                            <span class="estado ${infoEstado.clase}">${infoEstado.texto}</span>
                        `;
                    }
                }
                diaActual++;
            } else {
                td.className = 'celda-vacia';
                td.innerHTML = '';
            }

            tr.appendChild(td);
        }

        cuerpoTabla.appendChild(tr);
    }
}

async function cargarAsistenciaEstudianteTutor() {
    if (!ciGuardado) return;

    const mesInicial = selectMes ? parseInt(selectMes.value, 10) : 10;
    const mesValido = Number.isNaN(mesInicial) ? 10 : mesInicial;
    generarCalendario2026(mesValido);

    try {
        const ciNum = Number(ciGuardado);
        const filtroCiTutor = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data: vinculosData, error: vinculosErr } = await supabaseClient
            .from('vista_perfil_estudiante_tutor')
            .select('id_estudiante, nombres, apellidos, gestion')
            .eq('ci_tutor', filtroCiTutor)
            .order('gestion', { ascending: false });

        if (vinculosErr) {
            console.error('Error consultando estudiantes asociados del tutor:', vinculosErr);
            return;
        }

        const mapaEstudiantes = new Map();
        for (const row of (vinculosData || [])) {
            if (row.id_estudiante !== null && row.id_estudiante !== undefined) {
                const clave = String(row.id_estudiante);
                if (!mapaEstudiantes.has(clave)) {
                    mapaEstudiantes.set(clave, {
                        id_estudiante: row.id_estudiante,
                        nombres: row.nombres,
                        apellidos: row.apellidos
                    });
                }
            }
        }

        const estudiantesUnicos = Array.from(mapaEstudiantes.values());
        let estudianteSel = null;
        if (idEstudianteParam) {
            estudianteSel = estudiantesUnicos.find((e) => String(e.id_estudiante) === String(idEstudianteParam)) || null;
        }
        if (!estudianteSel && estudiantesUnicos.length > 0) {
            estudianteSel = estudiantesUnicos[0];
        }

        estudianteSeleccionadoObj = estudianteSel;
        const idEstActivo = estudianteSel ? estudianteSel.id_estudiante : idEstudianteParam;
        actualizarSubMenusEstudiantes(estudiantesUnicos, idEstActivo);

        if (!estudianteSel) {
            mapaAsistenciaPorFecha = new Map();
            generarCalendario2026(selectMes ? parseInt(selectMes.value, 10) : 10);
            return;
        }

        const estNum = Number(estudianteSel.id_estudiante);
        const filtroEst = Number.isNaN(estNum) ? estudianteSel.id_estudiante : estNum;

        const { data: asistData, error: asistErr } = await supabaseClient
            .from('vista_asistencia_estudiante_tutor')
            .select('id_asistencia, id_matricula, fecha, anio, mes, dia, estado_asistencia, id_estudiante, ci_tutor')
            .eq('id_estudiante', filtroEst)
            .eq('ci_tutor', filtroCiTutor)
            .order('fecha', { ascending: true });

        if (asistErr) {
            console.error('Error consultando vista_asistencia_estudiante_tutor:', asistErr);
            return;
        }

        const nuevoMapa = new Map();
        for (const fila of (asistData || [])) {
            if (!fila.fecha) continue;
            const fechaLimpia = String(fila.fecha).split('T')[0];
            if (fechaLimpia && fila.estado_asistencia) {
                nuevoMapa.set(fechaLimpia, fila.estado_asistencia);
            }
        }

        mapaAsistenciaPorFecha = nuevoMapa;
        const mesActual = selectMes ? parseInt(selectMes.value, 10) : 10;
        generarCalendario2026(Number.isNaN(mesActual) ? 10 : mesActual);
    } catch (err) {
        console.error('Error inesperado cargando asistencia del estudiante:', err);
    }
}

if (selectMes) {
    selectMes.addEventListener('change', function () {
        const mesSel = parseInt(this.value, 10);
        generarCalendario2026(Number.isNaN(mesSel) ? 10 : mesSel);
    });
}

cargarAsistenciaEstudianteTutor();