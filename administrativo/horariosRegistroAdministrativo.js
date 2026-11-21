const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_HORARIOS_SAN_PEDRO = 'horariosSanPedro';

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

// --- BLOQUES HORARIOS POR TURNO ---
const bloquesPorTurno = {
    mañana: [
        { id: 0, periodo: 1, hora: '8:00 a 9:00', tipo: 'clase' },
        { id: 1, periodo: 2, hora: '9:00 a 10:00', tipo: 'clase' },
        { id: 2, periodo: null, hora: '10:00 a 10:15', tipo: 'recreo', texto: 'RECREO' },
        { id: 3, periodo: 3, hora: '10:15 a 11:15', tipo: 'clase' },
        { id: 4, periodo: 4, hora: '11:15 a 12:15', tipo: 'clase' }
    ],
    tarde: [
        { id: 0, periodo: 1, hora: '1:30 a 2:30', tipo: 'clase' },
        { id: 1, periodo: 2, hora: '2:30 a 3:30', tipo: 'clase' },
        { id: 2, periodo: null, hora: '3:30 a 3:45', tipo: 'recreo', texto: 'RECREO' },
        { id: 3, periodo: 3, hora: '3:45 a 4:45', tipo: 'clase' },
        { id: 4, periodo: 4, hora: '4:45 a 5:45', tipo: 'clase' }
    ]
};

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const materiasPorDefecto = [
    'Matemáticas',
    'Lenguaje',
    'Física',
    'Química',
    'Biología',
    'Sociales',
    'Inglés',
    'Artes Plásticas',
    'Música',
    'Educación Física',
    'Informática',
    'Religión'
];

// Catálogos desde Supabase
let catalogoMaterias = materiasPorDefecto.map((nombre) => ({ id: null, nombre }));
let catalogoDocentes = [];

// --- ESTADO DE SELECCIÓN ---
const estadoCurso = {
    curso: '1',
    paralelo: 'A',
    turno: 'mañana',
    grado: 'Primaria'
};

let horariosGuardados = {};
try {
    horariosGuardados = JSON.parse(localStorage.getItem(CACHE_HORARIOS_SAN_PEDRO) || '{}');
} catch (_) {
    horariosGuardados = {};
}

let horarioActual = {};
let celdaActiva = null; // { filaId, periodo, diaIndex, horaTexto, diaNombre }
let materiaSeleccionada = null; // { id, nombre }
let docenteSeleccionado = null; // { id, nombre }

function obtenerClaveCurso() {
    return `${estadoCurso.curso}_${estadoCurso.paralelo}_${estadoCurso.turno}_${estadoCurso.grado}`;
}

function actualizarTituloCuadricula() {
    const turnoTexto = estadoCurso.turno === 'mañana' ? 'Mañana' : 'Tarde';
    document.getElementById('tituloCuadricula').textContent =
        `Cuadrícula de Horario (${estadoCurso.curso}° "${estadoCurso.paralelo}" ${estadoCurso.grado} - Turno ${turnoTexto})`;
}

// --- RENDERIZAR CUADRÍCULA ---
const tbodyHorario = document.getElementById('cuerpoTablaHorario');

function renderizarCuadricula() {
    tbodyHorario.innerHTML = '';
    const bloques = bloquesPorTurno[estadoCurso.turno] || bloquesPorTurno.mañana;

    bloques.forEach((bloque) => {
        const tr = document.createElement('tr');

        if (bloque.tipo === 'recreo') {
            tr.className = 'fila-recreo';
            tr.innerHTML = `
                <td class="hora">${bloque.hora}</td>
                <td colspan="5">${bloque.texto}</td>
            `;
        } else {
            const tdHora = document.createElement('td');
            tdHora.className = 'hora';
            tdHora.textContent = bloque.hora;
            tr.appendChild(tdHora);

            diasSemana.forEach((dia, diaIndex) => {
                const td = document.createElement('td');
                td.className = 'celda-clase';
                const claveCelda = `${bloque.id}-${diaIndex}`;

                if (celdaActiva && celdaActiva.filaId === bloque.id && celdaActiva.diaIndex === diaIndex) {
                    td.classList.add('activa');
                }

                const datosCelda = horarioActual[claveCelda];
                if (datosCelda) {
                    td.innerHTML = `
                        <span class="celda-materia">${datosCelda.materiaNombre}</span>
                        <span class="celda-docente">${datosCelda.docenteNombre}</span>
                    `;
                } else {
                    td.innerHTML = '';
                }

                td.addEventListener('click', () => {
                    seleccionarCelda(bloque.id, bloque.periodo, diaIndex, bloque.hora, dia);
                });

                tr.appendChild(td);
            });
        }

        tbodyHorario.appendChild(tr);
    });
}

