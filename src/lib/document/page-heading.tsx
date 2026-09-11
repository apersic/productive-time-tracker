import { Heading } from "@chakra-ui/react";
import { useEffect, type ReactElement } from "react";
import { documentTitle, pageHeading, type PageId } from "./page.ts";

export function PageHeading(props: {
  page: PageId;
  as?: "h1" | "h2";
}): ReactElement {
  useEffect(() => {
    document.title = documentTitle(props.page);
  }, [props.page]);
  return (
    <Heading as={props.as ?? "h1"} size={props.as === "h2" ? "md" : "lg"}>
      {pageHeading(props.page)}
    </Heading>
  );
}
