// src/pages/SettingsPage.tsx
import { useRef, useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useJobs, useFullImport } from '@/hooks/useJobs'
import { usePeriods } from '@/hooks/usePeriods'
import { useCompanies } from '@/hooks/useCompanies'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PeriodForm } from '@/components/periods/PeriodForm'
import { type ExportData, PERIOD_COLOR_STYLES } from '@/types'
import { Download, Upload, Check, Loader2, Plus, Pencil, AlertTriangle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'

export function SettingsPage() {
  const { settings, setSettings } = useSettings()
  const { data: jobs = [] } = useJobs()
  const { data: periods = [] } = usePeriods()
  const { data: companies = [] } = useCompanies()
  const fullImport = useFullImport()
  const { columns, setColumns } = useKanbanConfig()
  const fileRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  const [importConfirm, setImportConfirm] = useState<{
    data: ExportData
    isV2: boolean
  } | null>(null)

  const [periodDialogOpen, setPeriodDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<any>(null)

  // ── Export ─────────────────────────────────────────────────────────────────
  function handleExport() {
    const date = new Date().toISOString().split('T')[0]
    const exportData: ExportData = {
      version: 2,
      columns,
      applications: jobs,
      periods,
      companies,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jat_export_${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: t.toast.exported, description: t.toast.exportedDesc(jobs.length) })
  }

  // ── Import parsing ─────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as any

        if (Array.isArray(parsed)) {
          // v1 — tableau brut de candidatures
          setImportConfirm({
            data: {
              version: 2,
              columns,
              applications: parsed,
              periods: [],
              companies: [],
            },
            isV2: false,
          })
        } else if (parsed.version === 2 && Array.isArray(parsed.applications)) {
          // v2 — format complet
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

  // ── Import confirmation ────────────────────────────────────────────────────
  async function confirmImport() {
    if (!importConfirm) return
    const { data, isV2 } = importConfirm

    await fullImport.mutateAsync({ data, isV2 })

    if (isV2 && data.columns?.length) {
      setColumns(data.columns)
    }

    toast({
      title: t.toast.imported,
      description: t.toast.importedDesc(data.applications.length),
    })
    setImportConfirm(null)
  }

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
                  const colors = PERIOD_COLOR_STYLES[period.color] ?? PERIOD_COLOR_STYLES.blue
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
                            {period.endDate ? ` → ${formatDate(period.endDate, t.intlLocale)}` : ` → ${t.periods.ongoing}`}
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

          <div className="flex flex-col gap-3">
            {/* Export */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{t.settings.exportLabel}</p>
                <p className="text-xs text-muted-foreground">{t.settings.exportDesc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                {t.settings.exportLabel}
              </Button>
            </div>

            <div className="border-t border-border" />

            {/* Import */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{t.settings.importLabel}</p>
                <p className="text-xs text-muted-foreground">{t.settings.importDesc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {t.settings.importLabel}
              </Button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Confirmation block */}
            {importConfirm && (
                <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {t.settings.confirmTitle}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {importConfirm.isV2 ? (
                            <>
                              Cet import remplacera toutes vos données actuelles par :{' '}
                              <span className="font-semibold text-amber-900 dark:text-amber-200">
                          {importConfirm.data.applications.length} candidature{importConfirm.data.applications.length > 1 ? 's' : ''}
                        </span>
                              {(importConfirm.data.periods?.length ?? 0) > 0 && (
                                  <>, {' '}
                                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                              {importConfirm.data.periods!.length} période{importConfirm.data.periods!.length > 1 ? 's' : ''}
                            </span>
                                  </>
                              )}
                              {(importConfirm.data.companies?.length ?? 0) > 0 && (
                                  <>, {' '}
                                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                              {importConfirm.data.companies!.length} entreprise{importConfirm.data.companies!.length > 1 ? 's' : ''}
                            </span>
                                  </>
                              )}
                              . Vos données actuelles ({jobs.length} candidature{jobs.length > 1 ? 's' : ''}) seront perdues.
                            </>
                        ) : (
                            t.settings.confirmDescV1(importConfirm.data.applications.length, jobs.length)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmImport} disabled={fullImport.isPending}>
                      {fullImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {t.settings.confirm}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setImportConfirm(null)}>
                      {t.settings.cancel}
                    </Button>
                  </div>
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
                period={editingPeriod}
                onClose={() => { setPeriodDialogOpen(false); setEditingPeriod(null) }}
            />
          </DialogContent>
        </Dialog>
      </div>
  )
} 
