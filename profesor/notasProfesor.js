const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

// Cliente de Supabase independiente para notas del profesor
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

// --- RENDERIZADO DE CLASES PARA NOTAS ---
const listaClasesEl = document.querySelector('.lista-clases');

function capitalizarTurno(turno) {
    const limpio = (turno || '').trim();
    if (!limpio) return 'Sin turno';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function renderizarClasesNotas(clases) {
    if (!listaClasesEl) return;

    if (!Array.isArray(clases) || clases.length === 0) {
        listaClasesEl.innerHTML = `
            <div class="tarjeta-clase">
                <div class="info-clase">
                    <span class="materia-nombre">Sin clases asignadas</span>
                    <div class="detalles-curso">
                        <span class="etiqueta-info">No se encontraron materias o cursos para este profesor</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    listaClasesEl.innerHTML = clases
        .map((clase) => {
            const materia = clase.materia || 'Sin materia';
            const curso = clase.curso_etiqueta || `${clase.nivel || ''}° ${clase.paralelo || ''}`.trim() || 'Sin curso';
            const turno = capitalizarTurno(clase.turno);
            const idAsignacion = encodeURIComponent(clase.id_asignacion_docente ?? '');
            const idCurso = encodeURIComponent(clase.id_curso ?? '');
            const idMateria = encodeURIComponent(clase.id_materia ?? '');
            const gestion = encodeURIComponent(clase.gestion ?? '');

            const params = `asignacion=${idAsignacion}&curso=${idCurso}&materia=${idMateria}&gestion=${gestion}&nombreMateria=${encodeURIComponent(materia)}&nombreCurso=${encodeURIComponent(curso)}&turno=${encodeURIComponent(turno)}`;

            return `
                <div class="tarjeta-clase">
                    <div class="info-clase">
                        <span class="materia-nombre">${materia}</span>
                        <div class="detalles-curso">
                            <span class="etiqueta-info">Curso: ${curso}</span>
                            <span class="etiqueta-info">Turno: ${turno}</span>
                        </div>
                    </div>
                    <div class="acciones-clase">
                        <a href="ver_notas_profesor.html?${params}" class="btn-accion btn-ver">Ver</a>
                        <a href="registrar_notas_profesor.html?${params}" class="btn-accion btn-registrar">Registrar</a>
                    </div>
                </div>
            `;
        })
        .join('');
}

async function cargarClasesNotas() {
    if (!ciGuardado || !listaClasesEl) return;

    listaClasesEl.innerHTML = `
        <div class="tarjeta-clase">
            <div class="info-clase">
                <span class="materia-nombre">Cargando clases...</span>
            </div>
        </div>
    `;

    try {
        const ciNumerico = Number(ciGuardado);
        const filtroCi = Number.isNaN(ciNumerico) ? ciGuardado : ciNumerico;

        const { data, error } = await supabaseClient
            .from('vista_clases_notas_profesor')
            .select('id_asignacion_docente, id_profesor, ci_persona, id_materia, materia, id_curso, turno, grado, nivel, paralelo, curso_etiqueta, gestion')
            .eq('ci_persona', filtroCi)
            .order('id_asignacion_docente', { ascending: true });

        if (error) {
            console.error('Error consultando vista_clases_notas_profesor:', error);
            listaClasesEl.innerHTML = `
                <div class="tarjeta-clase">
                    <div class="info-clase">
                        <span class="materia-nombre">Error al cargar las clases</span>
                        <div class="detalles-curso">
                            <span class="etiqueta-info">Intenta recargar la página</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        renderizarClasesNotas(data || []);
    } catch (err) {
        console.error('Error inesperado cargando clases de notas:', err);
    }
}

cargarClasesNotas();