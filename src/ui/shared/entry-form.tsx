import {
  Button,
  Field,
  Flex,
  Input,
  InputGroup,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type SubmitEvent,
} from "react";
import {
  durationFieldIssue,
  FieldWarning,
  fieldIssueMessage,
  focusFirstInvalid,
  presenceIssue,
  type FieldIssue,
} from "../../lib/forms";
import {
  emptySpokenDuration,
  formatHhMm,
  formatSpokenDuration,
  parseDurationDraft,
  type DurationDraft,
} from "../../lib/time/duration.ts";
import {
  noteIdentity,
  parseEntryDraft,
  type EntryDraft,
  type EntryFields,
  type EntryNote,
  type ServicePicker,
  type ServicesList,
  type TrackableService,
} from "../../features/timesheet";
import { Card } from "./card.tsx";
import { NoteEditor } from "./note-editor.tsx";
import { ServiceField } from "./service-field.tsx";

const DURATION_HINT = "Minutes or hh:mm, like 90 or 1:30";

export function EntryFormSkeleton(): ReactElement {
  return (
    <Card aria-hidden>
      <Stack gap="4">
        <Field.Root>
          <Field.Label>Duration</Field.Label>
          <Skeleton height="10" borderRadius="md" />
        </Field.Root>
        <Field.Root>
          <Field.Label>Description</Field.Label>
          <Skeleton height="24" borderRadius="md" />
        </Field.Root>
        <Skeleton height="10" borderRadius="md" />
      </Stack>
    </Card>
  );
}

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

function showServiceSelect(availability: ServicesList): boolean {
  switch (availability.status) {
    case "many":
      return true;
    case "loading":
    case "failed":
    case "none":
    case "one":
      return false;
    default: {
      const _exhaustive: never = availability;
      return _exhaustive;
    }
  }
}

function formDisabled(args: {
  submitting: boolean;
  blocked: boolean;
  availability: ServicesList;
  selected: TrackableService | undefined;
}): boolean {
  if (args.submitting || args.blocked) {
    return true;
  }
  switch (args.availability.status) {
    case "loading":
    case "failed":
      return true;
    case "none":
      return args.selected === undefined;
    case "one":
    case "many":
      return false;
    default: {
      const _exhaustive: never = args.availability;
      return _exhaustive;
    }
  }
}

function loadingStatus(args: {
  blocked: boolean;
  availability: ServicesList;
}): string | undefined {
  if (args.availability.status === "loading") {
    return "Loading services";
  }
  if (args.blocked) {
    return "Loading time entries";
  }
  return undefined;
}

