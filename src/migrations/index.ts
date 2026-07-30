import * as migration_20260730_090000_complete_cms from './20260730_090000_complete_cms'
import * as migration_20260730_091000_leads_and_footer_rows from './20260730_091000_leads_and_footer_rows'

export const migrations = [
  {
    up: migration_20260730_090000_complete_cms.up,
    down: migration_20260730_090000_complete_cms.down,
    name: '20260730_090000_complete_cms',
  },
  {
    up: migration_20260730_091000_leads_and_footer_rows.up,
    down: migration_20260730_091000_leads_and_footer_rows.down,
    name: '20260730_091000_leads_and_footer_rows',
  },
]
