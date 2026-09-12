import { Button, Dialog, Link, Portal } from "@chakra-ui/react";
import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { homeReturnState } from "../../features/edit";
import { ArrowLeftIcon } from "../../lib/icons";
import type { CalendarDay } from "../../lib/time/calendar-day.ts";

export function BackHomeLink(props: { day?: CalendarDay; dirty?: boolean }) {
  const navigate = useNavigate();
  const [ask, setAsk] = useState(false);
  const homeState = props.day ? homeReturnState(props.day) : undefined;

  function goHome() {
    navigate("/", { state: homeState });
  }

  function onBackClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (props.dirty) {
      setAsk(true);
      return;
    }
    goHome();
  }

  return (
    <>
      <Link
        href="/"
        colorPalette="blue"
        alignSelf="flex-start"
        display="inline-flex"
        alignItems="center"
        gap="2"
        onClick={onBackClick}
      >
        <ArrowLeftIcon />
        Back to home
      </Link>
      <Dialog.Root
        role="alertdialog"
        placement="center"
        size="sm"
        open={ask}
        onOpenChange={(details) => {
          if (!details.open) {
            setAsk(false);
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner px="4">
            <Dialog.Content mx="auto">
              <Dialog.Header>
                <Dialog.Title>Discard unsaved changes?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Dialog.Description>
                  Your edits will be lost if you leave this page.
                </Dialog.Description>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAsk(false);
                  }}
                >
                  Keep editing
                </Button>
                <Button
                  type="button"
                  colorPalette="red"
                  variant="solid"
                  onClick={() => {
                    setAsk(false);
                    goHome();
                  }}
                >
                  Discard
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
