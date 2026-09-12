import { Flex, IconButton } from "@chakra-ui/react";
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
  const today = todayLocal();

  return (
    <Flex gap="2" align="center" wrap="wrap">
      <Flex gap="1">
        <IconButton
          type="button"
          variant="ghost"
          colorPalette="blue"
          aria-label="Previous day"
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
          aria-label="Today"
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
          aria-label="Next day"
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
        label="Day"
        labelHidden
      />
    </Flex>
  );
}
