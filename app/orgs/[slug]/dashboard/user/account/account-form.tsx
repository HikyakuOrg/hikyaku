"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

const accountSchema = z
    .object({
        displayName: z.string().min(1, "Display name is required"),
        password: z.string().optional(),
        confirmPassword: z.string().optional(),
    })
    .refine((v) => !v.password || v.password.length >= 8, {
        message: "Password must be at least 8 characters",
        path: ["password"],
    })
    .refine((v) => !v.password || v.password === v.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })

type AccountValues = z.infer<typeof accountSchema>

export function AccountForm() {
    const supabase = createClient()

    const form = useForm<AccountValues>({
        resolver: zodResolver(accountSchema),
        defaultValues: { displayName: "", password: "", confirmPassword: "" },
    })

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            form.reset({
                displayName: data.user?.user_metadata?.display_name ?? "",
                password: "",
                confirmPassword: "",
            })
        })
    }, [])

    async function onSubmit(values: AccountValues) {
        const supabase = createClient()
        const errors: string[] = []

        const { error: metaError } = await supabase.auth.updateUser({
            data: { display_name: values.displayName },
        })
        if (metaError) errors.push(metaError.message)

        if (values.password) {
            const { error: passwordError } = await supabase.auth.updateUser({
                password: values.password,
            })
            if (passwordError) errors.push(passwordError.message)
        }

        if (errors.length > 0) {
            toast.error(errors.join(" · "))
            return
        }

        form.reset({ ...values, password: "", confirmPassword: "" })
        toast.success("Account updated")
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Display Name</CardTitle>
                    <CardDescription>This is the name shown across the dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Field className="space-y-2">
                        <FieldLabel htmlFor="display-name">Name</FieldLabel>
                        <Input
                            id="display-name"
                            placeholder="Your name"
                            {...form.register("displayName")}
                        />
                        <FieldError>{form.formState.errors.displayName?.message}</FieldError>
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                        Leave blank to keep your current password. Must be at least 8 characters.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Field className="space-y-2">
                        <FieldLabel htmlFor="password">New Password</FieldLabel>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            {...form.register("password")}
                        />
                        <FieldError>{form.formState.errors.password?.message}</FieldError>
                    </Field>
                    <Field className="space-y-2">
                        <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                        <Input
                            id="confirm-password"
                            type="password"
                            placeholder="••••••••"
                            {...form.register("confirmPassword")}
                        />
                        <FieldError>{form.formState.errors.confirmPassword?.message}</FieldError>
                    </Field>
                </CardContent>
            </Card>

            <Button type="submit" disabled={form.formState.isSubmitting}>
                Save
            </Button>
        </form>
    )
}
