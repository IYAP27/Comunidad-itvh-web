export default {
  nombreCompleto: 'Ingeniería Civil',
  departamento: 'Departamento de Ciencias de la Tierra',
  color: '#2E7D32',
  iconoFondo: '🏗️',

  cardsResumen: [
    { icono: '🚩', titulo: 'Misión', color: '#2E7D32',
      contenido: 'Formar profesionistas en Ingeniería Civil con una preparación científica-tecnológica con competencias sinérgicas, espíritu innovador que contribuya al desarrollo sustentable y a la calidad de vida del ser humano.' },
    { icono: '👁️', titulo: 'Visión', color: '#00838F',
      contenido: 'Ser un programa de ingeniería Civil de calidad, que impulsa el desarrollo integral, sostenido y sustentable.' },
  ],

  objetivoGeneral: 'Formar profesionistas en ingeniería civil de manera integral, con visión humana, analítica, creativa y emprendedora, capaces de identificar y resolver problemas con eficiencia, eficacia y pertinencia, mediante la planeación, diseño, construcción, operación y conservación de obras de infraestructura, en el marco de la globalización, la sustentabilidad y la calidad, contribuyendo al desarrollo de la sociedad.',

  objetivosEspecificos: [
    [1, 'Resolver Problemas', 'Identifica, determina o resuelve problemas en las áreas de Hidráulica, Estructuras, Vías Terrestre y Construcción.'],
    [2, 'Saber Diseñar', 'Diseña y desarrolla proyectos para solucionar problemas de obras civiles.'],
    [3, 'Hacer Experimentos', 'Formula y ejecuta proyectos de investigación y desarrollo tecnológico en el ámbito de la Ingeniería Civil.'],
    [4, 'Saber Comunicarse', "Utiliza Tecnologías de la Información y Comunicación (TIC's), software especializado y herramientas electrónicas para el diseño de proyectos de Ingeniería Civil."],
    [5, 'Ser Ético', 'Optimiza el uso de los recursos en los procesos constructivos de obras civiles, con sentido ético y profesional.'],
    [6, 'Actualizarse', 'Se actualiza constantemente para realizar estudios de factibilidad ambiental, económica, técnica y financiera de los proyectos de obras civiles.'],
    [7, 'Trabajar en Equipo', 'Coordina y participa en equipos multidisciplinarios para la aplicación de soluciones innovadoras en proyectos de Ingeniería Civil.'],
  ],

  colorIngreso: '#5E35B1',
  perfilIngreso: [
    'El estudiante de Ingeniería Civil debe mostrar habilidad e ingenio para la solución de problemas.',
    'Tener predilección por las ciencias físico-matemáticas.',
    'Disposición para el trabajo arduo y en equipo.',
  ],

  colorEgreso: '#00838F',
  perfilEgreso: [
    'Planea, proyecta, diseña, construye, opera y conserva obras hidráulicas y sanitarias, sistemas estructurales, vías terrestres, edificación y obras de infraestructura urbana e industrial para el desarrollo de la sociedad.',
    'Dirige equipos técnicos para determinar la factibilidad ambiental, económica, técnica y social de los proyectos de obras civiles.',
    'Formula y ejecuta proyectos de investigación para el desarrollo tecnológico en el ámbito de la Ingeniería Civil.',
    'Crea, adapta, innova y aplica tecnologías en los estudios, proyectos y construcción de obras civiles para los requerimientos de la sociedad.',
    'Administra proyectos para optimizar el uso de los recursos en el logro de los objetivos de las obras civiles.',
    'Emplea técnicas de control de calidad en los materiales y procesos constructivos para la seguridad y durabilidad de las obras de ingeniería civil.',
    'Utiliza tecnologías de la información y comunicación para la optimización de los proyectos de Ingeniería Civil.',
    'Emprende proyectos productivos pertinentes para el desarrollo sustentable de las comunidades.',
  ],

  campoLaboral: [
    'Pemex.',
    'Secretaría de Comunicaciones y Transporte.',
    'Secretarías de Obras Públicas (Ayuntamientos).',
    'Secretaría de Ordenamiento Territorial y Obras Públicas del Estado de Tabasco.',
  ],

  reticulasTitulo: 'Retículas 2010-208',
  reticulas: [
    { clave: 'ICIV-2010-208--ICIE-CMV-2024-04', nombre: 'Construcción y Mantenimiento de Vías Terrestres', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/ICIV-2010-208--ICIE-CMV-2024-04.pdf' },
    { clave: 'ICIV-2010-208--ICIE-EST-2023-01', nombre: 'Estructuras', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/ICIV-2010-208--ICIE-EST-2023-01.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingcivil/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-AC006.pdf` },
        { nombre: 'Cálculo Diferencial', url: `${base}/1semestre/CalculoDiferencial-AC001.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-AC007.pdf` },
        { nombre: 'Química', url: `${base}/1semestre/Quimica-AE058.pdf` },
        { nombre: 'Software en Ingeniería Civil', url: `${base}/1semestre/SOFTWARE-DE-INGENIERIA-CIVIL.pdf` },
        { nombre: 'Dibujo en Ingeniería Civil', url: `${base}/1semestre/DIBUJO-EN-INGENIERIA-CIVIL.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Cálculo Integral', url: `${base}/2semestre/CalculoIntegral-AC002.pdf` },
        { nombre: 'Cálculo Vectorial', url: `${base}/2semestre/CalculoVectorial-AC004.pdf` },
        { nombre: 'Probabilidad y Estadística', url: `${base}/2semestre/PROBABILIDADYESTADISTICA.pdf` },
        { nombre: 'Topografía', url: `${base}/2semestre/TOPOGRAFIA.pdf` },
        { nombre: 'Materiales y Procesos Constructivos', url: `${base}/2semestre/MATERIALESYPROCESOSCONSTRUCTIVOS.pdf` },
        { nombre: 'Geología', url: `${base}/2semestre/GEOLOGIA.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Álgebra Lineal', url: `${base}/3semestre/AlgebraLineal-AC003.pdf` },
        { nombre: 'Ecuaciones Diferenciales', url: `${base}/3semestre/EcuacionesDiferenciales-AC005.pdf` },
        { nombre: 'Estática', url: `${base}/3semestre/ESTATICA.pdf` },
        { nombre: 'Carreteras', url: `${base}/3semestre/CARRETERAS.pdf` },
        { nombre: 'Tecnología del Concreto', url: `${base}/3semestre/TECNOLOGIADELCONCRETO.pdf` },
        { nombre: 'Sistemas de Transporte', url: `${base}/3semestre/SISTEMASDETRANSPORTE.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Fundamentos de la Mecánica de los Medios Continuos', url: `${base}/4semestre/FUNDAMENTOSDELAMECANICADELOSMEDIOSCONTINUOS.pdf` },
        { nombre: 'Métodos Numéricos', url: `${base}/4semestre/METODOSNUMERICOS.pdf` },
        { nombre: 'Mecánica de Suelos', url: `${base}/4semestre/MECANICADESUELOS.pdf` },
        { nombre: 'Maquinaria Pesada y Movimiento de Tierras', url: `${base}/4semestre/MAQUINARIAPESADAYMOVIMIENTODETIERRAS.pdf` },
        { nombre: 'Dinámica', url: `${base}/4semestre/DINAMICA.pdf` },
        { nombre: 'Modelos de Optimización de Recursos', url: `${base}/4semestre/MODELOSDEOPTIMIZACIONDERECURSOS.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Mecánica de Materiales', url: `${base}/5semestre/MECANICADEMATERIALES.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/5semestre/DesarrolloSustentable-AC008.pdf` },
        { nombre: 'Mecánica de Suelos Aplicada', url: `${base}/5semestre/MECANICADESUELOSAPLICADA.pdf` },
        { nombre: 'Costos y Presupuestos', url: `${base}/5semestre/COSTOSYPRESUPUESTOS.pdf` },
        { nombre: 'Taller de Investigación I', url: `${base}/5semestre/TallerdeInvestigacion-I-AC009.pdf` },
        { nombre: 'Hidráulica Básica', url: `${base}/5semestre/HIDRAULICABASICA.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Análisis Estructural', url: `${base}/6semestre/ANALISISESTRUCTURAL.pdf` },
        { nombre: 'Instalaciones en los Edificios', url: `${base}/6semestre/INSTALACIONESENLOSEDIFICIOS.pdf` },
        { nombre: 'Diseño y Construcción de Pavimentos', url: `${base}/6semestre/DISENOYCONSTRUCCIONDEPAVIMENTOS.pdf` },
        { nombre: 'Administración de la Construcción', url: `${base}/6semestre/ADMINISTRACIONDELACONSTRUCCION.pdf` },
        { nombre: 'Hidrología Superficial', url: `${base}/6semestre/HIDROLOGIASUPERFICIAL.pdf` },
        { nombre: 'Hidráulica de Canales', url: `${base}/6semestre/HIDRAULICADECANALES.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Análisis Estructural Avanzado', url: `${base}/7semestre/ANALISISESTRUCTURAL-AVANZADO.pdf` },
        { nombre: 'Diseño de Elementos de Concreto Reforzado', url: `${base}/7semestre/DISENODEELEMENTOSDECONCRETOREFORZADO.pdf` },
        { nombre: 'Taller de Investigación II', url: `${base}/7semestre/TallerdeInvestigacionII-AC010.pdf` },
        { nombre: 'Abastecimiento de Agua', url: `${base}/7semestre/ABASTECIMIENTODEAGUA.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Diseño Estructural de Cimentaciones', url: `${base}/8semestre/DISENOESTRUCTURALDECIMENTACIONES.pdf` },
        { nombre: 'Diseño de Elementos de Acero', url: `${base}/8semestre/DISENODEELEMENTOSDEACERO.pdf` },
        { nombre: 'Formulación y Evaluación de Proyectos', url: `${base}/8semestre/FORMULACIONYEVALUACIONDEPROYECTOS.pdf` },
        { nombre: 'Alcantarillado', url: `${base}/8semestre/ALCANTARILLADO.pdf` },
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
      nombre: 'Estructuras (ICIE-EST-2023-01)',
      icono: '🏗️',
      color: '#2E7D32',
      materias: (() => {
        const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingcivil/temario2010';
        return [
          { nombre: 'Normas y Reglamentos para Diseños Estructurales y Sostenibles', url: `${base}/Especialidad/ICIE-EST-2023-01/NormasyReglamentos.pdf` },
          { nombre: 'Obras de Ingeniería Sostenible', url: `${base}/Especialidad/ICIE-EST-2023-01/ObrasdeIngenieriIaSostenible.pdf` },
          { nombre: 'Análisis Sísmico y Eólico', url: `${base}/Especialidad/ICIE-EST-2023-01/AnalisisSismicoyEolico.pdf` },
          { nombre: 'Estructuras de Mampostería', url: `${base}/Especialidad/ICIE-EST-2023-01/EstructurasdeMamposteria.pdf` },
          { nombre: 'Diseño Estructural Sostenible Con Elementos Prefabricados', url: `${base}/Especialidad/ICIE-EST-2023-01/Disen%CC%83oEstructuralSostenible.pdf` },
        ];
      })(),
    },
    {
      nombre: 'Construcción y Mantenimiento de Vías Terrestres (ICIE-CMV-2024-04)',
      icono: '🛣️',
      color: '#5E35B1',
      materias: (() => {
        const base24 = 'https://villahermosa.tecnm.mx/docs/oferta/ingcivil/temario2024';
        return [
          { nombre: 'Ingeniería de Tránsito Revisada', url: `${base24}/Especialidad/ICIE-CMV-2024-04/Ingenieriadetransitorevisada.pdf` },
          { nombre: 'Topografía Aplicada', url: `${base24}/Especialidad/ICIE-CMV-2024-04/TOPOGRAFIAAPLICADA.pdf` },
          { nombre: 'Construcción de Vías Férreas', url: `${base24}/Especialidad/ICIE-CMV-2024-04/CONSTRUCCIONDEVIASFERREAS.pdf` },
          { nombre: 'Mantenimiento y Conservación de Vías Terrestres', url: `${base24}/Especialidad/ICIE-CMV-2024-04/MantoconservacionViasterrestres.pdf` },
          { nombre: 'Auditoría de Seguridad a las Vías Férreas', url: `${base24}/Especialidad/ICIE-CMV-2024-04/AuditoriaSeguridadViasFerreas.pdf` },
        ];
      })(),
    },
  ],
};