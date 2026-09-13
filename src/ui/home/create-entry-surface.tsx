import {
  Box,
  Button,
  Dialog,
  Heading,
  Portal,
  Stack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  blankEntryFields,
  type EntryDraft,
  type ServicePicker,
} from "../../features/timesheet";
import { usePrefersReducedMotion } from "../../lib/hooks";
import { useCopy } from "../../lib/copy";
import { PlusIcon, XIcon } from "../../lib/icons";
import { EntryForm, type EntryDayControl } from "../shared";
import {
  createSurface,
  dismissable,
  entryFormStatus,
  HOME_CREATE_PORTAL_ID,
  HOME_CREATE_SPLIT,
  type CreateLayout,
  type CreateRequest,
  type CreateResult,
  type CreateStatus,
} from "./create-surface";

function useCreateLayout(): CreateLayout {
  return (
    useBreakpointValue<CreateLayout>(
      { base: "overlay", [HOME_CREATE_SPLIT]: "inline" },
      { ssr: false },
    ) ?? "inline"
  );
}

export function CreateEntrySurface(props: {
  picker: ServicePicker;
  blocked: boolean;
  day: EntryDayControl;
  onCreate: (draft: EntryDraft) => Promise<CreateResult>;
}) {
  const copy = useCopy();
  const layout = useCreateLayout();
  const [request, setRequest] = useState<CreateRequest>({ kind: "closed" });
  const [status, setStatus] = useState<CreateStatus>({ kind: "editing" });
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortal(document.getElementById(HOME_CREATE_PORTAL_ID));
  }, []);

  useEffect(() => {
    if (layout !== "inline") {
      return;
    }
    setRequest((current) =>
      current.kind === "open" ? { kind: "closed" } : current,
    );
  }, [layout]);

  async function submit(draft: EntryDraft): Promise<boolean> {
    if (status.kind === "saving") {
      return false;
    }
    setStatus({ kind: "saving" });
    const result = await props.onCreate(draft);
    if (!result.ok) {
      setStatus({ kind: "failed", error: result.error });
      return false;
    }
    setStatus({ kind: "editing" });
    setRequest({ kind: "closed" });
    return true;
  }

  function open() {
    setRequest({ kind: "open" });
  }

  function close() {
    setRequest({ kind: "closed" });
  }

  const surface = createSurface({ layout, request, status });
  switch (surface.kind) {
    case "inline":
      return (
        <CreateEntryForm
          status={surface.status}
          picker={props.picker}
          blocked={props.blocked}
          day={props.day}
          onSubmit={submit}
          heading={copy.home.newEntry}
        />
      );
    case "trigger": {
      const fab = <CreateEntryFab blocked={props.blocked} onOpen={open} />;
      return portal ? createPortal(fab, portal) : fab;
    }
    case "modal":
      return (
        <CreateEntryDialog
          status={surface.status}
          picker={props.picker}
          blocked={props.blocked}
          day={props.day}
          onClose={close}
          onSubmit={submit}
        />
      );
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}

function CreateEntryForm(props: {
  status: CreateStatus;
  picker: ServicePicker;
  blocked: boolean;
  day: EntryDayControl;
  onSubmit: (draft: EntryDraft) => Promise<boolean>;
  heading?: string;
}) {
  const copy = useCopy();
  const { submitting, error } = entryFormStatus(props.status);
  return (
    <Stack gap="3">
      {props.heading ? (
        <Heading as="h2" size="md">
          {props.heading}
        </Heading>
      ) : null}
      <EntryForm
        initial={blankEntryFields()}
        day={props.day}
        submitLabel={copy.form.addEntry}
        picker={props.picker}
        submitting={submitting}
        blocked={props.blocked}
        error={error}
        onSubmit={props.onSubmit}
      />
    </Stack>
  );
}

function CreateEntryFab(props: { blocked: boolean; onOpen: () => void }) {
  const copy = useCopy();
  return (
    <Box
      as="nav"
      aria-label={copy.home.createNav}
      className="fixed right-4 bottom-4 z-50"
    >
      <Button
        type="button"
        aria-label={copy.home.newEntry}
        onClick={props.onOpen}
        disabled={props.blocked}
        colorPalette="blue"
        w="14"
        h="14"
        borderRadius="full"
        boxShadow="lg"
      >
        <PlusIcon />
      </Button>
    </Box>
  );
}

function CreateEntryDialog(props: {
  status: CreateStatus;
  picker: ServicePicker;
  blocked: boolean;
  day: EntryDayControl;
  onClose: () => void;
  onSubmit: (draft: EntryDraft) => Promise<boolean>;
}) {
  const copy = useCopy();
  const canDismiss = dismissable(props.status);
  const reduceMotion = usePrefersReducedMotion();
  return (
    <Dialog.Root
      open
      size="full"
      scrollBehavior="inside"
      motionPreset={reduceMotion ? "none" : "slide-in-bottom"}
      closeOnEscape={canDismiss}
      closeOnInteractOutside={canDismiss}
      modal
      trapFocus={true}
      preventScroll={true}
      onOpenChange={(details) => {
        if (!details.open && canDismiss) {
          props.onClose();
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Dialog.Title>{copy.home.newEntry}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={copy.form.close}
                  disabled={!canDismiss}
                >
                  <XIcon />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body pb="6">
              <CreateEntryForm
                status={props.status}
                picker={props.picker}
                blocked={props.blocked}
                day={props.day}
                onSubmit={props.onSubmit}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
