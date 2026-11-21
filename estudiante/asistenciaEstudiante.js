const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para asistencia del estudiante
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

// --- CALENDARIO Y ASISTENCIA ---
const selectMes = document.getElementById('select-mes');
const tituloMes = document.getElementById('titulo-mes');
const cuerpoTabla = document.getElementById('cuerpo-tabla');

const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let mapaAsistenciaPorFecha = new Map();

function formatearClaveFecha(anio, mesIndex, dia) {
    const mm = String(mesIndex + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return `${anio}-${mm}-${dd}`;
}

function normalizarEstadoAsistencia(estadoRaw) {
    if (estadoRaw === null || estadoRaw === undefined) return null;
    const limpio = String(estadoRaw).trim();
    if (!limpio) return null;

    const lower = limpio.toLowerCase();
    if (lower === 'presente') {
        return { clase: 'presente', texto: 'Presente' };
    }
    if (lower === 'ausente' || lower === 'falta') {
        return { clase: 'ausente', texto: 'Ausente' };
    }
    if (lower === 'sin clases' || lower === 'sin_clases') {
        return { clase: 'sin-clases', texto: 'Sin clases' };
    }

    const textoCapitalizado = limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
    return { clase: 'presente', texto: textoCapitalizado };
}

function generarCalendario2026(mesIndex) {
    if (!tituloMes || !cuerpoTabla) return;

    const anio = 2026;
    tituloMes.textContent = nombresMeses[mesIndex];
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
                    const estadoRaw = mapaAsistenciaPorFecha.get(claveFecha);
                    const infoEstado = normalizarEstadoAsistencia(estadoRaw);

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

async function cargarAsistenciaEstudiante() {
    if (!ciGuardado) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data, error } = await supabaseClient
            .from('vista_asistencia_estudiante')
            .select('*')
            .eq('ci_estudiante', filtroCi)
            .order('fecha', { ascending: true });

        if (error) {
            console.error('Error consultando vista_asistencia_estudiante:', error);
            return;
        }

        mapaAsistenciaPorFecha.clear();

        if (Array.isArray(data)) {
            for (const fila of data) {
                if (!fila.fecha) continue;
                const fechaLimpia = String(fila.fecha).split('T')[0];
                mapaAsistenciaPorFecha.set(fechaLimpia, fila.estado_asistencia);
            }
        }

        const mesActualIdx = selectMes ? parseInt(selectMes.value, 10) : 10;
        generarCalendario2026(Number.isNaN(mesActualIdx) ? 10 : mesActualIdx);
    } catch (err) {
        console.error('Error inesperado cargando asistencia del estudiante:', err);
    }
}

if (selectMes) {
    selectMes.addEventListener('change', function () {
        const mesIdx = parseInt(this.value, 10);
        generarCalendario2026(Number.isNaN(mesIdx) ? 10 : mesIdx);
    });
}

const mesInicial = selectMes ? parseInt(selectMes.value, 10) : 10;
generarCalendario2026(Number.isNaN(mesInicial) ? 10 : mesInicial);
cargarAsistenciaEstudiante();