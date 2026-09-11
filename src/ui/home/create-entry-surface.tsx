import { Button, Dialog, Portal, useBreakpointValue } from "@chakra-ui/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { blankEntryFields, type EntryDraft } from "../../features/timesheet";
import { PlusIcon, XIcon } from "../../lib/icons";
import type { ServicesList } from "../../providers/productive";
import { EntryForm } from "../shared";
import {
  createSurface,
  dismissable,
  entryFormStatus,
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
  services: ServicesList;
  blocked: boolean;
  onCreate: (draft: EntryDraft) => Promise<CreateResult>;
}) {
  const layout = useCreateLayout();
  const [request, setRequest] = useState<CreateRequest>({ kind: "closed" });
  const [status, setStatus] = useState<CreateStatus>({ kind: "editing" });

  // Drop a stale open request while inline so a later shrink does not reopen it.
  if (layout === "inline" && request.kind === "open") {
    setRequest({ kind: "closed" });
  }

  async function submit(draft: EntryDraft): Promise<boolean> {
    if (status.kind === "saving") {
      return false;
    }
    setStatus({ kind: "saving" });
    const result = await props.onCreate(draft);
    if (!result.ok) {
      setStatus({ kind: "failed", message: result.error.message });
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
          services={props.services}
          blocked={props.blocked}
          onSubmit={submit}
        />
      );
    case "trigger":
      return createPortal(
        <CreateEntryFab blocked={props.blocked} onOpen={open} />,
        document.body,
      );
    case "modal":
      return createPortal(
        <>
          <CreateEntryFab blocked={props.blocked} onOpen={open} />
          <CreateEntryDialog
            status={surface.status}
            services={props.services}
            blocked={props.blocked}
            onClose={close}
            onSubmit={submit}
          />
        </>,
        document.body,
      );
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}

function CreateEntryForm(props: {
  status: CreateStatus;
  services: ServicesList;
  blocked: boolean;
  onSubmit: (draft: EntryDraft) => Promise<boolean>;
}) {
  const { submitting, error } = entryFormStatus(props.status);
  return (
    <EntryForm
      initial={blankEntryFields()}
      submitLabel="Add entry"
      services={props.services}
      submitting={submitting}
      blocked={props.blocked}
      error={error}
      onSubmit={props.onSubmit}
    />
  );
}

function CreateEntryFab(props: { blocked: boolean; onOpen: () => void }) {
  return (
    // body is flex + h-full. Chakra Button is position:relative. Fixed has to live here.
    <div className="fixed right-4 bottom-4 z-50">
      <Button
        type="button"
        aria-label="New time entry"
        onClick={props.onOpen}
        disabled={props.blocked}
        w="14"
        h="14"
        borderRadius="full"
        boxShadow="lg"
      >
        <PlusIcon />
      </Button>
    </div>
  );
}

function CreateEntryDialog(props: {
  status: CreateStatus;
  services: ServicesList;
  blocked: boolean;
  onClose: () => void;
  onSubmit: (draft: EntryDraft) => Promise<boolean>;
}) {
  const canDismiss = dismissable(props.status);
  return (
    <Dialog.Root
      open
      size="full"
      scrollBehavior="inside"
      motionPreset="slide-in-bottom"
      closeOnEscape={canDismiss}
      // Service Select portals to body; a pick would look like an outside click.
      closeOnInteractOutside={false}
      // Modal aria-hides body siblings, including that listbox, so getByRole and AT miss the options.
      modal={false}
      trapFocus={true}
      preventScroll={true}
      onOpenChange={(details) => {
        if (!details.open && canDismiss) {
          props.onClose();
        }
      }}
    >
      <Portal>
        {/* Select content is zIndex.popover. The sheet must sit below that layer or the listbox is covered. */}
        <Dialog.Backdrop zIndex="modal" />
        <Dialog.Positioner zIndex="modal">
          <Dialog.Content zIndex="modal">
            <Dialog.Header
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Dialog.Title>New time entry</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  disabled={!canDismiss}
                >
                  <XIcon />
                </Button>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body pb="6">
              <CreateEntryForm
                status={props.status}
                services={props.services}
                blocked={props.blocked}
                onSubmit={props.onSubmit}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
