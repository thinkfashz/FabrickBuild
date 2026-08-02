export const DIGITAL_CONTACT = {
  whatsapp: '56930121625',
  email: 'faubricioedms@gmail.com',
  whatsappURL:
    'https://wa.me/56930121625?text=Hola%20FabrickBuild%2C%20quiero%20conversar%20sobre%20un%20proyecto%20digital.',
  emailURL: 'mailto:faubricioedms@gmail.com',
}

export type DigitalService = {
  slug: string
  eyebrow: string
  title: string
  shortTitle: string
  summary: string
  description: string
  idealFor: string[]
  deliverables: string[]
  technologies: string[]
  process: { title: string; description: string }[]
  outcomes: string[]
}

export type DigitalProject = {
  slug: string
  category: string
  title: string
  summary: string
  challenge: string
  solution: string
  modules: string[]
  technologies: string[]
  outcome: string
}

export const digitalServices: DigitalService[] = [
  {
    slug: 'diseno-web-ecommerce',
    eyebrow: 'PRESENCIA + CONVERSIÓN',
    title: 'Diseño web y e-commerce estratégico',
    shortTitle: 'Web y e-commerce',
    summary:
      'Sitios rápidos, administrables y visualmente memorables, pensados para convertir visitas en contactos, reservas o ventas.',
    description:
      'Diseñamos una experiencia propia para tu marca, sin depender de plantillas genéricas. Organizamos arquitectura, contenido, movimiento, navegación, formularios, catálogo y checkout para que cada sección tenga una función comercial clara.',
    idealFor: [
      'Empresas que necesitan una presencia profesional y diferenciada',
      'Tiendas con catálogo, stock, variantes, pagos y seguimiento',
      'Servicios que requieren cotización, captación de leads o reservas',
    ],
    deliverables: [
      'Arquitectura de información y recorrido de conversión',
      'Diseño responsive para móvil, tablet y escritorio',
      'CMS administrable, catálogo, checkout o formularios',
      'Optimización de imágenes, rendimiento y accesibilidad',
      'Integración con WhatsApp, correo, analítica y píxeles',
    ],
    technologies: ['Next.js', 'React', 'Payload CMS', 'Shopify', 'Vercel', 'Mercado Pago'],
    process: [
      { title: 'Estrategia', description: 'Definimos objetivo, público, propuesta y acción principal.' },
      { title: 'Prototipo', description: 'Ordenamos contenido, navegación y jerarquía visual antes de desarrollar.' },
      { title: 'Construcción', description: 'Desarrollamos componentes, CMS, integraciones y experiencia responsive.' },
      { title: 'Optimización', description: 'Medimos velocidad, SEO técnico, accesibilidad y conversión.' },
    ],
    outcomes: [
      'Una marca que se entiende en pocos segundos',
      'Contenido fácil de administrar y escalar',
      'Un recorrido diseñado para generar acciones reales',
    ],
  },
  {
    slug: 'software-sistemas-personalizados',
    eyebrow: 'OPERACIÓN + CONTROL',
    title: 'Software y sistemas personalizados',
    shortTitle: 'Software a medida',
    summary:
      'Aplicaciones web, paneles administrativos y herramientas internas construidas alrededor de tu proceso real.',
    description:
      'Convertimos tareas repetitivas, planillas dispersas y procesos manuales en un sistema centralizado. Cada módulo se diseña según roles, reglas, permisos, estados y necesidades operativas del negocio.',
    idealFor: [
      'Negocios que trabajan con planillas y procesos manuales',
      'Equipos que necesitan permisos, trazabilidad y paneles',
      'Operaciones con inventario, órdenes, clientes o estados',
    ],
    deliverables: [
      'Panel administrativo y experiencia por roles',
      'Flujos de trabajo, estados y automatizaciones',
      'Gestión de usuarios, permisos y sesiones',
      'Reportes, búsquedas, filtros y exportaciones',
      'API e integraciones con servicios externos',
    ],
    technologies: ['Next.js', 'NestJS', 'TypeScript', 'REST', 'GraphQL', 'WebSockets'],
    process: [
      { title: 'Levantamiento', description: 'Mapeamos actores, tareas, reglas y puntos de fricción.' },
      { title: 'Arquitectura', description: 'Definimos módulos, datos, permisos y contratos de integración.' },
      { title: 'Desarrollo', description: 'Construimos por etapas funcionales y verificables.' },
      { title: 'Entrega', description: 'Documentamos, desplegamos y dejamos una base preparada para crecer.' },
    ],
    outcomes: [
      'Menos trabajo repetido y errores operativos',
      'Información centralizada y trazable',
      'Un sistema alineado con la forma real de trabajar',
    ],
  },
  {
    slug: 'bases-de-datos-apis',
    eyebrow: 'DATOS + ARQUITECTURA',
    title: 'Bases de datos, APIs e integraciones',
    shortTitle: 'Datos e integraciones',
    summary:
      'Modelos SQL y relacionales sólidos para conectar productos, usuarios, operaciones y servicios externos.',
    description:
      'Diseñamos la estructura de datos desde las relaciones reales del negocio. Elegimos entre SQLite, PostgreSQL u otras herramientas según volumen, concurrencia, seguridad y forma de despliegue.',
    idealFor: [
      'Aplicaciones que necesitan una fuente de verdad confiable',
      'Sistemas que deben conectar varias plataformas',
      'Proyectos que requieren migración, limpieza o normalización de datos',
    ],
    deliverables: [
      'Modelo relacional, tablas, índices y restricciones',
      'SQL, migraciones y control de versiones del esquema',
      'APIs REST o GraphQL con validación y seguridad',
      'Integraciones con pagos, correo, CRM, ERP o servicios externos',
      'Estrategia de copias de seguridad y observabilidad',
    ],
    technologies: ['PostgreSQL', 'SQLite', 'SQL', 'Supabase', 'Drizzle', 'Prisma'],
    process: [
      { title: 'Modelo', description: 'Traducimos entidades, relaciones y reglas a un esquema claro.' },
      { title: 'Integridad', description: 'Aplicamos validaciones, índices, restricciones y permisos.' },
      { title: 'Conexión', description: 'Creamos APIs y adaptadores para cada sistema relacionado.' },
      { title: 'Monitoreo', description: 'Añadimos registros, alertas y estrategia de recuperación.' },
    ],
    outcomes: [
      'Datos consistentes y fáciles de consultar',
      'Integraciones menos frágiles',
      'Una arquitectura preparada para crecer sin rehacerse',
    ],
  },
  {
    slug: 'automatizacion-agendamiento-crm',
    eyebrow: 'FLUJOS + RESPUESTA',
    title: 'Automatización, agendamiento y CRM',
    shortTitle: 'Automatización y CRM',
    summary:
      'Sistemas que capturan solicitudes, reservan horas, notifican al equipo y mantienen cada oportunidad organizada.',
    description:
      'Diseñamos recorridos automáticos para que una consulta no se pierda. Formularios, agenda, recordatorios, estados, WhatsApp, correo y panel de seguimiento trabajan como un solo sistema.',
    idealFor: [
      'Servicios con reservas, visitas o reuniones',
      'Equipos comerciales que necesitan seguimiento de oportunidades',
      'Negocios que reciben consultas por varios canales',
    ],
    deliverables: [
      'Agenda con disponibilidad, reglas y confirmaciones',
      'CRM de contactos, oportunidades y etapas',
      'Recordatorios por correo o mensajería',
      'Automatizaciones con n8n, webhooks y APIs',
      'Panel de seguimiento y métricas operativas',
    ],
    technologies: ['n8n', 'Google Calendar', 'Webhooks', 'WhatsApp', 'Email', 'PostgreSQL'],
    process: [
      { title: 'Recorrido', description: 'Definimos desde dónde llega el contacto y cuál es el siguiente paso.' },
      { title: 'Reglas', description: 'Configuramos horarios, responsables, estados y excepciones.' },
      { title: 'Automatización', description: 'Conectamos agenda, CRM, notificaciones y panel.' },
      { title: 'Medición', description: 'Registramos tiempos, conversiones y puntos de abandono.' },
    ],
    outcomes: [
      'Menos consultas perdidas',
      'Respuesta más rápida y ordenada',
      'Seguimiento visible para todo el equipo',
    ],
  },
  {
    slug: 'ia-rag-agentes',
    eyebrow: 'CONOCIMIENTO + IA',
    title: 'IA, sistemas RAG y agentes',
    shortTitle: 'IA y RAG',
    summary:
      'Asistentes conectados a documentos, datos y herramientas para responder con contexto y ejecutar tareas controladas.',
    description:
      'Construimos sistemas de recuperación aumentada por generación para que la IA consulte información propia antes de responder. Podemos combinar búsqueda semántica, memoria, herramientas, permisos y trazabilidad.',
    idealFor: [
      'Equipos con documentación extensa o dispersa',
      'Soporte interno, ventas, capacitación o búsqueda técnica',
      'Procesos que requieren asistencia y acciones supervisadas',
    ],
    deliverables: [
      'Ingesta, limpieza y segmentación de documentos',
      'Índice vectorial y recuperación contextual',
      'Agente con herramientas, permisos y límites',
      'Panel de fuentes, conversaciones y evaluación',
      'Conexión con modelos locales o en la nube',
    ],
    technologies: ['OpenAI', 'Ollama', 'Embeddings', 'Vector DB', 'RAG', 'Agents'],
    process: [
      { title: 'Fuentes', description: 'Definimos qué información puede consultar y con qué permisos.' },
      { title: 'Recuperación', description: 'Diseñamos búsqueda, filtros, ranking y contexto.' },
      { title: 'Agente', description: 'Añadimos instrucciones, herramientas y controles de seguridad.' },
      { title: 'Evaluación', description: 'Medimos precisión, cobertura, costo y trazabilidad.' },
    ],
    outcomes: [
      'Respuestas basadas en información propia',
      'Menos tiempo buscando documentos',
      'Automatización asistida con control y evidencia',
    ],
  },
  {
    slug: 'seo-metadata-marketing',
    eyebrow: 'VISIBILIDAD + MEDICIÓN',
    title: 'SEO técnico, metadata y marketing digital',
    shortTitle: 'SEO y marketing',
    summary:
      'Estructura, contenido y medición para que el sitio sea entendible por personas, buscadores y plataformas sociales.',
    description:
      'Trabajamos posicionamiento SEO desde la arquitectura, no como una etiqueta al final. Definimos intención de búsqueda, títulos, descripciones, datos estructurados, contenido, rendimiento y medición de conversiones.',
    idealFor: [
      'Marcas que necesitan aparecer mejor en búsquedas',
      'Sitios con contenido duplicado, lento o mal estructurado',
      'Campañas que requieren páginas de destino y medición',
    ],
    deliverables: [
      'Investigación de palabras clave e intención',
      'Metadata, Open Graph y datos estructurados',
      'Arquitectura de contenidos y enlazado interno',
      'Core Web Vitals, sitemap, robots y canonicales',
      'Analítica, eventos, píxeles y páginas de campaña',
    ],
    technologies: ['SEO técnico', 'Schema.org', 'Google Analytics', 'Search Console', 'Meta Pixel', 'Lighthouse'],
    process: [
      { title: 'Diagnóstico', description: 'Revisamos indexación, estructura, velocidad y contenido.' },
      { title: 'Estrategia', description: 'Priorizamos búsquedas, páginas y acciones de conversión.' },
      { title: 'Implementación', description: 'Aplicamos metadata, schema, contenido y medición.' },
      { title: 'Iteración', description: 'Observamos resultados y ajustamos con datos reales.' },
    ],
    outcomes: [
      'Mejor comprensión por buscadores y redes sociales',
      'Páginas alineadas con búsquedas reales',
      'Decisiones de marketing basadas en medición',
    ],
  },
]

