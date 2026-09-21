export default {
  nombreCompleto: 'Ingeniería Petrolera',
  departamento: 'Departamento de Ciencias de la Tierra',
  color: '#2E7D32',
  iconoFondo: '🛢️',

  objetivoGeneral: 'Formar profesionales con la capacidad para desarrollar la programación, ejecución y la dirección de los procesos de explotación de hidrocarburos, aprovechando de manera sustentable los recursos naturales, atendiendo la preservación del medio ambiente, aplicando para ello las nuevas tecnologías, con habilidades, actitudes, aptitudes analíticas y creativas, de liderazgo y calidad humana, con un espíritu de superación permanente para investigar, desarrollar y aplicar el conocimiento científico y tecnológico.',

  colorIngreso: '#5E35B1',
  perfilIngreso: [
    'Dominio de habilidades básicas como la comprensión de textos.',
    'El trabajo en equipo.',
    'Interés sobre el tema de relevancia.',
    'Iniciativa, capacidad de gestión, de comunicación y creatividad.',
    'Interés por la investigación de las causas que deterioran el ambiente y respeto a la naturaleza.',
    'Inclinación por el conocimiento científico-tecnológico e interés en las ciencias básicas y naturales, y en sus aplicaciones para la solución de problemas.',
  ],

  colorEgreso: '#00838F',
  perfilEgreso: [
    'Identifica las características geológicas, petrofísicas y dinámicas que controlan la capacidad de almacenamiento de hidrocarburos y la producción de yacimientos, aplicando tecnología de punta.',
    'Mejora, diseña, implementa y evalúa los sistemas y modelos de exploración, producción y distribución para la optimización de los recursos con un enfoque de calidad y competitividad.',
    'Aplica técnicas de exploración y producción que ayuden en la interpretación y evaluación de las posibilidades de localización de yacimientos petroleros, así como pozos acuíferos.',
    'Maneja software para el diseño, simulación y operación de los sistemas de exploración y producción de hidrocarburos.',
    'Gestiona proyectos y realiza programas de investigación y desarrollo tecnológico para la solución de problemas en la industria petrolera.',
    'Se desempeña con una actitud ética y emprendedora en su ámbito profesional, comprometido con el desarrollo sustentable del entorno.',
    'Emplea adecuadamente las técnicas y procedimientos de campo con base en las leyes, reglamentos y códigos vigentes inherentes a su ejercicio profesional.',
    'Programa, organiza, dirige, ejecuta y controla las actividades relacionadas con la producción del petróleo y gas para su almacenamiento, procesamiento, transporte, distribución y comercialización, aplicando los principios de gestión de la calidad ambiental hacia la mejora continua.',
    'Propone soluciones integrales y estrategias a los problemas ambientales y de seguridad.',
    'Participa en equipos de trabajo multi e interdisciplinario para la toma de decisiones y solución de problemas.',
    'Administra e integra recursos humanos, materiales, financieros y económicos en el diseño, operación, evaluación, control y optimización de los procesos de perforación de pozos petroleros y acuíferos, así como su terminación y mantenimiento.',
  ],

  campoLaboral: [
    'Dependencias del gobierno en los ámbitos federal, estatal y municipal; organismos públicos desconcentrados y/o descentralizados.',
    'Empresas del sector industrial en general, y de los ramos minero-metalúrgico, energético, de obras y proyectos civiles.',
    'Instituciones educativas de nivel medio o superior, así como de investigación, tanto públicas como privadas.',
    'Profesional independiente que realiza capacitación para empresas, estudios de impacto ambiental, de riesgo, auditorías ambientales, propuesta de innovaciones tecnológicas para empresas, etc.',
    'Organizaciones no gubernamentales encaminadas a la promoción de Cultura Ambiental Limpia.',
  ],

  reticulasTitulo: 'Retícula 2010',
  reticulas: [
    { clave: 'IPET-2010', nombre: 'Productividad en el Sector Petrolero', url: 'https://villahermosa.tecnm.mx/docs/oferta/ingpetrolera/reticula/RETICULA_PETROLERA_PRODUCTIVIDAD.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingpetrolera/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Química Inorgánica', url: `${base}/1semestre/QuimicaInorganica.pdf` },
        { nombre: 'Geología Petrolera', url: `${base}/1semestre/GEOLOGIAPETROLERA.pdf` },
        { nombre: 'Computación para Ingeniería Petrolera', url: `${base}/1semestre/COMPUTACIONPARAINGENIERIAPETROLERA.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-AC007.pdf` },
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-AC006.pdf` },
        { nombre: 'Cálculo Diferencial', url: `${base}/1semestre/CalculoDiferencial-AC001.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Química Orgánica', url: `${base}/2semestre/QuimicaOrganica.pdf` },
        { nombre: 'Cálculo Integral', url: `${base}/2semestre/CalculoIntegral-AC002.pdf` },
        { nombre: 'Álgebra Lineal', url: `${base}/2semestre/AlgebraLineal-AC003.pdf` },
        { nombre: 'Geología de Yacimientos', url: `${base}/2semestre/GEOLOGIADEYACIMIENTOS.pdf` },
        { nombre: 'Estática', url: `${base}/2semestre/ESTATICA.pdf` },
        { nombre: 'Economía', url: `${base}/2semestre/Economia.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Análisis Numérico', url: `${base}/3semestre/AnalisisNumerico.pdf` },
        { nombre: 'Geología de Explotación del Petróleo', url: `${base}/3semestre/GEOLOGIADEEXPLOTACIONDELPETROLEO.pdf` },
        { nombre: 'Dinámica', url: `${base}/3semestre/DINAMICA.pdf` },
        { nombre: 'Cálculo Vectorial', url: `${base}/3semestre/CalculoVectorial-AC004.pdf` },
        { nombre: 'Administración', url: `${base}/3semestre/Administracion.pdf` },
        { nombre: 'Termodinámica', url: `${base}/3semestre/TERMODINAMICA.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Probabilidad y Estadística Aplicada al Campo Petrolero', url: `${base}/4semestre/probyestadaplicadalcampopetrolero.pdf` },
        { nombre: 'Administración de la Seguridad y Protección Ambiental', url: `${base}/4semestre/AdministraciondelaSegyProtAmbiental.pdf` },
        { nombre: 'Electricidad y Magnetismo', url: `${base}/4semestre/electricidadymagnetismo.pdf` },
        { nombre: 'Mecánica de Fluidos', url: `${base}/4semestre/mecanicadefluidos.pdf` },
        { nombre: 'Ecuaciones Diferenciales', url: `${base}/4semestre/EcuacionesDiferenciales-AC005.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/4semestre/DesarrolloSustentable-AC008.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Métodos Eléctricos', url: `${base}/5semestre/metodoselectricos.pdf` },
        { nombre: 'Calidad en la Industria Petrolera', url: `${base}/5semestre/Calidadenlaindustriapetrolera.pdf` },
        { nombre: 'Análisis e Interpretación de Planos y Diseño', url: `${base}/5semestre/ANALISISEINTERPRETACIONDEPLANOSYDISENODEINGENIERIA.pdf` },
        { nombre: 'Propiedades de los Fluidos Petroleros', url: `${base}/5semestre/Propiedadesdelosfluidospetroleros.pdf` },
        { nombre: 'Petrofísica y Registro de Pozos', url: `${base}/5semestre/petrofisicayregistrosdepozos.pdf` },
        { nombre: 'Taller de Investigación I', url: `${base}/5semestre/TallerdeInvestigacionI-ACA-0909.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Flujo Multifásico en Tuberías', url: `${base}/6semestre/FlujoMultifasicoenTuberias.pdf` },
        { nombre: 'Sistemas de Bombeo en la Industria Petrolera', url: `${base}/6semestre/SistemasdeBombeoenlaIndustriaPetrolera.pdf` },
        { nombre: 'Legislación de la Industria Petrolera', url: `${base}/6semestre/legislacionenlaindustriapetrolera.pdf` },
        { nombre: 'Productividad de Pozos', url: `${base}/6semestre/Productividaddepozos.pdf` },
        { nombre: 'Instrumentación', url: `${base}/6semestre/Instrumentacion-AEF-1038.pdf` },
        { nombre: 'Hidráulica', url: `${base}/6semestre/Hidraulica.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Ingeniería de Perforación de Pozos', url: `${base}/7semestre/Ing.deperforaciondepozos.pdf` },
        { nombre: 'Taller de Investigación II', url: `${base}/7semestre/TallerdeInvestigacionII-ACA-0910.pdf` },
        { nombre: 'Conducción y Manejo de Hidrocarburos', url: `${base}/7semestre/ConduccionyManejodeHidrocarburos.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Formulación y Evaluación de Proyectos', url: `${base}/8semestre/FormulacionyEvaluaciondeProyectos-AEF-1029.pdf` },
        { nombre: 'Terminación y Mantenimiento de Pozos', url: `${base}/8semestre/Terminacionymantenimientodepozos.pdf` },
        { nombre: 'Recuperación Secundaria y Mejorada', url: `${base}/8semestre/RecuperacionSecundariayMejorada_OK.pdf` },
        { nombre: 'Sistemas Artificiales', url: `${base}/8semestre/SistemasArtificiales.pdf` },
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
      nombre: 'Productividad en el Sector Petrolero',
      icono: '🛢️',
      color: '#2E7D32',
      materias: (() => {
        const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingpetrolera/temario2010';
        return [
          { nombre: 'Caracterización Estática de Yacimientos', url: `${base}/Especialidad/PSG-1801_Caracterizacion_Estatica_de_Yacimientos_7.pdf` },
          { nombre: 'Análisis de Pruebas de Presión I', url: `${base}/Especialidad/PSF-1802_Analisis_de_Pruebas_de_Presion_I_7.pdf` },
          { nombre: 'Análisis de Pruebas de Presión II', url: `${base}/Especialidad/PSD-1803_Analisis_de_Pruebas_de_Presion_II_8.pdf` },
          { nombre: 'Administración de Datos de Pozos', url: `${base}/Especialidad/PSG-1804_Administracion_de_Datos_de_Pozos_8.pdf` },
          { nombre: 'Perforación de Pozos No Convencional', url: `${base}/Especialidad/PSF-1805_Perforacion_de_Pozos_No_Convencional_9.pdf` },
          { nombre: 'Administración Integral de Yacimientos', url: `${base}/Especialidad/PSJ-1806_Administracion_Integral_de_Yacimientos_9.pdf` },
        ];
      })(),
    },
  ],
};