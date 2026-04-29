// src/pages/BoardPage.tsx
import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { JobForm } from '@/components/forms/JobForm'
import { useJobs } from '@/hooks/useJobs'

export function BoardPage() {
  const [open, setOpen] = useState(false)
  const { isLoading } = useJobs()

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-foreground">Candidatures</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Glisse les cartes pour changer le statut
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          Nouvelle candidature
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-2 flex-1 scrollbar-thin">
          <KanbanBoard />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouvelle candidature</DialogTitle>
          </DialogHeader>
          <JobForm onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
