"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganisation } from '@/lib/actions/organisations'
import { orgPath } from '@/lib/subdomain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { BuildingIcon, PersonIcon } from '@phosphor-icons/react'

type Step = 'type' | 'name'

export default function NewOrganisationPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Personal skips the name step entirely — the user's personal org (created
  // at signup by handle_new_user()) is looked up and we route straight in.
  const handlePersonal = async () => {
    setIsLoading(true)
    setError(null)
    const result = await createOrganisation(null, 'personal')
    if (typeof result === 'string') {
      setError(result)
      setIsLoading(false)
      return
    }
    setIsLoading(false)
    router.push(orgPath(result.slug, '/dashboard'))
  }

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Company name is required')
      return
    }
    setIsLoading(true)
    setError(null)
    const result = await createOrganisation(name.trim(), 'company')
    if (typeof result === 'string') {
      setError(result)
      setIsLoading(false)
      return
    }
    setIsLoading(false)
    setName('')
    router.push(orgPath(result.slug, '/dashboard'))
  }

  return (
    <div className="flex flex-1 min-h-screen items-center justify-center p-6">
      {step === 'type' ? (
        <TypeStep
          onPersonal={handlePersonal}
          onCompany={() => setStep('name')}
          isLoading={isLoading}
          error={error}
        />
      ) : (
        <NameStep
          name={name}
          onNameChange={setName}
          onBack={() => {
            setError(null)
            setStep('type')
          }}
          onSubmit={handleCompanySubmit}
          error={error}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

function TypeStep({
  onPersonal,
  onCompany,
  isLoading,
  error,
}: {
  onPersonal: () => void
  onCompany: () => void
  isLoading: boolean
  error: string | null
}) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="border-b">
        <CardTitle>Welcome</CardTitle>
        <CardDescription>
          How are you using the app?
        </CardDescription>
      </CardHeader>
      <CardContent className="py-6 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onPersonal}
          disabled={isLoading}
          className="flex flex-col items-center gap-3 rounded-lg border p-6 text-left hover:border-primary hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <PersonIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Personal</p>
            <p className="text-sm text-muted-foreground mt-1">
              Just for me. No setup required — go straight to the dashboard.
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onCompany}
          disabled={isLoading}
          className="flex flex-col items-center gap-3 rounded-lg border p-6 text-left hover:border-primary hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <BuildingIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Company</p>
            <p className="text-sm text-muted-foreground mt-1">
              For a business. You can set up payments later from Business Information.
            </p>
          </div>
        </button>
      </CardContent>
      {error && (
        <CardFooter className="border-t">
          <p className="text-sm text-destructive">{error}</p>
        </CardFooter>
      )}
    </Card>
  )
}

function NameStep({
  name,
  onNameChange,
  onBack,
  onSubmit,
  error,
  isLoading,
}: {
  name: string
  onNameChange: (v: string) => void
  onBack: () => void
  onSubmit: (e: React.FormEvent) => void
  error: string | null
  isLoading: boolean
}) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="border-b">
        <CardTitle>Name your company</CardTitle>
        <CardDescription>
          You can set up payments and other company details later.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit}>
        <CardContent className="py-6">
          <div className="grid grid-cols-[1fr_2fr] gap-4 items-start">
            <Label htmlFor="org-name" className="pt-2 font-medium">
              Name
            </Label>
            <div className="flex flex-col gap-1.5">
              <Input
                id="org-name"
                placeholder="Company name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                aria-invalid={!!error}
                autoFocus
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  What&apos;s the name of your company? You can change this later.
                </p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
            Back
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating…' : 'Create company'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