export const digitalProjects: DigitalProject[] = [
  {
    slug: 'ecommerce-operacion-conectada',
    category: 'E-COMMERCE + OPERACIÓN',
    title: 'Tienda digital conectada a catálogo, stock y seguimiento',
    summary:
      'Una experiencia de compra administrable que conecta productos, variantes, checkout, pagos, pedidos y comunicación con clientes.',
    challenge:
      'Evitar que diseño, catálogo, stock y seguimiento funcionen como piezas separadas o dupliquen información.',
    solution:
      'Arquitectura headless con una fuente principal para productos y pedidos, una capa visual personalizada y automatizaciones para notificaciones y operación.',
    modules: ['Catálogo y filtros', 'Carrito y checkout', 'Panel de pedidos', 'Stock y variantes', 'Seguimiento y notificaciones'],
    technologies: ['Next.js', 'Shopify', 'GraphQL', 'PostgreSQL', 'Vercel'],
    outcome:
      'Un sistema de venta que mantiene la identidad visual sin perder control operativo ni capacidad de crecimiento.',
  },
  {
    slug: 'agenda-crm-servicios',
    category: 'AGENDA + CRM',
    title: 'Sistema de reservas, clientes y seguimiento comercial',
    summary:
      'Una plataforma para recibir solicitudes, ofrecer horarios, confirmar reservas y mantener cada oportunidad visible.',
    challenge:
      'Reducir conversaciones repetidas, horarios cruzados y contactos sin seguimiento.',
    solution:
      'Agenda con reglas de disponibilidad, CRM por etapas, recordatorios y panel de actividad conectado a correo y WhatsApp.',
    modules: ['Disponibilidad', 'Reservas', 'Clientes', 'Oportunidades', 'Recordatorios', 'Métricas'],
    technologies: ['Next.js', 'PostgreSQL', 'Google Calendar', 'n8n', 'Email'],
    outcome:
      'Un recorrido más rápido para el cliente y una operación comercial más ordenada para el equipo.',
  },
  {
    slug: 'asistente-rag-documental',
    category: 'IA + CONOCIMIENTO',
    title: 'Asistente RAG conectado a documentos y herramientas',
    summary:
      'Un sistema que busca en fuentes autorizadas, muestra evidencia y ayuda a resolver consultas con contexto propio.',
    challenge:
      'Encontrar información confiable dentro de documentos extensos sin depender de respuestas genéricas de una IA.',
    solution:
      'Pipeline de ingestión, búsqueda semántica, recuperación con filtros, respuestas con fuentes y herramientas controladas.',
    modules: ['Biblioteca documental', 'Búsqueda semántica', 'Chat con fuentes', 'Permisos', 'Evaluación', 'Historial'],
    technologies: ['RAG', 'Embeddings', 'OpenAI', 'Ollama', 'Vector DB', 'PostgreSQL'],
    outcome:
      'Acceso más rápido al conocimiento interno y respuestas auditables basadas en fuentes reales.',
  },
  {
    slug: 'panel-operativo-personalizado',
    category: 'SOFTWARE A MEDIDA',
    title: 'Panel operativo para órdenes, usuarios y reportes',
    summary:
      'Una aplicación central para reemplazar planillas dispersas y coordinar estados, responsables y datos críticos.',
    challenge:
      'Mantener trazabilidad cuando la operación crece y cada persona usa una versión distinta de la información.',
    solution:
      'Modelo relacional, panel por roles, flujos de estado, búsquedas, filtros, registros de actividad y reportes.',
    modules: ['Usuarios y roles', 'Órdenes', 'Estados', 'Archivos', 'Auditoría', 'Reportes'],
    technologies: ['Next.js', 'NestJS', 'PostgreSQL', 'TypeScript', 'WebSockets'],
    outcome:
      'Una fuente de verdad compartida, con menos errores manuales y mejor visibilidad del trabajo.',
  },
]

export function getDigitalService(slug: string) {
  return digitalServices.find((service) => service.slug === slug)
}

export function getDigitalProject(slug: string) {
  return digitalProjects.find((project) => project.slug === slug)
}
