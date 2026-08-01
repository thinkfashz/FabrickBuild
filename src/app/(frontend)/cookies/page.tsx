import type { Metadata } from 'next'

import { LegalPage } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Política de cookies | FabrickBuild',
  description: 'Categorías de almacenamiento local y tecnologías similares utilizadas por FabrickBuild.',
}

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="PREFERENCIAS DE NAVEGACIÓN"
      title="Política de cookies"
      intro={
        <>
          <p>Este sitio utiliza almacenamiento estrictamente necesario para funcionar y ofrece categorías opcionales que permanecen desactivadas hasta que las autorices.</p>
          <p>La palabra “cookies” se usa aquí de forma amplia e incluye cookies HTTP, almacenamiento local y tecnologías equivalentes que guardan o leen información en el dispositivo.</p>
        </>
      }
      sections={[
        {
          id: 'categorias',
          title: '1. Categorías disponibles',
          content: (
            <div className="legal-table-wrap">
              <table>
                <thead><tr><th>Categoría</th><th>Finalidad</th><th>Estado inicial</th></tr></thead>
                <tbody>
                  <tr><td>Necesarias</td><td>Seguridad, sesión del administrador, prevención de abuso, funcionamiento del formulario y conservación de la decisión de privacidad.</td><td>Activas</td></tr>
                  <tr><td>Analítica</td><td>Medir navegación, rendimiento y uso agregado del sitio cuando exista una herramienta configurada.</td><td>Desactivadas</td></tr>
                  <tr><td>Personalización</td><td>Recordar opciones visuales o preferencias no esenciales.</td><td>Desactivadas</td></tr>
                  <tr><td>Marketing</td><td>Medir campañas, conversiones o comunicaciones comerciales cuando se habiliten proveedores de publicidad.</td><td>Desactivadas</td></tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: 'registro',
          title: '2. Cómo se registra tu decisión',
          content: <p>El gestor guarda en el navegador la versión del aviso, la fecha y las categorías elegidas. La categoría necesaria siempre permanece activa porque permite recordar tu decisión y mantener funciones básicas.</p>,
        },
        {
          id: 'activacion',
          title: '3. Activación de herramientas opcionales',
          content: <p>Los scripts de analítica, personalización o marketing deben comprobar la señal de consentimiento antes de ejecutarse. Aceptar una categoría no significa que necesariamente exista una herramienta activa; solo autoriza su uso futuro dentro de la finalidad descrita.</p>,
        },
        {
          id: 'cambiar',
          title: '4. Cambiar o retirar preferencias',
          content: <p>Puedes abrir nuevamente el panel desde “Preferencias de privacidad” en el footer. También puedes borrar el almacenamiento del sitio desde la configuración del navegador; al volver, se mostrará el aviso para elegir nuevamente.</p>,
        },
        {
          id: 'duracion',
          title: '5. Duración',
          content: <p>La decisión se conserva hasta que la retires, borres el almacenamiento o se publique una nueva versión del consentimiento. Las herramientas de terceros, si se habilitan, podrán utilizar períodos propios que deberán informarse aquí antes de su activación.</p>,
        },
        {
          id: 'terceros',
          title: '6. Servicios de terceros',
          content: <p>El sitio puede cargar recursos técnicos desde proveedores de alojamiento, almacenamiento o entrega de contenido. Cuando una integración opcional añada cookies o identificadores propios, deberá incorporarse a esta política y respetar la categoría elegida.</p>,
        },
        {
          id: 'contacto',
          title: '7. Contacto',
          content: <p>Para consultar sobre una tecnología concreta o solicitar información sobre tu decisión, escribe a <a href="mailto:contacto@solucionesfabrick.com">contacto@solucionesfabrick.com</a>.</p>,
        },
      ]}
    />
  )
}
