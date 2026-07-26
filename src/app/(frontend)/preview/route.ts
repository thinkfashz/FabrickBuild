import config from '@payload-config'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

const allowedCollections = ['pages', 'services', 'projects'] as const
type PreviewCollection = (typeof allowedCollections)[number]

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') || 'home'
  const collectionParam = url.searchParams.get('collection') || 'pages'
  const secret = url.searchParams.get('secret')

  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response('No autorizado', { status: 401 })
  }

  if (!allowedCollections.includes(collectionParam as PreviewCollection)) {
    return new Response('Colección no permitida', { status: 400 })
  }

  const collection = collectionParam as PreviewCollection
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection,
    draft: true,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: slug } }
  })

  if (!result.docs[0]) return new Response('Documento no encontrado', { status: 404 })

  ;(await draftMode()).enable()
  const target =
    collection === 'pages'
      ? slug === 'home' ? '/' : `/${slug}`
      : collection === 'services' ? `/servicios/${slug}` : `/proyectos/${slug}`
  redirect(target)
}
