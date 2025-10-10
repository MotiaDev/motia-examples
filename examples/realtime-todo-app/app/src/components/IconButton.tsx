import { Button, type ButtonProps } from '@motiadev/ui'

export const IconButton: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <Button className="rounded-full px-[6px] h-7 text-muted-foreground" {...props}>
      {children}
    </Button>
  )
}
