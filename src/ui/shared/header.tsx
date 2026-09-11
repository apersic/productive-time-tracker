import {
  Box,
  Button,
  Flex,
  Menu,
  Portal,
  SkeletonCircle,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { Person } from "../../lib/auth";
import { PageHeading, type PageId } from "../../lib/document";
import { LogOutIcon } from "../../lib/icons";
import { personChip } from "./person-chip.ts";

function HeaderBar(props: { children: ReactNode }) {
  return (
    <Box
      as="header"
      bg="bg"
      borderBottomWidth="1px"
      borderColor="border"
      boxShadow="sm"
      position="sticky"
      top="0"
      zIndex="sticky"
    >
      <Flex
        justify="space-between"
        align="center"
        gap="4"
        wrap="wrap"
        px="4"
        py="3"
        css={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {props.children}
      </Flex>
    </Box>
  );
}

export function HeaderSkeleton(props: { page: PageId }) {
  return (
    <HeaderBar>
      <PageHeading page={props.page} />
      <SkeletonCircle size="10" aria-hidden />
    </HeaderBar>
  );
}

export function Header(props: {
  page: PageId;
  person: Person;
  logout: () => void;
}) {
  const chip = personChip(props.person.displayName);

  return (
    <HeaderBar>
      <PageHeading page={props.page} />
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
            variant="solid"
            colorPalette="blue"
            aria-label={chip.label}
            borderRadius="full"
            p="0"
            w="10"
            h="10"
            minW="10"
          >
            <Text>{chip.initials}</Text>
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
    </HeaderBar>
  );
}
