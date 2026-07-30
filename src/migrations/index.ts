import * as migration_20260730_090000_complete_cms from './20260730_090000_complete_cms'

export const migrations = [
  {
    up: migration_20260730_090000_complete_cms.up,
    down: migration_20260730_090000_complete_cms.down,
    name: '20260730_090000_complete_cms',
  },
]
