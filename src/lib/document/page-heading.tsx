import { Heading } from "@chakra-ui/react";
import { useEffect, type ReactElement } from "react";
import { documentTitle, pageHeading, type PageId } from "./page.ts";

export function PageHeading(props: { page: PageId }): ReactElement {
  useEffect(() => {
    document.title = documentTitle(props.page);
  }, [props.page]);
  return (
    <Heading as="h1" size="lg">
      {pageHeading(props.page)}
    </Heading>
  );
}
