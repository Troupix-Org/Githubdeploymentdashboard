# BUILD_VERSION Updater Changelog

## Version 1.1 - November 4, 2025

### Changed
- **Version format**: Default version now uses **major.minor** format only (e.g., `1.2`, `1.3`) instead of semver `major.minor.patch`
  - Simplifies version numbers for build versions
  - Example: Current release `1.2.0` now suggests `1.3` instead of `1.3.0`
  - Still fully customizable - users can enter any version format they need

### Added
- **Version mismatch detection**: Displays a warning when any repository's BUILD_VERSION doesn't match the current release version
  - Helps identify situations where BUILD_VERSION may not need updating
  - Alerts users to potential version cycle discrepancies
  - Warning appears as a yellow notice banner with clear explanation

### Improved
- Better visual feedback with suggested version prominently displayed
- Reset button to quickly restore the suggested version
- Clearer UI labels distinguishing between "current release" and "target BUILD_VERSION"

## Version 1.0 - November 4, 2025

### Initial Release
- Multi-repository BUILD_VERSION management
- Support for repository-level and environment-level variables
- Auto-detection of existing variables
- Real-time status updates
- Integration with Production Release Process (Step 9)

---

## Migration Notes

### For Existing Users

If you were using the previous version that suggested `major.minor.patch` format:

**Before:** 
- Release `1.2.0` → Suggested `1.3.0`

**After:**
- Release `1.2.0` → Suggests `1.3`

**No action required** - You can still manually enter any version format you prefer. The change only affects the default suggestion.

### Version Mismatch Warnings

If you see the new warning message about version mismatches:

1. **Check if it's expected**: Your repositories may intentionally be on different version cycles
2. **Review your process**: You may have skipped updating BUILD_VERSION in a previous release
3. **Decide if update is needed**: Not every release requires a BUILD_VERSION update
4. **Document your decision**: If you skip updating, make a note for future reference

The warning is informational only and won't prevent you from proceeding.