// --- SELECCIONAR CASILLA DE LA CUADRÍCULA ---
function seleccionarCelda(filaId, periodo, diaIndex, horaTexto, diaNombre) {
    celdaActiva = { filaId, periodo, diaIndex, horaTexto, diaNombre };
    const claveCelda = `${filaId}-${diaIndex}`;
    const datosExistentes = horarioActual[claveCelda];

    if (datosExistentes) {
        materiaSeleccionada = {
            id: datosExistentes.materiaId ?? null,
            nombre: datosExistentes.materiaNombre
        };
        docenteSeleccionado = {
            id: datosExistentes.docenteId ?? null,
            nombre: datosExistentes.docenteNombre
        };
    } else {
        materiaSeleccionada = null;
        docenteSeleccionado = null;
    }

    document.getElementById('infoCeldaSeleccionada').textContent =
        `Bloque seleccionado: ${diaNombre} (${horaTexto} - Periodo ${periodo})`;

    document.getElementById('placeholderAsignacion').style.display = 'none';
    document.getElementById('formAsignacion').classList.add('visible');
    document.getElementById('alertaCasilla').style.display = 'none';

    renderizarSelectoresFormulario();
    renderizarCuadricula();
}

// --- RENDERIZAR BOTONES DE MATERIAS Y DOCENTES ---
function renderizarSelectoresFormulario() {
    const contenedorMaterias = document.getElementById('listaMaterias');
    const contenedorDocentes = document.getElementById('listaDocentes');

    contenedorMaterias.innerHTML = '';
    catalogoMaterias.forEach((mat) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const estaSel = materiaSeleccionada && materiaSeleccionada.nombre === mat.nombre;
        btn.className = 'btn-selector-item' + (estaSel ? ' seleccionado' : '');
        btn.textContent = mat.nombre;
        btn.addEventListener('click', () => {
            materiaSeleccionada = { id: mat.id, nombre: mat.nombre };
            renderizarSelectoresFormulario();
        });
        contenedorMaterias.appendChild(btn);
    });

    contenedorDocentes.innerHTML = '';
    if (catalogoDocentes.length === 0) {
        contenedorDocentes.innerHTML = '<span style="font-size:12px;color:#64748b;">No hay profesores registrados.</span>';
    } else {
        catalogoDocentes.forEach((doc) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const estaSel = docenteSeleccionado && docenteSeleccionado.id === doc.id;
            btn.className = 'btn-selector-item' + (estaSel ? ' seleccionado' : '');
            btn.textContent = doc.nombre;
            btn.addEventListener('click', () => {
                docenteSeleccionado = { id: doc.id, nombre: doc.nombre };
                renderizarSelectoresFormulario();
            });
            contenedorDocentes.appendChild(btn);
        });
    }
}

