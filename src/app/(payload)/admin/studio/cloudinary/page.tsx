import CloudinaryStudioManager from '@/components/admin/CloudinaryStudioManager'
import { requirePayloadAdmin } from '@/lib/requirePayloadAdmin'

export default async function AdminCloudinaryStudioPage() {
  await requirePayloadAdmin('/admin/studio/cloudinary')
  return <CloudinaryStudioManager />
}
