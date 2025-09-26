import React from "react";
import {
  Box,
  Button,
  Select,
  Option,
  FormControl,
  FormLabel,
  Typography,
} from "@mui/joy";

interface PaginationControlsProps {
  limit: number;
  setLimit: (limit: number) => void;
  page: number;
  setPage: (page: number) => void;
  hasMore: boolean;
  loading: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  limit,
  setLimit,
  page,
  setPage,
  hasMore,
  loading,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        py: 2,
        px: 2,
        my: 2,
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface',
      }}
    >
      <FormControl size="sm" sx={{ minWidth: 120 }}>
        <FormLabel>Posts per page</FormLabel>
        <Select
          value={limit}
          onChange={(_, value) => {
            setLimit(value as number);
            setPage(1); // Reset to first page when limit changes
          }}
          disabled={loading}
        >
          <Option value={10}>10</Option>
          <Option value={25}>25</Option>
          <Option value={50}>50</Option>
          <Option value={100}>100</Option>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1 || loading}
        >
          Previous
        </Button>
        <Typography sx={{ minWidth: 80, textAlign: 'center' }}>
          Page {page}
        </Typography>
        <Button
          variant="outlined"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={!hasMore || loading}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default PaginationControls;