export function EntryForm(props: {
  initial: EntryFields;
  submitLabel: string;
  picker: ServicePicker;
  submitting: boolean;
  blocked: boolean;
  error: string | undefined;
  onSubmit: (draft: EntryDraft) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [duration, setDuration] = useState(props.initial.duration);
  const [spoken, setSpoken] = useState(() =>
    spokenFromDuration(props.initial.duration),
  );
  const [note, setNote] = useState(props.initial.note);
  const [durationIssue, setDurationIssue] = useState<FieldIssue | undefined>(
    undefined,
  );
  const [serviceIssue, setServiceIssue] = useState<FieldIssue | undefined>(
    undefined,
  );
  const [submitFailed, setSubmitFailed] = useState(false);
  const summaryId = useId();
  const dirtyRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const availability = props.picker.availability;
  const selectVisible = showServiceSelect(availability);
  const disabled = formDisabled({
    submitting: props.submitting,
    blocked: props.blocked,
    availability,
    selected: props.picker.selected,
  });
  const pendingStatus = loadingStatus({
    blocked: props.blocked,
    availability,
  });
  const busy = pendingStatus !== undefined || props.submitting;

  function publishDirty(next: {
    duration?: string;
    note?: EntryNote;
    serviceId?: string;
  }) {
    const report = props.onDirtyChange;
    if (!report) {
      return;
    }
    const dirty =
      (next.duration ?? duration) !== props.initial.duration ||
      noteIdentity(next.note ?? note) !== noteIdentity(props.initial.note) ||
      (next.serviceId ?? props.picker.selected?.id ?? "") !==
        (props.initial.service?.id ?? "");
    dirtyRef.current = dirty;
    report(dirty);
  }

  useEffect(() => {
    publishDirty({});
  }, [
    duration,
    note,
    props.initial.duration,
    props.initial.note,
    props.initial.service?.id,
    props.onDirtyChange,
    props.picker.selected?.id,
  ]);

  useEffect(() => {
    if (!submitFailed) {
      return;
    }
    const form = formRef.current;
    if (form) {
      focusFirstInvalid(form);
    }
  }, [submitFailed, durationIssue, serviceIssue]);

  function commitService(service: TrackableService | undefined): boolean {
    const issue = presenceIssue(service?.id ?? "");
    setServiceIssue(issue);
    return issue === undefined;
  }

  function resetForm() {
    setDuration(props.initial.duration);
    setSpoken(spokenFromDuration(props.initial.duration));
    setNote(props.initial.note);
    setDurationIssue(undefined);
    setServiceIssue(undefined);
    setSubmitFailed(false);
    props.picker.reset();
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
    if (selectVisible) {
      commitService(props.picker.selected);
    }
    const committed = commitDuration(duration);
    const parsed = parseEntryDraft({
      fields: {
        duration: committed.value,
        service: props.picker.selected,
        note,
      },
      availability,
    });
    if (!parsed.ok) {
      setDurationIssue(parsed.issues.duration);
      setServiceIssue(parsed.issues.service);
      setSubmitFailed(true);
      return;
    }
    setSubmitFailed(false);
    const leavingDirty = dirtyRef.current;
    props.onDirtyChange?.(false);
    const ok = await props.onSubmit(parsed.draft);
    if (ok) {
      resetForm();
    } else if (leavingDirty) {
      props.onDirtyChange?.(true);
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      aria-busy={busy || undefined}
      aria-describedby={submitFailed ? summaryId : undefined}
      onSubmit={(event) => void onSubmit(event)}
    >
      <Card>
        <Stack gap="4">
          {pendingStatus ? <Text role="status">{pendingStatus}</Text> : null}
          {availability.status === "none" ? (
            <Text color="fg.error">
              No services are available for time tracking.
            </Text>
          ) : null}
          {availability.status === "failed" ? (
            <Text color="fg.error" role="alert">
              {availability.error.message}
            </Text>
          ) : null}
          {selectVisible ? (
            <ServiceField
              picker={props.picker}
              issue={serviceIssue}
              disabled={disabled}
              onSelect={(service) => {
                commitService(service);
                publishDirty({ serviceId: service.id });
              }}
            />
          ) : null}
          <Field.Root
            required
            invalid={durationIssue !== undefined}
            disabled={disabled}
            width="full"
          >
            <Field.Label>Duration</Field.Label>
            <InputGroup
              width="full"
              endElement={
                <Flex align="center" gap="1">
                  <Text aria-hidden color="fg.muted" whiteSpace="nowrap">
                    {spoken}
                  </Text>
                  {durationIssue ? <FieldWarning /> : null}
                </Flex>
              }
            >
              <Input
                name="duration"
                width="full"
                value={duration}
                inputMode="numeric"
                disabled={disabled}
                onChange={(event) => {
                  const value = event.target.value;
                  setDuration(value);
                  setDurationIssue(undefined);
                  publishDirty({ duration: value });
                }}
                onBlur={() => {
                  commitDuration(duration);
                }}
                placeholder="Time"
                autoComplete="off"
              />
            </InputGroup>
            <Field.HelperText>{DURATION_HINT}</Field.HelperText>
            {durationIssue ? (
              <Field.ErrorText>
                {fieldIssueMessage(durationIssue)}
              </Field.ErrorText>
            ) : null}
          </Field.Root>
          <Field.Root disabled={disabled}>
            <Field.Label>Description</Field.Label>
            <NoteEditor
              value={note}
              onChange={(next) => {
                setNote(next);
                publishDirty({ note: next });
              }}
              disabled={disabled}
              placeholder="Enter a description"
            />
            <Field.HelperText>Enter a description</Field.HelperText>
          </Field.Root>
          {submitFailed ? (
            <Text id={summaryId} color="fg.error" role="alert">
              Fix the highlighted fields.
            </Text>
          ) : null}
          {props.error ? (
            <Text color="fg.error" role="alert">
              {props.error}
            </Text>
          ) : null}
          <Button
            type="submit"
            colorPalette="blue"
            loading={props.submitting}
            disabled={disabled}
            width="full"
          >
            {props.submitLabel}
          </Button>
        </Stack>
      </Card>
    </form>
  );
}
