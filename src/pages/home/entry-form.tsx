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
import {
  entryServiceOptions,
  parseEntryDraft,
  type EntryDraft,
  type EntryFields,
} from "../../lib/timesheet/entry-draft.ts";
import { Card } from "../../lib/ui";
import { NoteEditor } from "./note-editor.tsx";

function spokenFromDuration(duration: string): string {
  const draft = parseDurationDraft(duration);
  switch (draft.kind) {
    case "ready":
      return formatSpokenDuration(draft.minutes);
    case "empty":
    case "invalid":
    case "tooLong":
      return emptySpokenDuration;
    default: {
      const _exhaustive: never = draft;
      return _exhaustive;
    }
  }
}

export function EntryForm(props: {
  initial: EntryFields;
  submitLabel: string;
  services: ServicesList;
  submitting: boolean;
  blocked: boolean;
  error: string | undefined;
  onSubmit: (draft: EntryDraft) => Promise<boolean>;
}) {
  const [duration, setDuration] = useState(props.initial.duration);
  const [spoken, setSpoken] = useState(() =>
    spokenFromDuration(props.initial.duration),
  );
  const [note, setNote] = useState(props.initial.note);
  const [selectedServiceId, setSelectedServiceId] = useState(
    props.initial.service?.id ?? "",
  );
  const [durationIssue, setDurationIssue] = useState<FieldIssue | undefined>(
    undefined,
  );
  const [serviceIssue, setServiceIssue] = useState<FieldIssue | undefined>(
    undefined,
  );

  const serviceOptions = entryServiceOptions({
    services: props.services,
    pinned: props.initial.service,
  });
  const showServiceSelect = serviceOptions.length > 1;

  const disabled =
    props.submitting ||
    props.blocked ||
    props.services.status === "loading" ||
    props.services.status === "failed" ||
    (props.services.status === "none" && serviceOptions.length === 0);

  function selectedService(): TrackableService | undefined {
    const id = parseServiceId(selectedServiceId);
    if (id) {
      const fromOptions = serviceOptions.find((service) => service.id === id);
      if (fromOptions) {
        return fromOptions;
      }
    }
    if (serviceOptions.length === 1) {
      return serviceOptions[0];
    }
    return undefined;
  }

  function resetForm() {
    setDuration(props.initial.duration);
    setSpoken(spokenFromDuration(props.initial.duration));
    setNote(props.initial.note);
    setSelectedServiceId(props.initial.service?.id ?? "");
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
    if (showServiceSelect) {
      commitService(selectedServiceId);
    }
    const committed = commitDuration(duration);
    const parsed = parseEntryDraft({
      fields: {
        duration: committed.value,
        service: selectedService(),
        note,
      },
      services: props.services,
    });
    if (!parsed.ok) {
      setDurationIssue(parsed.issues.duration);
      setServiceIssue(parsed.issues.service);
      return;
    }
    const ok = await props.onSubmit(parsed.draft);
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
          {showServiceSelect ? (
            <ServiceField
              services={serviceOptions}
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
            {props.submitLabel}
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
