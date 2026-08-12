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

// Every user already has exactly one personal org, created at signup by
// handle_new_user() — so this page only ever creates a company org.
export default function NewOrganisationPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <CardTitle>Name your company</CardTitle>
          <CardDescription>
            You can set up payments and other company details later.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
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
                  onChange={(e) => setName(e.target.value)}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create company'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
