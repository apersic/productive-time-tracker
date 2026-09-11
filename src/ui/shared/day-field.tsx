import { DatePicker, Portal, parseDate } from "@chakra-ui/react";
import {
  formatCalendarDayLabel,
  parseCalendarDay,
  type CalendarDay,
} from "../../lib/time/calendar-day.ts";
import { CalendarIcon } from "../../lib/icons";

export function DayField(props: {
  value: CalendarDay;
  onChange: (day: CalendarDay) => void;
}) {
  const selected = parseDate(props.value);

  return (
    <>
      <input type="hidden" name="day" value={props.value} />
      <DatePicker.Root
        value={selected ? [selected] : []}
        colorPalette="blue"
        variant="outline"
        openOnClick
        width={{ base: "full", lg: "auto" }}
        alignSelf={{ base: "stretch", lg: "flex-start" }}
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
        <DatePicker.Control bg="bg" width="full">
          <DatePicker.Input autoComplete="off" bg="bg" />
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
    </>
  );
}
