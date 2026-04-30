import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, X, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'
import { useJobs, useUpdateJob } from '@/hooks/useJobs'
import { ALL_KANBAN_COLORS, COLUMN_COLOR_STYLES, KanbanColumnColor, KanbanColumnConfig } from '@/types'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

interface SortableItemProps {
  col: KanbanColumnConfig
  onRemove: (id: string) => void
  onUpdate: (id: string, partial: Partial<KanbanColumnConfig>) => void
  canRemove: boolean
  jobsCount: number
}

function SortableItem({ col, onRemove, onUpdate, canRemove, jobsCount }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: col.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const { t } = useI18n()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg mb-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-accent rounded text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <Input
        value={col.label}
        onChange={(e) => onUpdate(col.id, { label: e.target.value })}
        className="flex-1 h-8"
      />
      <Select
        value={col.color}
        onValueChange={(val) => onUpdate(col.id, { color: val as KanbanColumnColor })}
      >
        <SelectTrigger className="w-[100px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_KANBAN_COLORS.map((c) => (
            <SelectItem key={c} value={c}>
               <div className="flex items-center gap-2">
                 <div className={cn("w-3 h-3 rounded-full", COLUMN_COLOR_STYLES[c].dot)} />
                 {c}
               </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        disabled={!canRemove}
        onClick={() => onRemove(col.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function KanbanConfigModal() {
  const { columns, setColumns, addColumn } = useKanbanConfig()
  const { data: jobs = [] } = useJobs()
  const updateJob = useUpdateJob()
  const { t } = useI18n()

  const [open, setOpen] = useState(false)
  const [localCols, setLocalCols] = useState<KanbanColumnConfig[]>([])

  // Track col to delete that has items
  const [colToDelete, setColToDelete] = useState<string | null>(null)
  const [targetColId, setTargetColId] = useState<string>('')

  // Init local state on open
  function handleOpenChange(val: boolean) {
    if (val) setLocalCols(columns)
    setOpen(val)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocalCols((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  function handleUpdate(id: string, partial: Partial<KanbanColumnConfig>) {
    setLocalCols((items) => items.map((col) => (col.id === id ? { ...col, ...partial } : col)))
  }

  function handleRemove(id: string) {
    const count = jobs.filter((j) => j.status === id).length
    if (count > 0) {
      setColToDelete(id)
      setTargetColId(localCols.find(c => c.id !== id)?.id || '')
    } else {
      setLocalCols((items) => items.filter((col) => col.id !== id))
    }
  }

  function confirmDelete() {
    if (!colToDelete || !targetColId) return
    // Move jobs
    const affectedJobs = jobs.filter(j => j.status === colToDelete)
    for (const job of affectedJobs) {
      updateJob.mutate({ id: job.id, updates: { status: targetColId }})
    }
    // Remove col
    setLocalCols((items) => items.filter((col) => col.id !== colToDelete))
    setColToDelete(null)
  }

  function handleAdd() {
    setLocalCols([
      ...localCols,
      { id: crypto.randomUUID(), label: 'New Column', color: 'gray', order: localCols.length }
    ])
  }

  async function handleSave() {
    setColumns(localCols)
    setOpen(false)
  }

  if (colToDelete) {
    const infoCol = localCols.find(c => c.id === colToDelete)
    const count = jobs.filter((j) => j.status === colToDelete).length

    return (
      <Dialog open={true} onOpenChange={() => setColToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Column</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm">
              {t.kanban.deleteWarning(infoCol?.label || '', count)}
            </p>
            <Select value={targetColId} onValueChange={setTargetColId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {localCols.filter(c => c.id !== colToDelete).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setColToDelete(null)}>{t.kanban.cancelDelete}</Button>
            <Button onClick={confirmDelete}>{t.kanban.confirmDelete}</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden lg:flex">
          <Settings2 className="h-4 w-4 mr-2" />
          {t.kanban.configButton}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.kanban.configTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t.kanban.configSubtitle}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localCols.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {localCols.map((col) => (
                <SortableItem
                  key={col.id}
                  col={col}
                  onRemove={handleRemove}
                  onUpdate={handleUpdate}
                  canRemove={localCols.length > 1}
                  jobsCount={jobs.filter(j => j.status === col.id).length}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button variant="dashed" onClick={handleAdd} className="w-full mt-2">
            <Plus className="h-4 w-4 mr-2" /> {t.kanban.addColumn}
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>{t.kanban.cancel}</Button>
          <Button onClick={handleSave}>{t.kanban.save}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

