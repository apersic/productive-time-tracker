export function focusFirstInvalid(form: HTMLFormElement): void {
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  invalid?.focus();
}
