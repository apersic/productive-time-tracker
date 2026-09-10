import {
  Button,
  createListCollection,
  Field,
  Input,
  InputGroup,
  Portal,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState, type SubmitEvent } from "react";
import {
  durationFieldIssue,
  FieldWarning,
  fieldIssueMessage,
  presenceIssue,
  type FieldIssue,
} from "../../lib/forms";
import type {
  ServicesList,
  TrackableService,
} from "../../lib/productive/services.ts";
import {
  emptySpokenDuration,
  formatHhMm,
  formatSpokenDuration,
  parseDurationDraft,
  type DurationDraft,
} from "../../lib/time/duration.ts";
import { parseServiceId } from "../../lib/timesheet/day-timesheet.ts";
import { emptyNote, type EntryNote } from "../../lib/timesheet/entry-note.ts";
import { Card } from "../../lib/ui";
import { NoteEditor } from "./note-editor.tsx";

export function CreateEntryForm(props: {
  services: ServicesList;
  submitting: boolean;
  blocked: boolean;
  error: string | undefined;
  onSubmit: (input: {
    note: EntryNote;
    duration: string;
    service: TrackableService | undefined;
  }) => Promise<boolean>;
}) {
  const [duration, setDuration] = useState("");
  const [spoken, setSpoken] = useState(emptySpokenDuration);
  const [note, setNote] = useState<EntryNote>(emptyNote);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [durationIssue, setDurationIssue] = useState<FieldIssue | undefined>(
    undefined,
  );
  const [serviceIssue, setServiceIssue] = useState<FieldIssue | undefined>(
    undefined,
  );

  const disabled =
    props.submitting ||
    props.blocked ||
    props.services.status === "loading" ||
    props.services.status === "none" ||
    props.services.status === "failed";

  function selectedService(): TrackableService | undefined {
    switch (props.services.status) {
      case "one":
        return props.services.service;
      case "many": {
        const id = parseServiceId(selectedServiceId);
        if (!id) {
          return undefined;
        }
        return props.services.services.find((service) => service.id === id);
      }
      case "loading":
      case "failed":
      case "none":
        return undefined;
      default: {
        const _exhaustive: never = props.services;
        return _exhaustive;
      }
    }
  }

  function resetForm() {
    setDuration("");
    setSpoken(emptySpokenDuration);
    setNote(emptyNote);
    setSelectedServiceId("");
    setDurationIssue(undefined);
    setServiceIssue(undefined);
  }

  function commitService(id: string): boolean {
    const issue = presenceIssue(id);
    setServiceIssue(issue);
    return issue === undefined;
  }

  function commitDuration(raw: string): {
    value: string;
    draft: DurationDraft;
  } {
    const draft = parseDurationDraft(raw);
    const issue = durationFieldIssue(draft);
    setDurationIssue(issue);
    switch (draft.kind) {
      case "empty":
      case "invalid":
        setDuration("");
        setSpoken(emptySpokenDuration);
        return { value: "", draft: { kind: "empty" } };
      case "tooLong":
        setSpoken(emptySpokenDuration);
        return { value: raw, draft };
      case "ready": {
        const value = formatHhMm(draft.minutes);
        setDuration(value);
        setSpoken(formatSpokenDuration(draft.minutes));
        return { value, draft };
      }
      default: {
        const _exhaustive: never = draft;
        return _exhaustive;
      }
    }
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }
    const serviceOk =
      props.services.status !== "many" || commitService(selectedServiceId);
    const committed = commitDuration(duration);
    if (!serviceOk || committed.draft.kind !== "ready") {
      return;
    }
    const ok = await props.onSubmit({
      note,
      duration: committed.value,
      service: selectedService(),
    });
    if (ok) {
      resetForm();
    }
  }

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <Card>
        <Stack gap="4">
          {props.services.status === "none" ? (
            <Text color="fg.error">
              No services are available for time tracking.
            </Text>
          ) : null}
          {props.services.status === "failed" ? (
            <Text color="fg.error" role="alert">
              {props.services.error.message}
            </Text>
          ) : null}
          {props.services.status === "many" ? (
            <ServiceField
              services={props.services.services}
              selectedServiceId={selectedServiceId}
              issue={serviceIssue}
              disabled={disabled}
              onSelectedServiceIdChange={(id) => {
                setSelectedServiceId(id);
                setServiceIssue(undefined);
              }}
              onBlur={() => {
                commitService(selectedServiceId);
              }}
            />
          ) : null}
          <Field.Root required invalid={durationIssue !== undefined}>
            <Field.Label>Duration</Field.Label>
            <InputGroup
              endElement={
                durationIssue ? (
                  <FieldWarning message={fieldIssueMessage(durationIssue)} />
                ) : (
                  <Text color="fg.muted" whiteSpace="nowrap">
                    {spoken}
                  </Text>
                )
              }
            >
              <Input
                name="duration"
                value={duration}
                onChange={(event) => {
                  setDuration(event.target.value);
                  setDurationIssue(undefined);
                }}
                onBlur={() => {
                  commitDuration(duration);
                }}
                placeholder="Time"
                autoComplete="off"
              />
            </InputGroup>
          </Field.Root>
          <Field.Root>
            <Field.Label>Description</Field.Label>
            <NoteEditor
              value={note}
              onChange={setNote}
              disabled={disabled}
              placeholder="Enter a description"
            />
          </Field.Root>
          {props.error ? (
            <Text color="fg.error" role="alert">
              {props.error}
            </Text>
          ) : null}
          <Button type="submit" loading={props.submitting} disabled={disabled}>
            Add entry
          </Button>
        </Stack>
      </Card>
    </form>
  );
}

function ServiceField(props: {
  services: readonly TrackableService[];
  selectedServiceId: string;
  issue: FieldIssue | undefined;
  disabled: boolean;
  onSelectedServiceIdChange: (id: string) => void;
  onBlur: () => void;
}) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: props.services.map((service) => ({
          label: service.name || service.id,
          value: service.id,
        })),
      }),
    [props.services],
  );

  return (
    <Field.Root required invalid={props.issue !== undefined}>
      <Field.Label>Service</Field.Label>
      <Select.Root
        collection={collection}
        value={props.selectedServiceId ? [props.selectedServiceId] : []}
        onValueChange={(details) =>
          props.onSelectedServiceIdChange(details.value[0] ?? "")
        }
        disabled={props.disabled}
        width="full"
        invalid={props.issue !== undefined}
      >
        <Select.HiddenSelect name="service" />
        <Select.Control onBlur={props.onBlur}>
          <Select.Trigger>
            <Select.ValueText placeholder="Select a service" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            {props.issue ? (
              <FieldWarning message={fieldIssueMessage(props.issue)} />
            ) : null}
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
              {collection.items.map((item) => (
                <Select.Item item={item} key={item.value}>
                  {item.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Field.Root>
  );
}
