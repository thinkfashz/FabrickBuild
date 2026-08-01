import { revalidatePath, revalidateTag } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

const refreshTag = (tag: string) => {
  try {
    revalidateTag(tag, 'max')
  } catch (error) {
    console.warn(`[revalidate] No fue posible invalidar la etiqueta ${tag}.`, error)
  }
}

const refreshPath = (path: string, type?: 'layout' | 'page') => {
  try {
    if (type) revalidatePath(path, type)
    else revalidatePath(path)
  } catch (error) {
    console.warn(`[revalidate] No fue posible invalidar la ruta ${path}.`, error)
  }
}

export const revalidatePage: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-pages')
  const slug = typeof doc?.slug === 'string' ? doc.slug : 'home'
  refreshPath(slug === 'home' ? '/' : `/${slug}`)
  return doc
}

export const revalidatePageDelete: CollectionAfterDeleteHook = ({ doc }) => {
  refreshTag('fabrick-pages')
  const slug = typeof doc?.slug === 'string' ? doc.slug : 'home'
  refreshPath(slug === 'home' ? '/' : `/${slug}`)
  return doc
}

export const revalidateBackgrounds: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-backgrounds')
  refreshTag('fabrick-pages')
  refreshPath('/')
  return doc
}

export const revalidateMedia: CollectionAfterChangeHook = ({ doc }) => {
  if (doc?.category === 'frame' || String(doc?.filename || '').toLowerCase().includes('frame')) {
    refreshTag('fabrick-backgrounds')
    refreshTag('fabrick-pages')
    refreshPath('/')
  }
  return doc
}

export const revalidateServices: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-services')
  if (typeof doc?.slug === 'string') refreshTag(`fabrick-service-${doc.slug}`)
  refreshPath('/servicios')
  refreshPath('/')
  return doc
}

export const revalidateProjects: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-projects')
  if (typeof doc?.slug === 'string') refreshTag(`fabrick-project-${doc.slug}`)
  refreshPath('/proyectos')
  refreshPath('/')
  return doc
}

export const revalidateTestimonials: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-testimonials')
  refreshPath('/')
  return doc
}

export const revalidateGlobals: GlobalAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-globals')
  refreshPath('/', 'layout')
  return doc
}
