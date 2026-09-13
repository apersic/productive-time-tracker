import { Link } from "@chakra-ui/react";
import { useCopy } from "../copy";

export function SkipToContent() {
  const copy = useCopy();
  return (
    <Link
      href="#main"
      variant="plain"
      position="fixed"
      left="3"
      top="2"
      zIndex="overlay"
      bg="fg"
      color="bg"
      px="2"
      py="1"
      borderRadius="md"
      fontWeight="medium"
      textStyle="sm"
      textDecoration="none"
      transform="translateY(calc(-100% - 1.5rem))"
      _focusVisible={{ transform: "none" }}
    >
      {copy.document.skipToContent}
    </Link>
  );
}
