export default {
  nombreCompleto: 'Ingeniería Bioquímica',
  departamento: 'Departamento Química, Bioquímica y Ambiental',
  color: '#2E7D32', // cs.primary
  iconoFondo: '🧬',

  cardsResumen: [
    { icono: '🚩', titulo: 'Misión', color: '#2E7D32',
      contenido: 'Formar profesionistas en ingeniería bioquímica con una preparación científica-tecnológica y una conciencia social que contribuya al desarrollo sustentable y a la calidad de vida del ser humano.' },
    { icono: '👁️', titulo: 'Visión', color: '#00838F',
      contenido: 'Ser un programa de ingeniería bioquímica reconocido por la calidad científica, tecnológica y humana de sus egresados, que impulsen el desarrollo sustentable.' },
  ],

  objetivoGeneral: 'Formar profesionales íntegros en la Ingeniería Bioquímica competentes para trabajar en equipos multidisciplinarios y multiculturales que, con sentido ético, crítico, creativo, emprendedor y actitud de liderazgo, diseñe, controlen, simulen y optimicen equipos, procesos y tecnologías sustentables que utilicen recursos bióticos y sus derivados, para la producción de bienes y servicios que contribuyan a elevar el nivel de vida de la sociedad.',

  objetivosEspecificos: [
    [1, 'Trabajo en Equipo', 'Trabaja en equipos interdisciplinarios y multiculturales, con liderazgo, sentido crítico, disposición al cambio y comprometido con la calidad.'],
    [2, 'Diseño de Procesos', 'Diseña y selecciona equipos y procesos para el aprovechamiento sustentable de los recursos bióticos.'],
    [3, 'Tecnologías Emergentes', 'Identifica y aplica tecnologías emergentes relacionadas con su campo de acción del Ingeniero Bioquímico para la mejora de procesos existentes.'],
    [4, 'Gestión de Calidad', 'Participa en el diseño y la aplicación de normas y programas para la gestión y aseguramiento de la calidad, en empresas e instituciones del ámbito de la Ingeniería Bioquímica.'],
    [5, 'Actualización', 'Actualiza sus conocimientos permanentemente para responder a los cambios globales.'],
    [6, 'Investigación', 'Participa en proyectos de investigación científica y tecnológica en el campo de la Ingeniería Bioquímica para contribuir al desarrollo de la sociedad.'],
    [7, 'Emprendimiento', 'Crea y administra empresas productoras de bienes y servicios para satisfacer necesidades en el campo de aplicación de la Ingeniería Bioquímica.'],
  ],

  colorIngreso: '#5E35B1',
  perfilIngreso: [
    'Habilidades en las áreas de Matemáticas, Química, Física y Biología, utilizando la observación, el análisis, la síntesis (creatividad) y la evaluación (juicio crítico).',
    'Capacidad para expresarse correctamente en forma oral y escrita.',
    'Pensamiento analítico, objetivo, crítico, sintético y destreza manual.',
    'Habilidades para realizar trabajo en equipo.',
  ],

  colorEgreso: '#00838F',
  perfilEgreso: [
    'Ejerce su profesión para resolver problemas en su ámbito, trabajando en equipos interdisciplinarios y multiculturales, con liderazgo, sentido crítico, disposición al cambio y comprometido con la calidad.',
    'Diseña y selecciona equipos y procesos para el aprovechamiento sustentable de los recursos bióticos.',
    'Identifica y aplica tecnologías emergentes relacionadas con su campo de acción del Ingeniero Bioquímico para la mejora de procesos existentes.',
    'Participa en el diseño y la aplicación de normas y programas para la gestión y aseguramiento de la calidad, en empresas e instituciones del ámbito de la Ingeniería Bioquímica.',
    'Formula y evalúa proyectos de Ingeniería Bioquímica para coadyuvar al desarrollo regional con criterios de sustentabilidad.',
    'Participa en proyectos de investigación científica y tecnológica en el campo de la Ingeniería Bioquímica para contribuir al desarrollo de la sociedad.',
    'Crea y administra empresas productoras de bienes y servicios para satisfacer necesidades en el campo de aplicación de la Ingeniería Bioquímica.',
  ],

  reticulasTitulo: 'Retícula 2010-207',
  reticulas: [
    { clave: 'IBQA-2010-207E', nombre: 'Retícula 2010', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/IBQA/IBQA-2010-207E.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingbioquimica/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-AC006.pdf` },
        { nombre: 'Cálculo Diferencial', url: `${base}/1semestre/CalculoDiferencial-AC001.pdf` },
        { nombre: 'Química', url: `${base}/1semestre/Quimica-AE057.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-AC007.pdf` },
        { nombre: 'Comportamiento Organizacional', url: `${base}/1semestre/ComportamientoOrganizacional.pdf` },
        { nombre: 'Dibujo Asistido por Computadora', url: `${base}/1semestre/DibujoAsistidoporComputadora-AE012.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Administración y Legislación de Empresas', url: `${base}/2semestre/AdministracionyLegislacionEmpresas.pdf` },
        { nombre: 'Cálculo Integral', url: `${base}/2semestre/CalculoIntegral-AC002.pdf` },
        { nombre: 'Química Orgánica I', url: `${base}/2semestre/Qu%C3%ADmicaOrganica_I.pdf` },
        { nombre: 'Biología', url: `${base}/2semestre/Biologia-AE005.pdf` },
        { nombre: 'Química Analítica', url: `${base}/2semestre/QuimicaAnalitica.pdf` },
        { nombre: 'Álgebra Lineal', url: `${base}/2semestre/AlgebraLineal-AC003.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Cálculo Vectorial', url: `${base}/3semestre/CalculoVectorial-AC004.pdf` },
        { nombre: 'Ecuaciones Diferenciales', url: `${base}/3semestre/EcuacionesDiferenciales-AC005.pdf` },
        { nombre: 'Química Orgánica II', url: `${base}/3semestre/QuimicaOrganica-II.pdf` },
        { nombre: 'Termodinámica', url: `${base}/3semestre/Termodinamica-AE065.pdf` },
        { nombre: 'Física', url: `${base}/3semestre/Fisica.pdf` },
        { nombre: 'Estadística', url: `${base}/3semestre/Estadistica.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Programación y Métodos Numéricos', url: `${base}/4semestre/ProgramacionyMetodosNumericos.pdf` },
        { nombre: 'Electromagnetismo', url: `${base}/4semestre/Electromagnetismo-AE020.pdf` },
        { nombre: 'Bioquímica', url: `${base}/4semestre/Bioquimica-AE007.pdf` },
        { nombre: 'Balance de Materia y Energía', url: `${base}/4semestre/BalancedeMateriayEnergia-AE004.pdf` },
        { nombre: 'Análisis Instrumental', url: `${base}/4semestre/AnalisisInstrumental.pdf` },
        { nombre: 'Aseguramiento de la Calidad', url: `${base}/4semestre/AseguramientodelaCalidad.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Ingeniería Económica', url: `${base}/5semestre/IngenieriaEconomica.pdf` },
        { nombre: 'Fenómenos de Transporte I', url: `${base}/5semestre/FenomenosdeTransporte-I.pdf` },
        { nombre: 'Bioquímica del Nitrógeno y Regulación Genética', url: `${base}/5semestre/BioquimicadelNitrogenoyRegulacionGenetica.pdf` },
        { nombre: 'Fisicoquímica', url: `${base}/5semestre/Fisicoquimica.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/5semestre/DesarrolloSustentable-AC008.pdf` },
        { nombre: 'Instrumentación y Control', url: `${base}/5semestre/InstrumentacionyControl-AE039.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Operaciones Unitarias I', url: `${base}/6semestre/OperacionesUnitarias-I.pdf` },
        { nombre: 'Fenómenos de Transporte II', url: `${base}/6semestre/FenomenosdeTransporte-II.pdf` },
        { nombre: 'Microbiología', url: `${base}/6semestre/Microbiologia-AE050.pdf` },
        { nombre: 'Seguridad e Higiene', url: `${base}/6semestre/SeguridadeHigiene.pdf` },
        { nombre: 'Cinética Química y Biológica', url: `${base}/6semestre/Cineticaqumicaybiologica.pdf` },
        { nombre: 'Taller de Investigación I', url: `${base}/6semestre/TallerdeInvestigacion-I-AC009.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Taller de Investigación II', url: `${base}/7semestre/TallerdeInvestigacion-II-AC010.pdf` },
        { nombre: 'Operaciones Unitarias II', url: `${base}/7semestre/OperacionesUnitarias-II.pdf` },
        { nombre: 'Operaciones Unitarias III', url: `${base}/7semestre/OperacionesUnitarias-III.pdf` },
        { nombre: 'Ingeniería de Biorreactores', url: `${base}/7semestre/IngenieriadeBiorreactores.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Ingeniería de Proyectos', url: `${base}/8semestre/IngenieriadeProyectos.pdf` },
        { nombre: 'Ingeniería y Gestión Ambiental', url: `${base}/8semestre/IngenieriayGestionAmbiental.pdf` },
        { nombre: 'Ingeniería de Procesos', url: `${base}/8semestre/IngenieriadeProcesos.pdf` },
      ]},
      { numero: 9, materias: [
        { nombre: 'Formulación y Evaluación de Proyectos', url: `${base}/9semestre/FormulacionyEvaluaciondeProyectos-AE029.pdf` },
        { nombre: 'Residencia Profesional', url: '' },
        { nombre: 'Servicio Social', url: '' },
        { nombre: 'Actividades Complementarias', url: '' },
      ]},
    ];
  })(),

  especialidades: [
    {
      nombre: 'Ciencias de los Alimentos (Plan IBQA-2010-207)',
      icono: '🍽️',
      color: '#2E7D32',
      materias: (() => {
        const esp = 'https://villahermosa.tecnm.mx/docs/oferta/ingbioquimica/especialidad';
        return [
          { nombre: 'Análisis de Alimentos', url: `${esp}/Analisisdealimentos.pdf` },
          { nombre: 'Biotecnología Alimentaria', url: `${esp}/Biotecnologiaalimentaria.pdf` },
          { nombre: 'Desarrollo e Innovación de Productos', url: `${esp}/Desarrolloeinnovaciondeproductos.pdf` },
          { nombre: 'Ingeniería de Alimentos', url: `${esp}/IngenieriadeAlimentos.pdf` },
          { nombre: 'Química de Alimentos', url: `${esp}/Quimicadealimentos.pdf` },
          { nombre: 'Tecnología de Alimentos', url: `${esp}/TecnologiadeAlimentos.pdf` },
        ];
      })(),
    },
  ],
};