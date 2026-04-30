// src/pages/SettingsPage.tsx
import { useRef, useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useJobs, useImportJobs } from '@/hooks/useJobs'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type JobApplication } from '@/types'
import { Download, Upload, Check, Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n'

export function SettingsPage() {
  const { settings, setSettings } = useSettings()
  const { data: jobs = [] } = useJobs()
  const importMutation = useImportJobs()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importConfirm, setImportConfirm] = useState<JobApplication[] | null>(null)
  const { t } = useI18n()

  function handleExport() {
    const date = new Date().toISOString().split('T')[0]
    const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jat_export_${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: t.toast.exported, description: t.toast.exportedDesc(jobs.length) })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as unknown
        if (!Array.isArray(parsed)) throw new Error('Invalid format')
        setImportConfirm(parsed as JobApplication[])
      } catch {
        toast({ title: t.toast.invalidFile, variant: 'destructive' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport() {
    if (!importConfirm) return
    await importMutation.mutateAsync(importConfirm)
    toast({ title: t.toast.imported, description: t.toast.importedDesc(importConfirm.length) })
    setImportConfirm(null)
  }

  return (
      <div className="max-w-lg">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-foreground">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.settings.subtitle}</p>
        </div>

        {/* Follow-up setting */}
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

        {/* Export / Import */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4">{t.settings.dataSection}</h2>

          <div className="flex flex-col gap-3">
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

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{t.settings.importLabel}</p>
                <p className="text-xs text-muted-foreground">{t.settings.importDesc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {t.settings.importLabel}
              </Button>
              <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
              />
            </div>

            {importConfirm && (
                <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {t.settings.confirmTitle}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    {t.settings.confirmDesc(importConfirm.length, jobs.length)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={confirmImport} disabled={importMutation.isPending}>
                      {importMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                          <Check className="h-4 w-4" />
                      )}
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

        <p className="text-xs text-muted-foreground mt-4 text-center">
          {t.settings.storageInfo}
        </p>
      </div>
  )
}
