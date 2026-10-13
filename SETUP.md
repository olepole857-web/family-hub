# FAMILY HUB einrichten – Schritt für Schritt

## 1. GitHub-Repository anlegen

1. Melde dich bei GitHub an und öffne <https://github.com/new>.
2. **Repository name:** `family-hub`.
3. Wähle **Public** für kostenloses GitHub Pages im Free-Tarif. Wichtig: Das Repository enthält nur App-Code, keine Familien-Termine, Logins oder privaten Schlüssel.
4. „Create repository“.
5. Dateien aus dem ZIP **einschließlich der Unterordner** über **Add file → Upload files** hochladen und committen. Alternativ die Dateien durch den verbundenen GitHub-Assistenten einpflegen lassen.
6. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, Branch `main`, Folder `/(root)` → Save.
7. Deine Seite bekommt üblicherweise eine Adresse wie `https://DEINNAME.github.io/family-hub/`. Es kann ein paar Minuten dauern.

**Hinweis:** GitHub Pages ist öffentlich erreichbar. Der geschützte Login und die RLS-Regeln verhindern, dass Fremde die privaten Termine sehen. GitHub Pages selbst bietet keine private Zugangsbarriere.

## 2. Kostenloses Supabase-Projekt

1. Öffne <https://supabase.com/dashboard> und erstelle ein Projekt.
2. Unter **SQL Editor → New query** den kompletten Inhalt von `supabase-schema.sql` einfügen und **Run** klicken.
3. Unter **Authentication → Providers → Email** sicherstellen, dass **öffentliche neue Registrierungen deaktiviert** sind. Die genaue Menübezeichnung kann sich ändern („Allow new users to sign up“).
4. Unter **Authentication → Users → Add user** die sechs Personen mit ihren eigenen E-Mail-Adressen anlegen. Verwende individuelle, starke Passwörter. Bei manueller Benutzeranlage müssen die Konten bestätigt sein, damit eine Passwort-Anmeldung klappt.
5. Öffne `setup-family.sql` im Texteditor, ersetze die sechs Platzhalter-Adressen durch die eben angelegten E-Mails und führe das angepasste SQL **nur im Supabase SQL Editor** aus. Du kannst zunächst eine Person und später die weiteren Konten hinzufügen, indem du das Skript erneut ausführst. `on conflict do nothing` vermeidet doppelte Mitglieder.
6. Prüfe unter **Table Editor → family_members**, ob die gewünschten Personen zugeordnet wurden. E-Mail-Adressen werden im Kalender selbst nicht angezeigt; die Spalte `display_name` kann im Table Editor angepasst werden.
7. Die maximal sechs Mitglieder sind durch einen Trigger geschützt; weitere Personen können nicht hinzugefügt werden.

## 3. Web-App mit der Datenbank verbinden

1. In Supabase unter **Project Settings → API Keys** oder **Connect** findest du **Project URL** und **Publishable Key** (in älteren Projekten **anon**).
2. Öffne die Datei `supabase-config.js` in GitHub, drücke auf „Edit“ und trage die Werte ein:

```js
window.FAMILY_HUB_CONFIG = {
  supabaseUrl: "https://DEIN-PROJEKT.supabase.co",
  supabasePublishableKey: "sb_publishable_DEIN_OEFFENTLICHER_KEY"
};
```

3. **Niemals** den `service_role`, `secret` oder ein Admin-Passwort in diese Datei eintragen! Der Publishable-Key ist absichtlich öffentlich und wird durch RLS eingeschränkt.
4. Commit speichern. GitHub Pages aktualisiert die Webseite. Lade die Seite neu und melde dich mit einem der angelegten Benutzerkonten an.

## 4. Auf dem Smartphone

- Link an alle sechs Personen schicken.
- iPhone: In Safari öffnen → Teilen → Zum Home-Bildschirm.
- Android: In Chrome öffnen → Menü → App installieren.
- Termine können von allen Mitgliedern erstellt, geändert und gelöscht werden.
- Die App versucht Echtzeit-Aktualisierung; beim erneuten Öffnen/Wechseln zur App und spätestens alle 30 Sekunden im Vordergrund lädt sie die Daten zusätzlich neu.

## Gut zu wissen

- Bei abgeschalteter Supabase-Verbindung ist nur der **Demo-Modus** verfügbar. Demo-Einträge werden **nicht automatisch** in die gemeinsame Datenbank übernommen.
- Bitte die SQL-Datei mit den persönlichen E-Mail-Adressen **nicht zurück ins öffentliche GitHub-Repository hochladen**. Die enthaltene Beispielversion mit Platzhaltern ist unproblematisch. Führe deine angepasste Version nur direkt in Supabase aus.
- Öffentliche Registrierung ist nicht nötig; der Admin verwaltet die Mitglieder über das Supabase-Dashboard.
- Kostenlos bedeutet Free-Tier-Limits und eventuell Pausierung inaktiver Projekte. Für einen kleinen privaten Familienkalender kann das ausreichen, ist aber nicht garantiert.