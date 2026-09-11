export type DebouncedFn<TArgs extends unknown[]> = ((
  ...args: TArgs
) => void) & {
  cancel(): void;
};

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => unknown,
  delay: number = 500,
): DebouncedFn<TArgs> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function debounced(...args: TArgs): void {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delay);
  }

  function cancel(): void {
    clearTimeout(timer);
    timer = undefined;
  }

  return Object.assign(debounced, { cancel });
}
