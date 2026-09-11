import {
  Box,
  Button,
  Field,
  Flex,
  Input,
  Portal,
  Text,
} from "@chakra-ui/react";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  type ReactElement,
} from "react";
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
  const [menuRect, setMenuRect] = useState<
    { top: number; left: number; width: number } | undefined
  >(undefined);

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(undefined);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [open]);

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
    if (!open || !menuRect) {
      return;
    }
    searchRef.current?.focus();
  }, [open, menuRect]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        picker.close();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, picker]);

  const selectedName = picker.selected?.name;

  return (
    <Field.Root required invalid={props.issue !== undefined}>
      <Flex align="center" gap="1">
        <Field.Label mb="0">Service</Field.Label>
        {props.issue ? (
          <FieldWarning message={fieldIssueMessage(props.issue)} />
        ) : null}
      </Flex>
      <Box ref={triggerWrapRef}>
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
      </Box>
      {open && menuRect ? (
        <Portal>
          <Box
            ref={menuRef}
            position="fixed"
            top={`${menuRect.top}px`}
            left={`${menuRect.left}px`}
            width={`${Math.max(menuRect.width, 256)}px`}
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
                }}
              />
            </Box>
          </Box>
        </Portal>
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
