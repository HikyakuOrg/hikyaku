"use client"

import { PackageFormValues, packageSchema } from "../add-package-schema";
import { Controller, useForm } from "react-hook-form";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";


export function PackageInfo({ onNext, defaultValues }: {
    onNext: (data: PackageFormValues) => void;
    defaultValues?: PackageFormValues;
}) {

    const MAX_FILE_SIZE = 1000 * 1000 * 5 // 5MB
    const MAX_FILE = 3

    const initialValues = useMemo(() => defaultValues ?? {
        packageId: crypto.randomUUID(),
        weight: 0,
        length: 0,
        width: 0,
        height: 0
    }, [defaultValues]);

    const form = useForm({
        resolver: zodResolver(packageSchema),
        defaultValues: initialValues,
    });

    const watchedPackageId = form.watch("packageId");

    const props = useSupabaseUpload({
        bucketName: 'packages',
        path: `${watchedPackageId}/images/received`,
        allowedMimeTypes: ['image/*'],
        maxFiles: MAX_FILE,
        maxFileSize: MAX_FILE_SIZE,
    })


    return (
        <form
            id="packageInfo"
            onSubmit={form.handleSubmit(onNext)}
            className="space-y-8 p-4">

            <FieldGroup>
                <Controller
                    name="weight"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="stepper-form-weight">
                                Weight
                                <Badge variant="destructive">Required</Badge>
                            </FieldLabel>
                            <InputGroup >
                                <InputGroupInput  {...field}
                                    id="stepper-form-weight"
                                    aria-invalid={fieldState.invalid}
                                    type="number"
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                    placeholder="0.0" />
                                <InputGroupAddon align="inline-end">KG</InputGroupAddon>
                            </InputGroup>

                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
                <Field>
                    <FieldLabel>
                        Dimensions (L × W × H)
                        <Badge variant="destructive">Required</Badge>
                    </FieldLabel>

                    <div className="flex items-start gap-3">
                        <Controller
                            name="length"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <div className="flex-1">
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            aria-invalid={fieldState.invalid}
                                            type="number"
                                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            placeholder="Length"
                                        />
                                        <InputGroupAddon align="inline-end">CM</InputGroupAddon>
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </div>
                            )}
                        />

                        <div className="flex items-center pt-2 text-muted-foreground">×</div>

                        <Controller
                            name="width"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <div className="flex-1">
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            aria-invalid={fieldState.invalid}
                                            type="number"
                                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            placeholder="Width"
                                        />
                                        <InputGroupAddon align="inline-end">CM</InputGroupAddon>
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </div>
                            )}
                        />

                        <div className="flex items-center pt-2 text-muted-foreground">×</div>

                        <Controller
                            name="height"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <div className="flex-1">
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            aria-invalid={fieldState.invalid}
                                            type="number"
                                            placeholder="Height"
                                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                        />
                                        <InputGroupAddon align="inline-end">CM</InputGroupAddon>
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </div>
                            )}
                        />
                    </div>
                </Field>
                <Field>
                    <FieldLabel htmlFor="stepper-form-weight">
                        Package Images
                        <span className="text-muted-foreground ml-1">
                            (Optional)
                        </span>
                    </FieldLabel>
                    <Controller
                        name="files"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <div className="flex-1">
                                <Dropzone {...props}>
                                    <DropzoneEmptyState />
                                    <DropzoneContent />
                                </Dropzone>
                            </div>
                        )}
                    />
                </Field>

            </FieldGroup>
            <div className="flex justify-end gap-2 pt-6 border-t mt-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Next…" : "Next"}
                </Button>
            </div>
        </form>
    );

}