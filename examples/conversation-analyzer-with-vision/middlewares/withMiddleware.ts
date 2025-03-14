import { StepHandler, StepConfig } from 'motia';

type Middleware<T extends StepHandler<TConfig>, TConfig extends StepConfig = StepConfig> = (
  handler: T
) => T;

export const withMiddleware = <
  T extends StepHandler<TConfig>,
  TConfig extends StepConfig = StepConfig,
>(
  ...fns: [...Middleware<T, TConfig>[], T]
): T => {
  const handler = fns.pop() as T;
  return (fns as Middleware<T, TConfig>[]).reduceRight((h, m) => m(h), handler);
};
