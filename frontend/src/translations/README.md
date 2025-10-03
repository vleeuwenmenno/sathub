# SatHub Internationalization (i18n) Guide

This guide explains how to use the translation system to make SatHub multilingual.

## Overview

SatHub now supports internationalization with:

- JSON-based translation files in `/src/translations/`
- React context for translation management
- Support for parameter substitution (e.g., `{{name}}`)
- Automatic language detection and user preference saving

## Translation Files Structure

Translation files are located in `/src/translations/` and follow this structure:

```
src/translations/
├── en.json    # English translations
├── de.json    # German translations
├── nl.json    # Dutch translations
└── ...        # Add more languages as needed
```

Each file contains nested objects organized by feature areas:

```json
{
  "common": { /* Common UI elements */ },
  "auth": { /* Authentication related */ },
  "navigation": { /* Navigation/menu items */ },
  "stations": { /* Ground station management */ },
  "posts": { /* Satellite data posts */ },
  "user": { /* User profile/settings */ },
  "admin": { /* Administration */ },
  "errors": { /* Error messages */ },
  "success": { /* Success messages */ },
  "validation": { /* Form validation messages */ }
}
```

## Using Translations in Components

### 1. Import the Translation Hook

```tsx
import { useTranslation } from '../contexts/TranslationContext';
```

### 2. Use the `t` Function

```tsx
const MyComponent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('posts.title')}</h1>
      <p>{t('posts.subtitle')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### 3. Parameter Substitution

Use `{{parameterName}}` in translation strings:

```json
{
  "welcome": "Welcome back, {{name}}!",
  "itemsCount": "You have {{count}} items"
}
```

```tsx
<p>{t('welcome', { name: user.name })}</p>
<p>{t('itemsCount', { count: items.length })}</p>
```

### 4. Plurals and Complex Logic

For complex cases, you can use conditional rendering:

```tsx
{items.length === 0
  ? t('items.none')
  : t('items.count', { count: items.length })
}
```

## Adding New Translation Keys

### 1. Add to English Translation File

Always add new keys to `en.json` first:

```json
{
  "myFeature": {
    "newKey": "New translation text",
    "anotherKey": "Another text with {{param}}"
  }
}
```

### 2. Add to Other Language Files

Add the same keys to all supported language files:

```json
// de.json
{
  "myFeature": {
    "newKey": "Neuer Übersetzungstext",
    "anotherKey": "Weiterer Text mit {{param}}"
  }
}
```

### 3. Update TypeScript Types (Optional)

If you want type safety, you can create types for your translation keys.

## Language Management

### Supported Languages

Languages are defined in `getSupportedLanguages()` in `utils/translations.ts`:

```tsx
export const getSupportedLanguages = () => [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
];
```

### Adding a New Language

1. Create a new JSON file: `src/translations/[lang].json`
2. Copy the structure from `en.json`
3. Add the language to `getSupportedLanguages()`
4. Translate all strings

### Language Detection Priority

1. User's saved language preference (from API)
2. Browser language detection
3. Fallback to English

## Migration Guide

### Converting Existing Components

**Before:**

```tsx
<button>Save Changes</button>
<p>Welcome to SatHub</p>
```

**After:**

```tsx
const { t } = useTranslation();

<button>{t('common.save')}</button>
<p>{t('welcome.message')}</p>
```

### Common Translation Patterns

#### Buttons and Actions

```tsx
<Button>{t('common.save')}</Button>
<Button>{t('common.cancel')}</Button>
<Button>{t('common.delete')}</Button>
```

#### Form Labels

```tsx
<FormLabel>{t('user.profile.firstName')}</FormLabel>
<Input placeholder={t('user.profile.firstNamePlaceholder')} />
```

#### Status Messages

```tsx
{loading && <p>{t('common.loading')}</p>}
{error && <Alert color="danger">{t('errors.generic')}</Alert>}
{success && <Alert color="success">{t('success.saved')}</Alert>}
```

#### Navigation

```tsx
<Link to="/stations">{t('navigation.stations')}</Link>
```

## Best Practices

### 1. Use Descriptive Keys

Good: `stations.createNew`
Bad: `newStation`

### 2. Keep Keys Consistent

Use the same key for the same concept across components.

### 3. Group Related Translations

```json
{
  "user": {
    "profile": {
      "title": "Profile Settings",
      "firstName": "First Name",
      "lastName": "Last Name"
    }
  }
}
```

### 4. Handle Missing Translations

The `t` function returns the key if no translation is found, so your app won't break.

### 5. Test with Different Languages

Always test your components with different languages to ensure proper layout.

## Example Component Migration

See `Login.i18n.tsx` for a complete example of a component converted to use translations.

## Language Switching

Users can change their language in their profile settings. The preference is saved to their account and persists across sessions.

## Performance

- Translation files are loaded asynchronously and cached
- Only the current language translations are kept in memory
- Translation loading is handled by the TranslationContext
