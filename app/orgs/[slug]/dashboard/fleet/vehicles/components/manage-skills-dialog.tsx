'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Loader2, Check, X as XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { archiveSkill, getSkillCatalog, renameSkill } from '@/lib/supabase/db'
import { isUniqueViolationError } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/utils'
import { Tables } from '@/lib/supabase/supabase'

function SkillRow({
    skill,
    onChanged,
}: {
    skill: Tables<'skills'>
    onChanged: (updated: Tables<'skills'>) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(skill.name)
    const [isSaving, startSaving] = useTransition()
    const [isArchiving, startArchiving] = useTransition()
    const isArchived = skill.archived_at !== null

    function handleRename() {
        const trimmed = name.trim()
        if (!trimmed || trimmed === skill.name) {
            setIsEditing(false)
            setName(skill.name)
            return
        }
        startSaving(async () => {
            try {
                const updated = await renameSkill(skill.id, trimmed)
                onChanged(updated)
                setIsEditing(false)
                toast.success('Skill renamed')
            } catch (error) {
                console.error(error)
                toast.error(
                    isUniqueViolationError(error)
                        ? `A skill named "${trimmed}" already exists.`
                        : getErrorMessage(error) || 'Failed to rename the skill.'
                )
            }
        })
    }

    function handleArchive() {
        startArchiving(async () => {
            try {
                const updated = await archiveSkill(skill.id)
                onChanged(updated)
                toast.success(`"${skill.name}" archived`)
            } catch (error) {
                console.error(error)
                toast.error(getErrorMessage(error) || 'Failed to archive the skill.')
            }
        })
    }

    return (
        <div className="flex items-center justify-between gap-3 py-2" data-testid="manage-skills-row">
            {isEditing ? (
                <div className="flex flex-1 items-center gap-2">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSaving}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename()
                            if (e.key === 'Escape') {
                                setIsEditing(false)
                                setName(skill.name)
                            }
                        }}
                        className="h-8"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={isSaving} onClick={handleRename}>
                        {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={isSaving}
                        onClick={() => {
                            setIsEditing(false)
                            setName(skill.name)
                        }}
                    >
                        <XIcon className="size-4" />
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{skill.name}</span>
                        {isArchived && <Badge variant="secondary">Archived</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Rename ${skill.name}`}
                            disabled={isArchived}
                            onClick={() => setIsEditing(true)}
                            data-testid="manage-skills-rename"
                        >
                            <Pencil className="size-4 text-muted-foreground" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger
                                render={
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                        disabled={isArchived}
                                        data-testid="manage-skills-archive"
                                    >
                                        Archive
                                    </Button>
                                }
                            />
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{`Archive "${skill.name}"?`}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        It disappears from the vehicle and package pickers, but existing
                                        assignments and historical routes keep referencing it.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={isArchiving}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            handleArchive()
                                        }}
                                    >
                                        {isArchiving && <Loader2 className="mr-2 size-4 animate-spin" />}
                                        Archive
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </>
            )}
        </div>
    )
}

/**
 * Rename/archive for the organisation's skill catalog. Creation lives inline
 * in the Capabilities combobox instead (see SkillsMultiSelect) — this dialog
 * only manages skills that already exist, per HIK-95.
 */
export function ManageSkillsDialog() {
    const [open, setOpen] = useState(false)
    const [skills, setSkills] = useState<Tables<'skills'>[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const loadSkills = useCallback(async () => {
        setIsLoading(true)
        try {
            setSkills(await getSkillCatalog())
        } catch (error) {
            console.error(error)
            toast.error('Failed to load the skill catalog.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (open) void loadSkills()
    }, [open, loadSkills])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm">Manage Skills</Button>} />
            <DialogContent data-testid="manage-skills-dialog">
                <DialogHeader>
                    <DialogTitle>Manage Skills</DialogTitle>
                    <DialogDescription>
                        Rename or archive the capability labels vehicles and packages are matched on.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : skills.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground" data-testid="manage-skills-empty">
                        No skills yet. Add one from a vehicle&apos;s Capabilities card.
                    </div>
                ) : (
                    <div className="divide-y max-h-96 overflow-y-auto">
                        {skills.map((skill) => (
                            <SkillRow
                                key={skill.id}
                                skill={skill}
                                onChanged={(updated) =>
                                    setSkills((current) =>
                                        current.map((s) => (s.id === updated.id ? updated : s))
                                    )
                                }
                            />
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
