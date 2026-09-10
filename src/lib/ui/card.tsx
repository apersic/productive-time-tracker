import { Box, type BoxProps } from "@chakra-ui/react";

export function Card(props: BoxProps) {
  return (
    <Box
      p="4"
      bg="bg"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      boxShadow="sm"
      {...props}
    />
  );
}
