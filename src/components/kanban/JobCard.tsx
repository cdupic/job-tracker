// src/components/kanban/JobCard.tsx
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, AlertCircle, User } from 'lucide-react'
import { cn, daysBetween, formatDate } from '@/lib/utils'
import { STATUS_COLORS, type JobApplication } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { JobForm } from '@/components/forms/JobForm'

interface JobCardProps {
  job: JobApplication
  followUpDays: number
}

export function JobCard({ job, followUpDays }: JobCardProps) {
  const [open, setOpen] = useState(false)
  const days = daysBetween(job.dateApplied)
  const needsFollowUp = job.status === 'applied' && days >= followUpDays
  const colors = STATUS_COLORS[job.status]

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => setOpen(true)}
        className={cn(
          'group relative bg-card border border-border rounded-lg p-3.5 cursor-pointer',
          'hover:border-foreground/20 hover:shadow-sm transition-all duration-150',
          'animate-slide-up',
          isDragging && 'opacity-40 ring-1 ring-primary shadow-lg scale-[0.98]'
        )}
      >
        {/* Follow-up warning */}
        {needsFollowUp && (
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            <span className="text-[10px] font-mono text-orange-500 font-medium">Relancer ?</span>
          </div>
        )}

        {/* Company */}
        <p className="font-semibold text-[13px] text-foreground leading-tight pr-16 truncate">
          {job.company}
        </p>

        {/* Role */}
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.role}</p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] font-mono text-muted-foreground">
            {formatDate(job.dateApplied)}
          </span>

          <div className="flex items-center gap-1.5">
            {job.contact && (job.contact.name || job.contact.email) && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                    title="Voir le contact"
                  >
                    <User className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  onClick={(e) => e.stopPropagation()}
                  className="w-64 p-4 z-[100] bg-card flex flex-col gap-2 shadow-xl border-border rounded-xl"
                >
                  <div className="flex items-center gap-3 border-b border-border pb-3 mb-1">
                    <div className="h-10 w-10 shrink-0 bg-primary/10 text-primary flex items-center justify-center rounded-full font-display text-lg">
                      {job.contact.name ? job.contact.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {job.contact.name || "Contact inconnu"}
                      </span>
                      {job.contact.email && (
                        <a href={`mailto:${job.contact.email}`} className="text-xs text-muted-foreground hover:text-primary transition-colors truncate mt-0.5">
                          {job.contact.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-1 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Candidature envoyée le</span>
                      <span className="font-medium text-foreground font-mono">{formatDate(job.dateApplied)}</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Badge className={cn(colors.badge, 'ml-1')}>
              {days === 0 ? 'aujourd\'hui' : `${days}j`}
            </Badge>
          </div>
        </div>

        {job.notes && (
          <div className="mt-2 flex items-start gap-1">
            <AlertCircle className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground/60 line-clamp-1">{job.notes}</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {job.company}{' '}
              <span className="text-muted-foreground font-sans font-normal text-base">
                · {job.role}
              </span>
            </DialogTitle>
          </DialogHeader>
          <JobForm job={job} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
