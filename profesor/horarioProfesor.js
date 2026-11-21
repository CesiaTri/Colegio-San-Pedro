const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para horario del profesor
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
} else if (rolGuardado && rolGuardado !== 'profesor') {
    window.location.href = `../${rolGuardado}/perfil_${rolGuardado}.html`;
}

// --- CONFIGURACIÓN DE BLOQUES Y DÍAS ---
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const BLOQUES_MANANA = [
    { periodo: 1, hora: '8:00 a 9:00', tipo: 'clase' },
    { periodo: 2, hora: '9:00 a 10:00', tipo: 'clase' },
    { periodo: null, hora: '10:00 a 10:15', tipo: 'recreo', texto: 'RECREO' },
    { periodo: 3, hora: '10:15 a 11:15', tipo: 'clase' },
    { periodo: 4, hora: '11:15 a 12:15', tipo: 'clase' }
];

const BLOQUES_TARDE = [
    { periodo: 1, hora: '1:30 a 2:30', tipo: 'clase' },
    { periodo: 2, hora: '2:30 a 3:30', tipo: 'clase' },
    { periodo: null, hora: '3:30 a 3:45', tipo: 'recreo', texto: 'RECREO' },
    { periodo: 3, hora: '3:45 a 4:45', tipo: 'clase' },
    { periodo: 4, hora: '4:45 a 5:45', tipo: 'clase' }
];

function normalizarDia(dia) {
    const limpio = (dia || '').trim().toLowerCase();
    if (limpio === 'miercoles' || limpio === 'miércoles') return 'Miércoles';
    if (limpio === 'lunes') return 'Lunes';
    if (limpio === 'martes') return 'Martes';
    if (limpio === 'jueves') return 'Jueves';
    if (limpio === 'viernes') return 'Viernes';
    return dia;
}

function construirMapaHorario(filas, turnoObjetivo) {
    // Estructura: mapa[periodo][dia] = [{ materia, curso }]
    const mapa = {};
    for (const fila of filas) {
        const turnoFila = (fila.turno || '').trim().toLowerCase();
        if (turnoFila !== turnoObjetivo) continue;

        const periodo = Number(fila.periodo);
        const dia = normalizarDia(fila.dia_semana);
        if (!periodo || !DIAS_SEMANA.includes(dia)) continue;

        if (!mapa[periodo]) mapa[periodo] = {};
        if (!mapa[periodo][dia]) mapa[periodo][dia] = [];

        mapa[periodo][dia].push({
            materia: fila.materia || 'Sin materia',
            curso: fila.curso_etiqueta || `${fila.nivel || ''}° ${fila.paralelo || ''}`.trim()
        });
    }
    return mapa;
}

function renderizarTablaTurno(bloques, mapaTurno, idTbody) {
    const tbody = document.getElementById(idTbody);
    if (!tbody) return;
    tbody.innerHTML = '';

    bloques.forEach((bloque) => {
        const tr = document.createElement('tr');

        if (bloque.tipo === 'recreo') {
            tr.className = 'fila-recreo';
            tr.innerHTML = `
                <td class="hora">${bloque.hora}</td>
                <td colspan="5">${bloque.texto}</td>
            `;
            tbody.appendChild(tr);
            return;
        }

        let celdasHTML = `<td class="hora">${bloque.hora}</td>`;
        const asignacionesPeriodo = mapaTurno[bloque.periodo] || {};

        DIAS_SEMANA.forEach((dia) => {
            const clasesDia = asignacionesPeriodo[dia] || [];
            if (clasesDia.length === 0) {
                celdasHTML += `<td><span class="curso-texto">-</span></td>`;
            } else {
                const contenidoCeldas = clasesDia
                    .map(
                        (item) => `
                            <span class="materia-texto">${item.materia}</span>
                            <span class="curso-texto">${item.curso}</span>
                        `
                    )
                    .join('<br>');
                celdasHTML += `<td>${contenidoCeldas}</td>`;
            }
        });

        tr.innerHTML = celdasHTML;
        tbody.appendChild(tr);
    });
}

async function cargarHorarioProfesor() {
    if (!ciGuardado) return;

    try {
        const ciNumerico = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNumerico) ? ciGuardado : ciNumerico;

        const { data, error } = await supabaseClient
            .from('vista_horario_profesor')
            .select('id_horario, ci_persona, materia, turno, grado, nivel, paralelo, curso_etiqueta, gestion, dia_semana, periodo')
            .eq('ci_persona', filtroCi)
            .order('periodo', { ascending: true });

        if (error) {
            console.error('Error consultando vista_horario_profesor:', error);
            renderizarTablaTurno(BLOQUES_MANANA, {}, 'cuerpo-tabla-mañana');
            renderizarTablaTurno(BLOQUES_TARDE, {}, 'cuerpo-tabla-tarde');
            return;
        }

        const filas = Array.isArray(data) ? data : [];
        const mapaManana = construirMapaHorario(filas, 'mañana');
        const mapaTarde = construirMapaHorario(filas, 'tarde');

        renderizarTablaTurno(BLOQUES_MANANA, mapaManana, 'cuerpo-tabla-mañana');
        renderizarTablaTurno(BLOQUES_TARDE, mapaTarde, 'cuerpo-tabla-tarde');
    } catch (err) {
        console.error('Error inesperado cargando horario:', err);
    }
}

cargarHorarioProfesor();