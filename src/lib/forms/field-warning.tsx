import { Field, IconButton, Portal, Tooltip } from "@chakra-ui/react";

export function FieldWarning(props: { message: string }) {
  return (
    <Tooltip.Root openDelay={0}>
      <Tooltip.Trigger asChild>
        <IconButton
          type="button"
          variant="ghost"
          size="xs"
          color="fg.error"
          aria-label={props.message}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Field.ErrorIcon />
        </IconButton>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content>{props.message}</Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
