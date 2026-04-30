// src/i18n/index.tsx
import React, { createContext, useContext, useState } from 'react'
import { fr as frDate, enUS, de as deDate } from 'date-fns/locale'

export type AppLocale = 'fr' | 'en' | 'de'

// ─── French ───────────────────────────────────────────────────────────────────
const fr = {
    nav: {
        board: 'Tableau',
        stats: 'Stats',
        settings: 'Paramètres',
        subtitle: 'Job Application Tracker',
    },
    board: {
        title: 'Candidatures',
        subtitle: 'Glisse les cartes pour changer le statut',
        newButton: 'Nouvelle candidature',
        dialogTitle: 'Nouvelle candidature',
    },
    stats: {
        title: 'Statistiques',
        subtitle: "Vue d'ensemble de vos candidatures",
        total: 'Total',
        responseRate: 'Taux réponse',
        interviewRate: 'Taux entretien',
        avgDays: 'Moy. jours',
        waiting: 'en attente',
        responses: 'réponses',
        interviews: 'entretiens',
        distribution: 'Répartition par statut',
        empty: "Aucune candidature pour l'instant",
    },
    settings: {
        title: 'Paramètres',
        subtitle: 'Configuration et gestion des données',
        followUpSection: 'Relances automatiques',
        followUpLabel: 'Jours avant relance',
        followUpDesc: (days: number) =>
            `Une alerte apparaît sur la carte après ${days} jour${days > 1 ? 's' : ''} sans réponse.`,
        dataSection: 'Données',
        exportLabel: 'Exporter',
        exportDesc: 'Télécharge un fichier JSON avec toutes vos candidatures',
        importLabel: 'Importer',
        importDesc: 'Remplace toutes les données existantes',
        confirmTitle: "Confirmer l'import ?",
        confirmDesc: (count: number, existing: number) =>
            `${count} candidature(s) vont remplacer vos données actuelles (${existing} existante(s)).`,
        confirm: 'Confirmer',
        cancel: 'Annuler',
        storageInfo: 'Données stockées localement dans votre navigateur · Aucun compte requis',
    },
    form: {
        newTitle: 'Nouvelle candidature',
        companyLabel: 'Entreprise *',
        companyPlaceholder: 'Google, Apple…',
        roleLabel: 'Poste *',
        rolePlaceholder: 'Software Engineer…',
        dateLabel: 'Date de candidature *',
        chooseDate: 'Choisir une date',
        statusLabel: 'Statut *',
        urlLabel: "Lien de l'offre",
        urlPlaceholder: 'https://…',
        contactNameLabel: 'Nom du contact',
        contactNamePlaceholder: 'Marie Dupont',
        contactEmailLabel: 'Email du contact',
        contactEmailPlaceholder: 'marie@example.com',
        notesLabel: 'Notes',
        notesPlaceholder: 'Informations importantes, suite à donner…',
        save: 'Enregistrer',
        add: 'Ajouter',
        delete: 'Supprimer',
        cancel: 'Annuler',
        errorCompany: 'Entreprise requise',
        errorRole: 'Poste requis',
        errorDate: 'Date requise',
    },
    status: {
        applied: 'Candidaté',
        responded: 'Réponse reçue',
        interview: 'Entretien',
        offer: 'Offre reçue',
        rejected: 'Refusé',
        abandoned: 'Abandonné',
    },
    card: {
        today: "aujourd'hui",
        followUp: 'Relancer ?',
        contactUnknown: 'Contact inconnu',
        sentOn: 'Candidature envoyée le',
    },
    column: {
        empty: 'vide',
    },
    toast: {
        updated: 'Candidature mise à jour',
        added: 'Candidature ajoutée',
        deleted: 'Candidature supprimée',
        exported: 'Export téléchargé',
        exportedDesc: (n: number) => `${n} candidature(s)`,
        imported: 'Import réussi',
        importedDesc: (n: number) => `${n} candidature(s) importée(s)`,
        invalidFile: 'Fichier invalide',
    },
    dateFnsLocale: frDate,
    intlLocale: 'fr-FR',
    languageName: 'Français',
}

// ─── English ──────────────────────────────────────────────────────────────────
type Translations = typeof fr

