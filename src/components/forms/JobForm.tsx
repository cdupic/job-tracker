// src/components/forms/JobForm.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useCreateJob, useUpdateJob, useDeleteJob } from '@/hooks/useJobs'
import { toast } from '@/hooks/useToast'
import { todayISO } from '@/lib/utils'
import { STATUS_LABELS, STATUS_ORDER, type JobApplication, type JobStatus } from '@/types'
import { Trash2, Loader2, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const [company, setCompany] = useState(job?.company ?? '')
  const [role, setRole] = useState(job?.role ?? '')
  const [url, setUrl] = useState(job?.url ?? '')
  const [dateApplied, setDateApplied] = useState(job?.dateApplied ?? todayISO())
  const [status, setStatus] = useState<JobStatus>(job?.status ?? 'applied')
  const [contactName, setContactName] = useState(job?.contact?.name ?? '')
  const [contactEmail, setContactEmail] = useState(job?.contact?.email ?? '')
  const [notes, setNotes] = useState(job?.notes ?? '')
  const [errors, setErrors] = useState<FormErrors>({})

  const createJob = useCreateJob()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()

  // Convert date string "YYYY-MM-DD" to local Date object at noon to avoid timezone shift
  const parsedDate = dateApplied ? new Date(dateApplied + 'T12:00:00') : undefined

  const isPending = createJob.isPending || updateJob.isPending

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!company.trim()) errs.company = 'Entreprise requise'
    if (!role.trim()) errs.role = 'Poste requis'
    if (!dateApplied) errs.dateApplied = 'Date requise'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      company: company.trim(),
      role: role.trim(),
      url: url.trim() || undefined,
      status,
      dateApplied,
      contact: contactName || contactEmail
        ? { name: contactName || undefined, email: contactEmail || undefined }
        : undefined,
      notes: notes.trim() || undefined,
    }

    if (isEdit) {
      await updateJob.mutateAsync({ id: job.id, updates: payload })
      toast({ title: 'Candidature mise à jour' })
    } else {
      await createJob.mutateAsync(payload)
      toast({ title: 'Candidature ajoutée', description: `${payload.company} · ${payload.role}` })
    }
    onClose()
  }

  async function handleDelete() {
    if (!job) return
    await deleteJob.mutateAsync(job.id)
    toast({ title: 'Candidature supprimée', variant: 'destructive' })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Entreprise *</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Google, Apple…"
            className={errors.company ? 'border-destructive' : ''}
          />
          {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Poste *</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Software Engineer…"
            className={errors.role ? 'border-destructive' : ''}
          />
          {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date de candidature *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateApplied && "text-muted-foreground",
                  errors.dateApplied && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateApplied ? format(parsedDate!, "PPP", { locale: fr }) : <span>Choisir une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100] bg-card" align="start">
              <Calendar
                mode="single"
                locale={fr}
                selected={parsedDate}
                onSelect={(d) => {
                  if (d) {
                    // Convert back to local "YYYY-MM-DD" safely
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setDateApplied(`${year}-${month}-${day}`);
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
          <Label>Statut *</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* URL */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="url">Lien de l'offre</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-name">Nom du contact</Label>
          <Input
            id="contact-name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Marie Dupont"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-email">Email du contact</Label>
          <Input
            id="contact-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="marie@example.com"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informations importantes, suite à donner…"
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
            {deleteJob.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Supprimer
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </form>
  )
}
