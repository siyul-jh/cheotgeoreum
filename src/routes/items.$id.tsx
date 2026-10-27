import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/items/$id')({ component: () => <h1>항목 편집</h1> })
