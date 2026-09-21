export default {
  nombreCompleto: 'Ing. Química',
  departamento: 'Departamento Química, Bioquímica y Ambiental',
  color: '#E65100', // _naranja fijo, igual que en Dart
  iconoFondo: '🧪',

  objetivoGeneral: 'Formar profesionistas en Ingeniería Química competentes para investigar, generar y aplicar el conocimiento científico y tecnológico, que le permita identificar y resolver problemas de diseño, operación, adaptación, optimización y administración en industrias químicas y de servicios, con calidad, seguridad, economía, usando racional y eficientemente los recursos naturales, conservando el medio ambiente, cumpliendo el código ético de la profesión y participando en el bienestar de la sociedad.',

  objetivosEspecificosTitulo: 'Propósitos Específicos',
  objetivosEspecificos: [
    [1, 'Resolver Problemas', 'Identificar y resolver problemas de ingeniería aplicando los principios de las ciencias básicas e ingeniería.'],
    [2, 'Saber Diseñar', 'Aplicar y sintetizar procesos de diseño de ingeniería que resulten en proyectos que cumplen las necesidades especificadas.'],
    [3, 'Hacer Experimentos', 'Desarrollar experimentaciones adecuadas; analizar e interpretar datos y utilizar el juicio de ingeniería para establecer conclusiones.'],
    [4, 'Saber Comunicarse', 'Comunicarse efectivamente con diferentes audiencias.'],
    [5, 'Ser Ético', 'Reconoce sus responsabilidades éticas y profesionales en situaciones relevantes para la ingeniería, considerando el impacto de las soluciones en los contextos global, económico, ambiental y social.'],
    [6, 'Actualizarse', 'Reconoce la necesidad permanente de conocimiento adicional y tiene la habilidad para localizarlo, evaluarlo, integrarlo y aplicarlo adecuadamente.'],
    [7, 'Trabajar en Equipo', 'Trabaja efectivamente en equipos que establecen metas, planean tareas, cumplen fechas límite y analizan riesgos e incertidumbre.'],
  ],

  colorIngreso: '#E65100',
  perfilIngreso: [
    'Capacidad para expresarse correctamente en forma oral y escrita.',
    'Capacidades de razonamiento verbal y numérico.',
    'Capacidad de análisis, síntesis, identificación y resolución de problemas.',
    'Habilidades para realizar trabajo en equipo.',
    'Ser creativo, innovador, responsable, disciplinado y con vocación.',
    'Preferentemente con bachillerato en ciencias físico-matemáticas, químico-biológico, único o equivalente.',
  ],

  colorEgreso: '#BF360C',
  perfilEgreso: [
    'Diseña, selecciona, opera, optimiza y controla procesos en industrias químicas y de servicios con base en el desarrollo tecnológico, de manera sustentable.',
    'Colabora en equipos interdisciplinarios y multiculturales, con actitud innovadora, espíritu crítico, disposición al cambio y apego a la ética profesional.',
    'Planea e implementa sistemas de gestión de calidad, ambiente e higiene y seguridad conforme a normas nacionales e internacionales.',
    'Utiliza las TIC como herramientas en la construcción de soluciones a problemas de ingeniería y difusión del conocimiento científico.',
    'Realiza innovación y adaptación de tecnología en procesos aplicando la metodología científica con respeto a la propiedad intelectual.',
    'Utiliza un segundo idioma en su ámbito laboral según los requerimientos del entorno.',
    'Se comunica de forma oral y escrita en el ámbito laboral de manera expedita y concisa.',
    'Demuestra actitud creativa, emprendedora y liderazgo para impulsar y crear empresas que contribuyan al progreso nacional.',
    'Administra recursos humanos, materiales y financieros para los sectores público y privado, acorde a modelos administrativos vigentes.',
    'Demuestra actitudes de superación continua para lograr metas personales y profesionales con pertenencia y competitividad.',
  ],

  campoLaboral: [
    'Industrias de extracción y transformación.',
    'Sector público (IMP, PEMEX, SE, CFE, SEDESOL) y sector privado de la industria química.',
    'Industrias relacionadas con planeación y diseño de plantas químicas: alcoholera, jabonera, azucarera, del papel, textil y otras.',
    'Empresas o compañías de servicio: firmas de ingeniería y consultoras.',
    'Fábricas que producen fibras sintéticas para la industria textil.',
    'Instituciones educativas.',
    'Ingeniería Bioquímica y Biomédica.',
    'Protección ambiental, seguridad y materiales peligrosos.',
  ],

  reticulas: [
    { clave: 'IQUI-2005-299', nombre: 'Retícula 2005', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/IQUI/IQUI-2005-299.pdf' },
    { clave: 'IQUI-2010-232', nombre: 'Retícula 2010', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/IQUI/IQUI-2010-232.pdf' },
    { clave: 'IQUI-2010-232', nombre: 'Retícula 2023', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/IQUI-2010-232--IQUE-PRQ-2023-01.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingquimica/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Taller de Ética', url: `${base}/1ERSEMESTRE/TallerdeEtica-ACA-0907.pdf` },
        { nombre: 'Fundamentos de Investigación', url: `${base}/1ERSEMESTRE/FundamentosdeInvestigacion-ACC-0906.pdf` },
        { nombre: 'Cálculo Diferencial', url: `${base}/1ERSEMESTRE/CalculoDiferencial-ACF-0901.pdf` },
        { nombre: 'Química Inorgánica', url: `${base}/1ERSEMESTRE/QuimicaInorganica-AEF-1060.pdf` },
        { nombre: 'Programación', url: `${base}/1ERSEMESTRE/Programacion.pdf` },
        { nombre: 'Dibujo Asistido por Computadora', url: `${base}/1ERSEMESTRE/DibujoAsistidoporComputadora-AEO-1012.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Álgebra Lineal', url: 'https://villahermosa.tecnm.mx/docs/oferta/ingambiental/temario2010/2semestre/AlgebraLineal-AC003.pdf' },
        { nombre: 'Mecánica Clásica', url: `${base}/2DOSEMESTRE/MecanicaClasica-AEF-1042.pdf` },
        { nombre: 'Cálculo Integral', url: `${base}/2DOSEMESTRE/CalculoIntegral-ACF-0902.pdf` },
        { nombre: 'Química Orgánica I', url: `${base}/2DOSEMESTRE/QumicaorganicaI.pdf` },
        { nombre: 'Termodinámica', url: `${base}/2DOSEMESTRE/Termodinamica-AEF-1065.pdf` },
        { nombre: 'Química Analítica', url: `${base}/2DOSEMESTRE/QuimicaAnalitica-AEG-1059.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Análisis de Datos Experimentales', url: `${base}/3ERSEMESTRE/AnalisisdeDatosExperimentales.pdf` },
        { nombre: 'Electricidad, Magnetismo y Óptica', url: `${base}/3ERSEMESTRE/Electricidad,MagnetismoyOptica.pdf` },
        { nombre: 'Cálculo Vectorial', url: `${base}/3ERSEMESTRE/CalculoVectorial-ACF%E2%80%930904.pdf` },
        { nombre: 'Química Orgánica II', url: `${base}/3ERSEMESTRE/QuimicaOrganicaII.pdf` },
        { nombre: 'Balance de Materia y Energía', url: `${base}/3ERSEMESTRE/BalancedeMateriayEnergia-AEF-1004.pdf` },
        { nombre: 'Gestión de la Calidad', url: `${base}/3ERSEMESTRE/GestiondelaCalidad.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Métodos Numéricos', url: `${base}/4semestre/MetodosNumericos.pdf` },
        { nombre: 'Ecuaciones Diferenciales', url: `${base}/4semestre/EcuacionesDiferenciales-ACF%E2%80%930905.pdf` },
        { nombre: 'Mecanismos de Transferencia', url: `${base}/4semestre/MecanismosdeTransferencia.pdf` },
        { nombre: 'Ingeniería Ambiental', url: `${base}/4semestre/IngenieriaAmbiental.pdf` },
        { nombre: 'Fisicoquímica I', url: `${base}/4semestre/Fisicoqu%C3%ADmicaI.pdf` },
        { nombre: 'Análisis Instrumental', url: `${base}/4semestre/AnalisisInstrumental-AEF-1003.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Desarrollo Sustentable', url: `${base}/5semestre/DesarrolloSustentable-ACD-0908.pdf` },
        { nombre: 'Ingeniería de Costos', url: `${base}/5semestre/IngenieriadeCostos.pdf` },
        { nombre: 'Balance de Momento, Calor y Masa', url: `${base}/5semestre/BalancedeMomento,CaloryMasa.pdf` },
        { nombre: 'Procesos de Separación I', url: `${base}/5semestre/ProcesosdeSeparacionI.pdf` },
        { nombre: 'Fisicoquímica II', url: `${base}/5semestre/Fisicoqu%C3%ADmicaII.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Taller de Investigación I', url: `${base}/6semestre/TallerdeInvestigacionI-ACA-0909.pdf` },
        { nombre: 'Procesos de Separación II', url: `${base}/6semestre/ProcesosdeseparacinII.pdf` },
        { nombre: 'Laboratorio Integral I', url: `${base}/6semestre/LaboratorioIntegralI.pdf` },
        { nombre: 'Reactores Químicos', url: `${base}/6semestre/ReactoresQuimicos.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Taller de Administración Gerencial', url: `${base}/7semestre/TallerdeAdministracionGerencial.pdf` },
        { nombre: 'Taller de Investigación II', url: `${base}/7semestre/TallerdeInvestigacionII-ACA-0910.pdf` },
        { nombre: 'Procesos de Separación III', url: `${base}/7semestre/ProcesosdeSeparacionIII.pdf` },
        { nombre: 'Síntesis y Optimización de Procesos', url: `${base}/7semestre/SintesisyOptimizaciondeProcesos.pdf` },
        { nombre: 'Salud y Seguridad en el Trabajo', url: `${base}/7semestre/Saludyseguridadeneltrabajo.pdf` },
        { nombre: 'Laboratorio Integral II', url: `${base}/7semestre/LaboratorioIntegralII.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Laboratorio Integral III', url: `${base}/8semestre/LaboratorioIntegralIII.pdf` },
        { nombre: 'Instrumentación y Control', url: `${base}/8semestre/InstrumentacionyControl-AEF-1039.pdf` },
        { nombre: 'Ingeniería de Proyectos', url: `${base}/8semestre/IngenieriadeProyectos.pdf` },
        { nombre: 'Simulación de Procesos', url: `${base}/8semestre/SimulaciondeProcesos.pdf` },
      ]},
      { numero: 9, soloInformativo: true, materias: [
        { nombre: 'Especialidad', url: '' },
        { nombre: 'Residencia Profesional', url: '' },
        { nombre: 'Servicio Social', url: '' },
        { nombre: 'Actividades Complementarias', url: '' },
      ]},
    ];
  })(),

  especialidades: [
    {
      nombre: 'Procesos Químicos',
      clave: 'IQUI-2010-232',
      icono: '🧬',
      color: '#BF360C',
      materias: (() => {
        const espBase = 'https://villahermosa.tecnm.mx/docs/oferta/ingquimica/especialidad';
        return [
          { nombre: 'Ciencia y Tecnología de Materiales', url: `${espBase}/CienciayTecnologiadeMateriales.pdf` },
          { nombre: 'Control de Calidad en Productos', url: `${espBase}/ControldeCalidadenProductos.pdf` },
          { nombre: 'Diseño y Caracterización de Fluidos de Perforación', url: `${espBase}/DisennoyCaracterizaciondeFluidosdePerforacion.pdf` },
          { nombre: 'Optimización de Procesos Industriales', url: `${espBase}/OptimizaciondeProcesosIndustriales.pdf` },
          { nombre: 'Tecnologías y Tratamientos de Residuos', url: `${espBase}/TecnologiasyTratamientosdeResiduos.pdf` },
        ];
      })(),
    },
  ],
};