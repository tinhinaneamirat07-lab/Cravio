import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { ChatReply, ChatRole, Lang } from '@/api/types'
import { toISODate } from '@/lib/dates'

export function useAssistantStatus() {
  return useQuery({
    queryKey: ['assistant', 'status'],
    queryFn: () => api<{ available: boolean }>('/assistant/status'),
    staleTime: 5 * 60_000,
  })
}

type ChatInput = { messages: { role: ChatRole; content: string }[]; lang: Lang; recipeSlug?: string }

export function useChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messages, lang, recipeSlug }: ChatInput) =>
      api<ChatReply>('/assistant/chat', {
        method: 'POST',
        body: { messages, lang, today: toISODate(new Date()), recipe_slug: recipeSlug },
      }),
    // The agent may have changed the planner or the list: refresh what the other pages show.
    onSuccess: (reply) => {
      if (reply.actions.some((a) => a.type === 'planner_add')) qc.invalidateQueries({ queryKey: ['planner'] })
      if (reply.actions.some((a) => a.type !== 'planner_add')) qc.invalidateQueries({ queryKey: ['shopping'] })
    },
  })
}
