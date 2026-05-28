import { OnboardingClient } from "./onboarding-client"

type Props = { params: Promise<{ slug: string }> }

export default async function OnboardingPage({ params }: Props) {
    const { slug } = await params
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <OnboardingClient slug={slug} />
        </div>
    )
}
