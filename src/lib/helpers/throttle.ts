export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => unknown,
  limit: number,
): (...args: TArgs) => void {
  let inThrottle = false;

  return (...args: TArgs): void => {
    if (inThrottle) {
      return;
    }

    fn(...args);
    inThrottle = true;
    setTimeout(() => {
      inThrottle = false;
    }, limit);
  };
}
