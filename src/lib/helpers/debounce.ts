export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => unknown,
  delay: number = 500,
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: TArgs): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