// --- CARGAR CATÁLOGOS Y HORARIO DESDE SUPABASE ---
async function cargarCatalogosSupabase() {
    try {
        const [{ data: materiasBD }, { data: profesoresBD }] = await Promise.all([
            supabaseClient.from('materia').select('id, nombre').order('nombre'),
            supabaseClient.from('profesor').select('id, ci_persona, especialidad')
        ]);

        if (materiasBD && materiasBD.length > 0) {
            catalogoMaterias = materiasBD.map((m) => ({ id: m.id, nombre: m.nombre }));
        }

        if (profesoresBD && profesoresBD.length > 0) {
            const cis = Array.from(new Set(profesoresBD.map((p) => p.ci_persona).filter(Boolean)));
            const mapaPersonas = new Map();

            if (cis.length > 0) {
                const { data: personasBD } = await supabaseClient
                    .from('persona')
                    .select('ci, nombres, apellidos')
                    .in('ci', cis);

                (personasBD || []).forEach((per) => {
                    mapaPersonas.set(per.ci, per);
                });
            }

            catalogoDocentes = profesoresBD.map((p) => {
                const per = mapaPersonas.get(p.ci_persona);
                const nombreCompleto = per
                    ? `${per.nombres || ''} ${per.apellidos || ''}`.trim()
                    : `CI ${p.ci_persona}`;
                return {
                    id: p.id,
                    nombre: `Prof. ${nombreCompleto}`
                };
            });
        }

        if (celdaActiva) {
            renderizarSelectoresFormulario();
        }
    } catch (err) {
        console.error('Error cargando materias y profesores:', err);
    }
}

async function buscarCursoEnBD() {
    const variantesTurno = Array.from(new Set([
        estadoCurso.turno,
        estadoCurso.turno.toLowerCase(),
        estadoCurso.turno.charAt(0).toUpperCase() + estadoCurso.turno.slice(1).toLowerCase()
    ]));

    const variantesGrado = Array.from(new Set([
        estadoCurso.grado,
        estadoCurso.grado.toLowerCase(),
        estadoCurso.grado.charAt(0).toUpperCase() + estadoCurso.grado.slice(1).toLowerCase()
    ]));

    const { data: cursos, error } = await supabaseClient
        .from('curso')
        .select('id, turno, grado, nivel, paralelo')
        .in('turno', variantesTurno)
        .in('grado', variantesGrado)
        .eq('nivel', String(estadoCurso.curso))
        .eq('paralelo', String(estadoCurso.paralelo).toUpperCase());

    if (error || !cursos || cursos.length === 0) {
        return null;
    }
    return cursos[0];
}

async function cargarHorarioDeCurso() {
    const clave = obtenerClaveCurso();
    horarioActual = horariosGuardados[clave]
        ? JSON.parse(JSON.stringify(horariosGuardados[clave]))
        : {};

    celdaActiva = null;
    document.getElementById('formAsignacion').classList.remove('visible');
    document.getElementById('placeholderAsignacion').style.display = 'block';
    document.getElementById('alertaCasilla').style.display = 'none';
    document.getElementById('alertaCurso').style.display = 'none';

    actualizarTituloCuadricula();
    renderizarCuadricula();

    try {
        const cursoBD = await buscarCursoEnBD();
        if (!cursoBD) return;

        const { data: horariosBD } = await supabaseClient
            .from('horario')
            .select('id, id_curso, id_asignacion_docente, dia_semana, periodo')
            .eq('id_curso', cursoBD.id);

        if (!horariosBD || horariosBD.length === 0) return;

        const asigIds = Array.from(new Set(horariosBD.map((h) => h.id_asignacion_docente).filter(Boolean)));
        const { data: asignacionesBD } = await supabaseClient
            .from('asignacion_docente')
            .select('id, id_profesor, id_materia')
            .in('id', asigIds);

        const mapaAsig = new Map((asignacionesBD || []).map((a) => [a.id, a]));
        const mapaMat = new Map(catalogoMaterias.map((m) => [m.id, m.nombre]));
        const mapaDoc = new Map(catalogoDocentes.map((d) => [d.id, d.nombre]));

        const bloques = bloquesPorTurno[estadoCurso.turno] || bloquesPorTurno.mañana;
        const reconstruido = {};

        horariosBD.forEach((h) => {
            const bloque = bloques.find((b) => b.tipo === 'clase' && b.periodo === Number(h.periodo));
            const diaIdx = diasSemana.findIndex(
                (d) => d.toLowerCase() === String(h.dia_semana || '').trim().toLowerCase()
            );
            if (!bloque || diaIdx === -1) return;

            const asig = mapaAsig.get(h.id_asignacion_docente);
            const matId = asig?.id_materia ?? null;
            const docId = asig?.id_profesor ?? null;

            reconstruido[`${bloque.id}-${diaIdx}`] = {
                periodo: bloque.periodo,
                diaNombre: diasSemana[diaIdx],
                materiaId: matId,
                materiaNombre: mapaMat.get(matId) || 'Materia',
                docenteId: docId,
                docenteNombre: mapaDoc.get(docId) || 'Docente'
            };
        });

        if (Object.keys(reconstruido).length > 0) {
            horarioActual = reconstruido;
            renderizarCuadricula();
        }
    } catch (err) {
        console.error('Error cargando horario del curso desde Supabase:', err);
    }
}

