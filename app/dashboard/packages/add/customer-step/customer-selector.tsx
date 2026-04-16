import { useEffect, useState } from "react"
import { Controller, Control, FieldValues } from "react-hook-form"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Item, ItemContent, ItemTitle, ItemDescription } from "@/components/ui/item"
import { getCustomerDetails } from "@/lib/supabase/db"


type Props<T extends FieldValues> = {
    name: import("react-hook-form").FieldPath<T>
    control: Control<T>
    label?: string,
    customerSelected: (customer: Customer) => void,
    initialSelectedCustomer?: Customer | null
}

export function CustomerSelector<T extends FieldValues = any>({ name, control, customerSelected, initialSelectedCustomer }: Props<T>) {
    const [searchTerm, setSearchTerm] = useState("")
    const [results, setResults] = useState<Customer[]>([])
    const [selected, setSelected] = useState<Customer | null>(initialSelectedCustomer ?? null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (initialSelectedCustomer) {
            setSelected(initialSelectedCustomer)
        }
    }, [initialSelectedCustomer])

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (!searchTerm || searchTerm.length < 2) {
                setResults([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            const data = await getCustomerDetails(searchTerm)
            const typedData: Customer[] =
                data?.map((item) => ({
                    ...item,
                    customer_location: item.customer_location as Point,
                })) ?? [];

            setResults(typedData);
            setIsLoading(false)
        }, 300)

        return () => clearTimeout(timeout)
    }, [searchTerm])

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <Combobox
                    value={selected}
                    onValueChange={(customer) => {
                        if (customer) {
                            setSelected(customer)
                            setSearchTerm(customer?.customer_name ?? "")
                            field.onChange(customer?.id)
                            customerSelected(customer)
                        }
                    }}
                    items={results}
                    itemToStringValue={(item) => item.customer_name}
                >
                    <ComboboxInput
                        placeholder="Search customers by name or phone number"
                        value={selected ? selected.customer_name : searchTerm}
                        onChange={(e) => {
                            const value = e.target.value
                            setSearchTerm(value)

                            if (selected) {
                                setSelected(null)
                                field.onChange("")
                            }
                        }}
                        aria-invalid={fieldState.invalid}
                        loading={isLoading}
                    />

                    <ComboboxContent>
                        <ComboboxEmpty>No customer found.</ComboboxEmpty>

                        <ComboboxList>
                            {(item: Customer) => (
                                <ComboboxItem
                                    key={item.id}
                                    value={item}
                                >
                                    <Item size="xs" className="p-0">
                                        <ItemContent>
                                            <ItemTitle>{item.customer_name}</ItemTitle>
                                            <ItemDescription>
                                                {item.customer_phone}
                                            </ItemDescription>
                                        </ItemContent>
                                    </Item>
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            )}
        />
    )
}