export default {
  nombreCompleto: 'Ingeniería Ambiental',
  departamento: 'Departamento de Química, Bioquímica y Ambiental',
  color: '#2E7D32', // cs.primary equivalente (verde, temática ambiental)
  iconoFondo: '🌿',
  aviso: true, // _AvisoCard sobre cruce de datos en el backend del portal

  objetivoGeneral: 'Formar profesionistas en Ingeniería Ambiental éticos, analíticos, críticos y creativos con las competencias para identificar, proponer y resolver problemas ambientales de manera multidisciplinaria, asegurando la protección, conservación y mejoramiento del ambiente, bajo un marco legal, buscando el desarrollo sustentable en beneficio de la vida en el planeta.',

  colorIngreso: '#5E35B1', // cs.secondary
  perfilIngreso: [
    'Dominio de habilidades básicas como la comprensión de textos.',
    'El trabajo en equipo.',
    'Interés sobre el tema de relevancia.',
    'Iniciativa, capacidad de gestión, de comunicación y creatividad.',
    'Interés por la investigación de las causas que deterioran el ambiente y respeto a la naturaleza.',
    'Inclinación por el conocimiento científico-tecnológico e interés en las ciencias básicas y naturales, y en sus aplicaciones para la solución de problemas.',
  ],

  colorEgreso: '#00838F', // cs.tertiary
  perfilEgreso: [
    'Vincula el valor de los recursos naturales para promover su uso sustentable de acuerdo a las necesidades de la región, mediante instrumentos de concientización, sensibilización y comunicación.',
    'Participa en el desarrollo y ejecución de protocolos de investigación básica o aplicada para la resolución de problemas ambientales.',
    'Elabora, implementa y mantiene sistemas de gestión ambiental.',
    'Participa en la realización de auditorías ambientales en el sector público y privado.',
    'Realiza diagnósticos y evaluaciones de impacto y riesgo ambiental sustentados en métodos y procedimientos certificados conforme a criterios nacionales e internacionales.',
    'Elabora estudios de factibilidad económica y técnica de los procesos para la prevención y control ambiental.',
    'Propone e innova tecnologías para el manejo de los residuos cumpliendo la legislación ambiental vigente.',
    'Conoce y aplica criterios de ingeniería básica y aplicada, así como de las ciencias biológicas, para el dimensionamiento, adecuación, operación, mantenimiento y desarrollo de tecnologías de tratamiento, prevención, control y transformación de efluentes sólidos, líquidos y gaseosos contaminados.',
    "Conoce y aplica las TIC's, así como sistemas computacionales o software especializados en el área ambiental.",
    'Es analítico, ético, crítico y consciente de la importancia de su entorno para la vida, respetuoso de la misma y promotor del desarrollo sustentable.',
    'Es capaz de formar recursos humanos, realizar actividades de docencia, investigación y capacitación.',
    'Tiene una actitud emprendedora y de liderazgo para interactuar con grupos multidisciplinarios e interdisciplinarios en la búsqueda de soluciones a los problemas de deterioro del medio ambiente.',
  ],

  campoLaboral: [
    'Dependencias del gobierno en los ámbitos federal, estatal y municipal; organismos públicos desconcentrados y/o descentralizados.',
    'Empresas del sector industrial en general, y de los ramos minero-metalúrgico, energético, de obras y proyectos civiles.',
    'Instituciones educativas de nivel medio o superior, así como de investigación, tanto públicas como privadas.',
    'Profesional independiente que realiza capacitación para empresas, estudios de impacto ambiental, de riesgo, auditorías ambientales, propuesta de innovaciones tecnológicas, etc.',
    'Organizaciones no gubernamentales encaminadas a la promoción de cultura ambiental limpia.',
  ],

  reticulas: [
    { clave: 'IAMB-2004-286', nombre: 'Plan 2004', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/IAMB/IAMB-2004-286.pdf' },
    { clave: 'IAMB-2010-206', nombre: 'Plan 2010', url: 'https://pub-f883231412d746839d3a41f6bc354031.r2.dev/IAMB/IAMB_2010_206.pdf' },
    { clave: 'IAMB-2010-206--IAME-GIR-2023-01', nombre: 'Gestión Integral de Residuos', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/IAMB-2010-206--IAME-GIR-2023-01.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingambiental/temario2010';
    const esp = 'https://villahermosa.tecnm.mx/docs/oferta/ingambiental/especialidad';
    return [
      { numero: 1, materias: [
        { nombre: 'Química Inorgánica', url: `${base}/1semestre/QuimicaInorganica-AE060.pdf` },
        { nombre: 'Cálculo Diferencial', url: `${base}/1semestre/CalculoDiferencial-AC001.pdf` },
        { nombre: 'Dibujo Asistido por Computadora', url: `${base}/1semestre/DibujoAsistidoporComputadora.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-AC007.pdf` },
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-AC006.pdf` },
        { nombre: 'Biología', url: `${base}/1semestre/Biologia-AE005.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Fundamentos de Química Orgánica', url: `${base}/2semestre/FundamentosdeQuimicaOrganica-AE033.pdf` },
        { nombre: 'Álgebra Lineal', url: `${base}/2semestre/AlgebraLineal-AC003.pdf` },
        { nombre: 'Física', url: `${base}/2semestre/Fisica.pdf` },
        { nombre: 'Probabilidad y Estadística Ambiental', url: `${base}/2semestre/ProbabilidadyEstadisticaAmbiental.pdf` },
        { nombre: 'Cálculo Integral', url: `${base}/2semestre/CalculoIntegral-AC002.pdf` },
        { nombre: 'Ecología', url: `${base}/2semestre/Ecologia.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Química Analítica', url: `${base}/3semestre/QuimicaAnalitica-AE059.pdf` },
        { nombre: 'Cálculo Vectorial', url: `${base}/3semestre/CalculoVectorial-AC004.pdf` },
        { nombre: 'Diseño de Experimentos Ambientales', url: `${base}/3semestre/DisenodeExperimentosAmbientales.pdf` },
        { nombre: 'Termodinámica', url: `${base}/3semestre/Termodinamica-AE065.pdf` },
        { nombre: 'Economía Ambiental', url: `${base}/3semestre/EconomiaAmbiental.pdf` },
        { nombre: 'Bioquímica', url: `${base}/3semestre/Bioquimica-AE007.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Análisis Instrumental', url: `${base}/4semestre/AnalisisInstrumental.pdf` },
        { nombre: 'Ecuaciones Diferenciales', url: `${base}/4semestre/EcuacionesDiferenciales-AC005.pdf` },
        { nombre: 'Balance de Materia y Energía', url: `${base}/4semestre/BalanceDeMateriaYEnergia-AE004.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/4semestre/DesarrolloSustentable-AC008.pdf` },
        { nombre: 'Fisicoquímica I', url: `${base}/4semestre/Fisicoqu%C3%ADmicaI.pdf` },
        { nombre: 'Microbiología', url: `${base}/4semestre/Microbiologia-AE050.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Fenómenos de Transporte', url: `${base}/5semestre/FenomenoDeTransporte-AE027.pdf` },
        { nombre: 'Sistemas de Información Geográfica', url: `${base}/5semestre/SistemasDeInformacionGeografica.pdf` },
        { nombre: 'Gestión Ambiental I', url: `${base}/5semestre/GestionAmbiental_I.pdf` },
        { nombre: 'Mecánica de Fluidos', url: `${base}/5semestre/Mec%C3%A1nicaDeFluidos.pdf` },
        { nombre: 'Fisicoquímica II', url: `${base}/5semestre/Fisicoqu%C3%ADmica_II.pdf` },
        { nombre: 'Toxicología Ambiental', url: `${base}/5semestre/ToxicologiaAmbiental.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Taller de Investigación I', url: `${base}/6semestre/TallerDeInvestigacion-I-AC009.pdf` },
        { nombre: 'Contaminación Atmosférica', url: `${base}/6semestre/ContaminacionAtmosferica.pdf` },
        { nombre: 'Gestión Ambiental II', url: `${base}/6semestre/GestionAmbiental_II.pdf` },
        { nombre: 'Ingeniería de Costos', url: `${base}/6semestre/IngenieriaDeCostos.pdf` },
        { nombre: 'Gestión de Residuos', url: `${base}/6semestre/GestionDeResiduos.pdf` },
        { nombre: 'Componentes de Equipo Industrial', url: `${base}/6semestre/ComponentesdeEquipoIndustrial.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Taller de Investigación II', url: `${base}/7semestre/TallerDeInvestigacion-II-AC010.pdf` },
        { nombre: 'Potabilización de Agua', url: `${base}/7semestre/PotabilizacionDeAgua.pdf` },
        { nombre: 'Evaluación de Impacto Ambiental', url: `${base}/7semestre/EvaluacionDeImpactoAmbiental.pdf` },
        { nombre: 'Remediación de Suelos', url: `${base}/7semestre/RemediacionDeSuelos.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Seguridad e Higiene Industrial', url: `${base}/8semestre/SeguridadeHigieneIndustrial.pdf` },
        { nombre: 'Fundamentos de Aguas Residuales', url: `${base}/8semestre/FundamentosdeAguasResiduales.pdf` },
        { nombre: 'Formulación y Evaluación de Proyectos', url: `${base}/8semestre/AE029FormulacionyEvaluaciondeProyectos.pdf` },
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
      nombre: 'Manejo y Gestión de Residuos',
      icono: '🗑️',
      color: '#2E7D32',
      materias: (() => {
        const esp = 'https://villahermosa.tecnm.mx/docs/oferta/ingambiental/especialidad';
        return [
          { nombre: 'Manejo de Residuos de Manejo Especial', url: `${esp}/ManejodeResiduosdeManejoEspecial.pdf` },
          { nombre: 'Manejo de Residuos Sólidos Urbanos I', url: `${esp}/ManejodeResiduosSolidosUrbanosI.pdf` },
          { nombre: 'Manejo de Residuos Sólidos Urbanos II', url: `${esp}/ManejodeResiduosSolidosUrbanosII.pdf` },
          { nombre: 'Manejo de Residuos Peligrosos', url: `${esp}/ManejodeResiduosPeligrosos.pdf` },
          { nombre: 'Minimización y Valoración de RSU', url: `${esp}/MinimizacionyValoraciondeRSU.pdf` },
        ];
      })(),
    },
  ],
};