// --- GUARDAR ASIGNACIÓN EN LA CASILLA ---
const formAsignacion = document.getElementById('formAsignacion');
const alertaCasilla = document.getElementById('alertaCasilla');

function mostrarAlerta(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.style.display = 'block';
    elemento.className = tipo === 'error'
        ? 'mensaje-alerta alerta-error'
        : 'mensaje-alerta alerta-exito';
}

formAsignacion.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!celdaActiva) {
        mostrarAlerta(alertaCasilla, 'Seleccione primero una casilla de la cuadrícula.', 'error');
        return;
    }

    if (!materiaSeleccionada) {
        mostrarAlerta(alertaCasilla, 'Seleccione una materia antes de guardar.', 'error');
        return;
    }

    if (!docenteSeleccionado) {
        mostrarAlerta(alertaCasilla, 'Seleccione un docente antes de guardar.', 'error');
        return;
    }

    const claveCelda = `${celdaActiva.filaId}-${celdaActiva.diaIndex}`;
    horarioActual[claveCelda] = {
        periodo: celdaActiva.periodo,
        diaNombre: celdaActiva.diaNombre,
        materiaId: materiaSeleccionada.id,
        materiaNombre: materiaSeleccionada.nombre,
        docenteId: docenteSeleccionado.id,
        docenteNombre: docenteSeleccionado.nombre
    };

    renderizarCuadricula();
    mostrarAlerta(
        alertaCasilla,
        `Guardado: ${materiaSeleccionada.nombre} (${docenteSeleccionado.nombre}) el ${celdaActiva.diaNombre} de ${celdaActiva.horaTexto}.`,
        'exito'
    );
});

// --- EVENTOS DE BOTONES SUPERIORES ---
document.querySelectorAll('.grupo-botones').forEach((grupo) => {
    const filtro = grupo.dataset.filtro;
    const botones = grupo.querySelectorAll('.btn-opcion');

    botones.forEach((boton) => {
        boton.addEventListener('click', () => {
            botones.forEach((b) => b.classList.remove('seleccionado'));
            boton.classList.add('seleccionado');
            estadoCurso[filtro] = boton.dataset.valor;
            cargarHorarioDeCurso();
        });
    });
});

// --- GUARDAR HORARIO COMPLETO DEL CURSO EN SUPABASE ---
const btnGuardarHorarioCurso = document.getElementById('btnGuardarHorarioCurso');
const alertaCurso = document.getElementById('alertaCurso');

async function asegurarIdMateria(materiaObj) {
    if (materiaObj.id) return materiaObj.id;

    const { data: existente } = await supabaseClient
        .from('materia')
        .select('id')
        .ilike('nombre', materiaObj.nombre)
        .maybeSingle();

    if (existente?.id) return existente.id;

    const { data: insertada, error } = await supabaseClient
        .from('materia')
        .insert({ nombre: materiaObj.nombre })
        .select('id')
        .single();

    if (error || !insertada) {
        throw new Error(`No se pudo obtener/crear la materia "${materiaObj.nombre}".`);
    }
    return insertada.id;
}

