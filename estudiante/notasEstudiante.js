const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para notas del estudiante
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

// --- ELEMENTOS DE NOTAS ---
const infoEstudianteEl = document.getElementById('info-estudiante');
const infoCursoEl = document.getElementById('info-curso');
const infoTurnoEl = document.getElementById('info-turno');
const tbodyNotas = document.getElementById('cuerpo-tabla-notas');

function formatearTurno(turno) {
    if (!turno) return '-';
    const limpio = String(turno).trim().toLowerCase();
    if (!limpio) return '-';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function formatearGrado(grado) {
    if (!grado) return '';
    const limpio = String(grado).trim().toLowerCase();
    if (!limpio) return '';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function formatearPuntaje(valor) {
    if (valor === null || valor === undefined || valor === '') return '-';
    const num = Number(valor);
    if (Number.isNaN(num)) return String(valor);
    return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

async function cargarNotasEstudiante() {
    if (!ciGuardado || !tbodyNotas) return;

    try {
        const ciNum = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNum) ? ciGuardado : ciNum;

        const { data: notasData, error: notasErr } = await supabaseClient
            .from('vista_notas_estudiante')
            .select('*')
            .eq('ci_estudiante', filtroCi)
            .order('gestion', { ascending: false })
            .order('nombre_materia', { ascending: true })
            .order('trimestre', { ascending: true });

        if (notasErr) {
            console.error('Error consultando vista_notas_estudiante:', notasErr);
            tbodyNotas.innerHTML = `<tr><td colspan="5">No se pudieron cargar las calificaciones.</td></tr>`;
            return;
        }

        if (!notasData || notasData.length === 0) {
            if (infoEstudianteEl) infoEstudianteEl.textContent = `CI ${ciGuardado}`;
            if (infoCursoEl) infoCursoEl.textContent = '-';
            if (infoTurnoEl) infoTurnoEl.textContent = '-';
            tbodyNotas.innerHTML = `<tr><td colspan="5">Sin calificaciones registradas.</td></tr>`;
            return;
        }

        const gestionMasReciente = Math.max(
            ...notasData.map((r) => Number(r.gestion) || 0)
        );
        const filasGestion = gestionMasReciente > 0
            ? notasData.filter((r) => Number(r.gestion) === gestionMasReciente)
            : notasData;

        const primeraFila = filasGestion[0] || notasData[0];

        const nombreCompleto = (
            primeraFila.nombre_completo ||
            `${primeraFila.nombres || ''} ${primeraFila.apellidos || ''}`.trim() ||
            `CI ${ciGuardado}`
        );

        let cursoTexto = primeraFila.curso_completo || '';
        if (!cursoTexto && primeraFila.nivel && primeraFila.paralelo && primeraFila.grado) {
            cursoTexto = `${primeraFila.nivel}° "${primeraFila.paralelo}" de ${formatearGrado(primeraFila.grado)}`;
        }

        if (infoEstudianteEl) infoEstudianteEl.textContent = nombreCompleto;
        if (infoCursoEl) infoCursoEl.textContent = cursoTexto || '-';
        if (infoTurnoEl) infoTurnoEl.textContent = formatearTurno(primeraFila.turno);

        const mapaMaterias = new Map();

        for (const fila of filasGestion) {
            const claveMateria = fila.id_materia !== null && fila.id_materia !== undefined
                ? String(fila.id_materia)
                : String(fila.nombre_materia || '').trim().toLowerCase();

            if (!claveMateria) continue;

            if (!mapaMaterias.has(claveMateria)) {
                mapaMaterias.set(claveMateria, {
                    materia: fila.nombre_materia || 'Materia',
                    t1: null,
                    t2: null,
                    t3: null
                });
            }

            const registro = mapaMaterias.get(claveMateria);
            const trimestre = Number(fila.trimestre);
            const puntajeNum = Number(fila.puntaje);

            if (!Number.isNaN(puntajeNum)) {
                if (trimestre === 1) registro.t1 = puntajeNum;
                else if (trimestre === 2) registro.t2 = puntajeNum;
                else if (trimestre === 3) registro.t3 = puntajeNum;
            }
        }

        const materiasOrdenadas = Array.from(mapaMaterias.values()).sort((a, b) =>
            a.materia.localeCompare(b.materia, 'es', { sensitivity: 'base' })
        );

        tbodyNotas.innerHTML = '';

        for (const item of materiasOrdenadas) {
            const notasValidas = [item.t1, item.t2, item.t3].filter(
                (n) => n !== null && n !== undefined && !Number.isNaN(n)
            );

            let notaFinalTexto = '-';
            let notaFinalNum = null;

            if (notasValidas.length > 0) {
                const suma = notasValidas.reduce((acc, val) => acc + val, 0);
                notaFinalNum = Math.round(suma / 3);
                notaFinalTexto = String(notaFinalNum);
            }

            const tr = document.createElement('tr');
            if (notaFinalNum !== null && notaFinalNum < 51) {
                tr.classList.add('fila-reprobada');
            }

            tr.innerHTML = `
                <td>${item.materia}</td>
                <td>${formatearPuntaje(item.t1)}</td>
                <td>${formatearPuntaje(item.t2)}</td>
                <td>${formatearPuntaje(item.t3)}</td>
                <td><strong>${notaFinalTexto}</strong></td>
            `;

            tbodyNotas.appendChild(tr);
        }
    } catch (err) {
        console.error('Error inesperado cargando notas del estudiante:', err);
        tbodyNotas.innerHTML = `<tr><td colspan="5">Error al cargar las calificaciones.</td></tr>`;
    }
}

cargarNotasEstudiante();