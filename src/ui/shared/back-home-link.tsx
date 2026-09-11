import { Link } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";
import { ArrowLeftIcon } from "../../lib/icons";

export function BackHomeLink() {
  return (
    <Link
      asChild
      colorPalette="blue"
      alignSelf="flex-start"
      display="inline-flex"
      alignItems="center"
      gap="2"
    >
      <RouterLink to="/">
        <ArrowLeftIcon />
        Back
      </RouterLink>
    </Link>
  );
}
