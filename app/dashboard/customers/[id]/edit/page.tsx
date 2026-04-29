"use client"

import { use } from "react"

import { CustomerEditorPage } from "../../customer-editor-page"

type EditCustomerPageProps = {
    params: Promise<{ id: string }>
}

export default function EditCustomerPage({ params }: EditCustomerPageProps) {
    const { id } = use(params)

    return <CustomerEditorPage mode="edit" customerId={id} />
}