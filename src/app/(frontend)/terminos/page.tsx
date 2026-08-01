import type { Metadata } from 'next'

import { LegalPage } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Términos y condiciones | FabrickBuild',
  description: 'Condiciones de navegación, cotizaciones y contratación de servicios presentados por FabrickBuild.',
}

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="CONDICIONES DE USO"
      title="Términos y condiciones de navegación"
      intro={
        <>
          <p>Estos términos regulan el uso informativo del sitio FabrickBuild / Soluciones Fabrick y el envío de solicitudes de contacto o cotización.</p>
          <p>Una simulación, calculadora, precio “desde”, rango de mercado o formulario enviado no constituye por sí solo un contrato de construcción ni una aceptación definitiva del proyecto.</p>
        </>
      }
      sections={[
        {
          id: 'identidad',
          title: '1. Identidad y alcance del sitio',
          content: <p>FabrickBuild es la plataforma digital utilizada para presentar servicios, proyectos, herramientas y canales de contacto asociados a Soluciones Fabrick. La identificación contractual completa, alcance, responsable, domicilio y condiciones particulares se incorporarán en cada cotización u orden aceptada.</p>,
        },
        {
          id: 'informacion',
          title: '2. Información y precios referenciales',
          content: (
            <>
              <p>Los precios, plazos, rendimientos, cantidades, comparaciones y resultados de calculadoras son orientativos. El valor final depende, entre otros factores, de ubicación, terreno, accesos, permisos, planos, especialidades, disponibilidad, calidad de materiales, impuestos y condiciones detectadas durante la evaluación.</p>
              <p>Cuando una oferta comercial sea vinculante, deberá indicar expresamente vigencia, alcance, exclusiones, precio, forma de pago, garantías y aceptación.</p>
            </>
          ),
        },
        {
          id: 'cotizacion',
          title: '3. Solicitudes y formación del contrato',
          content: <p>Enviar una solicitud autoriza el contacto para revisar antecedentes, pero no obliga a ninguna parte a contratar. El contrato se forma mediante una propuesta suficientemente determinada y su aceptación por el mecanismo indicado, sin perjuicio de requisitos especiales que correspondan al servicio.</p>,
        },
        {
          id: 'consumidor',
          title: '4. Derechos de consumidores',
          content: <p>Nada en estos términos limita derechos irrenunciables establecidos por la Ley N.º 19.496 y normas aplicables. Cuando exista contratación electrónica de bienes o servicios, la información deberá presentarse de manera clara y oportuna conforme al Reglamento de Comercio Electrónico aprobado por el Decreto N.º 6 de 2021.</p>,
        },
        {
          id: 'garantias',
          title: '5. Garantías y recepción de trabajos',
          content: <p>Las garantías dependen del tipo de servicio, materiales, fabricante, mantenimiento, uso y contrato. La cotización o acta correspondiente deberá indicar cobertura, exclusiones, procedimiento de aviso, plazos de revisión y recepción de la obra. Una garantía comercial nunca reduce las garantías legales aplicables.</p>,
        },
        {
          id: 'uso',
          title: '6. Uso permitido y seguridad',
          content: <p>No está permitido intentar acceder al panel, eludir autenticación, automatizar envíos abusivos, introducir código malicioso, extraer datos personales, interferir con el servicio o utilizar el sitio con fines ilícitos. Podemos limitar solicitudes que comprometan seguridad o disponibilidad.</p>,
        },
        {
          id: 'propiedad',
          title: '7. Propiedad intelectual y materiales',
          content: <p>La marca, identidad visual, textos originales, renders, fotografías propias, interfaces y componentes específicos están protegidos por sus derechos correspondientes. Las dependencias de software conservan sus licencias. No se autoriza reutilizar proyectos o imágenes como si fueran propios sin permiso.</p>,
        },
        {
          id: 'enlaces',
          title: '8. Enlaces y servicios externos',
          content: <p>Los enlaces a mensajería, redes, proveedores o sitios de terceros se ofrecen por conveniencia. Sus contenidos, disponibilidad, políticas y transacciones dependen de esos terceros. Antes de contratar o pagar, verifica identidad, precio y condiciones en el canal oficial.</p>,
        },
        {
          id: 'disponibilidad',
          title: '9. Disponibilidad y responsabilidad técnica',
          content: <p>Se aplican medidas razonables de continuidad, caché, respaldo y seguridad, pero no se garantiza disponibilidad ininterrumpida. Podrán existir mantenimientos, fallos de proveedores, eventos de red o causas fuera de control. Esto no excluye responsabilidades que legalmente no puedan limitarse.</p>,
        },
        {
          id: 'ley',
          title: '10. Ley aplicable y contacto',
          content: <p>El sitio se orienta principalmente a usuarios en Chile y estos términos se interpretan conforme a la legislación chilena, sin perjuicio de normas imperativas aplicables al lugar del consumidor. Para consultas escribe a <a href="mailto:contacto@solucionesfabrick.com">contacto@solucionesfabrick.com</a>.</p>,
        },
      ]}
    />
  )
}
