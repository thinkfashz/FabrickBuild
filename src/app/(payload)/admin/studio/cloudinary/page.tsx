import CloudinaryStudioSafe from '@/components/admin/CloudinaryStudioSafe'
import { requirePayloadAdmin } from '@/lib/requirePayloadAdmin'

export default async function AdminCloudinaryStudioPage() {
  await requirePayloadAdmin('/admin/studio/cloudinary')
  return <CloudinaryStudioSafe />
}
