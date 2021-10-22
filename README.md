# @navikt/parcel-resolver-angular-templatecache

Lager en Angular 1.x modul med navnet `templates` som eksponerer en [`$templateCache`](https://docs.angularjs.org/api/ng/service/$templateCache) service.

## Konfigurasjon

### Legg til plugin i Parcel 

Legg dette inn i `.parceljs`:

```json
{
  "extends": "@parcel/config-default",
  "resolvers": [
    "@navikt/parcel-resolver-angular-templatecache",
    "..."
  ]
}
```

*"..." kreves for at andre resolvers skal fungere*

### Konfigurer hvilke templates som skal bli med

Lag en `angular.templates.json` fil:

```json
{
  "templates": [
    "./app/views/**/*.html",
    "./node_modules/@navikt/**/*.html"
  ],
  "stripPaths": [
    "^/node_modules/",
    "^/app/"
  ]
}
```

- `templates` er et array med globs relativ til hvor Parcel kjøres fra.
- `stripPaths` er et array med regex som skal fjernes fra filnavnet i `$templateCache`