const en: Translations = {
    nav: {
        board: 'Board',
        stats: 'Stats',
        settings: 'Settings',
        subtitle: 'Job Application Tracker',
    },
    board: {
        title: 'Applications',
        subtitle: 'Drag cards to change status',
        newButton: 'New application',
        dialogTitle: 'New application',
    },
    stats: {
        title: 'Statistics',
        subtitle: 'Overview of your applications',
        total: 'Total',
        responseRate: 'Response rate',
        interviewRate: 'Interview rate',
        avgDays: 'Avg. days',
        waiting: 'waiting',
        responses: 'responses',
        interviews: 'interviews',
        distribution: 'Distribution by status',
        empty: 'No applications yet',
    },
    settings: {
        title: 'Settings',
        subtitle: 'Configuration and data management',
        followUpSection: 'Follow-up reminders',
        followUpLabel: 'Days before follow-up',
        followUpDesc: (days: number) =>
            `An alert appears on the card after ${days} day${days > 1 ? 's' : ''} without a response.`,
        dataSection: 'Data',
        exportLabel: 'Export',
        exportDesc: 'Download a JSON file with all your applications',
        importLabel: 'Import',
        importDesc: 'Replaces all existing data',
        confirmTitle: 'Confirm import?',
        confirmDesc: (count: number, existing: number) =>
            `${count} application(s) will replace your current data (${existing} existing).`,
        confirm: 'Confirm',
        cancel: 'Cancel',
        storageInfo: 'Data stored locally in your browser · No account required',
    },
    form: {
        newTitle: 'New application',
        companyLabel: 'Company *',
        companyPlaceholder: 'Google, Apple…',
        roleLabel: 'Role *',
        rolePlaceholder: 'Software Engineer…',
        dateLabel: 'Application date *',
        chooseDate: 'Choose a date',
        statusLabel: 'Status *',
        urlLabel: 'Job posting link',
        urlPlaceholder: 'https://…',
        contactNameLabel: 'Contact name',
        contactNamePlaceholder: 'John Smith',
        contactEmailLabel: 'Contact email',
        contactEmailPlaceholder: 'john@example.com',
        notesLabel: 'Notes',
        notesPlaceholder: 'Important info, follow-up actions…',
        save: 'Save',
        add: 'Add',
        delete: 'Delete',
        cancel: 'Cancel',
        errorCompany: 'Company is required',
        errorRole: 'Role is required',
        errorDate: 'Date is required',
    },
    status: {
        applied: 'Applied',
        responded: 'Responded',
        interview: 'Interview',
        offer: 'Offer received',
        rejected: 'Rejected',
        abandoned: 'Abandoned',
    },
    card: {
        today: 'today',
        followUp: 'Follow up?',
        contactUnknown: 'Unknown contact',
        sentOn: 'Application sent on',
    },
    column: {
        empty: 'empty',
    },
    toast: {
        updated: 'Application updated',
        added: 'Application added',
        deleted: 'Application deleted',
        exported: 'Export downloaded',
        exportedDesc: (n: number) => `${n} application(s)`,
        imported: 'Import successful',
        importedDesc: (n: number) => `${n} application(s) imported`,
        invalidFile: 'Invalid file',
    },
    dateFnsLocale: enUS,
    intlLocale: 'en-GB',
    languageName: 'English',
}

