const SUPABASE_URL = 'https://ysodorfyloeodalkkphn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F_Ro8XGajrgNbBdlRPaTvQ_hZHiOOhO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_RESUMEN_CONTADURIA = 'cache_resumen_contaduria_san_pedro_v1';

// --- MENÚ LATERAL Y SUBMENÚS ---
const btnAbrirMenu = document.getElementById('btnAbrirMenu');
const btnCerrarMenu = document.getElementById('btnCerrarMenu');
const menuLateral = document.getElementById('menuLateral');
const overlay = document.getElementById('overlay');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

function abrirMenu() {
    if (!menuLateral || !overlay) return;
    menuLateral.classList.add('abierto');
    overlay.classList.add('activo');
}

function cerrarMenu() {
    if (!menuLateral || !overlay) return;
    menuLateral.classList.remove('abierto');
    overlay.classList.remove('activo');
}

if (btnAbrirMenu) btnAbrirMenu.addEventListener('click', abrirMenu);
if (btnCerrarMenu) btnCerrarMenu.addEventListener('click', cerrarMenu);
if (overlay) overlay.addEventListener('click', cerrarMenu);

window.toggleSubMenu = function toggleSubMenu(idSubMenu) {
    const submenu = document.getElementById(idSubMenu);
    if (!submenu) return;
    const boton = submenu.previousElementSibling;

    submenu.classList.toggle('abierto');
    if (boton) boton.classList.toggle('activo');
};

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

// --- FORMATO Y RENDERIZADO ---
const elIngresoAnualPrevisto = document.getElementById('ingreso-anual-previsto');
const elIngresoAnualActual = document.getElementById('ingreso-anual-actual');
const elSalidasAnuales = document.getElementById('salidas-anuales');
const elMatriculasAdeudadasTotal = document.getElementById('matriculas-adeudadas-total');
const elIngresosPrevistosMes = document.getElementById('ingresos-previstos-mes');
const elSalidasPrevistasMes = document.getElementById('salidas-previstas-mes');
const contenedorMeses = document.getElementById('contenedor-meses');

function formatearBs(valor) {
    const num = Number(valor) || 0;
    return `Bs. ${num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function renderizarResumen(resumen) {
    if (!resumen) return;

    if (elIngresoAnualPrevisto) {
        elIngresoAnualPrevisto.textContent = formatearBs(resumen.ingresoAnualPrevisto);
    }
    if (elIngresoAnualActual) {
        elIngresoAnualActual.textContent = formatearBs(resumen.ingresoAnualActual);
    }
    if (elSalidasAnuales) {
        elSalidasAnuales.textContent = formatearBs(resumen.salidasAnuales);
    }
    if (elMatriculasAdeudadasTotal) {
        elMatriculasAdeudadasTotal.textContent = formatearBs(resumen.matriculasAdeudadasTotal);
    }
    if (elIngresosPrevistosMes) {
        elIngresosPrevistosMes.textContent = formatearBs(resumen.ingresosPrevistosMes);
    }
    if (elSalidasPrevistasMes) {
        elSalidasPrevistasMes.textContent = formatearBs(resumen.salidasPrevistasMes);
    }

    if (contenedorMeses) {
        contenedorMeses.innerHTML = '';
        (resumen.meses || []).forEach((item) => {
            const tarjetaMes = document.createElement('div');
            tarjetaMes.className = 'panel-mes';
            tarjetaMes.innerHTML = `
                <h3 class="titulo-mes">${item.mes}</h3>
                <div class="sub-paneles-mes">
                    <div class="sub-panel-mes sub-ingreso-actual">
                        <span class="panel-titulo">Ingresos actual</span>
                        <span class="panel-numero ingreso-actual">${formatearBs(item.ingresosActual)}</span>
                    </div>
                    <div class="sub-panel-mes sub-deuda">
                        <span class="panel-titulo">Matriculas adeudadas</span>
                        <span class="panel-numero deuda">${formatearBs(item.matriculasAdeudadas)}</span>
                    </div>
                </div>
            `;
            contenedorMeses.appendChild(tarjetaMes);
        });
    }
}

async function cargarResumenContaduria() {
    try {
        const cached = localStorage.getItem(CACHE_RESUMEN_CONTADURIA);
        if (cached) {
            renderizarResumen(JSON.parse(cached));
        }
    } catch (_) {
        // Ignorar errores de caché
    }

    try {
        const { data: filasVista, error } = await supabaseClient
            .from('vista_resumen_contaduria_administrativo')
            .select('gestion, indice_curso, mes, ingreso_anual_previsto, ingreso_anual_actual, salidas_anuales, matriculas_adeudadas_total, ingresos_previstos_mes, salidas_previstas_mes, ingresos_actual, matriculas_adeudadas')
            .order('indice_curso', { ascending: true });

        if (error) {
            console.error('Error cargando vista de resumen de contaduría:', error);
            return;
        }

        if (!filasVista || filasVista.length === 0) {
            return;
        }

        const primera = filasVista[0];
        const resumenCalculado = {
            gestion: primera.gestion,
            ingresoAnualPrevisto: Number(primera.ingreso_anual_previsto) || 0,
            ingresoAnualActual: Number(primera.ingreso_anual_actual) || 0,
            salidasAnuales: Number(primera.salidas_anuales) || 0,
            matriculasAdeudadasTotal: Number(primera.matriculas_adeudadas_total) || 0,
            ingresosPrevistosMes: Number(primera.ingresos_previstos_mes) || 0,
            salidasPrevistasMes: Number(primera.salidas_previstas_mes) || 0,
            meses: filasVista.map((fila) => ({
                mes: fila.mes,
                ingresosActual: Number(fila.ingresos_actual) || 0,
                matriculasAdeudadas: Number(fila.matriculas_adeudadas) || 0
            }))
        };

        renderizarResumen(resumenCalculado);

        try {
            localStorage.setItem(CACHE_RESUMEN_CONTADURIA, JSON.stringify(resumenCalculado));
        } catch (_) {
            // Ignorar errores de caché
        }
    } catch (err) {
        console.error('Error inesperado cargando resumen de contaduría:', err);
    }
}

if (verificarSesionAdmin()) {
    cargarResumenContaduria();
}