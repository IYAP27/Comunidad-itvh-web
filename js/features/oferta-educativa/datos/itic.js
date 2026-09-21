export default {
  nombreCompleto: 'Ing. en Tecnologías de la Información y Comunicaciones',
  departamento: 'Departamento de Sistemas y Computación',
  color: '#5E35B1', // cs.secondary — distingue ITIC de ISC (primary) e IINF (tertiary)
  iconoFondo: '📶',

  objetivoGeneral: 'Formar profesionistas capaces de desarrollar, integrar y administrar tecnologías de la información y comunicaciones que contribuyan a la productividad y al logro de los objetivos estratégicos de las organizaciones en un entorno globalizado; caracterizándose por ser líderes, críticos, competentes, éticos y con visión emprendedora, comprometidos con el desarrollo sustentable.',

  colorIngreso: '#5E35B1',
  perfilIngreso: [
    'Tener habilidades para programar en un lenguaje de computadora.',
    'Interés por el uso de nuevas tecnologías.',
    'Tener gusto y creatividad para el desarrollo de nuevas tecnologías.',
    'Personalidad emprendedora.',
  ],

  colorEgreso: '#2E7D32',
  perfilEgreso: [
    'Diseña, implementa y administra redes de cómputo y comunicaciones para satisfacer las necesidades de información de las organizaciones, con base en modelos y estándares internacionales.',
    'Administra proyectos que involucren Tecnologías de la Información y Comunicaciones para el logro de los objetivos organizacionales conforme a requerimientos establecidos.',
    'Desarrolla e implementa sistemas de información para la gestión de procesos y apoyo en la toma de decisiones, utilizando metodologías basadas en estándares internacionales.',
    'Diseña, desarrolla y gestiona sistemas de bases de datos para garantizar la integridad, disponibilidad y confidencialidad de la información.',
    'Integra soluciones de sistemas de comunicación con diferentes tecnologías, plataformas o dispositivos.',
    'Desempeña funciones de consultoría y auditoría para validar procesos y garantizar la calidad en el uso de las Tecnologías de la Información y Comunicaciones.',
    'Crea empresas en el ámbito de las Tecnologías de la Información y Comunicaciones para contribuir al desarrollo del entorno.',
    'Integra las diferentes arquitecturas de hardware y administra plataformas de software para incrementar la productividad en las organizaciones.',
    'Implementa sistemas de seguridad acorde a políticas internas de las organizaciones basados en estándares establecidos, con la finalidad de garantizar la integridad y consistencia de la información.',
    'Aplica los aspectos de legislación informática para regular el uso y explotación de las Tecnologías de la Información y Comunicaciones.',
    'Diseña e implementa dispositivos con software embebido para aplicaciones de propósito específico.',
    'Utiliza tecnologías emergentes y herramientas actuales para atender necesidades acordes al entorno.',
    'Diseña e implementa interfaces gráficas de usuario para facilitar la interacción entre el ser humano, los equipos y sistemas electrónicos.',
    'Posee habilidades metodológicas de investigación que fortalezcan el desarrollo cultural, científico y tecnológico en el ámbito de sistemas computacionales y disciplinas afines.',
    'Selecciona y aplica herramientas matemáticas para el modelado, diseño y desarrollo de tecnología computacional.',
    'Desempeña sus actividades profesionales considerando los aspectos legales, éticos, sociales y de desarrollo sustentable.',
  ],

  // _CampoLaboralSection con chips de empresas (Microsoft, Google, NIC México)
  campoLaboral: ['Microsoft', 'Google', 'NIC México'],

  reticulasTitulo: 'Retícula ITIC-2010-225',
  reticulas: [
    { clave: 'ITIC-2010-225', nombre: 'Gestión de Datos', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/ITIC-2010-225--ITIE-GDD-2023-01.pdf' },
    { clave: 'ITIC-2010-225', nombre: 'Desarrollo de Aplicaciones Multiplataforma', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/ITIC-2010-225--ITIE-DAM-2023-02.pdf' },
    { clave: 'ITIC-2010-225', nombre: 'Infraestructura y Seguridad en Redes', url: 'http://cc.villahermosa.tecnm.mx/sys/estpro/reticulas/ITIC-2010-225--ITIE-ISR-2023-03.pdf' },
  ],

  semestres: (() => {
    const base = 'https://villahermosa.tecnm.mx/docs/oferta/ingtic/temario2010';
    return [
      { numero: 1, materias: [
        { nombre: 'Cálculo Diferencial', url: `${base}/1semestre/CalculoDiferencial-AC001.pdf` },
        { nombre: 'Fundamentos de Programación', url: `${base}/1semestre/FundamentosdeProgramacion-AEF-1032.pdf` },
        { nombre: 'Matemáticas Discretas I', url: `${base}/1semestre/MatematicasDiscretas-I.pdf` },
        { nombre: "Introducción a las TIC's", url: `${base}/1semestre/IntroduccionalasTICs.pdf` },
        { nombre: 'Taller de Ética', url: `${base}/1semestre/TallerdeEtica-AC007.pdf` },
        { nombre: 'Fundamentos de Investigación', url: `${base}/1semestre/FundamentosdeInvestigacion-AC006.pdf` },
      ]},
      { numero: 2, materias: [
        { nombre: 'Cálculo Integral', url: `${base}/2semestre/CalculoIntegral-AC002.pdf` },
        { nombre: 'Programación Orientada a Objetos', url: `${base}/2semestre/ProgramacionOrientadaaObjetos-AE054.pdf` },
        { nombre: 'Matemáticas Discretas II', url: `${base}/2semestre/MatematicasDiscretas-II.pdf` },
        { nombre: 'Álgebra Lineal', url: `${base}/2semestre/AlgebraLineal-AC003.pdf` },
        { nombre: 'Probabilidad y Estadística', url: `${base}/2semestre/ProbabilidadyEstadistica-AE052.pdf` },
        { nombre: 'Contabilidad y Costos', url: `${base}/2semestre/ContabilidadyCostos.pdf` },
      ]},
      { numero: 3, materias: [
        { nombre: 'Estructuras y Organización de Datos', url: `${base}/3semestre/EstructurasyOrganizaciondeDatos.pdf` },
        { nombre: 'Matemáticas para la Toma de Decisiones', url: `${base}/3semestre/MatematicasparalaTomadeDecisiones.pdf` },
        { nombre: 'Fundamentos de Base de Datos', url: `${base}/3semestre/FundamentosdeBasedeDatos-AE031.pdf` },
        { nombre: 'Electricidad y Magnetismo', url: `${base}/3semestre/ElectricidadyMagnetismo.pdf` },
        { nombre: 'Administración Gerencial', url: `${base}/3semestre/AdministracionGerencial.pdf` },
      ]},
      { numero: 4, materias: [
        { nombre: 'Matemáticas Aplicadas a Comunicaciones', url: `${base}/4semestre/MatematicasAplicadasaComunicaciones.pdf` },
        { nombre: 'Programación II', url: `${base}/4semestre/Programacion-II.pdf` },
        { nombre: 'Fundamentos de Redes', url: `${base}/4semestre/FundamentosdeRedes.pdf` },
        { nombre: 'Taller de Base de Datos', url: `${base}/4semestre/TallerdeBasedeDatos-AE063.pdf` },
        { nombre: 'Circuitos Eléctricos y Electrónicos', url: `${base}/4semestre/CircuitosElectricosyElectronicos.pdf` },
        { nombre: 'Ingeniería de Software', url: `${base}/4semestre/IngenieriadeSoftware.pdf` },
      ]},
      { numero: 5, materias: [
        { nombre: 'Análisis de Señales y Sistemas de Comunicación', url: `${base}/5semestre/AnalisisdeSenalesySistemasdeComunicacion.pdf` },
        { nombre: 'Administración de Proyectos', url: `${base}/5semestre/AdministraciOndeProyectos.pdf` },
        { nombre: 'Redes de Computadoras', url: `${base}/5semestre/RedesdeComputadoras.pdf` },
        { nombre: 'Base de Datos Distribuidas', url: `${base}/5semestre/BasesdeDatosDistribuidas.pdf` },
        { nombre: 'Arquitectura de Computadoras', url: `${base}/5semestre/ArquitecturadeComputadoras.pdf` },
        { nombre: 'Taller de Ingeniería de Software', url: `${base}/5semestre/TallerdeIngenieriadeSoftware.pdf` },
      ]},
      { numero: 6, materias: [
        { nombre: 'Telecomunicaciones', url: `${base}/6semestre/Telecomunicaciones.pdf` },
        { nombre: 'Programación Web', url: `${base}/6semestre/ProgramacionWeb-AE055.pdf` },
        { nombre: 'Desarrollo de Emprendedores', url: `${base}/6semestre/Desarrollo%20de%20Emprendedores.pdf` },
        { nombre: 'Sistemas Operativos I', url: `${base}/6semestre/SistemasOperativos-I-AE061.pdf` },
        { nombre: 'Desarrollo Sustentable', url: `${base}/6semestre/DesarrolloSustentable-AC008.pdf` },
        { nombre: 'Tecnologías Inalámbricas', url: `${base}/6semestre/TecnologiasInalambricas.pdf` },
      ]},
      { numero: 7, materias: [
        { nombre: 'Redes Emergentes', url: `${base}/7semestre/RedesEmergentes.pdf` },
        { nombre: 'Desarrollo de Apps para Disp. Móviles', url: `${base}/7semestre/DesarrolloAplicacionesDispositivosMoviles-AE011.pdf` },
        { nombre: 'Taller de Investigación I', url: `${base}/7semestre/TallerdeInvestigacion-I-AC009.pdf` },
        { nombre: 'Sistemas Operativos II', url: `${base}/7semestre/SistemasOperativos-II-AE062.pdf` },
        { nombre: 'Negocios Electrónicos I', url: `${base}/7semestre/NegociosElectronicos%20I.pdf` },
        { nombre: 'Interacción Humano Computadora', url: `${base}/7semestre/InteraccionHumanoComputadora.pdf` },
      ]},
      { numero: 8, materias: [
        { nombre: 'Administración y Seguridad de Redes', url: `${base}/8semestre/AdministracionySeguridaddeRedes.pdf` },
        { nombre: 'Auditoría en Tecnologías de la Información', url: `${base}/8semestre/AuditoriaenTecnologiasdelaInformacion.pdf` },
        { nombre: 'Taller de Investigación II', url: `${base}/8semestre/TallerdeInvestigacionII-AC010.pdf` },
        { nombre: 'Ingeniería del Conocimiento', url: `${base}/8semestre/IngenieriadelConocimiento.pdf` },
        { nombre: 'Negocios Electrónicos II', url: `${base}/8semestre/NegociosElectronicos-II.pdf` },
      ]},
      { numero: 9, materias: [
        { nombre: 'Especialidad', url: '' },
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