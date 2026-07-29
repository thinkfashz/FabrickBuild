import { NullField as NullFieldPayload } from '@payloadcms/ui'
import { CollectionCards } from '@payloadcms/next/rsc'
import {
  RscEntryLexicalCell,
  RscEntryLexicalField,
  LexicalDiffComponent
} from '@payloadcms/richtext-lexical/rsc'
import {
  InlineToolbarFeatureClient,
  FixedToolbarFeatureClient,
  HeadingFeatureClient,
  LinkFeatureClient,
  BoldFeatureClient,
  ItalicFeatureClient,
  UnderlineFeatureClient,
  ParagraphFeatureClient
} from '@payloadcms/richtext-lexical/client'
import { VercelBlobClientUploadHandler } from '@payloadcms/storage-vercel-blob/client'
import AdminStudioNav from '@/components/admin/AdminStudioNav'
import BeforeDashboard from '@/components/admin/BeforeDashboard'
import FrameFolderUploader from '@/components/admin/FrameFolderUploader'

/** @type {import('payload').ImportMap} */
export const importMap = {
  '@payloadcms/ui#NullField': NullFieldPayload,
  '@payloadcms/next/rsc#CollectionCards': CollectionCards,
  '@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell': RscEntryLexicalCell,
  '@payloadcms/richtext-lexical/rsc#RscEntryLexicalField': RscEntryLexicalField,
  '@payloadcms/richtext-lexical/rsc#LexicalDiffComponent': LexicalDiffComponent,
  '@payloadcms/richtext-lexical/client#InlineToolbarFeatureClient': InlineToolbarFeatureClient,
  '@payloadcms/richtext-lexical/client#FixedToolbarFeatureClient': FixedToolbarFeatureClient,
  '@payloadcms/richtext-lexical/client#HeadingFeatureClient': HeadingFeatureClient,
  '@payloadcms/richtext-lexical/client#LinkFeatureClient': LinkFeatureClient,
  '@payloadcms/richtext-lexical/client#BoldFeatureClient': BoldFeatureClient,
  '@payloadcms/richtext-lexical/client#ItalicFeatureClient': ItalicFeatureClient,
  '@payloadcms/richtext-lexical/client#UnderlineFeatureClient': UnderlineFeatureClient,
  '@payloadcms/richtext-lexical/client#ParagraphFeatureClient': ParagraphFeatureClient,
  '@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler': VercelBlobClientUploadHandler,
  '@/components/admin/AdminStudioNav#default': AdminStudioNav,
  '@/components/admin/BeforeDashboard#default': BeforeDashboard,
  '@/components/admin/FrameFolderUploader#default': FrameFolderUploader
}
