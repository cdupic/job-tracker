// src/components/forms/JobForm.tsx
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { useCreateJob, useUpdateJob, useDeleteJob } from '@/hooks/useJobs'
import { useCompanies, useCreateCompany } from '@/hooks/useCompanies'
import { usePeriods } from '@/hooks/usePeriods'
import { toast } from '@/hooks/useToast'
import { todayISO } from '@/lib/utils'
import { type JobApplication, type JobStatus, PERIOD_COLOR_STYLES } from '@/types'
import { Trash2, Loader2, CalendarIcon, Building2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'
import { CompanySheet } from '@/components/companies/CompanySheet'

interface JobFormProps {
  job?: JobApplication
  onClose: () => void
}

interface FormErrors {
  company?: string
  role?: string
  dateApplied?: string
}

export function JobForm({ job, onClose }: JobFormProps) {
  const isEdit = !!job
  const { t } = useI18n()
  const { columns } = useKanbanConfig()
  const { data: periods = [] } = usePeriods()
  const { data: companies = [] } = useCompanies()
  const createCompany = useCreateCompany()

  const [company, setCompany] = useState(job?.company ?? '')
  const [companyId, setCompanyId] = useState<string | undefined>(job?.companyId)
  const [role, setRole] = useState(job?.role ?? '')
  const [url, setUrl] = useState(job?.url ?? '')
  const [dateApplied, setDateApplied] = useState(job?.dateApplied ?? todayISO())
  const [status, setStatus] = useState<JobStatus>(job?.status ?? columns[0]?.id ?? 'applied')
  const [periodId, setPeriodId] = useState<string>(job?.periodId ?? '')
  const [contactName, setContactName] = useState(job?.contact?.name ?? '')
  const [contactEmail, setContactEmail] = useState(job?.contact?.email ?? '')
  const [notes, setNotes] = useState(job?.notes ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [companySheetOpen, setCompanySheetOpen] = useState(false)

  const createJob = useCreateJob()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()

  const parsedDate = dateApplied ? new Date(dateApplied + 'T12:00:00') : undefined
  const isPending = createJob.isPending || updateJob.isPending || createCompany.isPending

  // Suggestions: companies whose name contains the typed string (case-insensitive),
  // excluding an exact match (already selected)
  const suggestions = company.trim().length > 0
      ? companies
          .filter((c) =>
              c.displayName.toLowerCase().includes(company.toLowerCase().trim()) &&
              c.displayName.toLowerCase() !== company.toLowerCase().trim()
          )
          .slice(0, 6)
      : []

  const linkedCompany = companies.find((c) => c.id === companyId)

  function handleCompanyChange(value: string) {
    setCompany(value)
    setCompanyId(undefined) // user typed manually → reset link
    setShowSuggestions(true)
  }

  function selectSuggestion(c: (typeof companies)[0]) {
    setCompany(c.displayName)
    setCompanyId(c.id)
    setShowSuggestions(false)
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!company.trim()) errs.company = t.form.errorCompany
    if (!role.trim()) errs.role = t.form.errorRole
    if (!dateApplied) errs.dateApplied = t.form.errorDate
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function resolveCompanyId(): Promise<string> {
    // 1. Already linked via autocomplete selection
    if (companyId) return companyId

    // 2. Exact name match in existing companies
    const normalized = company.trim().toLowerCase()
    const existing = companies.find((c) => c.name === normalized)
    if (existing) return existing.id

    // 3. Auto-create a minimal profile
    const created = await createCompany.mutateAsync({
      name: normalized,
      displayName: company.trim(),
      contacts: [],
    })
    return created.id
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const resolvedCompanyId = await resolveCompanyId()

    const payload = {
      company: company.trim(),
      role: role.trim(),
      url: url.trim() || undefined,
      status,
      dateApplied,
      periodId: periodId || undefined,
      companyId: resolvedCompanyId,
      contact:
          contactName || contactEmail
              ? { name: contactName || undefined, email: contactEmail || undefined }
              : undefined,
      notes: notes.trim() || undefined,
    }

    if (isEdit) {
      await updateJob.mutateAsync({ id: job.id, updates: payload })
      toast({ title: t.toast.updated })
    } else {
      await createJob.mutateAsync(payload)
      toast({ title: t.toast.added, description: `${payload.company} · ${payload.role}` })
    }
    onClose()
  }

  async function handleDelete() {
    if (!job) return
    await deleteJob.mutateAsync(job.id)
    toast({ title: t.toast.deleted, variant: 'destructive' })
    onClose()
  }

  return (
      <>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Row 1 — company + role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company">{t.form.companyLabel}</Label>
              <div className="relative">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Input
                        id="company"
                        value={company}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder={t.form.companyPlaceholder}
                        autoComplete="off"
                        className={cn(
                            errors.company ? 'border-destructive' : '',
                            linkedCompany ? 'pr-7' : ''
                        )}
                    />
                    {linkedCompany && (
                        <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500 pointer-events-none" />
                    )}
                  </div>
                  <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      title={t.companies.openSheet}
                      onClick={() => setCompanySheetOpen(true)}
                  >
                    <Building2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Autocomplete dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-10 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      {suggestions.map((c) => (
                          <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => selectSuggestion(c)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground truncate">{c.displayName}</span>
                            {c.sector && (
                                <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{c.sector}</span>
                            )}
                          </button>
                      ))}
                    </div>
                )}
              </div>
              {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">{t.form.roleLabel}</Label>
              <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder={t.form.rolePlaceholder}
                  className={errors.role ? 'border-destructive' : ''}
              />
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>
          </div>

          {/* Row 2 — date + status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">{t.form.dateLabel}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                      variant="outline"
                      className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateApplied && 'text-muted-foreground',
                          errors.dateApplied && 'border-destructive'
                      )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateApplied
                        ? format(parsedDate!, 'PPP', { locale: t.dateFnsLocale })
                        : <span>{t.form.chooseDate}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100] bg-card" align="start">
                  <Calendar
                      mode="single"
                      locale={t.dateFnsLocale}
                      selected={parsedDate}
                      onSelect={(d) => {
                        if (d) {
                          const year = d.getFullYear()
                          const month = String(d.getMonth() + 1).padStart(2, '0')
                          const day = String(d.getDate()).padStart(2, '0')
                          setDateApplied(`${year}-${month}-${day}`)
                        }
                      }}
                      initialFocus
                      captionLayout="dropdown-buttons"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 2}
                  />
                </PopoverContent>
              </Popover>
              {errors.dateApplied && <p className="text-xs text-destructive">{errors.dateApplied}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t.form.statusLabel}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Period selector */}
          {periods.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>{t.form.periodLabel}</Label>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                      type="button"
                      onClick={() => setPeriodId('')}
                      className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                          !periodId
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                      )}
                  >
                    {t.form.noPeriod}
                  </button>
                  {periods.map((p) => {
                    const colors = PERIOD_COLOR_STYLES[p.color]
                    const isActive = periodId === p.id
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setPeriodId(p.id)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                                isActive
                                    ? cn(colors.badge, 'border', colors.border)
                                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                            )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot)} />
                          {p.name}
                        </button>
                    )
                  })}
                </div>
              </div>
          )}

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">{t.form.urlLabel}</Label>
            <Input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.form.urlPlaceholder}
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-name">{t.form.contactNameLabel}</Label>
              <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={t.form.contactNamePlaceholder}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-email">{t.form.contactEmailLabel}</Label>
              <Input
                  id="contact-email"
                  type="text"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t.form.contactEmailPlaceholder}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">{t.form.notesLabel}</Label>
            <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.form.notesPlaceholder}
                rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            {isEdit ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    disabled={deleteJob.isPending}
                >
                  {deleteJob.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {t.form.delete}
                </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>{t.form.cancel}</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? t.form.save : t.form.add}
              </Button>
            </div>
          </div>
        </form>

        {/* Company sheet dialog */}
        <Dialog open={companySheetOpen} onOpenChange={setCompanySheetOpen}>
          <DialogContent className="max-w-lg">
            <CompanySheet
                companyName={company}
                companyId={companyId ?? job?.companyId}
                jobId={job?.id}
                onClose={() => setCompanySheetOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </>
  )
}
