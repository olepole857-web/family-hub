## Aktueller Stand: gemeinsame Familienprofile

FAMILY HUB verwendet jetzt **ein gemeinsames Login mit sechs frei benennbaren Profilen**. Beim ersten Start pro Gerät wird ein Profil gewählt und lokal gespeichert. Neue Termine und Notizen werden dem aktiven Profil zugeordnet. Profilnamen lassen sich unter **Familie** ändern. Bereits gespeicherte Termine bleiben erhalten. Die älteren Schritte zu sechs getrennten Konten weiter unten sind für diese Variante nicht erforderlich.

---

# FAMILY HUB 👨‍👩‍👧‍👦

Ein gemeinsamer Familienkalender mit **breiten horizontalen Tageskacheln**, einheitlichem Design, Terminverwaltung und Familien-Merkzetteln. Funktioniert als Web-App auf iPhone, Android, Tablet und Computer.

## Status

✅ Funktionsfähige Web-App mit Monatsnavigation, Terminen, bearbeiten/löschen, Notizen, Home und Familienübersicht.  
✅ Lokaler **Demo-Modus** sofort benutzbar (Daten bleiben nur im Browser auf diesem Gerät).  
🔧 **Gemeinsame Nutzung** erfordert ein eigenes Supabase-Projekt, Benutzerkonten und die SQL-Einrichtung.  
🔧 **GitHub Pages** muss unter Settings → Pages einmal aktiviert werden. Der Quellcode liegt bereits vollständig im Repository.

## Schnellstart (Vorschau)

Dateien auf GitHub Pages hochladen oder lokal einen kleinen Webserver starten:

```bash
python3 -m http.server 8000
```

Danach `http://localhost:8000/` öffnen. Solange in `supabase-config.js` keine URL/kein Publishable-Key eingetragen sind, speichert FAMILY HUB alle Änderungen in `localStorage` nur **auf diesem Gerät**. Demo-Termine dienen nur als Beispiel.

## Gemeinsame Nutzung für sechs Personen

Die vollständigen Einrichtungsschritte stehen in [SETUP.md](SETUP.md). Kurzfassung:

1. Das öffentliche GitHub-Repository `olepole857-web/family-hub` enthält bereits den App-Code. **Private Kalenderdaten sind darin nicht enthalten.** Niemals Passwörter oder einen `service_role`-Key committen.
2. Auf GitHub unter **Settings → Pages → Build and deployment** die Quelle **Deploy from a branch**, `main` / `(root)` auswählen.
3. Supabase-Projekt erstellen, `supabase-schema.sql` im SQL-Editor ausführen.
4. Bis zu sechs Benutzer unter **Authentication → Users** anlegen, öffentliche Registrierung deaktivieren.
5. Mit angepassten E-Mail-Adressen `setup-family.sql` ausführen.
6. **Project URL** und den **Publishable Key** (früher `anon`) in `supabase-config.js` eintragen. **Niemals Secret/Service-Role-Schlüssel eintragen.**
7. App aktualisieren und mit den Familienkonten anmelden. Änderungen erscheinen für alle Mitglieder.

## Datenschutz & Sicherheit

- Der GitHub-Pages-Webserver enthält ausschließlich die statischen App-Dateien und **keine privaten Termine**.
- Die Einträge liegen in der Supabase-Datenbank, gesichert mit **Row Level Security** (RLS); nur berechtigte Familienmitglieder dürfen Termine/Notizen lesen und verändern.
- Die Datenbank erlaubt pro Familie maximal sechs Benutzerkonten. Nutzer können weder die Familienzuordnung noch die Mitgliederliste selbst ändern.
- Jede Person erhält eine eigene E-Mail/Passwort-Anmeldung.
- Kostenlose Dienste haben Nutzungs- und Inaktivitätsgrenzen; es gibt **keine Garantie dauerhaft kostenloser Verfügbarkeit**. Gelegentlich Daten exportieren/sichern.
- Keine sensiblen medizinischen Details, Passwörter oder Zugangscodes im Kalender speichern.

## App installieren

- **iPhone / iPad:** Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- **Android:** Seite in Chrome öffnen → Drei-Punkte-Menü → „App installieren“ oder „Zum Startbildschirm hinzufügen“.

## Dateien

- `index.html` – Benutzeroberfläche und Formulare
- `styles.css` – responsives Layout
- `app.js` – Monatsansicht, Terminverwaltung, Notizen, Login und Synchronisierung
- `supabase-config.js` – öffentliche Projektdaten, zunächst leer
- `supabase-schema.sql` – Tabellen, Berechtigungen, Zugriffsschutz und Realtime
- `setup-family.sql` – Beispiel für manuelles Anlegen einer Familie
- `sw.js`, `manifest.webmanifest`, `icons/icon.svg` – Installation als Web-App