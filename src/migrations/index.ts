import * as migration_20260730_090000_complete_cms from './20260730_090000_complete_cms'
import * as migration_20260730_091000_leads_and_footer_rows from './20260730_091000_leads_and_footer_rows'
import * as migration_20260730_120000_portfolio_factory_tables from './20260730_120000_portfolio_factory_tables'
import * as migration_20260802_060000_digital_background_names from './20260802_060000_digital_background_names'

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
  {
    up: migration_20260730_120000_portfolio_factory_tables.up,
    down: migration_20260730_120000_portfolio_factory_tables.down,
    name: '20260730_120000_portfolio_factory_tables',
  },
  {
    up: migration_20260802_060000_digital_background_names.up,
    down: migration_20260802_060000_digital_background_names.down,
    name: '20260802_060000_digital_background_names',
  },
]
