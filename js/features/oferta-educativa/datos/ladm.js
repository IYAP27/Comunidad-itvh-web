export default {
  nombreCompleto: 'Lic. en Administración',
  departamento: 'Departamento Económico Administrativo',
  color: '#4CAF50', // _verde fijo, igual que en Dart
  iconoFondo: '🏦',

  objetivoGeneral: 'Formar profesionales de la administración capaces de actuar como agentes de cambio, a través del diseño, innovación y dirección en organizaciones, sensibles a las demandas sociales y oportunidades del entorno, con capacidad de intervención en ámbitos globales y con un firme propósito de observar las normas y los valores universales.',

  objetivosEspecificos: [
    [1, 'Resolver Problemas', 'Identifica y resuelve problemas aplicando estrategias de dirección para la competitividad y productividad de las organizaciones.'],
    [2, 'Saber Diseñar', 'Diseña estrategias mediante decisiones basadas en el análisis de la información interna y del entorno global que aseguren el éxito de la comercialización de productos y servicios.'],
    [3, 'Hacer Experimentos', 'Desarrolla proyectos sustentables aplicando herramientas administrativas y métodos de investigación.'],
    [4, 'Saber Comunicarse', 'Comunicarse efectivamente para conducir la organización hacia la consecución de sus objetivos mediante un esfuerzo coordinado y espíritu emprendedor.'],
    [5, 'Ser Ético', 'Reconoce sus responsabilidades éticas y profesionales en situaciones relevantes para la administración, considerando el impacto de las soluciones en los contextos global, económico, ambiental y social.'],
    [6, 'Actualizarse', 'Actualiza sus conocimientos permanentemente para responder a los cambios globales.'],
    [7, 'Trabajar en Equipo', 'Integrar y coordinar equipos interdisciplinarios para favorecer el crecimiento de la organización y su entorno global.'],
  ],

  colorIngreso: '#4CAF50',
  perfilIngreso: [
    'Capacidad de liderazgo.',
    'Trabajo en equipo.',
    'Toma de decisiones.',
    'Adaptación al cambio.',
    'Capacidad de expresión verbal y escritura.',
    'Capacidad de adaptación al trabajo, ética y valores.',
  ],

  colorEgreso: '#2E7D32',
  perfilEgreso: [
    'Integrar los procesos gerenciales, de administración, de innovación y las estrategias de dirección para la competitividad y productividad de las organizaciones.',
    'Aplicar los conocimientos modernos de la gestión de negocios a las fases del proceso administrativo para la optimización de recursos y el manejo de los cambios organizacionales.',
    'Desarrollar las habilidades directivas y de vinculación basadas en la ética y la responsabilidad social, que le permitan integrar y coordinar equipos interdisciplinarios.',
    'Crear y desarrollar proyectos sustentables aplicando herramientas administrativas y métodos de investigación de vanguardia, con un enfoque estratégico, multicultural y humanista.',
    'Conducir la organización hacia la consecución de sus objetivos mediante un esfuerzo coordinado y espíritu emprendedor.',
    'Crear organizaciones que contribuyan a la transformación económica y social, identificando las oportunidades de negocios en un contexto global.',
    'Conocer y aplicar el marco legal vigente nacional e internacional de las organizaciones.',
    'Analizar e interpretar información financiera y económica para la toma de decisiones en las organizaciones.',
    'Ser un agente de cambio con la habilidad de potenciar el capital humano para la solución de los problemas y la toma de decisiones.',
    'Implementar y administrar sistemas de gestión de calidad orientados a la mejora continua y productividad de la organización.',
    'Aplicar las tecnologías de la información y comunicación para optimizar el trabajo y desarrollo de la organización.',
    'Actualizar conocimientos permanentemente para responder a los cambios globales.',
    'Diseñar sistemas de organización considerando alternativas estratégicas que generen cadenas productivas en beneficio de la sociedad.',
    'Tener visión multidisciplinaria para generar propuestas y desarrollar acciones ante escenarios de contingencia.',
    'Diseñar estrategias de mercadotecnia basadas en el análisis de la información interna y del entorno global.',
  ],

  campoLaboral: [
    'Sector público federal, estatal y municipal.',
    'Sector privado industrial, comercial o de servicios.',
    'Ejercicio en forma independiente de la profesión en consultorías o asesorías.',
    'Instituciones educativas públicas o privadas, desempeñando funciones administrativas o docentes.',
  ],

  reticulasTitulo: 'Retículas 2010',
  reticulas: [
    { clave: 'INTE-AFI-2018-01', nombre: 'Administración y Finanzas', url: 'https://villahermosa.tecnm.mx/docs/oferta/licadministracion/reticula/LAE_CON_ADMON_Y_FINANZAS_RETICULA.pdf' },
    { clave: 'LADE-PES-2017-01', nombre: 'Proyectos Empresariales Sustentables', url: 'https://villahermosa.tecnm.mx/docs/oferta/licadministracion/reticula/LAE_CON_PROYECTOS_EMPRESARIALES_RETICULA.pdf' },
    { clave: 'LADE-CHT-2023-02', nombre: 'Capital Humano y Transformación Digital', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/LADM-2010-234--LADE-CHT-2023-02.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/licadministracion/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Teoría General de la Administración', url: `${base}/1semestre/LAC-1035TeoriaGeneraldelaAdministracion_OK_2016.pdf` },
        { nombre: 'Informática para la Administración', url: `${base}/1semestre/LAV-1025InformaticaparalaAdministracion_OK_2016.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-ACA-0907.pdf` },
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-ACC-0906.pdf` },
        { nombre: 'Matemáticas Aplicadas a la Administración', url: `${base}/1semestre/LAD-1027MatematicasAplicadasalaAdministracion_OK_2016.pdf` },
        { nombre: 'Contabilidad General', url: `${base}/1semestre/LAD-1006ContabilidadGeneral_OK_2016.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Función Administrativa I', url: `${base}/2semestre/LAF-1019FuncionAdministrativa%20I_OK_2016.pdf` },
        { nombre: 'Estadística para la Administración I', url: `${base}/2semestre/LAD-1016EstadisticaparalaAdministraci%C3%B3n%20I_OK_2016.pdf` },
        { nombre: 'Derecho Laboral y Seguridad Social', url: `${base}/2semestre/LAF-1010DerechoLaboralSeguridadSocial_OK_2016.pdf` },
        { nombre: 'Comunicación Corporativa', url: `${base}/2semestre/LAC-1004ComunicacionCorporativa_OK_2016.pdf` },
        { nombre: 'Taller de Desarrollo Humano', url: `${base}/2semestre/LAC-1034TallerdeDesarrolloHumano_OK_2016.pdf` },
        { nombre: 'Costos de Manufactura', url: 'https://villahermosa.tecnm.mx/site/oferta.jsp?view=Licenciaturaadministracion' },
      ]},
      { numero: 3, materias: [
        { nombre: 'Función Administrativa II', url: `${base}/3semestre/LAD-1020FuncionAdministrativaII_OK_2016.pdf` },
        { nombre: 'Estadística para la Administración II', url: `${base}/3semestre/LAD-1017EstadisticaparalaadministracionII_OK_2016.pdf` },
        { nombre: 'Derecho Empresarial', url: `${base}/3semestre/LAD-1009DerechoEmpresarial_OK_2016.pdf` },
        { nombre: 'Comportamiento Organizacional', url: `${base}/3semestre/LAD-1003ComportamientoOrganizacional_OK_2016.pdf` },
        { nombre: 'Dinámica Social', url: `${base}/3semestre/LAC-1013DinamicaSocial_OK_2016.pdf` },
        { nombre: 'Contabilidad Gerencial', url: `${base}/3semestre/LAD-1007ContabilidadGerencial_OK_2016.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Gestión Estratégica del Capital Humano I', url: `${base}/4semestre/LAD-1023GestionEstrategicadelCapitalHumanoI_OK_2016.pdf` },
        { nombre: 'Procesos Estructurales', url: `${base}/4semestre/LAD-1031ProcesosEstructurales_OK_2016.pdf` },
        { nombre: 'Métodos Cuantitativos para la Administración', url: `${base}/4semestre/LAD-1028MetodosCuantitativosparalaAdministracion_OK_2016.pdf` },
        { nombre: 'Fundamentos de Mercadotecnia', url: `${base}/4semestre/LAF-1021FundamentosdeMercadotecnia_OK_2016.pdf` },
        { nombre: 'Economía Empresarial', url: `${base}/4semestre/LAD-1014EconomiaEmpresarial_OK_2016.pdf` },
        { nombre: 'Matemáticas Financieras', url: `${base}/4semestre/MatematicasFinancieras-AEC-1079.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Gestión Estratégica del Capital Humano II', url: `${base}/5semestre/LAD-1024GestionEstrategicaCapitalHumanoII_OK_2016.pdf` },
        { nombre: 'Derecho Fiscal', url: `${base}/5semestre/DerechoFiscal-AEC-1070.pdf` },
        { nombre: 'Mezcla de Mercadotecnia', url: `${base}/5semestre/MezcladeMercadotecnia-AEC-1080.pdf` },
        { nombre: 'Macroeconomía', url: `${base}/5semestre/Macroeconomia-AEC-1077.pdf` },
        { nombre: 'Administración Financiera I', url: `${base}/5semestre/AdministracionFinancieraI-AED-1068.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/5semestre/DesarrolloSustentable-ACD-0908.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Gestión de la Retribución', url: `${base}/6semestre/LAM-1022GestiondelaRetribucion_OK_2016.pdf` },
        { nombre: 'Producción', url: `${base}/6semestre/LAF-1032Produccion_OK_2016.pdf` },
        { nombre: 'Taller de Investigación I', url: `${base}/6semestre/TallerdeInvestigacionI-ACA-0909.pdf` },
        { nombre: 'Sistemas de Información de Mercadotecnia', url: `${base}/6semestre/LAD-1033SistemasdeInformaciondeMercadotecnia_OK_2016.pdf` },
        { nombre: 'Innovación y Emprendedurismo', url: `${base}/6semestre/LAA-1026InnovacionyEmprendedurismo_OK_2016.pdf` },
        { nombre: 'Administración Financiera II', url: `${base}/6semestre/LAD-1002AdministracionFinancieraII_OK_2016.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Plan de Negocios', url: `${base}/7semestre/LAB-1029PlandeNegocios_OK_2016.pdf` },
        { nombre: 'Procesos de Dirección', url: `${base}/7semestre/LAC-1030ProcesosdeDireccion_OK_2016.pdf` },
        { nombre: 'Taller de Investigación II', url: `${base}/7semestre/TallerdeInvestigacionII-ACA-0910.pdf` },
        { nombre: 'Administración de la Calidad', url: `${base}/7semestre/LAD-1001AdministraciondelaCalidad_OK_2016.pdf` },
        { nombre: 'Economía Internacional', url: `${base}/7semestre/LAC-1015EconomiaInternacional_OK_2016.pdf` },
        { nombre: 'Diagnóstico y Evaluación Empresarial', url: `${base}/7semestre/LAD-1012DiagnosticoyEvaluacionEmpresarial_OK_2016.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Consultoría Empresarial', url: `${base}/8semestre/LAC-1005ConsultoriaEmpresarial_OK_2016.pdf` },
        { nombre: 'Formulación y Evaluación de Proyectos', url: `${base}/8semestre/LAD-1018FormulacionyEvaluaciondeProyectos_OK_2016.pdf` },
        { nombre: 'Desarrollo Organizacional', url: `${base}/8semestre/LAD-1011DesarrolloOrganizacional_OK_2016.pdf` },
      ]},
      { numero: 9, soloInformativo: true, materias: [
        { nombre: 'Residencia Profesional', url: '' },
      ]},
    ];
  })(),

  especialidades: (() => {
    const esp = 'https://villahermosa.tecnm.mx/docs/oferta/licadministracion/temario2010/Especialidad';
    return [
      { nombre: 'Proyectos Empresariales Sustentables', clave: 'INTE-PES-2017-03', icono: '🌿', color: '#4CAF50', materias: [
        { nombre: 'Normas de Calidad y su Aplicación', url: `${esp}/INTE-PES-2017-03/NormasdeCalidadysuAplicacion-PEF-1701.pdf` },
        { nombre: 'Estrategias Corporativas y Sustentabilidad', url: `${esp}/INTE-PES-2017-03/EstrategiasCorporativasySustentabilidad-PEF-1703.pdf` },
        { nombre: 'Comercio Exterior', url: `${esp}/INTE-PES-2017-03/ComercioExterior-PEF-1704.pdf` },
        { nombre: 'Marketing Ecológico', url: `${esp}/INTE-PES-2017-03/MarketingEcologico-PED-1705.pdf` },
        { nombre: 'Modelo de Negocios Sustentables', url: `${esp}/INTE-PES-2017-03/ModelosdeNegociosSustentables-PED-1706.pdf` },
      ]},
      { nombre: 'Administración y Finanzas', clave: 'INTE-AFI-2018-01', icono: '💰', color: '#2E7D32', materias: [
        { nombre: 'Mercados Financieros I', url: `${esp}/INTE-AFI-2018-01/MercadosFinancierosI-AFD-1801.pdf` },
        { nombre: 'Modelo de Negocios Sustentables', url: `${esp}/INTE-AFI-2018-01/ModelodeNegociosSustentables-AFD-1802.pdf` },
        { nombre: 'Estrategias Corporativas y Sustentabilidad', url: `${esp}/INTE-AFI-2018-01/EstrategiasCorporativasySustentabilidad-AFF-1803.pdf` },
        { nombre: 'Comercio Exterior', url: `${esp}/INTE-AFI-2018-01/ComercioExterior-AFF-1804.pdf` },
        { nombre: 'Auditoría Interna', url: `${esp}/INTE-AFI-2018-01/AuditoriaInterna-AFD-1805.pdf` },
        { nombre: 'Mercados Financieros II', url: `${esp}/INTE-AFI-2018-01/MercadosFinancieros%20II-AFD-1806.pdf` },
      ]},
      { nombre: 'Capital Humano y Transformación Digital', clave: 'LADE-CHT-2023-02', icono: '👥', color: '#1B5E20', materias: [
        { nombre: 'Productividad y Competitividad del Talento Humano', url: `${esp}/INTE-CHT-2017-03/ProductividadyCompetitividaddelTalentoHumano-CHC-1701.pdf` },
        { nombre: 'Nuevas Herramientas como Apoyo a la Gestión del Talento', url: `${esp}/INTE-CHT-2017-03/NuevasHerramientascomoApoyoalaGestiondelTalentoHumano-CHH-1702.pdf` },
        { nombre: 'Capital Humano en la Era Digital', url: `${esp}/INTE-CHT-2017-03/CapitalHumanoenlaEraDigital-CHC-1703.pdf` },
        { nombre: 'Taller de Valoración de Empresas por Simulación', url: `${esp}/INTE-CHT-2017-03/TallerdeValoraciondeEmpresasporsimulacion-CHC-1704.pdf` },
        { nombre: 'Seminario de Gestión del Talento Humano', url: `${esp}/INTE-CHT-2017-03/SeminariodeGestiondelTalentoHumano-CHB-1705.pdf` },
        { nombre: 'Nómina Electrónica', url: `${esp}/INTE-CHT-2017-03/NominaelectronicaCHC1706.pdf` },
      ]},
    ];
  })(),
};