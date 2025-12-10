import { Composition } from 'remotion'
import {
  GitHubStarsComposition,
  animationDurationInSeconds,
  fps,
  height,
  width,
  Props,
} from './composition'
import { z } from 'zod'

// Define schema inline
const schema = z.object({
  user: z.string(),
  userAvatarUrl: z.string(),
  repository: z.string(),
  stars: z.number(),
  stargazers: z.array(z.string()),
})

const defaultProps: Props = {
  user: 'facebook',
  userAvatarUrl: 'https://avatars.githubusercontent.com/u/69631?v=4',
  repository: 'react',
  stars: 100000,
  stargazers: Array.from({ length: 50 }).map(
    (_, i) => `https://avatars.githubusercontent.com/u/${i + 1}?v=4`,
  ),
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GitHubStars"
        component={GitHubStarsComposition}
        fps={fps}
        width={width}
        height={height}
        durationInFrames={(animationDurationInSeconds + 1) * fps}
        schema={schema}
        defaultProps={defaultProps}
      />
    </>
  )
}
