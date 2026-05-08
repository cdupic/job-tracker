import { useRef, useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useJobs, useFullImport, type ImportStrategy } from '@/hooks/useJobs'
import { usePeriods } from '@/hooks/usePeriods'
import { useCompanies } from '@/hooks/useCompanies'
import { useCoverLetters } from '@/hooks/useCoverLetters'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PeriodForm } from '@/components/periods/PeriodForm'
import { useOpenRouter, DEFAULT_MODEL } from '@/hooks/useOpenRouter'
import type { JobMatchRecord } from '@/types'


import { type ExportData, type Period, PERIOD_COLOR_STYLES, type PeriodColor } from '@/types'
import {
  Download, Upload, Check, Loader2, Plus, Pencil,
  AlertTriangle, GitMerge, Trash2, ChevronDown, ChevronUp,
  Bell, Database, Layers, Bot, User,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'

// ── Petit composant checkbox période ─────────────────────────────────────────
function PeriodCheckbox({
                          period,
                          checked,
                          onChange,
                        }: {
  period: Period
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const colors = PERIOD_COLOR_STYLES[period.color as PeriodColor] ?? PERIOD_COLOR_STYLES.blue
  return (
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
        />
        <span className={cn('h-2 w-2 rounded-full shrink-0', colors.dot)} />
        <span className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
        {period.name}
      </span>
        {!period.endDate && (
            <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
          en cours
        </span>
        )}
      </label>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description, action }: {
  icon: React.FC<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
  )
}

export function SettingsPage() {
  const { settings, setSettings } = useSettings()
  const { getApiKey, saveAndTestKey } = useOpenRouter()
  const { data: jobs = [] } = useJobs()
  const { data: periods = [] } = usePeriods()
  const { data: companies = [] } = useCompanies()
  const { letters: coverLetters = [] } = useCoverLetters()
  const fullImport = useFullImport()
  const { columns, setColumns } = useKanbanConfig()
  const fileRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  // ── Export : sélection des périodes ──────────────────────────────────────
  const [exportPeriodIds, setExportPeriodIds] = useState<Set<string>>(
      () => new Set(periods.map((p) => p.id))
  )
  const [showExportPeriods, setShowExportPeriods] = useState(false)

  const allPeriodIds = periods.map((p) => p.id)
  const allSelected = allPeriodIds.every((id) => exportPeriodIds.has(id))

  function toggleExportPeriod(id: string, checked: boolean) {
    setExportPeriodIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  function toggleAllPeriods(checked: boolean) {
    setExportPeriodIds(checked ? new Set(allPeriodIds) : new Set())
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const [importConfirm, setImportConfirm] = useState<{
    data: ExportData
    isV2: boolean
  } | null>(null)

  // ── Périodes ──────────────────────────────────────────────────────────────
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExport() {
    const date = new Date().toISOString().split('T')[0]

    const filteredJobs = jobs.filter(
        (j) => !j.periodId || exportPeriodIds.has(j.periodId)
    )
    const filteredPeriods = periods.filter((p) => exportPeriodIds.has(p.id))
    const exportedCompanyIds = new Set(filteredJobs.map((j) => j.companyId).filter(Boolean))
    const filteredCompanies = companies.filter((c) => exportedCompanyIds.has(c.id))

    // Profils et clé API
    const apiKey = await getApiKey()
    const rawProfiles = (() => {
      try { return JSON.parse(localStorage.getItem('jat_candidate_profiles') ?? '[]') } catch { return [] }
    })()

    const rawMatches = (() => {
      try { return JSON.parse(localStorage.getItem('jat_job_matches') ?? '[]') } catch { return [] }
    })()

    const exportData: ExportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      columns,
      applications: filteredJobs,
      periods: filteredPeriods,
      companies: filteredCompanies,
      jobMatches: rawMatches,   // NEW

      profiles: rawProfiles,
      coverLetters,
      settings: {
        followUpDays: settings.followUpDays,
        openRouterModel: localStorage.getItem('jat_or_model') ?? undefined,
        ...(apiKey ? { openRouterApiKey: apiKey } : {}),
      },
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jat_export_${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: t.toast.exported,
      description: t.toast.exportedDesc(filteredJobs.length),
    })
  }
  // ── Import parsing ────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as any
        if (Array.isArray(parsed)) {
          setImportConfirm({
            data: { version: 2, exportedAt: new Date().toISOString(), columns, applications: parsed, periods: [], companies: [] },
            isV2: false,
          })
        } else if (parsed.version === 2 && Array.isArray(parsed.applications)) {
          setImportConfirm({ data: parsed as ExportData, isV2: true })
        } else {
          throw new Error('Invalid format')
        }
      } catch {
        toast({ title: t.toast.invalidFile, variant: 'destructive' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport(strategy: ImportStrategy) {
    if (!importConfirm) return
    const { data, isV2 } = importConfirm
    await fullImport.mutateAsync({ data, isV2, strategy })
    if (isV2 && data.columns?.length) setColumns(data.columns)

    // Import de la clé API OpenRouter (re-chiffrement sur cet appareil)
    if (isV2 && data.settings?.openRouterApiKey) {
      const shouldImportKey =
          strategy === 'replace' ||
          !(localStorage.getItem('jat_or_key_enc')) // merge : uniquement si pas déjà de clé
      if (shouldImportKey) {
        await saveAndTestKey(data.settings.openRouterApiKey)
      }
    }

    toast({
      title: t.toast.imported,
      description: t.toast.importedDesc(data.applications.length),
    })
    setImportConfirm(null)
  }
  const previewJobCount = jobs.filter(
      (j) => !j.periodId || exportPeriodIds.has(j.periodId)
  ).length

  return (
      <div className="flex flex-col gap-8 w-full">
        {/* Page header */}
        <div>
          <h1 className="font-display text-3xl text-foreground">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settings.subtitle}</p>
        </div>

        {/* ── ROW 1: Follow-up + Periods ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Follow-up reminders */}
          <section className="bg-card border border-border rounded-xl p-6">
            <SectionHeader
                icon={Bell}
                title={t.settings.followUpSection}
                description="Délai avant qu'une alerte s'affiche sur les cartes"
            />
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="followup">{t.settings.followUpLabel}</Label>
                <div className="flex items-center gap-3">
                  <Input
                      id="followup"
                      type="number"
                      min={1}
                      max={90}
                      value={settings.followUpDays}
                      onChange={(e) => setSettings({ followUpDays: Number(e.target.value) })}
                      className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">jours</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex-1">
                {t.settings.followUpDesc(settings.followUpDays)}
              </p>
            </div>
          </section>

          {/* Periods */}
          <section className="bg-card border border-border rounded-xl p-6">
            <SectionHeader
                icon={Layers}
                title={t.periods.settingsSection}
                description="Organiser vos candidatures par campagne"
                action={
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingPeriod(null); setPeriodDialogOpen(true) }}
                  >
                    <Plus className="h-4 w-4" />
                    {t.periods.create}
                  </Button>
                }
            />

            {periods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <p className="text-sm text-muted-foreground text-center">{t.periods.empty}</p>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingPeriod(null); setPeriodDialogOpen(true) }}
                  >
                    <Plus className="h-4 w-4" />
                    {t.periods.createFirst}
                  </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                  {periods.map((period) => {
                    const colors = PERIOD_COLOR_STYLES[period.color as PeriodColor] ?? PERIOD_COLOR_STYLES.blue
                    const jobCount = jobs.filter((j) => j.periodId === period.id).length
                    return (
                        <div
                            key={period.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                        >
                          <span className={cn('h-3 w-3 rounded-full shrink-0', colors.dot)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{period.name}</p>
                              {!period.endDate && (
                                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {t.periods.active}
                          </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {formatDate(period.startDate, t.intlLocale)}
                              {period.endDate
                                  ? ` → ${formatDate(period.endDate, t.intlLocale)}`
                                  : ` → ${t.periods.ongoing}`}
                              {' · '}{jobCount} {t.periods.jobsCount}
                            </p>
                          </div>
                          <button
                              onClick={() => { setEditingPeriod(period); setPeriodDialogOpen(true) }}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                    )
                  })}
                </div>
            )}
          </section>
        </div>

        {/* ── ROW 2: Candidate profiles (full width) ── */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader
              icon={User}
              title="Profils candidat"
              description="Informations pré-remplies pour la génération de mails de relance"
          />
          {/* Delegate body rendering to the existing component but without its own outer card */}
          <ProfilesSettingsSectionBody />
        </section>

        {/* ── ROW 3: OpenRouter (full width) ── */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader
              icon={Bot}
              title="OpenRouter — IA"
              description="Clé API et modèle pour la génération des emails de relance"
          />
          <OpenRouterSettingsSectionBody />
        </section>

        {/* ── ROW 4: Data — Export + Import side by side ── */}
        <section className="bg-card border border-border rounded-xl p-6">
          <SectionHeader
              icon={Database}
              title={t.settings.dataSection}
              description="Sauvegarder et restaurer vos données"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.settings.exportLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.settings.exportDesc}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0">
                  <Download className="h-4 w-4" />
                  {t.settings.exportLabel}
                </Button>
              </div>

              {periods.length > 0 && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowExportPeriods((v) => !v)}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
                    >
                  <span>
                    {t.settings.exportPeriodsLabel} :{' '}
                    <span className="font-semibold text-foreground">
                      {exportPeriodIds.size === 0
                          ? t.settings.exportPeriodsNone
                          : exportPeriodIds.size === periods.length
                              ? t.settings.exportPeriodsAll
                              : `${exportPeriodIds.size} / ${periods.length}`}
                    </span>
                    {' · '}
                    <span className="font-semibold text-foreground">{previewJobCount}</span>{' '}
                    {t.settings.exportPeriodsCount(previewJobCount)}
                  </span>
                      {showExportPeriods
                          ? <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                          : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                    </button>

                    {showExportPeriods && (
                        <div className="flex flex-col gap-2.5 px-3 py-3 border-t border-border bg-muted/30">
                          <label className="flex items-center gap-2.5 cursor-pointer pb-2 border-b border-border/60">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => toggleAllPeriods(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-border accent-foreground cursor-pointer"
                            />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t.settings.exportPeriodsAll2}
                      </span>
                          </label>
                          {periods.map((p) => (
                              <PeriodCheckbox
                                  key={p.id}
                                  period={p}
                                  checked={exportPeriodIds.has(p.id)}
                                  onChange={(checked) => toggleExportPeriod(p.id, checked)}
                              />
                          ))}
                          <p className="text-[11px] text-muted-foreground/70 italic pt-1 border-t border-border/60">
                            {t.settings.exportPeriodsFootnote}
                          </p>
                        </div>
                    )}
                  </div>
              )}
            </div>

            {/* Import */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.settings.importLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.settings.importDesc}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="shrink-0">
                  <Upload className="h-4 w-4" />
                  {t.settings.importLabel}
                </Button>
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
              </div>

              {importConfirm && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex flex-col gap-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          {t.settings.importFileDetected}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          {t.settings.importFileContent(
                              importConfirm.data.applications.length,
                              importConfirm.data.periods?.length ?? 0,
                              importConfirm.data.companies?.length ?? 0,
                              importConfirm.data.profiles?.length ?? 0,
                              importConfirm.data.coverLetters?.length ?? 0
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                          type="button"
                          onClick={() => confirmImport('merge')}
                          disabled={fullImport.isPending}
                          className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-border bg-card hover:border-foreground/30 hover:bg-accent/40 transition-all text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          {fullImport.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              : <GitMerge className="h-4 w-4 text-emerald-500" />}
                          <span className="text-sm font-semibold text-foreground">{t.settings.importMergeTitle}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {t.settings.importMergeDesc}
                        </p>
                      </button>

                      <button
                          type="button"
                          onClick={() => confirmImport('replace')}
                          disabled={fullImport.isPending}
                          className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:border-destructive/60 hover:bg-destructive/10 transition-all text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          {fullImport.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              : <Trash2 className="h-4 w-4 text-destructive" />}
                          <span className="text-sm font-semibold text-destructive">{t.settings.importReplaceTitle}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {t.settings.importReplaceDesc}
                        </p>
                      </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setImportConfirm(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                    >
                      {t.settings.importCancel}
                    </button>
                  </div>
              )}
            </div>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center pb-4">{t.settings.storageInfo}</p>

        {/* Period dialog */}
        <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPeriod ? t.periods.editTitle : t.periods.createTitle}
              </DialogTitle>
            </DialogHeader>
            <PeriodForm
                period={editingPeriod ?? undefined}
                onClose={() => { setPeriodDialogOpen(false); setEditingPeriod(null) }}
            />
          </DialogContent>
        </Dialog>
      </div>
  )
}

// ── Inline body components (strip outer card wrapper) ─────────────────────────
// These re-use the inner content of the existing section components
// without duplicating the outer card (since SettingsPage now owns the card).

import { useState as useState2 } from 'react'
import { useProfiles, type CandidateProfile } from '@/hooks/useProfiles'
import { ProfileForm } from '@/components/profiles/ProfileForm'
import {
  Eye, EyeOff, X as XIco, RefreshCw, Search, Zap, Lock, Unlock, Trash2 as Trash2i,
  ExternalLink,
} from 'lucide-react'
import { useMemo } from 'react'

function ProfilesSettingsSectionBody() {
  const { profiles } = useProfiles()
  const [dialogOpen, setDialogOpen] = useState2(false)
  const [editing, setEditing] = useState2<CandidateProfile | null>(null)

  function openCreate() { setEditing(null); setDialogOpen(true) }
  function openEdit(p: CandidateProfile) { setEditing(p); setDialogOpen(true) }

  return (
      <>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">Profils utilisés pour pré-remplir les mails de relance</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau profil
          </Button>
        </div>

        {profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Aucun profil créé</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Crée un profil pour pré-remplir les mails de relance avec tes informations.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Créer mon premier profil
              </Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profiles.map(profile => (
                  <div
                      key={profile.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-display text-base">
                      {profile.firstName.charAt(0).toUpperCase()}{profile.lastName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {profile.firstName} {profile.lastName}
                        {profile.email && ` · ${profile.email}`}
                      </p>
                      {(profile.experiences.length > 0 || profile.skills) && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                            {profile.experiences.length > 0 && `${profile.experiences.length} exp.`}
                            {profile.experiences.length > 0 && profile.skills && ' · '}
                            {profile.skills && profile.skills.slice(0, 40) + (profile.skills.length > 40 ? '…' : '')}
                          </p>
                      )}
                    </div>
                    <button
                        onClick={() => openEdit(profile)}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
              ))}
            </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? `Modifier · ${editing.name}` : 'Nouveau profil candidat'}
              </DialogTitle>
            </DialogHeader>
            <ProfileForm
                profile={editing ?? undefined}
                onClose={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </>
  )
}

function OpenRouterSettingsSectionBody() {
  const {
    hasKey, keyStatus, keyInfo,
    saveAndTestKey, deleteApiKey,
    selectedModel, setSelectedModel,
    models, modelsLoading, modelsError, fetchModels,
  } = useOpenRouter()

  const [keyInput, setKeyInput] = useState2('')
  const [showKey, setShowKey] = useState2(false)
  const [saving, setSaving] = useState2(false)
  const [modelSearch, setModelSearch] = useState2('')
  const [filterFree, setFilterFree] = useState2<'all' | 'free' | 'paid'>('all')
  const [showPicker, setShowPicker] = useState2(false)

  async function handleSaveKey() {
    if (!keyInput.trim()) return
    setSaving(true)
    await saveAndTestKey(keyInput.trim())
    setKeyInput('')
    setSaving(false)
  }

  const filteredModels = useMemo(() => {
    let list = models
    if (filterFree === 'free') list = list.filter(m => m.isFree)
    if (filterFree === 'paid') list = list.filter(m => !m.isFree)
    if (modelSearch.trim()) {
      const q = modelSearch.toLowerCase()
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
    }
    return list
  }, [models, filterFree, modelSearch])

  const currentModel = models.find(m => m.id === selectedModel)
  const isDefault = selectedModel === DEFAULT_MODEL

  return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Key column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Clé API OpenRouter</Label>
            <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Obtenir une clé <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {hasKey ? (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {keyStatus === 'valid'
                      ? <Lock className="h-4 w-4 text-emerald-500" />
                      : keyStatus === 'testing' || keyStatus === 'unknown'
                          ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                          : <Unlock className="h-4 w-4 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <span className="text-xs text-foreground font-medium">
                {keyStatus === 'valid' ? 'Clé enregistrée et chiffrée'
                    : keyStatus === 'testing' || keyStatus === 'unknown' ? 'Vérification…'
                        : 'Erreur de validation'}
              </span>
                  {keyInfo && keyStatus === 'valid' && (
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {keyInfo.is_free_tier && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <Zap className="h-2.5 w-2.5" /> Free tier
                    </span>
                        )}
                        {keyInfo.limit_remaining != null && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Crédits : {Number(keyInfo.limit_remaining).toFixed(4)}
                    </span>
                        )}
                      </div>
                  )}
                </div>
                <button
                    type="button"
                    onClick={() => { if (confirm('Supprimer la clé API ?')) deleteApiKey() }}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2i className="h-3.5 w-3.5" />
                </button>
              </div>
          ) : (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                        type={showKey ? 'text' : 'password'}
                        value={keyInput}
                        onChange={e => setKeyInput(e.target.value)}
                        placeholder="sk-or-v1-…"
                        className="pr-9 font-mono text-xs"
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveKey() }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" onClick={handleSaveKey} disabled={!keyInput.trim() || saving} className="shrink-0">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Tester
                  </Button>
                </div>
                {keyStatus === 'invalid' && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XIco className="h-3.5 w-3.5" /> Clé refusée par OpenRouter.
                    </p>
                )}
              </>
          )}
        </div>

        {/* Model column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Modèle</Label>
            <button
                type="button"
                onClick={() => fetchModels(true)}
                disabled={modelsLoading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn('h-3 w-3', modelsLoading && 'animate-spin')} />
              Actualiser
            </button>
          </div>

          <div
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:border-foreground/30 transition-colors"
              onClick={() => setShowPicker(v => !v)}
          >
            <div className="flex-1 min-w-0">
              {currentModel ? (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">{currentModel.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{currentModel.id}</p>
                      {currentModel.isFree && (
                          <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded shrink-0">gratuit</span>
                      )}
                    </div>
                  </>
              ) : (
                  <p className="text-sm font-medium text-foreground truncate">{selectedModel}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{showPicker ? '▲' : '▼'}</span>
          </div>

          {showPicker && (
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card shadow-sm">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                      value={modelSearch}
                      onChange={e => setModelSearch(e.target.value)}
                      placeholder="Rechercher…"
                      className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="flex gap-1.5">
                  {(['all', 'free', 'paid'] as const).map(f => (
                      <button
                          key={f}
                          type="button"
                          onClick={() => setFilterFree(f)}
                          className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all',
                              filterFree === f
                                  ? 'bg-foreground text-background border-foreground'
                                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
                          )}
                      >
                        {f === 'all' && 'Tous'}
                        {f === 'free' && <><Zap className="h-2.5 w-2.5" /> Gratuits</>}
                        {f === 'paid' && 'Payants'}
                      </button>
                  ))}
                </div>
                {modelsLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                      {filteredModels.map(model => (
                          <button
                              key={model.id}
                              type="button"
                              onClick={() => { setSelectedModel(model.id); setShowPicker(false) }}
                              className={cn(
                                  'flex items-center gap-2 text-left p-2 rounded-lg border transition-all text-xs',
                                  model.id === selectedModel
                                      ? 'border-foreground bg-accent'
                                      : 'border-transparent hover:border-border hover:bg-accent/30'
                              )}
                          >
                            <span className="flex-1 font-medium text-foreground truncate">{model.name}</span>
                            {model.isFree && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded shrink-0">free</span>}
                            {model.id === selectedModel && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
                          </button>
                      ))}
                    </div>
                )}
                {!isDefault && (
                    <button
                        type="button"
                        onClick={() => { setSelectedModel(DEFAULT_MODEL); setShowPicker(false) }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center mt-1"
                    >
                      ↩ Revenir au modèle par défaut
                    </button>
                )}
              </div>
          )}
        </div>
      </div>
  )
}
