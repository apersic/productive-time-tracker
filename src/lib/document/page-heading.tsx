import { Heading } from "@chakra-ui/react";
import { useEffect, type ReactElement } from "react";
import { useCopy } from "../copy";
import { documentTitle, type PageId } from "./page.ts";

export function PageHeading(props: {
  page: PageId;
  as?: "h1" | "h2";
}): ReactElement {
  const copy = useCopy();
  useEffect(() => {
    document.title = documentTitle(props.page, copy);
  }, [props.page, copy]);
  return (
    <Heading as={props.as ?? "h1"} size={props.as === "h2" ? "md" : "lg"}>
      {copy.page[props.page]}
    </Heading>
  );
}
