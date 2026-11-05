import { Link, type LinkProps } from 'react-router-dom'
import { buttonClass, type Common } from './button-styles'

export function Button({
  variant,
  size,
  className,
  ...props
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClass({ variant, size, className })} {...props} />
}

export function ButtonLink({ variant, size, className, ...props }: Common & LinkProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />
}
