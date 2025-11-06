import { z } from 'zod'

export const schema = z.object({
  user: z.string(),
  userAvatarUrl: z.string(),
  repository: z.string(),
  stars: z.number(),
  stargazers: z.array(z.string()),
})

export type Props = z.infer<typeof schema>

export const defaultProps: Props = {
  user: 'facebook',
  userAvatarUrl: 'https://avatars.githubusercontent.com/u/69631?v=4',
  repository: 'react',
  stars: 100000,
  stargazers: Array.from({ length: 50 }).map(
    (_, i) => `https://avatars.githubusercontent.com/u/${i + 1}?v=4`,
  ),
}

