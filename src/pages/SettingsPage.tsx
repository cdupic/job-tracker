import { useRef, useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useJobs, useFullImport, type ImportStrategy } from '@/hooks/useJobs'
import { usePeriods } from '@/hooks/usePeriods'
import { useCompanies } from '@/hooks/useCompanies'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PeriodForm } from '@/components/periods/PeriodForm'
import { type ExportData, type Period, PERIOD_COLOR_STYLES, type PeriodColor } from '@/types'
import {
  Download, Upload, Check, Loader2, Plus, Pencil,
  AlertTriangle, GitMerge, Trash2, ChevronDown, ChevronUp,
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

export function SettingsPage() {
  const { settings, setSettings } = useSettings()
  const { data: jobs = [] } = useJobs()
  const { data: periods = [] } = usePeriods()
  const { data: companies = [] } = useCompanies()
  const fullImport = useFullImport()
  const { columns, setColumns } = useKanbanConfig()
  const fileRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  // ── Export : sélection des périodes ──────────────────────────────────────
  const [exportPeriodIds, setExportPeriodIds] = useState<Set<string>>(
      () => new Set(periods.map((p) => p.id))
  )
  const [showExportPeriods, setShowExportPeriods] = useState(false)

  // Sync si les périodes chargent après le premier render
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
  function handleExport() {
    const date = new Date().toISOString().split('T')[0]

    // Candidatures filtrées : sans période + celles des périodes cochées
    const filteredJobs = jobs.filter(
        (j) => !j.periodId || exportPeriodIds.has(j.periodId)
    )
    const filteredPeriods = periods.filter((p) => exportPeriodIds.has(p.id))

    // Entreprises liées aux candidatures exportées
    const exportedCompanyIds = new Set(filteredJobs.map((j) => j.companyId).filter(Boolean))
    const filteredCompanies = companies.filter((c) => exportedCompanyIds.has(c.id))

    const exportData: ExportData = {
      version: 2,
      columns,
      applications: filteredJobs,
      periods: filteredPeriods,
      companies: filteredCompanies,
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
            data: { version: 2, columns, applications: parsed, periods: [], companies: [] },
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
    toast({
      title: t.toast.imported,
      description: t.toast.importedDesc(data.applications.length),
    })
    setImportConfirm(null)
  }

  // ── Helpers affichage ─────────────────────────────────────────────────────
  const previewJobCount = jobs.filter(
      (j) => !j.periodId || exportPeriodIds.has(j.periodId)
  ).length

  return (
      <div className="max-w-lg">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-foreground">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settings.subtitle}</p>
        </div>

        {/* Follow-up */}
        <section className="bg-card border border-border rounded-xl p-6 mb-4">
          <h2 className="text-sm font-semibold mb-4">{t.settings.followUpSection}</h2>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="followup">{t.settings.followUpLabel}</Label>
              <Input
                  id="followup"
                  type="number"
                  min={1}
                  max={90}
                  value={settings.followUpDays}
                  onChange={(e) => setSettings({ followUpDays: Number(e.target.value) })}
                  className="w-28"
              />
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              {t.settings.followUpDesc(settings.followUpDays)}
            </p>
          </div>
        </section>

        {/* Periods */}
        <section className="bg-card border border-border rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">{t.periods.settingsSection}</h2>
            <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditingPeriod(null); setPeriodDialogOpen(true) }}
            >
              <Plus className="h-4 w-4" />
              {t.periods.create}
            </Button>
          </div>

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

        {/* Export / Import */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4">{t.settings.dataSection}</h2>

          <div className="flex flex-col gap-4">

            {/* ── Export ── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm">{t.settings.exportLabel}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.exportDesc}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0">
                  <Download className="h-4 w-4" />
                  {t.settings.exportLabel}
                </Button>
              </div>

              {/* Sélecteur de périodes pour l'export */}
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
                          {/* Tout sélectionner */}
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

            <div className="border-t border-border" />

            {/* ── Import ── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm">{t.settings.importLabel}</p>
                <p className="text-xs text-muted-foreground">{t.settings.importDesc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="shrink-0">
                <Upload className="h-4 w-4" />
                {t.settings.importLabel}
              </Button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Confirmation import avec choix de stratégie */}
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
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Les deux stratégies */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Fusionner */}
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

                    {/* Remplacer tout */}
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
        </section>

        <p className="text-xs text-muted-foreground mt-4 text-center">{t.settings.storageInfo}</p>

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
