import { XIcon } from "lucide-react";


interface CustomerCardProps {
    customer: Customer,
    onRemove: () => void,
}

export function CustomerCard({ customer, onRemove }: CustomerCardProps) {


    return (
        <div className="bg-white dark:bg-slate-900 border border-primary/20 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {customer?.customer_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{customer?.customer_name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{customer?.customer_phone}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{customer?.customer_address}, {customer?.customer_suburb}, {customer?.customer_postcode}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{customer?.customer_country}</p>
                </div>
            </div>
            <XIcon size={32} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer" onClick={onRemove} />

        </div>
    )
}