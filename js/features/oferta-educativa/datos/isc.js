export default {
  nombreCompleto: 'Ing. en Sistemas Computacionales',
  departamento: 'Departamento de Sistemas y Computación',
  color: '#2E7D32', // cs.primary — ISC domina con este color en el mismo depto
  iconoFondo: '💻',

  cardsResumen: [
    { icono: '🚩', titulo: 'Misión', color: '#2E7D32',
      contenido: 'Formar Ingenieros en Sistemas Computacionales que desarrollen e impulsen soluciones innovadoras para los desafíos tecnológicos de la región.' },
    { icono: '👁️', titulo: 'Visión', color: '#00838F',
      contenido: 'Ser una carrera reconocida en Tabasco y en un entorno global, por su excelencia profesional y aportación al desarrollo tecnológico computacional.' },
  ],

  objetivoGeneral: 'Formar profesionistas líderes con visión estratégica y amplio sentido ético; capaces de diseñar, desarrollar, implementar y administrar tecnología computacional para aportar soluciones innovadoras en beneficio de la sociedad; en un contexto global, multidisciplinario y sostenible.',

  objetivosEspecificos: [
    [1, 'Resolver Problemas', 'Desarrollar e implementar aplicaciones computacionales para solucionar problemas de diversos contextos, integrando diferentes tecnologías, plataformas o dispositivos.'],
    [2, 'Saber Diseñar', 'Analizar, diseñar y aplicar modelos computacionales para solucionar problemas, mediante la selección y uso de herramientas tecnológicas.'],
    [3, 'Hacer Experimentos', 'Desarrollar y administrar recursos tecnológicos para incrementar la productividad y competitividad de las organizaciones cumpliendo con normas nacionales e internacionales.'],
    [4, 'Saber Comunicarse', 'Construir proyectos innovadores aplicando las TIC con una visión emprendedora e intercultural.'],
    [5, 'Ser Ético', 'Desarrollar conciencia sobre el significado y sentido de la ética para orientar un comportamiento armónico en el contexto comunitario y profesional.'],
    [6, 'Actualizarse', 'Actualizar conocimientos profesionales para responder a las demandas de los cambios globales.'],
    [7, 'Trabajar en Equipo', 'Participar en equipos multidisciplinarios para el desarrollo de soluciones innovadoras y sostenibles en diferentes contextos.'],
  ],

  colorIngreso: '#5E35B1',
  perfilIngreso: [
    'Capacidad para la investigación, análisis y síntesis de información.',
    'Interés en las ciencias básicas y tecnologías de cómputo.',
    'Gusto por las tecnologías de información y comunicación.',
    'Disposición para la interacción y el trabajo en equipo.',
    'Habilidad para la toma de decisiones.',
    'Conocimientos de inglés.',
  ],

  colorEgreso: '#00838F',
  perfilEgreso: [
    'Implementa aplicaciones computacionales integrando diferentes tecnologías, plataformas o dispositivos.',
    'Diseña, desarrolla y aplica modelos computacionales mediante herramientas matemáticas.',
    'Diseña e implementa interfaces para automatización de sistemas de hardware y software.',
    'Coordina equipos multidisciplinarios para aplicar soluciones innovadoras.',
    'Diseña, implementa y administra bases de datos conforme a normas de seguridad.',
    'Desarrolla y administra software cumpliendo estándares de calidad.',
    'Evalúa tecnologías de hardware para soportar aplicaciones de manera efectiva.',
    'Detecta áreas de oportunidad con visión empresarial aplicando TIC.',
    'Diseña, configura y administra redes de computadoras aplicando normas vigentes.',
  ],

  reticulasTitulo: 'Retículas 2010-224',
  reticulas: [
    { clave: 'ISIC-2010-224--ISIE-GDD-2023-01', nombre: 'Gestión de Datos', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/ISIC/ISIC-2010-224--ISIE-GDD-2023-01.pdf' },
    { clave: 'ISIC-2010-224--ISIE-DAM-2023-02', nombre: 'Desarrollo de Aplicaciones Multiplataforma', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/ISIC/ISIC-2010-224--ISIE-DAM-2023-02.pdf' },
    { clave: 'ISIC-2010-224--ISIE-ISR-2023-03', nombre: 'Infraestructura y Seguridad en Redes', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/ISIC/ISIC-2010-224--ISIE-ISR-2023-03.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingsistemas/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Cálculo Diferencial', url: `${base}/1semestre/CalculoDiferencial-AC001.pdf` },
        { nombre: 'Fundamentos de Programación', url: `${base}/1semestre/FundamentosdeProgramacion-AED-1285.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-AC007.pdf` },
        { nombre: 'Matemáticas Discretas', url: `${base}/1semestre/MatematicasDiscretas-AE041.pdf` },
        { nombre: 'Taller de Administración', url: `${base}/1semestre/TallerdeAdministracion.pdf` },
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-AC006.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Cálculo Integral', url: `${base}/2semestre/CalculoIntegral-AC002.pdf` },
        { nombre: 'Programación Orientada a Objetos', url: `${base}/2semestre/ProgramacionOrientadaaObjetos-AED-1286.pdf` },
        { nombre: 'Contabilidad Financiera', url: `${base}/2semestre/ContabilidadFinanciera-AE008.pdf` },
        { nombre: 'Química', url: `${base}/2semestre/Quimica-AE058.pdf` },
        { nombre: 'Álgebra Lineal', url: `${base}/2semestre/AlgebraLineal-AC003.pdf` },
        { nombre: 'Probabilidad y Estadística', url: `${base}/2semestre/ProbabilidadyEstadistica-AE052.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Cálculo Vectorial', url: `${base}/3semestre/CalculoVectorial-AC004.pdf` },
        { nombre: 'Estructura de Datos', url: `${base}/3semestre/EstructuradeDatos-AE026.pdf` },
        { nombre: 'Cultura Empresarial', url: `${base}/3semestre/CulturaEmpresarial.pdf` },
        { nombre: 'Investigación de Operaciones', url: `${base}/3semestre/Investigaciondeoperaciones.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/3semestre/DesarrolloSustentable-AC008.pdf` },
        { nombre: 'Física General', url: `${base}/3semestre/FisicaGeneral.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Ecuaciones Diferenciales', url: `${base}/4semestre/EcuacionesDiferenciales-AC005.pdf` },
        { nombre: 'Métodos Numéricos', url: `${base}/4semestre/Metodosnumericos.pdf` },
        { nombre: 'Tópicos Avanzados de Programación', url: `${base}/4semestre/TopicosAvanzadosdeProgramacion.pdf` },
        { nombre: 'Fundamentos de Bases de Datos', url: `${base}/4semestre/FundamentosdeBasedeDatos-AE031.pdf` },
        { nombre: 'Simulación', url: `${base}/4semestre/Simulacion.pdf` },
        { nombre: 'Principios Eléctricos y Aplic. Digitales', url: `${base}/4semestre/PrincipiosElectricosyAplicacionesDigitales.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Graficación', url: `${base}/5semestre/Graficacion.pdf` },
        { nombre: 'Fundamentos de Telecomunicaciones', url: `${base}/5semestre/FundamentosdeTelecomunicaciones-AE034.pdf` },
        { nombre: 'Sistemas Operativos', url: `${base}/5semestre/SistemasOperativosI-AE061.pdf` },
        { nombre: 'Taller de Bases de Datos', url: `${base}/5semestre/Tallerdebasededatos.pdf` },
        { nombre: 'Fundamentos de Ing. de Software', url: `${base}/5semestre/FundamentosdeIngenieriadeSoftware.pdf` },
        { nombre: 'Arquitectura de Computadoras', url: `${base}/5semestre/ArquitecturadeComputadoras.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Lenguajes y Autómatas I', url: `${base}/6semestre/LenguajesyAutomatasI.pdf` },
        { nombre: 'Redes de Computadoras', url: `${base}/6semestre/RedesdeComputadoras.pdf` },
        { nombre: 'Taller de Sistemas Operativos', url: `${base}/6semestre/TallerdeSistemasOperativos.pdf` },
        { nombre: 'Administración de Bases de Datos', url: `${base}/6semestre/AdministraciondeBasedeDatos.pdf` },
        { nombre: 'Ingeniería de Software', url: `${base}/6semestre/IngenieriadeSoftware.pdf` },
        { nombre: 'Lenguajes de Interfaz', url: `${base}/6semestre/LenguajesdeInterfaz.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Lenguajes y Autómatas II', url: `${base}/7semestre/LenguajesyAutomatasII.pdf` },
        { nombre: 'Conmutación y Enrutamiento de Redes', url: `${base}/7semestre/ConmutacionyEnrutamientoenRedesdeDatos.pdf` },
        { nombre: 'Taller de Investigación I', url: `${base}/7semestre/TallerdeInvestigacionI-AC009.pdf` },
        { nombre: 'Gestión de Proyectos de Software', url: `${base}/7semestre/GestiondeProyectosdeSoftware.pdf` },
        { nombre: 'Sistemas Programables', url: `${base}/7semestre/SistemasProgramables.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Programación Lógica y Funcional', url: `${base}/8semestre/ProgramacionLogicayFuncional.pdf` },
        { nombre: 'Administración de Redes', url: `${base}/8semestre/Administracionderedes.pdf` },
        { nombre: 'Taller de Investigación II', url: `${base}/8semestre/TallerdeInvestigacionII-AC010.pdf` },
        { nombre: 'Programación Web', url: `${base}/8semestre/AE055ProgramacionWeb.pdf` },
      ]},
      { numero: 9, materias: [
        { nombre: 'Inteligencia Artificial', url: `${base}/9semestre/InteligenciaArtificial.pdf` },
        { nombre: 'Residencia Profesional', url: '' },
        { nombre: 'Servicio Social', url: '' },
        { nombre: 'Actividades Complementarias', url: '' },
      ]},
    ];
  })(),

  especialidades: (() => {
    const esp = 'https://villahermosa.tecnm.mx/docs/oferta/ingsistemas/especialidades';
    return [
      { nombre: 'Gestión de Redes y Mejoramiento de la Seguridad', icono: '📡', color: '#2E7D32', materias: [
        { nombre: 'Infraestructura de Telecomunicaciones', url: `${esp}/GESTION_DE_REDES_Y_MEJORAMIENTO_DE_LA_SEGURIDAD/Infraestructura_de_Telecomunicaciones.pdf` },
        { nombre: 'Redes Convergentes', url: `${esp}/GESTION_DE_REDES_Y_MEJORAMIENTO_DE_LA_SEGURIDAD/Redes_Convergentes.pdf` },
        { nombre: 'Redes Inalámbricas', url: `${esp}/GESTION_DE_REDES_Y_MEJORAMIENTO_DE_LA_SEGURIDAD/Redes_Inalambricas.pdf` },
        { nombre: 'Seguridad en Redes', url: `${esp}/GESTION_DE_REDES_Y_MEJORAMIENTO_DE_LA_SEGURIDAD/Seguridad_en_Redes.pdf` },
        { nombre: 'Tópicos Selectos de Seguridad', url: `${esp}/GESTION_DE_REDES_Y_MEJORAMIENTO_DE_LA_SEGURIDAD/Topicos_Selectos.pdf` },
      ]},
      { nombre: 'Tecnologías de Base de Datos', icono: '🗄️', color: '#5E35B1', materias: [
        { nombre: 'Nuevos Paradigmas de Base de Datos', url: `${esp}/TECNOLOGIAS_DE_BASE_DE_DATOS/Nuevos_Paradigmas_de_Base_de_Datos.pdf` },
        { nombre: 'Base de Datos NoSQL', url: `${esp}/TECNOLOGIAS_DE_BASE_DE_DATOS/Base_de_Datos_NoSQL.pdf` },
        { nombre: 'Tecnologías de Big Data', url: `${esp}/TECNOLOGIAS_DE_BASE_DE_DATOS/Tecnologias_de_Big_Data.pdf` },
        { nombre: 'Tratamiento de Datos', url: `${esp}/TECNOLOGIAS_DE_BASE_DE_DATOS/Tratamiento_de_Datos.pdf` },
        { nombre: 'Diseño y Construcción de Data Warehouse', url: `${esp}/TECNOLOGIAS_DE_BASE_DE_DATOS/Diseno_y_Construccion_de_Data_WareHouse.pdf` },
      ]},
      { nombre: 'Tecnologías y Aplicaciones Multiplataforma', icono: '📱', color: '#00838F', materias: [
        { nombre: 'Tópicos de Desarrollo de Aplicaciones', url: `${esp}/TECNOLOGIAS_Y_APLICACIONES_MULTIPLATAFORMA/Topicos_de_Desarrollo_de_Aplicaciones.pdf` },
        { nombre: 'Desarrollo de Apps para Móviles', url: `${esp}/TECNOLOGIAS_Y_APLICACIONES_MULTIPLATAFORMA/Desarrollo_de_Aplicaciones_para_Dispositivos_Moviles.pdf` },
        { nombre: 'Arquitectura Orientada a Servicios', url: `${esp}/TECNOLOGIAS_Y_APLICACIONES_MULTIPLATAFORMA/Arquitectura_Orientada_a_Servicios.pdf` },
        { nombre: 'Nuevas Tecnologías para Aplicaciones', url: `${esp}/TECNOLOGIAS_Y_APLICACIONES_MULTIPLATAFORMA/Nuevas_Tecnologias_para_Desarrollo_de_Aplicaciones.pdf` },
        { nombre: 'Seguridad, Producción y Despliegue', url: `${esp}/TECNOLOGIAS_Y_APLICACIONES_MULTIPLATAFORMA/Seguridad_Produccion_y_Despliegue_de_Aplicaciones.pdf` },
        { nombre: 'Diseño de Interfaces', url: `${esp}/TECNOLOGIAS_Y_APLICACIONES_MULTIPLATAFORMA/Diseno_de_Interfaces.pdf` },
        { nombre: 'Metodologías para Desarrollo Ágil', url: `${esp}/TECNOLOGIAS_Y_APLICACIONES_MULTIPLATAFORMA/Metodologias_para_el_Desarrollo_Agil.pdf` },
      ]},
    ];
  })(),
};