import {
  Button,
  Flex,
  Menu,
  Portal,
  SkeletonCircle,
  Text,
} from "@chakra-ui/react";
import type { Person } from "../../lib/auth";
import { PageHeading, type PageId } from "../../lib/document";
import { LogOutIcon } from "../../lib/icons";
import { personChip } from "./person-chip.ts";

export function HeaderSkeleton(props: { page: PageId }) {
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
      <PageHeading page={props.page} />
      <SkeletonCircle size="10" aria-hidden />
    </Flex>
  );
}

export function Header(props: {
  page: PageId;
  person: Person;
  logout: () => void;
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
      <PageHeading page={props.page} />
      <Flex gap="2" align="center">
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
                  <Menu.Item value="logout" color="fg.error" cursor="pointer">
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
