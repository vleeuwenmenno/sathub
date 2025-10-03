# SatHub Translation Migration Checklist

This document tracks the progress of migrating all hardcoded text in SatHub components to use the internationalization (i18n) system.

## Overview

SatHub has been set up with a complete i18n system including:
- JSON-based translation files (`src/translations/`)
- React TranslationContext with `useTranslation` hook
- Support for English and German
- Parameter substitution (`{{param}}` syntax)

## Migration Status

### Phase 1: Core User Experience (High Priority)
- [x] **Login.tsx** - Login form and authentication
- [x] **Register.tsx** - User registration form
- [x] **ForgotPassword.tsx** - Password reset request
- [x] **ResetPassword.tsx** - Password reset form
- [x] **Navbar.tsx** - Main navigation menu
- [x] **Overview.tsx** - Dashboard with recent posts

### Phase 2: User Management
- [ ] **UserSettings.tsx** - Profile and account settings
- [ ] **UserOverview.tsx** - Individual user profile pages
- [ ] **Achievements.tsx** - User achievements display

### Phase 3: Station Management
- [ ] **StationForm.tsx** - Create/edit station forms
- [ ] **StationsList.tsx** - Station listing and management
- [ ] **StationPosts.tsx** - Posts from specific stations
- [ ] **GlobalStations.tsx** - Global stations map view
- [ ] **StationHealthDialog.tsx** - Health monitoring dialogs
- [ ] **StationNotificationSettingsDialog.tsx** - Notification preferences

### Phase 4: Content & Social Features
- [ ] **Detail.tsx** - Individual post detail view
- [ ] **CommentSection.tsx** - Comments and replies
- [ ] **LikeButton.tsx** - Like/unlike functionality
- [ ] **Notifications.tsx** - Notification management
- [ ] **NotificationDropdown.tsx** - Notification dropdown menu

### Phase 5: Admin Panel
- [ ] **AdminOverview.tsx** - Admin dashboard
- [ ] **AdminUserManagement.tsx** - User administration
- [ ] **AdminPosts.tsx** - Post moderation
- [ ] **AdminStationsMap.tsx** - Station administration
- [ ] **AdminAuditLogs.tsx** - Audit logging
- [ ] **AdminPendingUsers.tsx** - User approval queue
- [ ] **AdminPostDetail.tsx** - Detailed post admin view
- [ ] **AdminRegistrationSettings.tsx** - Registration configuration
- [ ] **AdminUserDetail.tsx** - Individual user admin view

### Phase 6: Utility & Supporting Components
- [ ] **PaginationControls.tsx** - Page navigation controls
- [ ] **LocationPicker.tsx** - Coordinate selection
- [ ] **TwoFactorSetup.tsx** - 2FA setup wizard
- [ ] **TwoFactorVerify.tsx** - 2FA verification
- [ ] **ConfirmEmail.tsx** - Email confirmation
- [ ] **ConfirmEmailChange.tsx** - Email change confirmation
- [ ] **ConfirmDisableTwoFactor.tsx** - 2FA disable confirmation
- [ ] **DeletePostButton.tsx** - Post deletion confirmation
- [ ] **BackendStatus.tsx** - System status indicator
- [ ] **Footer.tsx** - Site footer
- [ ] **StationMap.tsx** - Station mapping component
- [ ] **ThemeAwareTileLayer.tsx** - Map theming component

## Migration Process

### 1. Preparation
- [x] Set up translation system infrastructure
- [x] Create English and German translation files
- [x] Create TranslationContext and useTranslation hook
- [x] Create example component (Login.i18n.tsx)

### 2. Component Migration Steps
For each component to migrate:

1. **Analyze** - Use the migration helper:
   ```bash
   node src/translations/migration-helper.js src/components/ComponentName.tsx
   ```

2. **Import hook** - Add to component:
   ```tsx
   import { useTranslation } from '../contexts/TranslationContext';
   ```

3. **Replace text** - Convert hardcoded strings:
   ```tsx
   // Before
   <Button>Save Changes</Button>

   // After
   const { t } = useTranslation();
   <Button>{t('common.save')}</Button>
   ```

4. **Add translation keys** - Update `src/translations/en.json` and `src/translations/de.json`

5. **Test** - Verify component works in both languages

### 3. Translation Key Guidelines
- Use descriptive, hierarchical keys: `auth.login.submit`
- Group related keys: `user.profile.*`, `stations.form.*`
- Use consistent naming conventions
- Add parameters for dynamic content: `{{name}}`, `{{count}}`

## Current Progress

- **Total Components**: 36
- **Completed**: 6
- **In Progress**: 0
- **Remaining**: 30

## Next Steps

1. ✅ **Phase 1** components completed (Login, Register, ForgotPassword, ResetPassword, Navbar, Overview)
2. Start with **Phase 2** components (UserSettings, UserOverview, Achievements)
3. Use translated components as templates for migration patterns
4. Update this checklist as components are completed
5. Test translations in both English and German

## Resources

- **Translation Files**: `src/translations/`
- **Migration Helper**: `src/translations/migration-helper.js`
- **Documentation**: `src/translations/README.md`
- **Example Component**: `src/components/Login.i18n.tsx`