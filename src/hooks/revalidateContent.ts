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
    console.warn(`[revalidate] No fue posible invalidar ${tag}.`, error)
  }
}

export const revalidatePage: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-pages')
  const slug = typeof doc?.slug === 'string' ? doc.slug : 'home'
  revalidatePath(slug === 'home' ? '/' : `/${slug}`)
  return doc
}

export const revalidatePageDelete: CollectionAfterDeleteHook = ({ doc }) => {
  refreshTag('fabrick-pages')
  const slug = typeof doc?.slug === 'string' ? doc.slug : 'home'
  revalidatePath(slug === 'home' ? '/' : `/${slug}`)
  return doc
}

export const revalidateServices: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-services')
  if (typeof doc?.slug === 'string') refreshTag(`fabrick-service-${doc.slug}`)
  revalidatePath('/servicios')
  revalidatePath('/')
  return doc
}

export const revalidateProjects: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-projects')
  if (typeof doc?.slug === 'string') refreshTag(`fabrick-project-${doc.slug}`)
  revalidatePath('/proyectos')
  revalidatePath('/')
  return doc
}

export const revalidateTestimonials: CollectionAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-testimonials')
  revalidatePath('/')
  return doc
}

export const revalidateGlobals: GlobalAfterChangeHook = ({ doc }) => {
  refreshTag('fabrick-globals')
  revalidatePath('/', 'layout')
  return doc
}
