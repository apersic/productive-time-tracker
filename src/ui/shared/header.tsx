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
import { useCopy } from "../../lib/copy";
import type { Person } from "../../lib/auth";
import { PageHeading, SITE_ICON_HREF, type PageId } from "../../lib/document";
import { LogOutIcon } from "../../lib/icons";
import { LanguagePicker } from "./language-picker.tsx";
import { personChip } from "./person-chip.ts";

function HeaderTitle(props: { page: PageId }) {
  return (
    <Flex align="center" gap="2" minW="0">
      <img
        src={SITE_ICON_HREF}
        alt=""
        aria-hidden={true}
        width={32}
        height={32}
      />
      <PageHeading page={props.page} />
    </Flex>
  );
}

function HeaderBar(props: { children: ReactNode }) {
  return (
    <Box
      as="header"
      flexShrink="0"
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
      <HeaderTitle page={props.page} />
      <Flex align="center" gap="2">
        <LanguagePicker />
        <SkeletonCircle size="10" aria-hidden />
      </Flex>
    </HeaderBar>
  );
}

export function Header(props: {
  page: PageId;
  person: Person;
  logout: () => void;
}) {
  const copy = useCopy();
  const chip = personChip(props.person.displayName);

  return (
    <HeaderBar>
      <HeaderTitle page={props.page} />
      <Flex align="center" gap="2">
        <LanguagePicker />
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
                    {copy.header.logOut}
                  </Menu.Item>
                </Menu.ItemGroup>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>
    </HeaderBar>
  );
}
