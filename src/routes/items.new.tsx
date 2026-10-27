import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/items/new')({ component: () => <h1>새 항목</h1> })
