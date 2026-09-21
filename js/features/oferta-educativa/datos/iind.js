export default {
  nombreCompleto: 'Ingeniería Industrial',
  departamento: 'Departamento de Ingeniería Industrial',
  color: '#2E7D32',
  iconoFondo: '⚙️',

  cardsResumen: [
    { icono: '🚩', titulo: 'Misión', color: '#2E7D32',
      contenido: 'Formadora de profesionales en Ingeniería Industrial en el sureste del país, capaces de desarrollar competencias instrumentales, sistémicas y actitudinales con alta responsabilidad.' },
    { icono: '👁️', titulo: 'Visión', color: '#00838F',
      contenido: 'Ser líder en ingeniería industrial en el sureste de México, formando profesionales competitivos con ética y armonía con el medio ambiente.' },
  ],

  objetivoGeneral: 'Formar profesionistas en el campo de la ingeniería industrial, líderes, creativos y emprendedores con visión sistémica, capacidad analítica y competitiva que les permita diseñar, implementar, mejorar, innovar, optimizar y administrar sistemas de producción de bienes y servicios en un entorno global, con enfoque sustentable, ético y comprometido con la sociedad.',

  objetivosEspecificos: [
    [1, 'Resolver Problemas', 'Desarrolla sistemas productivos de bienes y servicios aplicando tecnologías para su optimización.'],
    [2, 'Saber Diseñar', 'Diseña sistemas de trabajo para elevar la productividad mediante mejora continua.'],
    [3, 'Hacer Experimentos', 'Desarrolla investigación para mejorar los sistemas de trabajo y elevar la productividad.'],
    [4, 'Saber Comunicarse', 'Administra la información de los procesos de bienes y servicios para la optimización de los recursos.'],
    [5, 'Ser Ético', 'Gestiona sistemas productivos de bienes y servicios atendiendo los lineamientos legales.'],
    [6, 'Actualizarse', 'Actualiza sus conocimientos permanentemente para mejorar la competitividad de las organizaciones.'],
    [7, 'Trabajar en Equipo', 'Dirige equipos de trabajo para el desarrollo de proyectos de inversión, sociales y de transferencia de tecnología.'],
  ],

  colorIngreso: '#5E35B1',
  perfilIngreso: [
    'Capacidad de análisis, síntesis y juicio crítico.',
    'Capacidad de planeación, organización y coordinación de tareas.',
    'Liderazgo positivo, capacidad de dirección y de mando.',
    'Actitud emprendedora e interés por mejorar el entorno.',
  ],

  colorEgreso: '#00838F',
  perfilEgreso: [
    'Diseña, mejora e integra sistemas productivos de bienes y servicios aplicando tecnologías para su optimización.',
    'Diseña, implementa y mejora sistemas de trabajo para elevar la productividad.',
    'Implanta sistemas de calidad utilizando métodos estadísticos para mejorar la competitividad de las organizaciones.',
    'Administra sistemas de mantenimiento en procesos de bienes y servicios para la optimización en el uso de los recursos.',
    'Gestiona sistemas de seguridad y salud ocupacional de manera sustentable, atendiendo los lineamientos legales.',
    'Formula, evalúa y gestiona proyectos de inversión, sociales y de transferencia de tecnología para el desarrollo regional.',
  ],

  // _CampoLaboralSection con chips: se traduce como campoLaboral simple,
  // el estilo de chip vs bullet se resuelve en CSS (misma data, distinto look).
  campoLaboral: [
    'Sector Público', 'Sector Industrial', 'Comercio y Servicios',
    'Instituciones Educativas', 'Consultoría', 'Org. sin fines de lucro',
  ],

  reticulasTitulo: 'Retícula IIND-2010-227',
  reticulas: [
    { clave: 'IIND-2010-227', nombre: 'Retícula 2010 - IINE-CSP-2023-01 (D)', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/IIND-2010-227--IINE-CSP-2023-01.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingindustrial/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-ACC-0906.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-ACA-0907.pdf` },
        { nombre: 'Cálculo Diferencial', url: `${base}/1semestre/CalculoDiferencial-AC001.pdf` },
        { nombre: 'Taller de Herramientas Intelectuales', url: `${base}/1semestre/TALLERDEHERRAMIENTASINTELECTUALESv2.pdf` },
        { nombre: 'Química', url: `${base}/1semestre/QUIMICAv2.pdf` },
        { nombre: 'Dibujo Industrial', url: `${base}/1semestre/DIBUJOINDUSTRIALv2.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Electricidad y Electrónica Industrial', url: `${base}/2semestre/ELECTRICIDADYELECTRONICAINDUSTRIALv2.pdf` },
        { nombre: 'Propiedad de los Materiales', url: `${base}/2semestre/PROPIEDADDELOSMATERIALESv2.pdf` },
        { nombre: 'Cálculo Integral', url: `${base}/2semestre/CalculoIntegral-ACF%E2%80%930902.pdf` },
        { nombre: 'Probabilidad y Estadística', url: `${base}/2semestre/ProbabilidadyEstadistica-AEC-1053.pdf` },
        { nombre: 'Análisis de la Realidad Nacional', url: `${base}/2semestre/ANALISISDELAREALIDADNACIONALv2.pdf` },
        { nombre: 'Taller de Liderazgo', url: `${base}/2semestre/TALLERDELIDERAZGO.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Metrología y Normalización', url: `${base}/3semestre/MetrologiayNormalizacion-AEC-1048.pdf` },
        { nombre: 'Álgebra Lineal', url: `${base}/3semestre/AlgebraLineal-ACF%E2%80%930903.pdf` },
        { nombre: 'Cálculo Vectorial', url: `${base}/3semestre/CalculoVectorial-ACF%E2%80%930904.pdf` },
        { nombre: 'Economía', url: `${base}/3semestre/Economia-AEC-1018.pdf` },
        { nombre: 'Estadística Inferencial I', url: `${base}/3semestre/EstadisticaInferencial-I-AEF%E2%80%931024.pdf` },
        { nombre: 'Estudio del Trabajo I', url: `${base}/3semestre/ESTUDIODELTRABAJO-I-v2.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Procesos de Fabricación', url: `${base}/4semestre/PROCESOSDEFABRICACIONv2.pdf` },
        { nombre: 'Física', url: `${base}/4semestre/FISICAv2.pdf` },
        { nombre: 'Algoritmos y Lenguajes de Programación', url: `${base}/4semestre/ALGORITMOSYLENGUAJESDEPROGRAMACIONv2.pdf` },
        { nombre: 'Investigación de Operaciones I', url: `${base}/4semestre/INVESTIGACIONDEOPERACIONES-I-v2.pdf` },
        { nombre: 'Estadística Inferencial II', url: `${base}/4semestre/EstadisticaInferencial-II-AEF%E2%80%931025.pdf` },
        { nombre: 'Estudio del Trabajo II', url: `${base}/4semestre/ESTUDIODELTRABAJOIIv2.pdf` },
        { nombre: 'Higiene y Seguridad Industrial', url: `${base}/4semestre/HIGIENEYSEGURIDADINDUSTRIAL%20.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Administración de Proyectos', url: `${base}/5semestre/ADMINISTRACIONDEPROYECTOSv2.pdf` },
        { nombre: 'Gestión de Costos', url: `${base}/5semestre/GestiondeCostos-AE092.pdf` },
        { nombre: 'Administración de Operaciones I', url: `${base}/5semestre/ADMINISTRACIONDEOPERACIONESIv2.pdf` },
        { nombre: 'Investigación de Operaciones II', url: `${base}/5semestre/INVESTIGACIONDEOPERACIONESIIv2.pdf` },
        { nombre: 'Control Estadístico de la Calidad', url: `${base}/5semestre/CONTROLESTADISTICODELACALIDA%20v2.pdf` },
        { nombre: 'Ergonomía', url: `${base}/5semestre/ERGONOMIAv2.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/5semestre/DesarrolloSustentable-AC008.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Taller de Investigación I', url: `${base}/6semestre/TallerdeInvestigacionIAC009.pdf` },
        { nombre: 'Ingeniería Económica', url: `${base}/6semestre/IngenieriaEconomica-AE037.pdf` },
        { nombre: 'Administración de las Operaciones II', url: `${base}/6semestre/ADMINISTRACIONDEOPERACIONESIIv2.pdf` },
        { nombre: 'Simulación', url: `${base}/6semestre/SIMULACIONv2.pdf` },
        { nombre: 'Administración del Mantenimiento', url: `${base}/6semestre/ADMINISTRACIONDELMANTENIMIENTOV2.pdf` },
        { nombre: 'Mercadotecnia', url: `${base}/6semestre/Mecadotecnia-AE044.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Taller de Investigación II', url: `${base}/7semestre/TallerdeInvestigacionII-AC010.pdf` },
        { nombre: 'Planeación Financiera', url: `${base}/7semestre/PLANEACIONFINANCIERAv2.pdf` },
        { nombre: 'Planeación y Diseño de Instalaciones', url: `${base}/7semestre/PLANEACIONYDISENODEINSTALACIONESv2.pdf` },
        { nombre: 'Sistemas de Manufactura', url: `${base}/7semestre/SISTEMASDEMANUFACTURA.pdf` },
        { nombre: 'Logística y Cadenas de Suministro', url: `${base}/7semestre/LOGISTICAyCADENADESUMINISTROv2.pdf` },
        { nombre: 'Gestión de los Sistemas de Calidad', url: `${base}/7semestre/GESTIONDELOSSITEMASDECALIDADv2.pdf` },
        { nombre: 'Ingeniería de Sistemas', url: `${base}/7semestre/INGENIERIADESISTEMASv2.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Formulación y Evaluación de Proyectos', url: `${base}/8semestre/FormulacionyEvaluaciondeProyectos-AED-1030.pdf` },
        { nombre: 'Relaciones Industriales', url: `${base}/8semestre/RELACIONESINDUSTRIALESv2.pdf` },
      ]},
      { numero: 9, materias: [
        { nombre: 'Especialidad', url: '' },
        { nombre: 'Residencia Profesional', url: '' },
        { nombre: 'Servicio Social', url: '' },
        { nombre: 'Actividades Complementarias', url: '' },
      ]},
    ];
  })(),

  especialidades: [
    {
      nombre: 'Calidad, Seguridad y Productividad',
      clave: 'IINE-CSP-2023-01 (D)',
      icono: '🏅',
      color: '#00838F',
      materias: (() => {
        const espBase = 'https://villahermosa.tecnm.mx/docs/oferta/ingindustrial';
        return [
          { nombre: 'Investigación y Desarrollo', url: `${espBase}/temario-IINE-CPC-2017-01(B)/01_INVESTIGACION%20Y%20DESARROLLO.pdf` },
          { nombre: 'Innovación en los Sistemas de Gestión de la Seguridad', url: `${espBase}/especialidad/INNOVACIONSEGURIDAD.pdf` },
          { nombre: 'Métodos de Análisis de Riesgo para la Seguridad', url: `${espBase}/especialidad/METODOSRIESGOSSEGURIDAD.pdf` },
          { nombre: 'Ingeniería de Calidad', url: `${espBase}/especialidad/INGENIERIACALIDAD.pdf` },
          { nombre: 'Administración de la Calidad', url: `${espBase}/especialidad/ADMINISTRACIONCALIDAD.pdf` },
          { nombre: 'Dirección Estratégica', url: `${espBase}/especialidad/DIRECCIONESTRATEGICA.pdf` },
          { nombre: 'Productividad y Competitividad', url: `${espBase}/especialidad/PRODUCTIVIDADCOMPETITIVIDAD.pdf` },
          { nombre: 'Herramientas Aplicadas a la Calidad', url: `${espBase}/especialidad/HERRAMIENTASCALIDAD.pdf` },
        ];
      })(),
    },
  ],
};