const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para horario del estudiante
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

// --- TABLA DE HORARIO ---
const tbodyHorario = document.getElementById('cuerpo-tabla-horario');

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const HORAS_POR_TURNO = {
    'mañana': {
        1: '8:00 a 9:00',
        2: '9:00 a 10:00',
        3: '10:15 a 11:15',
        4: '11:15 a 12:15'
    },
    'tarde': {
        1: '1:30 a 2:30',
        2: '2:30 a 3:30',
        3: '3:45 a 4:45',
        4: '4:45 a 5:45'
    }
};

function normalizarDia(dia) {
    if (!dia) return '';
    const limpio = String(dia)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (limpio.startsWith('lun')) return 'Lunes';
    if (limpio.startsWith('mar')) return 'Martes';
    if (limpio.startsWith('mie')) return 'Miércoles';
    if (limpio.startsWith('jue')) return 'Jueves';
    if (limpio.startsWith('vie')) return 'Viernes';
    return '';
}

function normalizarTurno(turno) {
    const t = String(turno || '').trim().toLowerCase();
    return t === 'mañana' || t === 'manana' ? 'mañana' : 'tarde';
}

function renderizarHorario(turnoNorm, matrizPeriodos, periodosExtras = []) {
    if (!tbodyHorario) return;

    const horas = HORAS_POR_TURNO[turnoNorm] || HORAS_POR_TURNO['tarde'];
    const recreoHora = turnoNorm === 'mañana' ? '10:00 a 10:15' : '3:30 a 3:45';

    const filasDefinidas = [
        { periodo: 1, hora: horas[1] },
        { periodo: 2, hora: horas[2] },
        { tipo: 'recreo', hora: recreoHora, texto: 'RECREO' },
        { periodo: 3, hora: horas[3] },
        { periodo: 4, hora: horas[4] }
    ];

    for (const pExtra of periodosExtras) {
        if (!filasDefinidas.some((f) => f.periodo === pExtra)) {
            filasDefinidas.push({ periodo: pExtra, hora: `Periodo ${pExtra}` });
        }
    }

    tbodyHorario.innerHTML = '';

    for (const fila of filasDefinidas) {
        const tr = document.createElement('tr');

        if (fila.tipo === 'recreo') {
            tr.className = 'fila-recreo';
            tr.innerHTML = `
                <td class="hora">${fila.hora}</td>
                <td colspan="5">${fila.texto}</td>
            `;
        } else {
            const diasMap = matrizPeriodos.get(fila.periodo) || new Map();
            const celdasDias = DIAS_SEMANA.map((dia) => {
                const materiasDia = diasMap.get(dia) || [];
                const contenido = materiasDia.length > 0 ? materiasDia.join(' / ') : '-';
                return `<td>${contenido}</td>`;
            }).join('');

            tr.innerHTML = `
                <td class="hora">${fila.hora}</td>
                ${celdasDias}
            `;
        }

        tbodyHorario.appendChild(tr);
    }
}

async function cargarHorarioEstudiante() {
    if (!ciGuardado || !tbodyHorario) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data, error } = await supabaseClient
            .from('vista_horario_estudiante')
            .select('*')
            .eq('ci_estudiante', filtroCi)
            .order('gestion', { ascending: false })
            .order('periodo', { ascending: true });

        if (error) {
            console.error('Error consultando vista_horario_estudiante:', error);
            tbodyHorario.innerHTML = `<tr><td colspan="6">No se pudo cargar el horario.</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tbodyHorario.innerHTML = `<tr><td colspan="6">Sin horario asignado.</td></tr>`;
            return;
        }

        const gestionReciente = Math.max(...data.map((r) => Number(r.gestion) || 0));
        const filasFiltradas = gestionReciente > 0
            ? data.filter((r) => Number(r.gestion) === gestionReciente)
            : data;

        const turnoNorm = normalizarTurno(filasFiltradas[0]?.turno);
        const matrizPeriodos = new Map();
        const periodosExtras = [];

        for (const fila of filasFiltradas) {
            const periodo = Number(fila.periodo);
            const diaNorm = normalizarDia(fila.dia_semana);
            const materia = String(fila.nombre_materia || '').trim();

            if (Number.isNaN(periodo) || !diaNorm || !materia) continue;

            if (![1, 2, 3, 4].includes(periodo) && !periodosExtras.includes(periodo)) {
                periodosExtras.push(periodo);
            }

            if (!matrizPeriodos.has(periodo)) {
                matrizPeriodos.set(periodo, new Map());
            }

            const diasMap = matrizPeriodos.get(periodo);
            if (!diasMap.has(diaNorm)) {
                diasMap.set(diaNorm, []);
            }

            const listaMaterias = diasMap.get(diaNorm);
            if (!listaMaterias.includes(materia)) {
                listaMaterias.push(materia);
            }
        }

        periodosExtras.sort((a, b) => a - b);
        renderizarHorario(turnoNorm, matrizPeriodos, periodosExtras);
    } catch (err) {
        console.error('Error inesperado cargando horario del estudiante:', err);
        tbodyHorario.innerHTML = `<tr><td colspan="6">Error al cargar el horario.</td></tr>`;
    }
}

cargarHorarioEstudiante();