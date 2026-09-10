import { Button, Flex, Heading, Menu, Portal, Text } from "@chakra-ui/react";
import type { Person } from "../../lib/auth/session.ts";
import { LogOutIcon } from "../../lib/icons";
import { personChip } from "./person-chip.ts";

export function HomeHeader(props: {
  person: Person;
  logout: () => void;
  title?: string;
  pauseSlot?: { disabled: boolean; onPause: () => void };
}) {
  const chip = personChip(props.person.displayName);

  return (
    <Flex
      justify="space-between"
      align="center"
      gap="4"
      wrap="wrap"
      borderBottom="1px solid"
      borderColor="gray.200"
      py="4"
    >
      <Heading as="h1" size="lg">
        {props.title ?? "Home"}
      </Heading>
      <Flex gap="2" align="center">
        {props.pauseSlot ? (
          <Button
            type="button"
            variant="outline"
            aria-label="Pause"
            disabled={props.pauseSlot.disabled}
            onClick={props.pauseSlot.onPause}
          >
            Pause
          </Button>
        ) : null}
        <Menu.Root
          positioning={{ placement: "bottom-end" }}
          onSelect={(details) => {
            if (details.value === "logout") {
              props.logout();
            }
          }}
        >
          <Menu.Trigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label={chip.label}
              borderRadius="full"
              p="0"
            >
              <Flex align="center" justify="center" w="10" h="10">
                <Text>{chip.initials}</Text>
              </Flex>
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="10rem">
                <Menu.ItemGroup>
                  <Menu.ItemGroupLabel>{chip.label}</Menu.ItemGroupLabel>
                  <Menu.Item value="logout" color="fg.error">
                    <LogOutIcon />
                    Log out
                  </Menu.Item>
                </Menu.ItemGroup>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>
    </Flex>
  );
}
