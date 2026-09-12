import {
  DatePicker,
  Flex,
  IconButton,
  Portal,
  parseDate,
} from "@chakra-ui/react";
import {
  formatCalendarDayLabel,
  nextCalendarDay,
  parseCalendarDay,
  previousCalendarDay,
  todayLocal,
  type CalendarDay,
} from "../../lib/time/calendar-day.ts";
import { CalendarIcon, ChevronIcon } from "../../lib/icons";

export function DayField(props: {
  value: CalendarDay;
  onChange: (day: CalendarDay) => void;
}) {
  const selected = parseDate(props.value);
  const today = todayLocal();

  return (
    <Flex gap="2" align="end" wrap="wrap">
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
      <DatePicker.Root
        value={selected ? [selected] : []}
        colorPalette="blue"
        variant="outline"
        openOnClick
        w="auto"
        format={(date) => {
          const day = parseCalendarDay(date.toString());
          return day ? formatCalendarDayLabel(day) : date.toString();
        }}
        parse={(value) => {
          const day = parseCalendarDay(value);
          return day ? parseDate(day) : undefined;
        }}
        onValueChange={(details) => {
          const next = details.value[0];
          if (!next) {
            return;
          }
          const day = parseCalendarDay(next.toString());
          if (day) {
            props.onChange(day);
          }
        }}
      >
        <DatePicker.Label>Day</DatePicker.Label>
        <DatePicker.Control bg="bg" w="auto">
          <DatePicker.Input
            autoComplete="off"
            bg="bg"
            readOnly
            cursor="pointer"
            w="auto"
          />
          <DatePicker.IndicatorGroup>
            <DatePicker.Trigger aria-label="Open calendar">
              <CalendarIcon />
            </DatePicker.Trigger>
          </DatePicker.IndicatorGroup>
        </DatePicker.Control>
        <Portal>
          <DatePicker.Positioner>
            <DatePicker.Content
              colorPalette="blue"
              bg="bg"
              borderWidth="1px"
              borderColor="border"
              boxShadow="md"
            >
              <DatePicker.View view="day">
                <DatePicker.Header />
                <DatePicker.DayTable />
              </DatePicker.View>
              <DatePicker.View view="month">
                <DatePicker.Header />
                <DatePicker.MonthTable />
              </DatePicker.View>
              <DatePicker.View view="year">
                <DatePicker.Header />
                <DatePicker.YearTable />
              </DatePicker.View>
            </DatePicker.Content>
          </DatePicker.Positioner>
        </Portal>
      </DatePicker.Root>
    </Flex>
  );
}
