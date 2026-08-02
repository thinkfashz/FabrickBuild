import Link from 'next/link'
import { requirePayloadAdmin } from '@/lib/requirePayloadAdmin'

const tools = [
  { href: '/admin/studio/cloudinary', title: 'Cloudinary y frames', detail: 'Carpetas, imágenes, subida, edición, eliminación y generación de backgrounds.' },
  { href: '/admin/collections/backgrounds/create', title: 'Creador de backgrounds', detail: 'Editor completo de secuencias, video, GSAP y publicación.' },
  { href: '/admin/collections/backgrounds', title: 'Backgrounds guardados', detail: 'Revisa estado, preview, páginas asignadas y configuración.' },
  { href: '/admin/collections/media', title: 'Multimedia', detail: 'Catálogo unificado de Blob, Cloudinary, imágenes y frames.' },
  { href: '/admin/studio/sistema', title: 'Sistema y rendimiento', detail: 'Conexiones, latencia, almacenamiento y diagnósticos.' },
]

export default async function AdminStudioPage() {
  const user = await requirePayloadAdmin('/admin/studio')
  return (
    <main className="studio-hub">
      <header>
        <div><small>PAYLOAD · FABRICKBUILD</small><h1>Studio</h1><p>Herramientas multimedia y técnicas integradas al administrador. La edición de páginas vive únicamente en la colección Páginas de Payload, con preview real.</p></div>
        <div><span>{user.email}</span><Link href="/admin">Volver al dashboard</Link></div>
      </header>
      <section className="tool-grid">{tools.map((tool, index) => <Link key={tool.href} href={tool.href}><i>{String(index + 1).padStart(2, '0')}</i><strong>{tool.title}</strong><span>{tool.detail}</span><b>ABRIR →</b></Link>)}</section>
      <style>{`
        :root{color-scheme:dark}.studio-hub{min-height:100vh;padding:clamp(20px,4vw,52px);background:var(--theme-bg,#101010);color:var(--theme-text,#f4f4f4);font-family:Inter,system-ui,sans-serif}.studio-hub header{max-width:1280px;margin:auto;display:flex;justify-content:space-between;gap:24px;align-items:end;padding-bottom:24px;border-bottom:1px solid var(--theme-elevation-150,#303030)}.studio-hub small{color:#d8ac27;font-weight:900;letter-spacing:.16em}.studio-hub h1{font-size:clamp(42px,8vw,88px);line-height:.9;margin:12px 0}.studio-hub p{max-width:720px;color:var(--theme-elevation-600,#aaa);line-height:1.6}.studio-hub header>div:last-child{display:grid;gap:10px;text-align:right}.studio-hub header a,.tool-grid a{color:inherit;text-decoration:none}.studio-hub header a{padding:10px 13px;border:1px solid var(--theme-elevation-250,#444);border-radius:9px}.tool-grid{max-width:1280px;margin:24px auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tool-grid a{min-height:190px;padding:22px;display:grid;align-content:start;gap:10px;border:1px solid var(--theme-elevation-150,#303030);border-radius:14px;background:var(--theme-elevation-50,#171717);transition:.25s ease}.tool-grid a:hover{transform:translateY(-3px);border-color:#d8ac27}.tool-grid i{font-style:normal;color:#d8ac27;font-size:11px;font-weight:900}.tool-grid strong{font-size:clamp(20px,3vw,31px)}.tool-grid span{color:var(--theme-elevation-600,#aaa);line-height:1.5}.tool-grid b{margin-top:auto;font-size:10px;letter-spacing:.13em}@media(max-width:720px){.studio-hub header{display:grid;align-items:start}.studio-hub header>div:last-child{text-align:left}.tool-grid{grid-template-columns:1fr}.tool-grid a{min-height:160px}}
      `}</style>
    </main>
  )
}
