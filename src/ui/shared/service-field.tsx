import { Box, Button, Field, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, type ReactElement } from "react";
import {
  FieldWarning,
  fieldIssueMessage,
  type FieldIssue,
} from "../../lib/forms";
import { ChevronIcon } from "../../lib/icons";
import type { ServicePicker } from "../../features/timesheet";
import type {
  ServiceRow,
  TrackableService,
} from "../../features/timesheet/service-catalog.ts";

export function ServiceField(props: {
  picker: ServicePicker;
  issue: FieldIssue | undefined;
  disabled: boolean;
  onSelect: (service: TrackableService) => void;
}): ReactElement {
  const { picker } = props;
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const open = picker.lifecycle.kind === "open";
  const close = picker.close;

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (triggerWrapRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      picker.close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, picker]);

  useEffect(() => {
    if (!open) {
      return;
    }
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        picker.close();
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      const options =
        menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
      if (!options || options.length === 0) {
        return;
      }
      event.preventDefault();
      const current = document.activeElement;
      const index = Array.from(options).findIndex(
        (option) => option === current,
      );
      const last = options.length - 1;
      const next =
        event.key === "ArrowDown"
          ? index < 0
            ? 0
            : Math.min(index + 1, last)
          : index < 0
            ? last
            : Math.max(index - 1, 0);
      options[next]?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, picker]);

  const selectedName = picker.selected?.name;

  return (
    <Field.Root required invalid={props.issue !== undefined} width="full">
      <Field.Label>Service</Field.Label>
      <Box ref={triggerWrapRef} width="full" position="relative">
        <Button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-label="Service"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={props.issue !== undefined}
          variant="outline"
          width="full"
          justifyContent="space-between"
          fontWeight="normal"
          disabled={props.disabled}
          borderColor={props.issue ? "fg.error" : undefined}
          _hover={props.issue ? { borderColor: "fg.error" } : undefined}
          _focusVisible={props.issue ? { borderColor: "fg.error" } : undefined}
          onClick={() => {
            if (props.disabled) {
              return;
            }
            if (open) {
              picker.close();
              return;
            }
            picker.open();
          }}
        >
          <Text truncate color={selectedName ? undefined : "fg.muted"}>
            {selectedName && selectedName.length > 0
              ? selectedName
              : "Select a service"}
          </Text>
        </Button>
        {open ? (
          <Box
            ref={menuRef}
            position="absolute"
            top="calc(100% + 0.25rem)"
            left="0"
            width="full"
            minW="16rem"
            zIndex="popover"
            bg="bg"
            borderWidth="1px"
            borderColor="border"
            borderRadius="md"
            boxShadow="md"
            py="2"
          >
            <Box px="2" pb="2">
              <Input
                ref={searchRef}
                value={picker.query}
                onChange={(event) => {
                  picker.setQuery(event.target.value);
                }}
                placeholder="Search services"
                aria-label="Search services"
                autoComplete="off"
              />
            </Box>
            <Box
              role="listbox"
              aria-label="Service"
              maxH="20rem"
              overflowY="auto"
            >
              <ListingBody
                picker={picker}
                onSelect={(service) => {
                  props.onSelect(service);
                  picker.select(service);
                  picker.close();
                  triggerRef.current?.focus();
                }}
              />
            </Box>
          </Box>
        ) : null}
      </Box>
      {props.issue ? (
        <Flex align="center" gap="1">
          <FieldWarning />
          <Field.ErrorText>{fieldIssueMessage(props.issue)}</Field.ErrorText>
        </Flex>
      ) : null}
    </Field.Root>
  );
}

function ListingBody(props: {
  picker: ServicePicker;
  onSelect: (service: TrackableService) => void;
}): ReactElement {
  const { listing } = props.picker;
  switch (listing.kind) {
    case "loading":
      return (
        <Text px="3" py="2" color="fg.muted">
          Loading services
        </Text>
      );
    case "failed":
      return (
        <Text px="3" py="2" color="fg.error" role="alert">
          {listing.error.message}
        </Text>
      );
    case "empty":
      switch (listing.reason) {
        case "noMatches":
          return (
            <Text px="3" py="2" color="fg.muted">
              No matching services
            </Text>
          );
        case "noServices":
          return (
            <Text px="3" py="2" color="fg.muted">
              No services
            </Text>
          );
        default: {
          const _exhaustive: never = listing.reason;
          return _exhaustive;
        }
      }
    case "rows":
      return (
        <>
          {listing.rows.map((row) => (
            <CatalogRow
              key={rowKey(row)}
              row={row}
              picker={props.picker}
              onSelect={props.onSelect}
            />
          ))}
        </>
      );
    case "searchFailed":
      return (
        <>
          <Text px="3" py="2" color="fg.error" role="alert">
            {listing.error.message}
          </Text>
          {listing.rows.map((row) => (
            <CatalogRow
              key={rowKey(row)}
              row={row}
              picker={props.picker}
              onSelect={props.onSelect}
            />
          ))}
        </>
      );
    default: {
      const _exhaustive: never = listing;
      return _exhaustive;
    }
  }
}

function rowKey(row: ServiceRow): string {
  switch (row.kind) {
    case "group":
      return row.id;
    case "service":
      return row.service.id;
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

function CatalogRow(props: {
  row: ServiceRow;
  picker: ServicePicker;
  onSelect: (service: TrackableService) => void;
}): ReactElement {
  const { row } = props;
  switch (row.kind) {
    case "group":
      return (
        <Button
          type="button"
          variant="ghost"
          width="full"
          justifyContent="flex-start"
          fontWeight="medium"
          borderRadius="none"
          aria-expanded={row.expanded}
          style={{ paddingInlineStart: `${8 + row.depth * 16}px` }}
          onClick={() => {
            props.picker.toggleGroup(row.id);
          }}
        >
          <Box
            display="inline-flex"
            flexShrink="0"
            style={{
              transform: row.expanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            <ChevronIcon />
          </Box>
          <Text truncate>{row.label}</Text>
          {row.expanded ? null : (
            <Text color="fg.muted" fontWeight="normal">
              {row.serviceCount}
            </Text>
          )}
        </Button>
      );
    case "service":
      return (
        <Button
          type="button"
          role="option"
          aria-selected={row.selected}
          variant="ghost"
          width="full"
          justifyContent="flex-start"
          fontWeight="normal"
          borderRadius="none"
          bg={row.selected ? "bg.muted" : undefined}
          style={{ paddingInlineStart: `${8 + row.depth * 16}px` }}
          onClick={() => {
            props.onSelect(row.service);
          }}
        >
          <Text truncate>
            {row.service.name.length > 0 ? row.service.name : row.service.id}
          </Text>
        </Button>
      );
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}
