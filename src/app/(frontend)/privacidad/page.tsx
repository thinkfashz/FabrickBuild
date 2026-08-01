import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Política de privacidad | FabrickBuild',
  description: 'Información sobre recopilación, uso, conservación y derechos relacionados con datos personales en FabrickBuild.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACIDAD Y DATOS PERSONALES"
      title="Política de privacidad"
      intro={
        <>
          <p>Esta política explica qué datos recibe FabrickBuild / Soluciones Fabrick mediante este sitio, para qué se utilizan y cómo puedes ejercer tus derechos.</p>
          <p>Al 30 de julio de 2026, el marco chileno vigente continúa siendo la Ley N.º 19.628. La Ley N.º 21.719, publicada el 13 de diciembre de 2024, entra en vigor el 1 de diciembre de 2026 y amplía derechos, obligaciones y supervisión.</p>
        </>
      }
      sections={[
        {
          id: 'responsable',
          title: '1. Responsable y contacto',
          content: (
            <>
              <p>La operación digital se presenta bajo las marcas FabrickBuild y Soluciones Fabrick. Para consultas de privacidad, rectificación o eliminación, escribe a <a href="mailto:contacto@solucionesfabrick.com">contacto@solucionesfabrick.com</a>.</p>
              <p>Cuando un contrato, cotización u orden identifique una razón social, domicilio o responsable específico, esos datos contractuales prevalecerán para dicho servicio.</p>
            </>
          ),
        },
        {
          id: 'datos',
          title: '2. Datos que podemos recibir',
          content: (
            <ul>
              <li>Datos de contacto enviados voluntariamente: nombre, teléfono, correo y comuna o ciudad.</li>
              <li>Información del proyecto: servicio, superficie, presupuesto estimado y descripción de la necesidad.</li>
              <li>Datos técnicos mínimos de seguridad: fecha, ruta solicitada, tipo general de dispositivo, registros de error y controles anti-spam.</li>
              <li>Preferencias de privacidad guardadas en el navegador, incluida la versión y categorías aceptadas.</li>
              <li>Datos de analítica o marketing únicamente después de una autorización válida y cuando dichas herramientas estén efectivamente habilitadas.</li>
            </ul>
          ),
        },
        {
          id: 'finalidades',
          title: '3. Finalidades y fundamento',
          content: (
            <>
              <p>Usamos los datos para responder solicitudes, preparar evaluaciones o cotizaciones, coordinar servicios, mantener seguridad, prevenir abuso, cumplir obligaciones aplicables y conservar evidencia de comunicaciones comerciales.</p>
              <p>El envío del formulario exige una autorización específica para responder. Las categorías opcionales del sitio permanecen desactivadas hasta que sean aceptadas en el gestor de privacidad.</p>
            </>
          ),
        },
        {
          id: 'comunicacion',
          title: '4. Encargados, alojamiento y transferencias',
          content: (
            <>
              <p>Los datos pueden ser procesados por proveedores tecnológicos necesarios para operar el sitio, como alojamiento, almacenamiento de archivos, base de datos, correo, seguridad y monitoreo. Solo deben recibir la información necesaria para prestar su función.</p>
              <p>Algunos proveedores pueden procesar información fuera de Chile. En esos casos se procurarán medidas contractuales, controles de acceso, cifrado y selección de proveedores con estándares adecuados. No vendemos bases de datos personales a anunciantes.</p>
            </>
          ),
        },
        {
          id: 'conservacion',
          title: '5. Conservación y seguridad',
          content: (
            <>
              <p>Las solicitudes comerciales podrán conservarse hasta 24 meses desde la última interacción, salvo que exista contrato, obligación legal, garantía, reclamo o necesidad de defensa que justifique un plazo mayor. Los registros técnicos se conservarán por el período razonablemente necesario para seguridad y diagnóstico.</p>
              <p>Aplicamos controles de acceso, autenticación del administrador, conexiones cifradas, validación de formularios, límites anti-spam, copias de seguridad y separación entre el panel administrativo y la entrega pública.</p>
            </>
          ),
        },
        {
          id: 'derechos',
          title: '6. Derechos de las personas',
          content: (
            <>
              <p>Mientras rija el régimen actual de la Ley N.º 19.628, puedes solicitar información sobre tus datos, su procedencia y destinatarios, además de rectificación, eliminación o bloqueo cuando corresponda.</p>
              <p>Desde el 1 de diciembre de 2026, la reforma de la Ley N.º 21.719 incorpora expresamente derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo, junto con nuevas reglas sobre responsables, seguridad y reclamación.</p>
              <p>Para ejercer un derecho, indica tu nombre, medio de contacto, la solicitud concreta y antecedentes suficientes para verificar identidad sin pedir información excesiva.</p>
            </>
          ),
        },
        {
          id: 'menores',
          title: '7. Menores y datos sensibles',
          content: <p>El formulario no está diseñado para recopilar datos de menores ni antecedentes sensibles. No envíes información médica, biométrica, financiera, contraseñas o documentos de identidad salvo que un proceso contractual seguro y específico lo requiera.</p>,
        },
        {
          id: 'cookies',
          title: '8. Cookies y cambios de preferencia',
          content: <p>Puedes revisar las categorías, su finalidad y cómo cambiar tu decisión en la <Link href="/cookies">Política de cookies</Link>. El footer mantiene un acceso permanente para reabrir el panel de preferencias.</p>,
        },
        {
          id: 'actualizaciones',
          title: '9. Actualizaciones',
          content: <p>Esta política puede modificarse por cambios operativos, tecnológicos o normativos. Cuando el cambio sea relevante, se actualizará la fecha y, si corresponde, se solicitará nuevamente consentimiento usando una nueva versión.</p>,
        },
      ]}
    />
  )
}
