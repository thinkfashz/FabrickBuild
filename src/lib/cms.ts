import config from '@payload-config'
import { getPayload } from 'payload'

export const getCMS = async () => getPayload({ config })
