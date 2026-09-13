import { Button, Menu, Portal } from "@chakra-ui/react";
import {
  LANGUAGE_ENDONYM,
  LANGUAGES,
  useCopy,
  useLanguage,
} from "../../lib/copy";

export function LanguagePicker() {
  const copy = useCopy();
  const { language, setLanguage } = useLanguage();

  return (
    <Menu.Root
      positioning={{ placement: "bottom-end" }}
      onSelect={(details) => {
        if (details.value === "en" || details.value === "hr") {
          setLanguage(details.value);
        }
      }}
    >
      <Menu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={copy.language.pickerLabel}
        >
          {LANGUAGE_ENDONYM[language]}
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="8rem">
            {LANGUAGES.map((option) => (
              <Menu.Item
                key={option}
                value={option}
                translate="no"
                cursor="pointer"
              >
                {LANGUAGE_ENDONYM[option]}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
