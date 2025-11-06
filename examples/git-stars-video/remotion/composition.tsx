import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export interface Props {
  user: string
  userAvatarUrl: string
  repository: string
  stars: number
  stargazers: string[]
  theme?: 'dark' | 'light'
}

export const animationDurationInSeconds = 3
export const width = 1280
export const height = 720
export const fps = 60
const stargazerAvatarSize = 128
const stargazerAvatarGap = 16
const starSize = 32

export function GitHubStarsComposition({
  user,
  userAvatarUrl,
  repository,
  stargazers,
  stars,
  theme = 'dark',
}: Props) {
  const bgColor = theme === 'dark' ? '#0a0a0a' : '#ffffff'
  const textColor = theme === 'dark' ? 'white' : 'black'
  
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <RepositoryInformation
        user={user}
        userAvatarUrl={userAvatarUrl}
        repository={repository}
        textColor={textColor}
      />
      <UserAvatars stargazers={stargazers} />
      <StarCount stars={stars} textColor={textColor} />
    </AbsoluteFill>
  )
}

function StarCount({
  stars,
  startFrom = 0,
  textColor = 'white',
}: {
  stars: number
  startFrom?: number
  textColor?: string
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const starsToDisplay = Math.round(
    interpolate(
      frame,
      [0, animationDurationInSeconds * fps],
      [startFrom, stars],
      {
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.5, 1, 0.5, 1),
      },
    ),
  )

  return (
    <div style={{
      textAlign: 'right',
      paddingLeft: 64,
      paddingRight: 64,
      paddingBottom: 64,
      fontSize: 128,
      color: textColor,
    }}>
      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
        {starsToDisplay.toLocaleString('en-US', { useGrouping: true })}
      </strong>
      &nbsp;stars
    </div>
  )
}

function UserAvatars({ stargazers }: { stargazers: Props['stargazers'] }) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {stargazers.map((avatarUrl, index) => (
        <User
          key={index}
          avatarUrl={avatarUrl}
          index={index}
          stargazers={stargazers}
        />
      ))}
    </div>
  )
}

function RepositoryInformation({
  user,
  userAvatarUrl,
  repository,
  textColor = 'white',
}: {
  user: string
  userAvatarUrl: string
  repository: string
  textColor?: string
}) {
  return (
    <div style={{
      padding: 64,
      fontSize: 72,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: textColor,
      display: 'flex',
      alignItems: 'center',
    }}>
      <Img
        src={userAvatarUrl}
        alt={user}
        style={{
          borderRadius: '50%',
          width: 90,
          height: 90,
          marginRight: 24,
          objectFit: 'cover',
        }}
      />
      <span style={{ display: 'flex', alignItems: 'center' }}>
        <span>{user}</span>
        <span style={{ opacity: 0.4, margin: '0 0.25em' }}>/</span>
        <strong>{repository}</strong>
      </span>
    </div>
  )
}

function User({
  avatarUrl,
  index,
  stargazers,
}: {
  avatarUrl: string
  index: number
  stargazers: Props['stargazers']
}) {
  const { fps, width } = useVideoConfig()
  const frame = useCurrentFrame()
  const offset =
    stargazerAvatarGap + index * (stargazerAvatarSize + stargazerAvatarGap)
  const left = interpolate(
    frame,
    [0, animationDurationInSeconds * fps],
    [
      offset,
      offset -
        stargazers.length * (stargazerAvatarSize + stargazerAvatarGap) +
        (width * 3) / 4,
    ],
    { extrapolateRight: 'clamp', easing: Easing.elastic(1) },
  )
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: stargazerAvatarSize,
        height: stargazerAvatarSize,
      }}>
        <Img
          style={{
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            borderRadius: '50%',
          }}
          src={avatarUrl}
          width={stargazerAvatarSize}
          height={stargazerAvatarSize}
        />
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 16,
      }}>
        <Star starSize={starSize} />
      </div>
    </div>
  )
}

function Star({ starSize }: { starSize: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={starSize}
      height={starSize}
      viewBox="0 0 24 24"
      fill="#fde047"
      stroke="#eab308"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

