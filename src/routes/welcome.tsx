import { createFileRoute } from '@tanstack/react-router'
import { WelcomeGuide, markWelcomeSeen } from '@/features/onboarding'

export const Route = createFileRoute('/welcome')({ component: WelcomePage })

function WelcomePage() {
  const navigate = Route.useNavigate()
  return (
    <WelcomeGuide
      onDone={(next) => {
        markWelcomeSeen()
        void navigate({ to: next === 'write' ? '/items/new' : '/', replace: true })
      }}
    />
  )
}
