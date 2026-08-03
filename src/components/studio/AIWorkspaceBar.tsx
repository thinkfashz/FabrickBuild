import { Blocks, LayoutDashboard, Settings2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function AIWorkspaceBar() {
  return (
    <nav className="ai-workspace-bar" aria-label="Herramientas del estudio de IA">
      <div>
        <span className="studio-pill studio-pill-ok"><ShieldCheck size={13} /> Sesión protegida</span>
        <p>Genera propuestas con IA y termina la edición únicamente en el editor nativo de Payload.</p>
      </div>
      <div className="ai-workspace-actions">
        <Link className="studio-button studio-button-primary" href="/admin/collections/pages">
          <LayoutDashboard size={16} /> Editor Payload
        </Link>
        <Link className="studio-button" href="/studio/integraciones">
          <Settings2 size={16} /> Proveedores
        </Link>
        <Link className="studio-button" href="/admin/collections/reusable-components">
          <Blocks size={16} /> Componentes
        </Link>
      </div>
    </nav>
  )
}
