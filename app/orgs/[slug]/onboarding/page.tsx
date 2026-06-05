import { Suspense } from "react"
import { OnboardingClient } from "./onboarding-client"

type Props = { params: Promise<{ slug: string }> }

export default function OnboardingPage({ params }: Props) {
    // This route has no auth layout opting it out of prerendering, so Next builds
    // a static shell for it. Resolving `params` is request-time work, so it must
    // sit inside a <Suspense> boundary (cacheComponents requirement).
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <Suspense fallback={null}>
                <OnboardingLoader params={params} />
            </Suspense>
        </div>
    )
}

async function OnboardingLoader({ params }: Props) {
    const { slug } = await params
    return <OnboardingClient slug={slug} />
}
