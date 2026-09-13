import { Flex, IconButton } from "@chakra-ui/react";
import { useCopy } from "../../lib/copy";
import {
  nextCalendarDay,
  previousCalendarDay,
  todayLocal,
  type CalendarDay,
} from "../../lib/time/calendar-day.ts";
import { ChevronIcon } from "../../lib/icons";
import { CalendarDayPicker } from "./calendar-day-picker.tsx";

export function DayField(props: {
  value: CalendarDay;
  onChange: (day: CalendarDay) => void;
}) {
  const copy = useCopy();
  const today = todayLocal();

  return (
    <Flex gap="2" align="center" wrap="wrap">
      <Flex gap="1">
        <IconButton
          type="button"
          variant="ghost"
          colorPalette="blue"
          aria-label={copy.form.previousDay}
          onClick={() => {
            props.onChange(previousCalendarDay(props.value));
          }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <ChevronIcon />
          </span>
        </IconButton>
        <IconButton
          type="button"
          variant="ghost"
          colorPalette="blue"
          aria-label={copy.form.today}
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
        </IconButton>
        <IconButton
          type="button"
          variant="ghost"
          colorPalette="blue"
          aria-label={copy.form.nextDay}
          onClick={() => {
            props.onChange(nextCalendarDay(props.value));
          }}
        >
          <ChevronIcon />
        </IconButton>
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
