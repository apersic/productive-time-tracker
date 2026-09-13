import { Flex, IconButton, Tooltip } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useCopy } from "../../lib/copy";
import {
  nextCalendarDay,
  previousCalendarDay,
  todayLocal,
  type CalendarDay,
} from "../../lib/time/calendar-day.ts";
import { ChevronIcon } from "../../lib/icons";
import { CalendarDayPicker } from "./calendar-day-picker.tsx";

function DayNavButton(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span style={{ display: "inline-flex" }}>
          <IconButton
            type="button"
            variant="ghost"
            colorPalette="blue"
            aria-label={props.label}
            onClick={props.onClick}
            disabled={props.disabled}
          >
            {props.children}
          </IconButton>
        </span>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{props.label}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}

export function DayField(props: {
  value: CalendarDay;
  onChange: (day: CalendarDay) => void;
}) {
  const copy = useCopy();
  const today = todayLocal();

  return (
    <Flex gap="2" align="center" wrap="wrap">
      <Flex gap="1">
        <DayNavButton
          label={copy.form.previousDay}
          onClick={() => {
            props.onChange(previousCalendarDay(props.value));
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <ChevronIcon />
          </span>
        </DayNavButton>
        <DayNavButton
          label={copy.form.today}
          onClick={() => {
            props.onChange(today);
          }}
          disabled={props.value === today}
        >
          <span
            aria-hidden
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "9999px",
              background: "currentColor",
            }}
          />
        </DayNavButton>
        <DayNavButton
          label={copy.form.nextDay}
          onClick={() => {
            props.onChange(nextCalendarDay(props.value));
          }}
        >
          <ChevronIcon />
        </DayNavButton>
      </Flex>
      <CalendarDayPicker
        value={props.value}
        onChange={props.onChange}
        label={copy.form.day}
        labelHidden
      />
    </Flex>
  );
}
