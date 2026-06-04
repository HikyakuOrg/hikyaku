import { getServiceCatalog } from "@/lib/api/services"
import { ServicesManager } from "./services-manager"

type PageProps = { params: Promise<{ slug: string }> }

export default async function ServiceRatesPage({ params }: PageProps) {
    const { slug } = await params
    const catalog = await getServiceCatalog(slug)

    return <ServicesManager slug={slug} catalog={catalog} />
}
