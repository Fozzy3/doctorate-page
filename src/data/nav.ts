export interface NavItem {
  slug: string;
  label: string;
}

export interface NavSection {
  id: string;
  label: string;
  /** Frase corta y factual mostrada en el mega-menú */
  blurb: string;
  /** Imagen destacada del mega-menú (en public/images/) */
  image: string;
  imageAlt: string;
  items: NavItem[];
}

// Fuente única de la navegación. Los slugs son idénticos a las URLs del
// sitio WordPress actual para que el reemplazo no rompa ningún enlace.
export const sections: NavSection[] = [
  {
    id: 'programa',
    label: 'El programa',
    blurb:
      'Formación doctoral de la Facultad de Ingeniería: 90 créditos, 3 años y dos énfasis de investigación.',
    image: '/images/hero-ingenieria.jpg',
    imageAlt: 'Fachada de la Facultad de Ingeniería de la Universidad Distrital',
    items: [
      { slug: 'acerca-del-doctorado', label: 'Acerca del doctorado' },
      { slug: 'informacion-del-doctorado-en-ingenieria', label: 'Información general' },
      { slug: 'plan-general-de-estudios', label: 'Plan general de estudios' },
      { slug: 'gestion-curricular', label: 'Gestión curricular' },
      { slug: 'cursos-2026', label: 'Cursos 2026' },
      { slug: 'cursos-2025', label: 'Cursos 2025' },
      { slug: 'calendario-de-actividades-2026', label: 'Calendario 2026' },
      { slug: 'normatividad', label: 'Normatividad' },
      { slug: 'preguntas-frecuentes-doctorado', label: 'Preguntas frecuentes' },
    ],
  },
  {
    id: 'admisiones',
    label: 'Admisiones',
    blurb: 'Calendario, requisitos, formatos y resultados del proceso de admisión al programa.',
    image: '/images/campus-tecnologica.jpg',
    imageAlt: 'Campus de la Facultad Tecnológica de la Universidad Distrital',
    items: [
      { slug: 'admisiones-doctorado', label: 'Proceso de admisión' },
      { slug: 'resultados-admisiones-2026-1', label: 'Resultados 2026-I' },
      { slug: 'formatos', label: 'Formatos' },
      { slug: 'solicitudes', label: 'Solicitudes' },
      { slug: 'solicitudes-consejo-de-carrera', label: 'Solicitudes al Consejo de Carrera' },
    ],
  },
  {
    id: 'posdoctorado',
    label: 'Posdoctorado',
    blurb:
      'Estancias posdoctorales en ingeniería para doctores que desarrollan investigación en la universidad.',
    image: '/images/libros.jpg',
    imageAlt: 'Muestra de libros académicos en el campus',
    items: [
      { slug: 'posdoctorado', label: 'El posdoctorado' },
      { slug: 'admisiones-posdoctorado-2023', label: 'Admisiones' },
      { slug: 'preguntas-frecuentes-posdoctorado', label: 'Preguntas frecuentes' },
    ],
  },
  {
    id: 'comunidad',
    label: 'Comunidad',
    blurb: 'Docentes, estudiantes, egresados y el equipo administrativo que hacen el programa.',
    image: '/images/grupos.jpg',
    imageAlt: 'Estudiantes en el campus de la Universidad Distrital',
    items: [
      { slug: 'docentes', label: 'Docentes' },
      { slug: 'docentes-invitados', label: 'Docentes invitados' },
      { slug: 'estudiantes', label: 'Estudiantes' },
      { slug: 'estudiantes-pasantes', label: 'Estudiantes pasantes' },
      { slug: 'egresados-2', label: 'Egresados' },
      { slug: 'equipo-de-trabajo', label: 'Equipo de trabajo' },
    ],
  },
  {
    id: 'investigacion',
    label: 'Investigación',
    blurb:
      '34 grupos de investigación adscritos, libros, memorias y el laboratorio de microrredes.',
    image: '/images/proyectos.jpg',
    imageAlt: 'Prototipo de invernadero automatizado desarrollado en la universidad',
    items: [
      { slug: 'grupos-de-investigacion', label: 'Grupos de investigación' },
      { slug: 'proyectos-2', label: 'Proyectos' },
      { slug: 'libros', label: 'Libros' },
      { slug: 'memorias', label: 'Memorias' },
      { slug: 'laboratorio-de-microrredes', label: 'Laboratorio de microrredes' },
    ],
  },
  {
    id: 'acreditacion',
    label: 'Acreditación',
    blurb:
      'Autoevaluación y acreditación en alta calidad: informes, plan de mejoramiento y visita de pares.',
    image: '/images/investigacion.jpg',
    imageAlt: 'Edificio de la Universidad Distrital Francisco José de Caldas',
    items: [
      { slug: 'procesos-de-acreditacion', label: 'Procesos de acreditación' },
      { slug: 'acreditacion-curriculo-y-calidad', label: 'Currículo y calidad' },
      { slug: 'plan-de-mejoramiento', label: 'Plan de mejoramiento' },
      { slug: 'tu-rol-en-la-acreditacion', label: 'Tu rol en la acreditación' },
      {
        slug: 'visita-de-pares-academicos-con-fines-de-acreditacion-en-alta-calidad',
        label: 'Visita de pares académicos',
      },
      { slug: 'informes', label: 'Informes' },
      { slug: 'actas-de-consejo', label: 'Actas de consejo' },
    ],
  },
  {
    id: 'cecad',
    label: 'CECAD',
    blurb:
      'Centro de Computación de Alto Desempeño: servidores, salas y servicios para la investigación.',
    image: '/images/campus-tecnologica.jpg',
    imageAlt: 'Campus de la Universidad Distrital',
    items: [
      { slug: 'que-es-el-cecad', label: 'Qué es el CECAD' },
      { slug: 'servicios-cecad', label: 'Servicios' },
      { slug: 'solicitudes-cecad', label: 'Solicitudes CECAD' },
      { slug: 'prestamo-de-salas-y-espacios-academicos', label: 'Préstamo de salas' },
      { slug: 'solicitudes-presatamo-de-licencias-de-software', label: 'Licencias de software' },
      { slug: 'estadisticas-de-uso-cecad-2022-2025', label: 'Estadísticas de uso' },
      { slug: 'access-grid', label: 'Access Grid' },
      { slug: 'sala-508', label: 'Sala 508' },
      { slug: 'sala-de-investigadores', label: 'Sala de investigadores' },
      { slug: 'sala-de-juntas', label: 'Sala de juntas' },
      { slug: 'sala-de-profesores', label: 'Sala de profesores' },
      { slug: 'sala-de-realidad-aumentada', label: 'Sala de realidad aumentada' },
      { slug: 'sala-videoconferencias', label: 'Sala de videoconferencias' },
    ],
  },
];

export function sectionOf(sectionId: string): NavSection | undefined {
  return sections.find((s) => s.id === sectionId);
}
