import { Box, type BoxProps } from "@chakra-ui/react";

export function Card(props: BoxProps) {
  return (
    <Box
      p="4"
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      boxShadow="sm"
      {...props}
    />
  );
}