// ─── German ───────────────────────────────────────────────────────────────────
const de: Translations = {
    nav: {
        board: 'Übersicht',
        stats: 'Statistiken',
        settings: 'Einstellungen',
        subtitle: 'Job Application Tracker',
    },
    board: {
        title: 'Bewerbungen',
        subtitle: 'Karten ziehen, um Status zu ändern',
        newButton: 'Neue Bewerbung',
        dialogTitle: 'Neue Bewerbung',
    },
    stats: {
        title: 'Statistiken',
        subtitle: 'Übersicht Ihrer Bewerbungen',
        total: 'Gesamt',
        responseRate: 'Rückmeldequote',
        interviewRate: 'Gesprächsquote',
        avgDays: 'Ø Tage',
        waiting: 'wartend',
        responses: 'Rückmeldungen',
        interviews: 'Gespräche',
        distribution: 'Verteilung nach Status',
        empty: 'Noch keine Bewerbungen',
    },
    settings: {
        title: 'Einstellungen',
        subtitle: 'Konfiguration und Datenverwaltung',
        followUpSection: 'Nachfass-Erinnerungen',
        followUpLabel: 'Tage bis zur Nachfrage',
        followUpDesc: (days: number) =>
            `Eine Warnung erscheint auf der Karte nach ${days} Tag${days > 1 ? 'en' : ''} ohne Antwort.`,
        dataSection: 'Daten',
        exportLabel: 'Exportieren',
        exportDesc: 'Lädt eine JSON-Datei mit allen Bewerbungen herunter',
        importLabel: 'Importieren',
        importDesc: 'Ersetzt alle vorhandenen Daten',
        confirmTitle: 'Import bestätigen?',
        confirmDesc: (count: number, existing: number) =>
            `${count} Bewerbung(en) ersetzen Ihre aktuellen Daten (${existing} vorhandene).`,
        confirm: 'Bestätigen',
        cancel: 'Abbrechen',
        storageInfo: 'Daten lokal im Browser gespeichert · Kein Konto erforderlich',
    },
    form: {
        newTitle: 'Neue Bewerbung',
        companyLabel: 'Unternehmen *',
        companyPlaceholder: 'Google, Apple…',
        roleLabel: 'Position *',
        rolePlaceholder: 'Software Engineer…',
        dateLabel: 'Bewerbungsdatum *',
        chooseDate: 'Datum wählen',
        statusLabel: 'Status *',
        urlLabel: 'Link zur Stellenausschreibung',
        urlPlaceholder: 'https://…',
        contactNameLabel: 'Kontaktname',
        contactNamePlaceholder: 'Max Mustermann',
        contactEmailLabel: 'Kontakt-E-Mail',
        contactEmailPlaceholder: 'max@example.com',
        notesLabel: 'Notizen',
        notesPlaceholder: 'Wichtige Informationen, nächste Schritte…',
        save: 'Speichern',
        add: 'Hinzufügen',
        delete: 'Löschen',
        cancel: 'Abbrechen',
        errorCompany: 'Unternehmen erforderlich',
        errorRole: 'Position erforderlich',
        errorDate: 'Datum erforderlich',
    },
    status: {
        applied: 'Beworben',
        responded: 'Antwort erhalten',
        interview: 'Vorstellungsgespräch',
        offer: 'Angebot erhalten',
        rejected: 'Abgelehnt',
        abandoned: 'Aufgegeben',
    },
    card: {
        today: 'heute',
        followUp: 'Nachfragen?',
        contactUnknown: 'Unbekannter Kontakt',
        sentOn: 'Bewerbung gesendet am',
    },
    column: {
        empty: 'leer',
    },
    toast: {
        updated: 'Bewerbung aktualisiert',
        added: 'Bewerbung hinzugefügt',
        deleted: 'Bewerbung gelöscht',
        exported: 'Export heruntergeladen',
        exportedDesc: (n: number) => `${n} Bewerbung(en)`,
        imported: 'Import erfolgreich',
        importedDesc: (n: number) => `${n} Bewerbung(en) importiert`,
        invalidFile: 'Ungültige Datei',
    },
    dateFnsLocale: deDate,
    intlLocale: 'de-DE',
    languageName: 'Deutsch',
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ALL_LOCALES: Record<AppLocale, Translations> = { fr, en, de }

interface I18nContextType {
    locale: AppLocale
    setLocale: (locale: AppLocale) => void
    t: Translations
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<AppLocale>(() => {
        const saved = localStorage.getItem('jat_locale')
        return (['fr', 'en', 'de'] as AppLocale[]).includes(saved as AppLocale)
            ? (saved as AppLocale)
            : 'fr'
    })

    function setLocale(l: AppLocale) {
        localStorage.setItem('jat_locale', l)
        setLocaleState(l)
    }

    return (
        <I18nContext.Provider value={{ locale, setLocale, t: ALL_LOCALES[locale] }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n() {
    const ctx = useContext(I18nContext)
    if (!ctx) throw new Error('useI18n must be used within I18nProvider')
    return ctx
}

export const LOCALES: AppLocale[] = ['fr', 'en', 'de']