async function asegurarAsignacionDocente(idProfesor, idMateria, idCurso, gestion) {
    if (!idProfesor) {
        throw new Error('Seleccione un docente registrado en la base de datos.');
    }

    const { data: existente } = await supabaseClient
        .from('asignacion_docente')
        .select('id')
        .eq('id_profesor', idProfesor)
        .eq('id_materia', idMateria)
        .eq('id_curso', idCurso)
        .eq('gestion', gestion)
        .maybeSingle();

    if (existente?.id) return existente.id;

    const { data: insertada, error } = await supabaseClient
        .from('asignacion_docente')
        .insert({
            id_profesor: idProfesor,
            id_materia: idMateria,
            id_curso: idCurso,
            gestion
        })
        .select('id')
        .single();

    if (error || !insertada) {
        throw new Error(error?.message || 'No se pudo crear la asignación docente.');
    }
    return insertada.id;
}

if (verificarSesionAdmin()) {
    btnGuardarHorarioCurso.addEventListener('click', async function () {
        const entradas = Object.values(horarioActual);

        if (entradas.length === 0) {
            mostrarAlerta(
                alertaCurso,
                'No se puede guardar un horario vacío. Asigne al menos una materia en la cuadrícula.',
                'error'
            );
            return;
        }

        btnGuardarHorarioCurso.disabled = true;
        btnGuardarHorarioCurso.textContent = 'Guardando...';
        alertaCurso.style.display = 'none';

        try {
            const cursoBD = await buscarCursoEnBD();
            if (!cursoBD) {
                mostrarAlerta(
                    alertaCurso,
                    `No existe el curso ${estadoCurso.curso}° "${estadoCurso.paralelo}" de ${estadoCurso.grado} (${estadoCurso.turno}) en la tabla curso.`,
                    'error'
                );
                return;
            }

            const gestionActual = new Date().getFullYear();

            for (const item of entradas) {
                const idMateria = await asegurarIdMateria({
                    id: item.materiaId,
                    nombre: item.materiaNombre
                });
                const idAsignacion = await asegurarAsignacionDocente(
                    item.docenteId,
                    idMateria,
                    cursoBD.id,
                    gestionActual
                );

                const { data: horarioExistente } = await supabaseClient
                    .from('horario')
                    .select('id')
                    .eq('id_curso', cursoBD.id)
                    .eq('dia_semana', item.diaNombre)
                    .eq('periodo', item.periodo)
                    .maybeSingle();

                if (horarioExistente?.id) {
                    const { error: updError } = await supabaseClient
                        .from('horario')
                        .update({ id_asignacion_docente: idAsignacion })
                        .eq('id', horarioExistente.id);

                    if (updError) throw new Error(updError.message);
                } else {
                    const { error: insError } = await supabaseClient
                        .from('horario')
                        .insert({
                            id_curso: cursoBD.id,
                            id_asignacion_docente: idAsignacion,
                            dia_semana: item.diaNombre,
                            periodo: item.periodo
                        });

                    if (insError) throw new Error(insError.message);
                }
            }

            const clave = obtenerClaveCurso();
            horariosGuardados[clave] = JSON.parse(JSON.stringify(horarioActual));
            try {
                localStorage.setItem(CACHE_HORARIOS_SAN_PEDRO, JSON.stringify(horariosGuardados));
            } catch (_) {
                // Ignorar errores de caché
            }

            const turnoTexto = estadoCurso.turno === 'mañana' ? 'Mañana' : 'Tarde';
            mostrarAlerta(
                alertaCurso,
                `¡Horario del curso ${estadoCurso.curso}° "${estadoCurso.paralelo}" de ${estadoCurso.grado} (Turno ${turnoTexto}) guardado correctamente en Supabase!`,
                'exito'
            );
        } catch (err) {
            console.error('Error guardando horario:', err);
            mostrarAlerta(alertaCurso, `Error al guardar el horario: ${err.message}`, 'error');
        } finally {
            btnGuardarHorarioCurso.disabled = false;
            btnGuardarHorarioCurso.textContent = 'Guardar Horario del Curso';
        }
    });

    (async () => {
        await cargarCatalogosSupabase();
        await cargarHorarioDeCurso();
    })();
}